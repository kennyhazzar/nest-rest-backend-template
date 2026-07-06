export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  PUBLIC = 'public',
}

export const ROLE_TYPE_DISPLAY_NAMES: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'Administrator',
  [RoleType.MANAGER]: 'Manager',
  [RoleType.USER]: 'User',
  [RoleType.PUBLIC]: 'Public',
};
