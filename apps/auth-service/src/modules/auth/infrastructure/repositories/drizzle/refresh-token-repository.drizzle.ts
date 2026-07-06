import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';

import { IdType } from '@libs/common/id.type';
import { refresh as refreshTable } from '@libs/database/users.schema';
import * as schema from '@libs/database/users.schema';
import { DRIZZLE_CONNECTION } from '../../../../../drizzle.provider';
import { RefreshTokenRecord } from '../../../domain/entities/refresh-token.entity';
import {
  RefreshTokenCreatePayload,
  RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';

type RefreshRow = typeof refreshTable.$inferSelect;

@Injectable()
export class RefreshTokenRepositoryDrizzle extends RefreshTokenRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  private toDomain(row: RefreshRow): RefreshTokenRecord {
    const record = new RefreshTokenRecord();
    record.id = row.id;
    record.userId = row.userId;
    record.refreshToken = row.refreshToken;
    record.expiresAt = row.expiresAt;
    record.isRevoked = row.isRevoked;
    return record;
  }

  async create(payload: RefreshTokenCreatePayload): Promise<void> {
    await this.db.insert(refreshTable).values({
      userId: payload.userId,
      refreshToken: payload.refreshToken,
      expiresAt: payload.expiresAt,
      isRevoked: false,
      fingerprint: payload.fingerprint,
      userAgent: payload.userAgent,
    });
  }

  async findByToken(token: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db.select().from(refreshTable).where(eq(refreshTable.refreshToken, token)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async revokeById(id: IdType): Promise<void> {
    await this.db.update(refreshTable).set({ isRevoked: true }).where(eq(refreshTable.id, id));
  }

  async revokeByToken(token: string): Promise<boolean> {
    const rows = await this.db
      .update(refreshTable)
      .set({ isRevoked: true })
      .where(and(eq(refreshTable.refreshToken, token), eq(refreshTable.isRevoked, false)))
      .returning({ id: refreshTable.id });
    return rows.length > 0;
  }

  async revokeAllForUser(userId: IdType): Promise<void> {
    await this.db.update(refreshTable).set({ isRevoked: true }).where(eq(refreshTable.userId, userId));
  }
}
