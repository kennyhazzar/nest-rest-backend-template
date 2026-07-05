import { ConfigService } from '@nestjs/config';

import { EncryptionService } from './encryption.service';

const TEST_KEY = '0123456789abcdef0123456789abcdef';
const TEST_PLAINTEXT = 'sensitive-value';
const TEST_ENCRYPTED = 'enc:v1:ABEiM0RVZneImaq7:9Q/jrMQPofSrmiTQxgKA5Q==:Lf5R7QjiVJHtaMFZQhGz';

function createService(key = TEST_KEY): EncryptionService {
  return new EncryptionService(new ConfigService({ security: { encryptionKey: key } }));
}

describe('EncryptionService', () => {
  it('encrypts and decrypts a value', () => {
    const service = createService();

    const encrypted = service.encryptNullable(TEST_PLAINTEXT);

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toBe(TEST_PLAINTEXT);
    expect(service.decryptNullable(encrypted)).toBe(TEST_PLAINTEXT);
  });

  it('decrypts a deterministic compatibility vector', () => {
    expect(createService().decryptNullable(TEST_ENCRYPTED)).toBe(TEST_PLAINTEXT);
  });

  it('passes through empty and legacy plaintext values', () => {
    const service = createService();

    expect(service.decryptNullable(null)).toBeNull();
    expect(service.decryptNullable(undefined)).toBeNull();
    expect(service.decryptNullable('')).toBe('');
    expect(service.decryptNullable('legacy-plaintext')).toBe('legacy-plaintext');
  });

  it('rejects malformed encrypted payloads before decrypting', () => {
    const service = createService();

    expect(() => service.decryptNullable('enc:v1:too:few')).toThrow('crypto.encryptedPayloadInvalid');
    expect(() => service.decryptNullable('enc:v1:YQ==:Yg==:Yw==')).toThrow('crypto.encryptedPayloadInvalid');
  });

  it('rejects invalid keys', () => {
    expect(() => createService('short')).toThrow('security.encryptionKeyInvalid');
  });

  it('creates deterministic lookup hashes and does not rehash them', () => {
    const service = createService();
    const hash = service.hashLookupSecret('device-token');

    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(service.hashLookupSecret(hash)).toBe(hash);
    expect(service.isHashedLookupSecret(hash)).toBe(true);
  });
});
