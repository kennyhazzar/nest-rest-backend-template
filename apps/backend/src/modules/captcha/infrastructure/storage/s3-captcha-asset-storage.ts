import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { FileAdapter } from '@/modules/file/infrastructure/adapters/s3.adapter';
import { CaptchaAssetStoragePort, PutCaptchaObjectInput } from '../../application/ports/captcha.ports';

@Injectable()
export class S3CaptchaAssetStorage extends CaptchaAssetStoragePort {
  constructor(private readonly fileAdapter: FileAdapter) {
    super();
  }

  async putObject(input: PutCaptchaObjectInput): Promise<{ storageKey: string }> {
    await this.fileAdapter.uploadBuffer(input.body, input.key, input.contentType);
    return { storageKey: input.key };
  }

  async getObjectStream(storageKey: string): Promise<{ stream: Readable; contentType?: string }> {
    const object = await this.fileAdapter.download(storageKey);
    return {
      stream: object.Body as Readable,
      contentType: object.ContentType,
    };
  }
}
