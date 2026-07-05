import { FastifyReply } from 'fastify';
import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import { file as fileTable, fileVersion as versionTable } from '@/common/drizzle/schema';
import * as schema from '@/common/drizzle/schema';
import type { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { FileFrom } from '@/enums/file-from.enum';
import { FileType } from '@/enums/file-type.enum';
import { File, FileVersion } from '../../domain/entities';
import { FileRepository, Files, FileFindOptions, UpdateAffected } from '../../domain/repositories';
import { UpdateFileBody, UploadFileBody } from '../../presentation';
import { FileAdapter } from '../adapters/s3.adapter';

type FileRow = typeof fileTable.$inferSelect;
type VersionRow = typeof versionTable.$inferSelect;

@Injectable()
export class FileRepositoryDrizzle extends FileRepository {
  private readonly logger = new Logger(FileRepositoryDrizzle.name);

  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly fileAdapter: FileAdapter,
  ) {
    super();
  }

  async count(): Promise<number> {
    const [{ value }] = await this.db.select({ value: count() }).from(fileTable).where(isNull(fileTable.deletedAt));
    return value;
  }

  async find(options?: FileFindOptions): Promise<Files> {
    const rows = await this.db
      .select({ file: fileTable, lastVersion: versionTable })
      .from(fileTable)
      .leftJoin(versionTable, eq(fileTable.lastVersionId, versionTable.id))
      .where(isNull(fileTable.deletedAt))
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0);
    return {
      nodes: rows.map((row) => this.toDomain(row.file, row.lastVersion)),
      totalCount: await this.count(),
    };
  }

  async findById(id: IdType): Promise<File | null> {
    const [row] = await this.db
      .select({ file: fileTable, lastVersion: versionTable })
      .from(fileTable)
      .leftJoin(versionTable, eq(fileTable.lastVersionId, versionTable.id))
      .where(and(eq(fileTable.id, id), isNull(fileTable.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row.file, row.lastVersion) : null;
  }

  async findBy(payload: { id: IdType; module?: FileFrom }): Promise<File | null> {
    const conditions = [eq(fileTable.id, payload.id), isNull(fileTable.deletedAt)];
    if (payload.module) conditions.push(eq(fileTable.module, payload.module));
    const [row] = await this.db
      .select({ file: fileTable, lastVersion: versionTable })
      .from(fileTable)
      .leftJoin(versionTable, eq(fileTable.lastVersionId, versionTable.id))
      .where(and(...conditions))
      .limit(1);
    return row ? this.toDomain(row.file, row.lastVersion) : null;
  }

  async findVersion(fileId: IdType): Promise<FileVersion[]> {
    const rows = await this.db
      .select()
      .from(versionTable)
      .where(and(eq(versionTable.fileId, fileId), isNull(versionTable.deletedAt)))
      .orderBy(desc(versionTable.createdAt));
    return rows.map((row) => this.toVersion(row));
  }

  async findVersionById(id: IdType): Promise<FileVersion | null> {
    const [row] = await this.db
      .select()
      .from(versionTable)
      .where(and(eq(versionTable.id, id), isNull(versionTable.deletedAt)))
      .limit(1);
    return row ? this.toVersion(row) : null;
  }

  async download({
    reply,
    fileId,
    versionId,
    currentUserId,
    currentRoleType,
  }: {
    reply: FastifyReply;
    fileId: IdType;
    versionId?: IdType;
    currentUserId?: IdType;
    currentRoleType?: RoleType;
  }): Promise<void> {
    const file = await this.findBy({
      id: fileId,
      module: !currentUserId || !currentRoleType ? FileFrom.PUBLIC : undefined,
    });
    if (!file) throw new BadRequestException({ message: 'file.notFoundWithId', args: { fileId } });
    if (
      currentUserId &&
      currentRoleType &&
      file.userId !== currentUserId &&
      currentRoleType !== RoleType.MANAGER &&
      currentRoleType !== RoleType.ADMIN
    ) {
      throw new ForbiddenException('file.accessDenied');
    }
    const version = versionId ? await this.findVersionById(versionId) : file.lastVersion;
    if (versionId && version?.fileId !== file.id) {
      throw new BadRequestException({ message: 'file.versionNotFoundWithId', args: { fileId, versionId } });
    }
    const fullPath = this.fileAdapter.getFilePath(file.userId, file);
    const object = await this.downloadObject(fullPath, version?.versionId ?? undefined);
    const mimetype = object.ContentType || version?.mimetype || 'application/octet-stream';
    reply.header('Content-Type', mimetype);
    reply.header(
      'Content-Disposition',
      `${/^(image|video|audio)\//.test(mimetype) ? 'inline' : 'attachment'}; filename="${this.safeFilename(file)}"`,
    );
    if (object.ContentLength || version?.size) reply.header('Content-Length', object.ContentLength || version!.size);
    if (object.LastModified) reply.header('Last-Modified', object.LastModified.toUTCString());
    if (object.ETag) reply.header('ETag', object.ETag);
    reply.header('Cache-Control', file.module === FileFrom.PUBLIC ? 'public, max-age=604800' : 'private, no-store');
    await reply.send(object.Body as NodeJS.ReadableStream);
  }

  async uploads(userId: IdType, uploads: UploadFileBody[]): Promise<Files> {
    const nodes: File[] = [];
    for (const upload of uploads) {
      const fullPath = this.fileAdapter.getFilePath(userId, upload);
      const pathParts = fullPath.split('/');
      pathParts.pop();
      const file = await this.db.transaction(async (tx) => {
        const [saved] = await tx
          .insert(fileTable)
          .values({
            name: upload.name,
            path: pathParts.join('/'),
            description: upload.description,
            module: upload.module,
            externalId: upload.externalId,
            type: upload.type,
            userId,
          })
          .onConflictDoUpdate({
            target: [fileTable.name, fileTable.module, fileTable.externalId],
            set: { description: upload.description, type: upload.type, updatedAt: new Date() },
          })
          .returning();
        const uploaded = await this.uploadVersion(userId, saved.id, fullPath, upload);
        const [version] = await tx
          .insert(versionTable)
          .values(uploaded)
          .onConflictDoUpdate({
            target: [versionTable.versionId, versionTable.fileId],
            set: { mimetype: uploaded.mimetype, size: uploaded.size, updatedAt: new Date() },
          })
          .returning();
        const [updated] = await tx
          .update(fileTable)
          .set({ lastVersionId: version.id, updatedAt: new Date() })
          .where(eq(fileTable.id, saved.id))
          .returning();
        return this.toDomain(updated, version);
      });
      nodes.push(file);
    }
    return { nodes, totalCount: nodes.length };
  }

  async update(id: IdType, update: UpdateFileBody): Promise<File> {
    const existing = await this.findById(id);
    if (!existing) throw new BadRequestException({ message: 'file.notFoundWithId', args: { fileId: id } });
    if (update.name !== undefined || update.description !== undefined) {
      await this.db
        .update(fileTable)
        .set({
          ...(update.name !== undefined && { name: update.name }),
          ...(update.description !== undefined && { description: update.description }),
          updatedAt: new Date(),
        })
        .where(eq(fileTable.id, id));
    }
    if (update.file) {
      const fullPath = this.fileAdapter.getFilePath(existing.userId, {
        ...existing,
        name: update.name ?? existing.name,
      });
      const uploaded = await this.uploadVersion(existing.userId, id, fullPath, {
        name: update.name ?? existing.name,
        description: update.description ?? existing.description,
        module: existing.module,
        externalId: existing.externalId,
        type: existing.type,
        file: update.file,
      });
      const [version] = await this.db.insert(versionTable).values(uploaded).returning();
      await this.updateVersion(id, version.id);
    }
    const result = await this.findById(id);
    if (!result) throw new BadRequestException({ message: 'file.notFoundAfterUpdate', args: { fileId: id } });
    return result;
  }

  async updateVersion(fileId: IdType, lastVersionId: IdType): Promise<UpdateAffected> {
    const rows = await this.db
      .update(fileTable)
      .set({ lastVersionId, updatedAt: new Date() })
      .where(eq(fileTable.id, fileId))
      .returning({ id: fileTable.id });
    return { affected: rows.length };
  }

  async delete(id: IdType): Promise<UpdateAffected> {
    const rows = await this.db
      .update(fileTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(fileTable.id, id), isNull(fileTable.deletedAt)))
      .returning({ id: fileTable.id });
    return { affected: rows.length };
  }

  private async uploadVersion(userId: IdType, fileId: IdType, fullPath: string, upload: UploadFileBody) {
    const source = await upload.file;
    const result = await this.fileAdapter.upload(userId, source, fullPath, upload);
    if (!result.Key) throw new BadRequestException('file.s3UploadFailed');
    const head = await this.fileAdapter.head(result.Key, result.VersionId);
    return {
      mimetype: source.mimetype,
      size: head.ContentLength ?? 0,
      versionId: result.VersionId ?? null,
      fileId,
      userId,
    };
  }

  private downloadObject(path: string, versionId?: string): Promise<GetObjectCommandOutput> {
    return this.fileAdapter.download(path, versionId).then((value) => {
      if (!value.Body) throw new BadRequestException({ message: 'file.s3DownloadFailed', args: { path } });
      return value;
    });
  }

  private safeFilename(file: File): string {
    return this.fileAdapter.getFilePath(file.userId, file).split('/').at(-1) ?? file.name;
  }

  private toDomain(row: FileRow, version?: VersionRow | null): File {
    return new File({
      ...row,
      module: row.module as FileFrom,
      type: (row.type ?? FileType.OTHER) as FileType,
      description: row.description ?? undefined,
      lastVersionId: row.lastVersionId ?? undefined,
      lastVersion: version ? this.toVersion(version) : undefined,
    });
  }

  private toVersion(row: VersionRow): FileVersion {
    return new FileVersion({ ...row, fileId: row.fileId!, userId: row.userId! });
  }
}
