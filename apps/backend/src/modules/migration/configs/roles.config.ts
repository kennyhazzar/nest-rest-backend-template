import { RoleType } from '@/enums/role-type.enum';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';

interface RolePermission {
  action: Actions;
  subject: Subjects;
  description: string;
}

interface RoleConfig {
  roleType: RoleType;
  roleName: string;
  roleDescription: string;
  permissions: RolePermission[];
}

export interface RoleSeedConfig {
  name: string;
  description: string;
  type: RoleType;
}

export const rolesConfig: RoleSeedConfig[] = [
  { name: 'Administrator', description: 'System administrator', type: RoleType.ADMIN },
  { name: 'Manager', description: 'Operational manager', type: RoleType.MANAGER },
  { name: 'User', description: 'Authenticated user', type: RoleType.USER },
  { name: 'Public', description: 'Unauthenticated', type: RoleType.PUBLIC },
];

const selfServicePermissions: RolePermission[] = [
  { action: Actions.UPDATE, subject: Subjects.USER, description: 'Update own profile' },
  { action: Actions.READ, subject: Subjects.FILE, description: 'View own files' },
  { action: Actions.CREATE, subject: Subjects.FILE, description: 'Upload own files' },
  { action: Actions.UPDATE, subject: Subjects.FILE, description: 'Update own files' },
  { action: Actions.DELETE, subject: Subjects.FILE, description: 'Delete own files' },
  { action: Actions.READ, subject: Subjects.NOTIFICATION, description: 'View own notifications' },
  { action: Actions.UPDATE, subject: Subjects.NOTIFICATION, description: 'Update own notifications' },
  { action: Actions.DELETE, subject: Subjects.NOTIFICATION, description: 'Delete own notifications' },
];

export const rolePermissionsConfig: RoleConfig[] = [
  {
    roleType: RoleType.ADMIN,
    roleName: 'Administrator',
    roleDescription: 'Full system access',
    permissions: [
      { action: Actions.READ, subject: Subjects.USER_ADMIN, description: 'View users' },
      { action: Actions.CREATE, subject: Subjects.USER_ADMIN, description: 'Create users' },
      { action: Actions.UPDATE, subject: Subjects.USER_ADMIN, description: 'Update users' },
      { action: Actions.DELETE, subject: Subjects.USER_ADMIN, description: 'Delete users' },
      { action: Actions.READ, subject: Subjects.USER_ROLE, description: 'View roles' },
      { action: Actions.CREATE, subject: Subjects.USER_ROLE, description: 'Create roles' },
      { action: Actions.UPDATE, subject: Subjects.USER_ROLE, description: 'Update roles' },
      { action: Actions.DELETE, subject: Subjects.USER_ROLE, description: 'Delete roles' },
      { action: Actions.READ, subject: Subjects.FILE_ADMIN, description: 'View all files' },
      { action: Actions.CREATE, subject: Subjects.FILE_ADMIN, description: 'Upload files' },
      { action: Actions.UPDATE, subject: Subjects.FILE_ADMIN, description: 'Update any file' },
      { action: Actions.DELETE, subject: Subjects.FILE_ADMIN, description: 'Delete any file' },
      { action: Actions.READ, subject: Subjects.ADMIN_DASHBOARD, description: 'View admin dashboard' },
      { action: Actions.READ, subject: Subjects.ADMIN_ACCESS_LOG, description: 'View access logs' },
      { action: Actions.READ, subject: Subjects.ADMIN_SETTINGS, description: 'View system settings' },
      { action: Actions.UPDATE, subject: Subjects.ADMIN_SETTINGS, description: 'Update system settings' },
      { action: Actions.READ, subject: Subjects.CAPTCHA_ADMIN, description: 'View captcha administration' },
      { action: Actions.CREATE, subject: Subjects.CAPTCHA_ADMIN, description: 'Create captcha resources' },
      { action: Actions.UPDATE, subject: Subjects.CAPTCHA_ADMIN, description: 'Activate captcha configs' },
      { action: Actions.DELETE, subject: Subjects.CAPTCHA_ADMIN, description: 'Archive captcha resources' },
      ...selfServicePermissions,
    ],
  },
  {
    roleType: RoleType.MANAGER,
    roleName: 'Manager',
    roleDescription: 'Operational manager access',
    permissions: [
      { action: Actions.READ, subject: Subjects.USER_ADMIN, description: 'View users' },
      { action: Actions.READ, subject: Subjects.USER_ROLE, description: 'View roles' },
      { action: Actions.READ, subject: Subjects.FILE_ADMIN, description: 'View all files' },
      { action: Actions.UPDATE, subject: Subjects.FILE_ADMIN, description: 'Update files' },
      ...selfServicePermissions,
    ],
  },
  {
    roleType: RoleType.USER,
    roleName: 'User',
    roleDescription: 'Regular authenticated user',
    permissions: selfServicePermissions,
  },
  {
    roleType: RoleType.PUBLIC,
    roleName: 'Public',
    roleDescription: 'Unauthenticated access',
    permissions: [],
  },
];
