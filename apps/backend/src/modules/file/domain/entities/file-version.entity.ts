import { IdType } from '@/interfaces/id.type';

export class FileVersion {
  id!: IdType;
  mimetype!: string;
  size!: number;
  versionId?: string | null;
  fileId!: IdType;
  userId!: IdType;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  constructor(data: FileVersion) {
    Object.assign(this, data);
  }
}

export class FileVersions {
  constructor(
    public readonly nodes: FileVersion[],
    public readonly totalCount: number,
  ) {}
}
