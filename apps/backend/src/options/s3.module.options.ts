import { ConfigService } from '@nestjs/config';
import { S3ModuleOptions } from 'nestjs-s3';

export const S3ModuleFuncOptions = (configService: ConfigService): S3ModuleOptions => {
  const endpoint = configService.getOrThrow<string>('s3.endpoint');
  if (!(endpoint.includes('http://') || endpoint.includes('https://'))) {
    throw new Error('s3.endpointInvalid');
  }

  return {
    config: {
      credentials: {
        accessKeyId: configService.getOrThrow<string>('s3.accessKey'),
        secretAccessKey: configService.getOrThrow<string>('s3.secretKey'),
      },
      region: configService.getOrThrow<string>('s3.region'),
      endpoint,
      forcePathStyle: configService.getOrThrow<boolean>('s3.forcePathStyle'),
    },
  };
};
