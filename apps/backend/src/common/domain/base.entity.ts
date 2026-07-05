import { IdType } from '@/interfaces/id.type';

/**
 * ORM-agnostic base interface for all domain entities.
 * No decorators, no ORM imports — pure TypeScript.
 */
export interface IBaseEntity {
  id: IdType;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
