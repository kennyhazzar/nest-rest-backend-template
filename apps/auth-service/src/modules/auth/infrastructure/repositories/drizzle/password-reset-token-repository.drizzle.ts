import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { IdType } from '@libs/common/id.type';
import { passwordResetToken as table } from '@libs/database/users.schema';
import * as schema from '@libs/database/users.schema';
import { DRIZZLE_CONNECTION } from '../../../../../drizzle.provider';
import { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity';
import { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository';

type Row = typeof table.$inferSelect;

@Injectable()
export class PasswordResetTokenRepositoryDrizzle extends PasswordResetTokenRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  async create(token: Omit<PasswordResetToken, 'id' | 'createdAt'>): Promise<PasswordResetToken> {
    const [row] = await this.db.insert(table).values(token).returning();
    return this.toDomain(row);
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const [row] = await this.db.select().from(table).where(eq(table.token, token)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async markUsed(id: IdType): Promise<void> {
    await this.db.update(table).set({ isUsed: true }).where(eq(table.id, id));
  }

  private toDomain(row: Row): PasswordResetToken {
    const entity = new PasswordResetToken();
    entity.id = row.id;
    entity.userId = row.userId;
    entity.token = row.token;
    entity.expiresAt = row.expiresAt;
    entity.isUsed = row.isUsed;
    entity.createdAt = row.createdAt;
    return entity;
  }
}
