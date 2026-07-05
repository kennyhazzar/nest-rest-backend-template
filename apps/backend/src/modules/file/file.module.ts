import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { S3Module } from 'nestjs-s3';

import { S3ModuleFuncOptions } from '@/options/s3.module.options';

import {
  FileGetByIdHandler,
  FilesGetHandler,
  FilesUploadHandler,
  FileDownloadHandler,
  FileUpdateHandler,
  FileDeleteHandler,
} from './application';
import { FileRepository } from './domain/repositories';
import { FileAdapter } from './infrastructure/adapters/s3.adapter';
import { FileRepositoryDrizzle } from './infrastructure/repositories/file.repository.drizzle';
import { FileController } from './presentation/controllers/file.controller';
import { UsersModule } from '../users/users.module';

const CommandHandlers = [FilesUploadHandler, FileDownloadHandler, FileUpdateHandler, FileDeleteHandler];
const QueryHandlers = [FilesGetHandler, FileGetByIdHandler];

@Global()
@Module({
  imports: [
    S3Module.forRootAsync({ useFactory: S3ModuleFuncOptions, inject: [ConfigService] }),
    CqrsModule,
    UsersModule,
  ],
  controllers: [FileController],
  providers: [
    FileAdapter,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: FileRepository,
      useClass: FileRepositoryDrizzle,
    },
  ],
  exports: [FileRepository, FileAdapter],
})
export class FileModule {}
