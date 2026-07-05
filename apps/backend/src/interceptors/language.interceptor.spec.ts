import { LanguageInterceptor } from './language.interceptor';

describe('LanguageInterceptor', () => {
  const i18n = {
    translate: jest.fn((value: unknown) => (value === 'common.ok' ? 'OK' : value)),
    isTranslationKey: jest.fn((value: unknown) => value === 'common.ok'),
    resolveLanguage: jest.fn((value: string | undefined) => value ?? 'ru'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('translates nested message fields without mutating Date values into empty objects', () => {
    const interceptor = new LanguageInterceptor(i18n as any);
    const createdAt = new Date('2026-07-03T10:00:00.000Z');

    const result = (interceptor as any).translateMessages(
      {
        data: [{ id: 'client-id', createdAt, nested: { message: 'common.ok' } }],
      },
      'en',
    );

    expect(result).toEqual({
      data: [{ id: 'client-id', createdAt, nested: { message: 'OK', messageKey: 'common.ok' } }],
    });
    expect(result.data[0].createdAt).toBe(createdAt);
    expect(JSON.stringify(result.data[0].createdAt)).toBe('"2026-07-03T10:00:00.000Z"');
  });
});
