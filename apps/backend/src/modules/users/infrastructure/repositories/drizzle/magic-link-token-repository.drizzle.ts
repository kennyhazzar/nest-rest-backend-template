import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, lt } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { magicLinkToken as magicLinkTokenTable } from '@/common/drizzle/schema';
import { MagicLinkTokenRepository } from '../../../domain/repositories/magic-link-token.repository';
import { MagicLinkToken } from '../../../domain/entities/magic-link-token.entity';

type MagicLinkTokenRow = typeof magicLinkTokenTable.$inferSelect;

function rowToDomain(row: MagicLinkTokenRow): MagicLinkToken {
  return new MagicLinkToken(
    row.id,
    row.email,
    row.token,
    row.expiresAt,
    row.isUsed ?? false,
    row.fingerprint,
    row.userAgent,
    row.createdAt,
  );
}

@Injectable()
export class MagicLinkTokenRepositoryDrizzle extends MagicLinkTokenRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  async create(data: Omit<MagicLinkToken, 'id' | 'createdAt'>): Promise<MagicLinkToken> {
    const [inserted] = await this.db
      .insert(magicLinkTokenTable)
      .values({
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
        isUsed: data.isUsed,
        fingerprint: data.fingerprint,
        userAgent: data.userAgent,
      })
      .returning();

    return rowToDomain(inserted);
  }

  async findByToken(token: string): Promise<MagicLinkToken | null> {
    const rows = await this.db.select().from(magicLinkTokenTable).where(eq(magicLinkTokenTable.token, token)).limit(1);

    return rows[0] ? rowToDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<MagicLinkToken[]> {
    const rows = await this.db
      .select()
      .from(magicLinkTokenTable)
      .where(eq(magicLinkTokenTable.email, email))
      .orderBy(magicLinkTokenTable.createdAt);

    return rows.map(rowToDomain);
  }

  async markAsUsed(id: string): Promise<void> {
    await this.db.update(magicLinkTokenTable).set({ isUsed: true }).where(eq(magicLinkTokenTable.id, id));
  }

  async deleteExpired(): Promise<number> {
    const rows = await this.db
      .delete(magicLinkTokenTable)
      .where(lt(magicLinkTokenTable.expiresAt, new Date()))
      .returning({ id: magicLinkTokenTable.id });

    return rows.length;
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.db.delete(magicLinkTokenTable).where(eq(magicLinkTokenTable.email, email));
  }
}
