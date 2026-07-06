import { FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { AuthMode } from '@libs/auth/auth-mode.enum';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

/**
 * Pure functions (no DB, no JWT signing) — extracted from the former AuthServiceAdapter.
 * gRPC can't carry a live Fastify `reply`, so cookie-writing stays on the HTTP side
 * (apps/backend), called directly by the CQRS handlers after they get a result back from
 * AuthGatewayPort. Not wrapped in a service/DI token since there's nothing to mock here
 * beyond `reply`/`configService`, which callers already have.
 */
export function setAuthCookies(reply: FastifyReply, tokens: AuthTokens, configService: ConfigService): void {
  const mode = configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);

  if (mode === AuthMode.RESPONSE_ONLY) {
    return;
  }

  const accessCookieConfig = {
    httpOnly: configService.get<boolean>('auth.cookies.accessToken.httpOnly', true),
    secure: configService.get<boolean>('auth.cookies.accessToken.secure', true),
    sameSite: configService.get<'strict' | 'lax' | 'none'>('auth.cookies.accessToken.sameSite', 'lax'),
    maxAge: configService.get<number>('auth.cookies.accessToken.maxAge', 900000),
  };
  reply.setCookie(
    configService.get<string>('auth.cookies.accessToken.name', 'accessToken'),
    tokens.accessToken,
    accessCookieConfig,
  );

  const refreshCookieConfig = {
    httpOnly: configService.get<boolean>('auth.cookies.refreshToken.httpOnly', true),
    secure: configService.get<boolean>('auth.cookies.refreshToken.secure', true),
    sameSite: configService.get<'strict' | 'lax' | 'none'>('auth.cookies.refreshToken.sameSite', 'lax'),
    maxAge: configService.get<number>('auth.cookies.refreshToken.maxAge', 604800000),
  };
  reply.setCookie(
    configService.get<string>('auth.cookies.refreshToken.name', 'refreshToken'),
    tokens.refreshToken,
    refreshCookieConfig,
  );

  const csrfEnabled = configService.get<boolean>('auth.csrf.enabled', false);
  if (csrfEnabled) {
    const csrfCookieConfig = {
      httpOnly: false, // JS must read this for sending in header
      secure: configService.get<boolean>('auth.cookies.csrf.secure', true),
      sameSite: configService.get<'strict' | 'lax' | 'none'>('auth.cookies.csrf.sameSite', 'lax'),
      maxAge: configService.get<number>('auth.cookies.csrf.maxAge', 604800000),
    };
    reply.setCookie(
      configService.get<string>('auth.cookies.csrf.name', 'csrf-token'),
      tokens.csrfToken,
      csrfCookieConfig,
    );
  }
}

export function clearAuthCookies(reply: FastifyReply, configService: ConfigService): void {
  const cookieNames = [
    configService.get<string>('auth.cookies.accessToken.name', 'accessToken'),
    configService.get<string>('auth.cookies.refreshToken.name', 'refreshToken'),
    configService.get<string>('auth.cookies.csrf.name', 'csrf-token'),
  ];

  cookieNames.forEach((name) => {
    reply.clearCookie(name);
  });
}
