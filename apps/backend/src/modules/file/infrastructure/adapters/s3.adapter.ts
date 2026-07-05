import { Readable } from 'node:stream';
import slugify from 'slugify';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Upload as MultipartUpload } from '@aws-sdk/lib-storage';

export interface UploadedFile {
  createReadStream: () => Readable;
  mimetype: string;
  filename: string;
}

import { IdType } from '@/interfaces/id.type';
import { FileType, FileFrom } from '@/enums';
import { UploadFileBody, IFileExtra } from '../../presentation';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

slugify.extend({ '☢': 'radioactive' });
slugify.extend({ '!': '_exclmrk' });
slugify.extend({ й: 'y' });
slugify.extend({ Й: 'Y' });
slugify.extend({ ц: 'ts' });
slugify.extend({ Ц: 'TS' });
slugify.extend({ Ц: 'TS' });
slugify.extend({ ч: 'ch' });
slugify.extend({ Ч: 'CH' });
slugify.extend({ х: 'kh' });
slugify.extend({ Х: 'KH' });
slugify.extend({ ш: 'sh' });
slugify.extend({ Ш: 'SH' });
slugify.extend({ щ: 'shch' });
slugify.extend({ Щ: 'SHCH' });

@Injectable()
export class FileAdapter {
  private readonly logger = new Logger(FileAdapter.name);
  private readonly bucket: string;
  private readonly environment: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectS3() public readonly s3: S3,
  ) {
    this.bucket = this.configService.getOrThrow<string>('s3.bucket');
    this.environment = this.configService.getOrThrow<string>('host.environment');
  }

  /**
   * Формирует путь к файлу для S3
   *
   * ВАЖНО: Этот метод транслитерирует имя файла для безопасного хранения в S3.
   * Оригинальное имя файла (включая кириллицу) сохраняется в БД для отображения пользователю.
   *
   * @param upload Параметры загрузки файла
   * @param userId ID пользователя
   * @returns Путь к файлу в формате 'environment/module/externalId/userId/slugifiedFileName'
   */
  getFilePath(userId: IdType, upload: IFileExtra): string {
    if (!upload || !upload.name || upload.name?.match(/\/|\.\./g) || !userId || !upload.module || !upload.externalId) {
      throw new BadRequestException('file.invalidUploadParameters');
    }
    const modulePath = upload.module.toLowerCase();
    const externalId = upload.externalId;
    // Транслитерируем имя файла для безопасности S3 (кириллица -> латиница)
    const file = slugify(upload.name ?? 'no-name-file', { replacement: '_', strict: false, locale: 'ru' });
    // Формируем путь к файлу
    return `${this.environment}/${modulePath}/${externalId}/${userId}/${file}`;
  }

  /**
   * Загрузка файла на S3
   *
   * @param userId ID пользователя
   * @param file Файл для загрузки
   * @param Key Ключ для файла в S3
   * @description Загружает файл на S3 с использованием Multipart Upload.
   * @returns {Promise<CompleteMultipartUploadCommandOutput>} Результат загрузки файла
   * @throws {Error} Если не удалось загрузить файл
   */
  async upload(
    userId: IdType,
    file: UploadedFile,
    Key: string,
    options: Partial<UploadFileBody> = {},
  ): Promise<CompleteMultipartUploadCommandOutput> {
    try {
      const upload = new MultipartUpload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Body: file.createReadStream(),
          Key,
          ContentType: file.mimetype,
          Metadata: {
            userId,
            type: options.type ?? FileType.OTHER,
            module: options.module ?? FileFrom.PUBLIC,
            externalId: options.externalId ?? NIL_UUID,
          },
        },
        queueSize: 4, // Number of parts to upload in parallel
        partSize: 5 * 1024 * 1024, // Minimum part size
      });
      return await upload.done();
    } catch (error: any) {
      this.logger.error(`Failed to upload file to S3: ${error}`);
      throw error;
    }
  }

  /**
   * Загрузка буфера на S3
   *
   * @param buffer Buffer для загрузки
   * @param Key Ключ для файла в S3
   * @param contentType MIME тип файла
   * @returns {Promise<CompleteMultipartUploadCommandOutput>} Результат загрузки файла
   * @throws {Error} Если не удалось загрузить файл
   */
  async uploadBuffer(buffer: Buffer, Key: string, contentType: string): Promise<CompleteMultipartUploadCommandOutput> {
    try {
      const upload = new MultipartUpload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Body: buffer,
          Key,
          ContentType: contentType,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
      });
      return await upload.done();
    } catch (error) {
      this.logger.error(`Failed to upload buffer to S3: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Загрузка стрима на S3
   *
   * @param stream Readable stream для загрузки
   * @param Key Ключ для файла в S3
   * @param contentType MIME тип файла
   * @param metadata Дополнительные метаданные (опционально)
   * @returns {Promise<CompleteMultipartUploadCommandOutput>} Результат загрузки файла
   * @throws {Error} Если не удалось загрузить файл
   */
  async uploadStream(
    stream: Readable,
    Key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<CompleteMultipartUploadCommandOutput> {
    try {
      const upload = new MultipartUpload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Body: stream,
          Key,
          ContentType: contentType,
          Metadata: metadata,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
      });
      return await upload.done();
    } catch (error) {
      this.logger.error(`Failed to upload stream to S3: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Получение метаданных файла из S3
   *
   * @param path Путь для файла
   * @param VersionId Версия файла в S3
   * @returns {Promise<HeadObjectCommandOutput>} Метаданные файла
   * @throws {Error} Если не удалось получить метаданные файла
   */
  async head(path: string, VersionId?: string): Promise<HeadObjectCommandOutput> {
    return this.s3.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
        VersionId,
      }),
    );
  }

  /**
   * Выгрузка файла с S3
   *
   * @param path Путь для файла
   * @param VersionId Версия файла в S3
   */
  async download(path: string, VersionId?: string) {
    return this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
        VersionId,
      }),
    );
  }

  /**
   * Удаление файла с S3
   *
   * @param path Путь для файла
   * @param VersionId Версия файла в S3
   */
  async delete(path: string, VersionId?: string) {
    return this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
        VersionId,
      }),
    );
  }

  /**
   * Стрим в буффер
   *
   * @param stream Readable - объект
   * @returns Promise<Buffer>
   */
  static async streamToBuffer(stream: Readable): Promise<Buffer> {
    const buffer: Uint8Array[] = [];

    return new Promise((resolve, reject) =>
      stream
        .on('error', (error) => reject(error))
        .on('data', (data: Uint8Array) => buffer.push(data))
        .on('end', () => resolve(Buffer.concat(buffer))),
    );
  }
}
