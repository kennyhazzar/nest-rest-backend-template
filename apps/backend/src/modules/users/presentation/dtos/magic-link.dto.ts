import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MagicLinkResponseDto {
  @ApiProperty({ description: 'Whether the magic link was successfully sent or authenticated' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Human-readable status message', example: 'Magic link sent to user@example.com' })
  message?: string;
}
