import { createSocket, Socket } from 'node:dgram';
import { randomBytes } from 'node:crypto';
import { createConnection, Socket as NetSocket } from 'node:net';
import { once } from 'node:events';
import deflate from 'node:zlib';
import SonicBoom from 'sonic-boom';
import build from 'pino-abstract-transport';
import type { DestinationStream, LogDescriptor } from 'pino';
import { Logger } from '@nestjs/common';

// GELF options interface
export interface GelfOptions {
  host: string;
  port: number;
  protocol?: 'udp' | 'tcp';
  environment?: string;
  destination?: string | number | DestinationStream;
  facility?: string;
  hostname?: string;
  compression?: boolean;
  maxChunkSize?: number;
}

// Pino levels: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal
// GELF levels: 0=emergency, 1=alert, 2=critical, 3=error, 4=warning, 5=notice, 6=info, 7=debug
const levelMapPinoToGelf: Record<number, number> = {
  10: 7, // trace -> debug
  20: 7, // debug -> debug
  30: 6, // info -> info
  40: 4, // warn -> warning
  50: 3, // error -> error
  60: 2, // fatal -> critical
};

export default async function (opts: GelfOptions) {
  const { host, port, protocol = 'udp', maxChunkSize = 8192, compression = true } = opts;

  if (!host || !port) {
    throw new Error('GELF transport requires host and port configuration');
  }

  let socket: Socket | null = null;
  let tcpConnection: NetSocket | null = null;

  if (protocol === 'udp') {
    socket = createSocket('udp4');
  } else if (protocol === 'tcp') {
    await new Promise((resolve, reject) => {
      tcpConnection = createConnection({ host, port, keepAlive: true }, () => {
        new Logger('Graylog').debug('Graylog TCP connection created');
        resolve(true);
      })
        .on('error', (err: Error) => {
          new Logger('Graylog').error({ msg: `Graylog TCP connection error:${err.message}`, err });
          reject(err);
        })
        .on('close', () => {
          new Logger('Graylog').debug('Graylog TCP connection closed');
          resolve(true);
        });
    }).catch((err: Error) => {
      new Logger('Graylog').error({ msg: `Graylog failed to create TCP connection: ${err.message}`, err });
      return;
    });
  } else {
    throw new Error('Invalid protocol');
  }

  const destination = new SonicBoom({
    dest: 1, // stdout as fallback
    sync: false,
  });

  await once(destination, 'ready');

  return build(
    async function (source: any) {
      for await (const obj of source) {
        const gelfMessage = convertToGelf(obj, opts);
        const message = JSON.stringify(gelfMessage);

        if (protocol === 'udp') {
          if (socket !== null) {
            let buffer: Buffer<ArrayBufferLike> = Buffer.from(message, 'utf8');
            if (compression) {
              buffer = deflate.deflateSync(buffer);
            }
            if (buffer.length > maxChunkSize) {
              sendChunkedMessage(buffer, socket, host, port, opts.maxChunkSize || 8192);
            } else {
              socket.send(buffer, port, host, (err: Error | null) => {
                if (err) {
                  new Logger('Graylog').error({ msg: `Failed to send GELF message: ${err.message}`, err });
                }
              });
            }
          }
        } else if (tcpConnection !== null) {
          tcpConnection.write(message + '\0'); // GELF TCP requires null-terminated messages
        }
      }
    },
    {
      async close(err: Error) {
        destination.end();
        if (socket !== null) {
          socket.close();
        }
        if (tcpConnection !== null) {
          tcpConnection.end();
        }
        if (err) {
          new Logger('Graylog').error({ msg: `Failed to close GELF destination: ${err.message}`, err });
        }
      },
    },
  );
}

function convertToGelf(log: LogDescriptor, opts: GelfOptions) {
  const { facility = 'backend', hostname = process.env.HOSTNAME || 'localhost', environment = 'development' } = opts;

  const message = log.msg || log.message || 'No message';
  const short_message = message.length > 100 ? `${message.substring(0, 100)}...` : message;
  let _body = log.body ?? log.req?.body;
  if (_body && _body.length > 1000) {
    _body = `${_body.substring(0, 1000)}...`;
  }

  const gelfMessage = {
    version: '1.1',
    host: hostname,
    short_message: short_message,
    full_message: message,
    timestamp: Math.floor((log.time || Date.now()) / 1000),
    level: mapPinoLevelToGelf(log.level),
    facility,
    _service: log.service || 'backend',
    _environment: environment,
    _pid: log.pid,
    _hostname: log.hostname,
    _context: log.context,
    _requestId: log.req?.id,
    _userId: log.userId,
    _method: log.req?.method,
    _url: log.req?.url,
    _body,
    _statusCode: log.statusCode || log.res?.statusCode,
    _responseTime: log.responseTime,
    _headers: log.req?.headers,
    _headers_response: log.res?.headers,
    _userAgent: log.req?.headers?.['user-agent'],
    _ip: log.req?.headers?.['x-real-ip'] || log.req?.headers?.['x-forwarded-for'] || log.req?.remoteAddress,
  };

  // Add additional fields from log
  Object.keys(log).forEach((key) => {
    if (!['time', 'level', 'msg', 'message', 'pid', 'hostname', 'req', 'res', 'context'].includes(key)) {
      gelfMessage[`_${key}`] = log[key];
    }
  });

  return gelfMessage;
}

const mapPinoLevelToGelf = (pinoLevel: number): number => levelMapPinoToGelf[pinoLevel] || 6;

function prepareMultipleChunks(buffer: Buffer, maxChunkSize: number) {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += maxChunkSize) {
    chunks.push(buffer.subarray(i, i + maxChunkSize));
  }
  return chunks;
}

function prepareDatagrams(chunks: Buffer[]) {
  const messageId = randomBytes(8).subarray(0, 8);

  const datagrams: Buffer[] = [];
  const gelfBytes: any[] = [0x1e, 0x0f];
  const length = chunks.length;

  for (let i = 0; i < length; i++) {
    const datagram = gelfBytes.concat(messageId, i, length, chunks[i]);
    datagrams[i] = Buffer.from(datagram.join(''));
  }

  return datagrams;
}

function sendChunkedMessage(buffer: Buffer, socket: Socket, host: string, port: number, maxChunkSize: number) {
  const chunks = prepareMultipleChunks(buffer, maxChunkSize);
  const datagrams = prepareDatagrams(chunks);
  for (const datagram of datagrams) {
    socket.send(datagram, port, host, (err: Error | null) => {
      if (err) {
        new Logger('Graylog').error({ msg: `Failed to send GELF chunk: ${err.message}`, err });
      }
    });
  }
}
