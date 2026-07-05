import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class MagicLinkRequestBody {
  @ApiProperty({
    description: 'Email address to send the magic link to',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class MagicLinkAuthenticateBody {
  @ApiProperty({
    description: 'One-time token received in the magic link email',
    example: 'a1b2c3d4e5f6789abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
