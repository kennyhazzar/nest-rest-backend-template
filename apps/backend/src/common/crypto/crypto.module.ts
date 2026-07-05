import { Global, Module } from '@nestjs/common';

import { EncryptionService } from './encryption.service';

/**
 * Global module that provides {@link EncryptionService} application-wide.
 *
 * Marked `@Global()` so any module can inject `EncryptionService` without
 * explicitly importing `CryptoModule`. Register once in `AppModule`.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CryptoModule {}
