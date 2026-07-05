import { IBaseEntity } from '@/common/domain/base.entity';
import { IdType } from '@/interfaces/id.type';
import { Gender } from '@/enums/gender.enum';
import { Theme } from '@/enums/theme.enum';
import { NotificationChannel } from '@/modules/notification/domain/enums';
import { IUserRole } from './user-role.interface';

export interface IUser extends IBaseEntity {
  email: string;
  forgotConfirmKey: string | null;
  emailConfirmKey: string | null;
  verified: boolean;
  password?: string;
  name: string;
  surname: string;
  middleName?: string;
  phone?: string;
  role?: IUserRole;
  roleId: string;
  gender: Gender;
  birthday?: Date;
  blocked: boolean;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt?: Date | null;
  lockedUntil?: Date | null;
  country: string;
  language: string;
  locale: string;
  theme: Theme;
  notificationChannels?: NotificationChannel[] | null;
}

/**
 * Flexible input type for User.create() factory.
 * Accepts partial data with sensible defaults applied automatically.
 */
export type UserCreateData = {
  id?: IdType;
  email: string;
  name?: string;
  surname?: string;
  password?: string;
  roleId?: string;
  role?: IUserRole;
  verified?: boolean;
  blocked?: boolean;
  failedLoginAttempts?: number;
  failedLoginWindowStartedAt?: Date | null;
  lockedUntil?: Date | null;
  gender?: Gender | null;
  theme?: Theme | null;
  country?: string;
  language?: string;
  locale?: string;
  forgotConfirmKey?: string | null;
  emailConfirmKey?: string | null;
  middleName?: string | null;
  phone?: string | null;
  birthday?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  notificationChannels?: NotificationChannel[] | null;
};
