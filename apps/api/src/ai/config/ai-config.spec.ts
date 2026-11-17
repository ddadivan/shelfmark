import { readAiConfig } from './ai-config';

const KEY = 'sk-ant-test-0123456789';
const PRODUCTION = { NODE_ENV: 'production' };

describe('readAiConfig', () => {
  it('has no key and no real provider by default', () => {
    expect(readAiConfig({ NODE_ENV: 'production' })).toEqual({
      apiKey: null,
      useRealProvider: false,
    });
    expect(readAiConfig({ NODE_ENV: 'production', ANTHROPIC_API_KEY: '  ' })).toEqual({
      apiKey: null,
      useRealProvider: false,
    });
  });

  it('uses the real provider only in production with a key', () => {
    expect(readAiConfig({ ...PRODUCTION, ANTHROPIC_API_KEY: KEY })).toEqual({
      apiKey: KEY,
      useRealProvider: true,
    });
    // An unset NODE_ENV is production (fail safe), so the key is honoured there too.
    expect(readAiConfig({ ANTHROPIC_API_KEY: KEY }).useRealProvider).toBe(true);
  });

  it.each(['development', 'test'])(
    'never uses the real provider when NODE_ENV is %s',
    (nodeEnv) => {
      expect(readAiConfig({ NODE_ENV: nodeEnv, ANTHROPIC_API_KEY: KEY }).useRealProvider).toBe(
        false,
      );
    },
  );

  it('never uses the real provider on a Vercel preview deployment', () => {
    expect(
      readAiConfig({ ...PRODUCTION, VERCEL_ENV: 'preview', ANTHROPIC_API_KEY: KEY })
        .useRealProvider,
    ).toBe(false);
    expect(
      readAiConfig({ ...PRODUCTION, VERCEL_ENV: 'production', ANTHROPIC_API_KEY: KEY })
        .useRealProvider,
    ).toBe(true);
  });

  it('lets AI_PROVIDER=mock force the mock, and accepts anthropic', () => {
    expect(
      readAiConfig({ ...PRODUCTION, AI_PROVIDER: 'MOCK', ANTHROPIC_API_KEY: KEY }).useRealProvider,
    ).toBe(false);
    expect(
      readAiConfig({ ...PRODUCTION, AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: KEY })
        .useRealProvider,
    ).toBe(true);
  });

  it('rejects an unknown AI_PROVIDER, naming only the variable', () => {
    expect(() => readAiConfig({ AI_PROVIDER: 'gpt-secret' })).toThrow(/AI_PROVIDER/);
    expect(() => readAiConfig({ AI_PROVIDER: 'gpt-secret' })).not.toThrow(/gpt-secret/);
  });

  it('rejects a malformed key without echoing it', () => {
    const bad = 'has spaces inside the key';
    let message = '';
    try {
      readAiConfig({ ...PRODUCTION, ANTHROPIC_API_KEY: bad });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ANTHROPIC_API_KEY');
    expect(message).not.toContain(bad);
    expect(message).not.toContain('spaces');
    expect(() => readAiConfig({ ...PRODUCTION, ANTHROPIC_API_KEY: 'short' })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });
});
