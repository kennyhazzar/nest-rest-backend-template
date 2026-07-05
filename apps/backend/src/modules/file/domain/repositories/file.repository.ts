import { FastifyReply } from 'fastify';

import type { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { FileFrom } from '@/enums/file-from.enum';
import { File, FileVersion } from '../entities';
import { UpdateFileBody, UploadFileBody } from '../../presentation/dtos/file.dto';

export interface Files {
  nodes: File[];
  totalCount: number;
}

export interface FileFindOptions {
  limit?: number;
  offset?: number;
}

export interface UpdateAffected {
  affected: number;
}

export abstract class FileRepository {
  abstract count(): Promise<number>;
  abstract find(options?: FileFindOptions): Promise<Files>;
  abstract findById(id: IdType): Promise<File | null>;
  abstract findVersion(fileId: IdType): Promise<FileVersion[]>;
  abstract findVersionById(fileVersionId: IdType): Promise<FileVersion | null>;
  abstract download(params: {
    reply: FastifyReply;
    fileId: IdType;
    versionId?: IdType;
    currentUserId?: IdType;
    currentRoleType?: RoleType;
  }): Promise<void>;
  abstract findBy(payload: { id: IdType; module?: FileFrom }): Promise<File | null>;
  abstract uploads(currentUserId: IdType, files: UploadFileBody[]): Promise<Files>;
  abstract update(fileId: IdType, update: UpdateFileBody): Promise<File>;
  abstract updateVersion(fileId: IdType, lastVersionId: IdType): Promise<UpdateAffected>;
  abstract delete(id: IdType): Promise<UpdateAffected>;
}
