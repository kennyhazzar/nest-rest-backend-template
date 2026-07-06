import { join } from 'node:path';

export const AUTH_PACKAGE_NAME = 'auth';
export const AUTH_SERVICE_NAME = 'AuthService';

/** DI token apps/backend registers its `ClientGrpc` under. */
export const AUTH_GRPC_CLIENT = 'AUTH_GRPC_CLIENT';

/**
 * The .proto file ships as source (not compiled) — both apps run with cwd = repo root
 * (Docker WORKDIR /app, `nest start`/`nest build` invoked from the workspace root), so this
 * resolves identically in dev and in the built image without needing an asset-copy step.
 */
export function resolveAuthProtoPath(): string {
  return join(process.cwd(), 'libs/contracts/auth/auth.proto');
}
