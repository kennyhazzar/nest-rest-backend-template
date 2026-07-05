import { IdType } from '@/interfaces/id.type';
import { FileFrom } from '@/enums/file-from.enum';
import { FileType } from '@/enums/file-type.enum';
import { FileVersion } from './file-version.entity';

export class File {
  id!: IdType;
  name!: string;
  path!: string;
  module!: FileFrom;
  externalId!: IdType;
  description?: string;
  type!: FileType;
  lastVersion?: FileVersion;
  lastVersionId?: IdType;
  versions?: FileVersion[];
  userId!: IdType;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  constructor(data: File) {
    Object.assign(this, data);
  }
}
