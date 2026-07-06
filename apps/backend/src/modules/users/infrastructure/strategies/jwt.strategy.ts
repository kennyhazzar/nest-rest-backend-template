import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { JwtPayloadApp, ValidateJWT } from '@/interfaces/jwt.payload.interface';
import { AuthTokenVersionService } from '../services';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly tokenVersionService: AuthTokenVersionService,
  ) {
    const secretOrKey = configService.getOrThrow<string>('jwt.access.token');
    const cookieName = configService.get<string>('auth.cookies.accessToken.name', 'accessToken');

    // Create custom extractor that tries header first, then cookie
    const extractFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken();
    const extractFromCookie = (req: any) => {
      if (req && req.cookies && req.cookies[cookieName]) {
        return req.cookies[cookieName];
      }
      return null;
    };

    const jwtExtractor = (req: any) => {
      let token = extractFromHeader(req);
      if (!token) {
        token = extractFromCookie(req);
      }
      return token;
    };

    super({
      jwtFromRequest: jwtExtractor,
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate({
    sub: userId,
    rid: roleId,
    rty: roleType,
    lng: language,
    tv: tokenVersion,
  }: JwtPayloadApp): Promise<ValidateJWT> {
    if (!userId || !roleId || !roleType || !language) {
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    await this.tokenVersionService.assertCurrent(userId, tokenVersion);

    return { userId, roleId, roleType, language, tokenVersion };
  }
}
