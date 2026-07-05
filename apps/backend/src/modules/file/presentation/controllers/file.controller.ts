import { Readable } from 'node:stream';
import { BadRequestException, Controller, Get, Param, Post, Req, Response, UseGuards } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { isUUID } from 'class-validator';
import { CommandBus } from '@nestjs/cqrs';

import type { IdType } from '@/interfaces/id.type';
import { FileFrom, FileType } from '@/enums';
import type { RoleType } from '@/enums/role-type.enum';
import { CurrentRoleId } from '@/decorators/current-role-id.decorator';
import { CurrentRoleType } from '@/decorators/current-role-type.decorator';
import { CurrentUserId } from '@/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { FileDownloadCommand, FilesUploadCommand } from '../../application/commands';
import { FilesDto, UploadFileBody } from '../dtos/file.dto';

type MultipartField = {
  type: 'field';
  fieldname: string;
  value?: string;
};

type MultipartFile = {
  type: 'file';
  fieldname: string;
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
};

@Controller('file')
@ApiTags('files')
export class FileController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload. Repeat the field to upload many files.',
        },
        name: { type: 'string', description: 'Optional display name. Defaults to original filename.' },
        description: { type: 'string', description: 'Optional file description.' },
        type: { type: 'string', enum: Object.values(FileType), default: FileType.USER_FILE },
      },
      required: ['file'],
    },
  })
  async uploadCurrentUserFiles(
    @Req() request: FastifyRequest,
    @CurrentUserId() currentUserId: IdType,
    @CurrentRoleId() currentRoleId: IdType,
    @CurrentRoleType() currentRoleType: RoleType,
  ): Promise<FilesDto> {
    const payload = await this.parseCurrentUserUploads(request, currentUserId);
    return this.commandBus.execute(new FilesUploadCommand({ payload, currentUserId, currentRoleId, currentRoleType }));
  }

  /**
   * Endpoint to download a public file by its ID.
   * @param fileId - The ID of the file to download.
   */
  @Get('public/:fileId')
  async downloadPublic(@Param('fileId') fileId: IdType, @Response() reply: FastifyReply): Promise<void> {
    if (!isUUID(fileId)) {
      throw new BadRequestException({ message: 'file.invalidId', args: { fileId } });
    }
    await this.commandBus.execute(new FileDownloadCommand({ reply, fileId }));
  }

  /**
   * Endpoint to download a public file by its ID and version ID.
   * @param fileId - The ID of the file to download.
   * @param versionId - The ID of the version to download.
   */
  @Get('public/:fileId/:versionId')
  async downloadPublicVersion(
    @Param('fileId') fileId: IdType,
    @Param('versionId') versionId: IdType,
    @Response() reply: FastifyReply,
  ): Promise<void> {
    if (!isUUID(fileId)) {
      throw new BadRequestException({ message: 'file.invalidId', args: { fileId } });
    }
    await this.commandBus.execute(new FileDownloadCommand({ reply, fileId, versionId }));
  }

  /**
   * Endpoint to download a file by its ID.
   * @param fileId - The ID of the file to download.
   */
  @Get(':fileId')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('fileId') fileId: IdType,
    @CurrentUserId() currentUserId: IdType,
    @CurrentRoleType() currentRoleType: RoleType,
    @Response() reply: FastifyReply,
  ): Promise<void> {
    if (!isUUID(fileId)) {
      throw new BadRequestException({ message: 'file.invalidId', args: { fileId } });
    }
    await this.commandBus.execute(new FileDownloadCommand({ reply, fileId, currentUserId, currentRoleType }));
  }

  /**
   * Endpoint to download a file by its ID and version.
   * @param fileId - The ID of the file to download.
   * @param versionId - The ID of the version to download.
   */
  @Get(':fileId/:versionId')
  @UseGuards(JwtAuthGuard)
  async downloadVersion(
    @Param('fileId') fileId: IdType,
    @Param('versionId') versionId: IdType,
    @CurrentUserId() currentUserId: IdType,
    @CurrentRoleType() currentRoleType: RoleType,
    @Response() reply: FastifyReply,
  ): Promise<void> {
    if (!isUUID(fileId)) {
      throw new BadRequestException({ message: 'file.invalidId', args: { fileId } });
    }
    await this.commandBus.execute(
      new FileDownloadCommand({ reply, fileId, versionId, currentUserId, currentRoleType }),
    );
  }

  private async parseCurrentUserUploads(request: FastifyRequest, currentUserId: IdType): Promise<UploadFileBody[]> {
    const multipartRequest = request as FastifyRequest & {
      parts?: () => AsyncIterableIterator<MultipartField | MultipartFile>;
    };

    if (typeof multipartRequest.parts !== 'function') {
      throw new BadRequestException('file.multipartRequired');
    }

    const fields: Record<string, string> = {};
    const uploads: UploadFileBody[] = [];

    for await (const part of multipartRequest.parts()) {
      if (part.type === 'field') {
        fields[part.fieldname] = typeof part.value === 'string' ? part.value : '';
        continue;
      }

      if (part.type !== 'file' || part.fieldname !== 'file') {
        continue;
      }

      const buffer = await part.toBuffer();
      const name = fields.name?.trim() || part.filename || 'file';

      uploads.push({
        name,
        description: fields.description?.trim() || undefined,
        module: FileFrom.USER,
        externalId: currentUserId,
        type: this.parseFileType(fields.type),
        file: {
          filename: part.filename || name,
          mimetype: part.mimetype || 'application/octet-stream',
          createReadStream: () => Readable.from(buffer),
        },
      });
    }

    if (!uploads.length) {
      throw new BadRequestException('file.fileRequired');
    }

    return uploads;
  }

  private parseFileType(value?: string): FileType {
    if (!value) {
      return FileType.USER_FILE;
    }

    return Object.values(FileType).includes(value as FileType) ? (value as FileType) : FileType.USER_FILE;
  }
}
