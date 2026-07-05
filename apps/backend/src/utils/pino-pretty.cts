import type { LogDescriptor, LoggerOptions } from 'pino';
import pinoPretty from 'pino-pretty';

export default (opts: LoggerOptions) =>
  pinoPretty({
    ...opts,
    messageFormat: (
      log: LogDescriptor,
      messageKey: string,
      // levelLabel: string,
    ) => {
      const messageText = typeof log[messageKey] === 'object' ? JSON.stringify(log[messageKey]) : log[messageKey];
      const message = `[${log.context || 'HTTP'}] ${messageText}`;

      delete log.context;
      return message;
    },
  });
