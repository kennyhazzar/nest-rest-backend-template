import { ConfigService } from '@nestjs/config';
import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

export const MailerModuleOptions = (configService: ConfigService): MailerOptions => {
  return {
    transport: {
      host: configService.getOrThrow('mailer.host'),
      port: configService.getOrThrow('mailer.port'),
      auth: {
        user: configService.getOrThrow('mailer.user'),
        pass: configService.getOrThrow('mailer.pass'),
      },
      secure: configService.get<boolean>('mailer.secure', true),
    },
    defaults: {
      from: configService.getOrThrow('mailer.from'),
    },
    template: {
      dir: __dirname + '/templates',
      adapter: new HandlebarsAdapter(),
    },
  };
};
