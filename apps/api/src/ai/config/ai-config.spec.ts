import { readAiConfig } from './ai-config';

const KEY = 'sk-ant-test-0123456789';
const PRODUCTION = { NODE_ENV: 'production' };

describe('readAiConfig', () => {
  it('has no key and no real provider by default', () => {
    expect(readAiConfig({ NODE_ENV: 'production' })).toEqual({
      apiKey: null,
      useRealProvider: false,
      voyageApiKey: null,
      useRealEmbeddings: false,
    });
    expect(readAiConfig({ NODE_ENV: 'production', ANTHROPIC_API_KEY: '  ' })).toEqual({
      apiKey: null,
      useRealProvider: false,
      voyageApiKey: null,
      useRealEmbeddings: false,
    });
  });

  it('uses the real provider only in production with a key', () => {
    expect(readAiConfig({ ...PRODUCTION, ANTHROPIC_API_KEY: KEY })).toEqual({
      apiKey: KEY,
      useRealProvider: true,
      voyageApiKey: null,
      useRealEmbeddings: false,
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

  describe('Voyage embeddings (ADR 0052)', () => {
    const VOYAGE = 'voyage'.padEnd(20, 'x');

    it('uses real embeddings only in production, not a preview, with a key and not forced to mock', () => {
      expect(readAiConfig({ ...PRODUCTION, VOYAGE_API_KEY: VOYAGE })).toMatchObject({
        voyageApiKey: VOYAGE,
        useRealEmbeddings: true,
        useRealProvider: false,
      });
      for (const NODE_ENV of ['development', 'test']) {
        expect(readAiConfig({ NODE_ENV, VOYAGE_API_KEY: VOYAGE }).useRealEmbeddings).toBe(false);
      }
      expect(
        readAiConfig({ ...PRODUCTION, VERCEL_ENV: 'preview', VOYAGE_API_KEY: VOYAGE })
          .useRealEmbeddings,
      ).toBe(false);
      expect(
        readAiConfig({ ...PRODUCTION, AI_PROVIDER: 'mock', VOYAGE_API_KEY: VOYAGE })
          .useRealEmbeddings,
      ).toBe(false);
      expect(readAiConfig({ ...PRODUCTION, VOYAGE_API_KEY: ' ' })).toMatchObject({
        voyageApiKey: null,
        useRealEmbeddings: false,
      });
    });

    it('rejects a malformed Voyage key, naming only the variable', () => {
      expect(() => readAiConfig({ ...PRODUCTION, VOYAGE_API_KEY: 'bad key value' })).toThrow(
        /VOYAGE_API_KEY/,
      );
      expect(() => readAiConfig({ ...PRODUCTION, VOYAGE_API_KEY: 'bad key value' })).not.toThrow(
        /bad key/,
      );
    });
  });
});
