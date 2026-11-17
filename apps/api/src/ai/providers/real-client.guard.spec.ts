import Anthropic from '@anthropic-ai/sdk';
import { takeVoyageAttempts } from '../../../test-utils/voyage-fetch-guard';
import { readAiConfig } from '../config/ai-config';
import { VoyageEmbeddingProvider } from './voyage-embedding.provider';

// ADR 0047 point 5: no spec may reach a real model. `vitest.setup.ts` replaces the SDK's client with
// one whose constructor throws; this spec pins that and the configuration that keeps tests on the mock.
describe('no real AI client in tests', () => {
  it('throws when the provider SDK client is constructed', () => {
    expect(() => new Anthropic({ apiKey: 'sk-ant-test-0123456789' })).toThrow(
      /must never be constructed in tests/,
    );
  });

  it('keeps the mock provider in development and test even with a key', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(readAiConfig({ NODE_ENV, ANTHROPIC_API_KEY: 'sk-ant-test-0123456789' })).toEqual({
        apiKey: 'sk-ant-test-0123456789',
        useRealProvider: false,
        voyageApiKey: null,
        useRealEmbeddings: false,
      });
    }
  });

  it('runs this suite as development, so the real provider is off for every spec', () => {
    expect(readAiConfig().useRealProvider).toBe(false);
  });
});

// ADR 0050: Voyage is called with plain `fetch`; `vitest.setup.ts` installs a guard that makes any
// request to its host throw and fails the spec afterwards.
describe('no real embeddings call in tests', () => {
  it('throws for a request to the Voyage host and records the attempt', () => {
    expect(() => fetch('https://api.voyageai.com/v1/embeddings', { method: 'POST' })).toThrow(
      /must never be called in tests/,
    );
    expect(() => fetch(new URL('https://API.voyageai.com/v1/embeddings'))).toThrow();
    expect(takeVoyageAttempts()).toHaveLength(2);
  });

  it('turns a real Voyage provider call into a retryable failure that is still recorded', async () => {
    const provider = new VoyageEmbeddingProvider('voyage'.padEnd(20, 'x'));
    await expect(provider.embed(['text'], 'query')).resolves.toEqual({
      ok: false,
      retryable: true,
    });
    expect(takeVoyageAttempts()).toHaveLength(1);
  });

  it('keeps every spec on the mock embeddings', () => {
    expect(readAiConfig()).toMatchObject({ useRealEmbeddings: false });
  });
});
