import { ASK_MODEL_PROFILE } from '../models/ask-model-profile.const';
import { AiProviderRegistry } from './ai-provider.registry';
import { MockAiProvider } from './mock-ai.provider';
import type { AiConfig } from '../models/ai-config.interface';
import type { AiProvider } from '../models/ai-provider.interface';
import { VoyageEmbeddingProvider } from './voyage-embedding.provider';

const NO_EMBEDDINGS = { voyageApiKey: null, useRealEmbeddings: false };
const NO_MODEL = { apiKey: null, useRealProvider: false };

function setup(config: AiConfig) {
  const real = new MockAiProvider();
  const factory = vi.fn((): AiProvider => real);
  return { registry: new AiProviderRegistry(config, factory), factory, real };
}

describe('AiProviderRegistry', () => {
  it('answers the mock without a key or outside production, and never builds the real provider', () => {
    const { registry, factory, real } = setup({
      ...NO_EMBEDDINGS,
      apiKey: null,
      useRealProvider: false,
    });
    expect(registry.for({ isDemo: false })).not.toBe(real);
    expect(registry.for({ isDemo: false }).name).toBe('mock');
    expect(registry.for({ isDemo: true }).name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });

  it('answers the mock for a demo user even when the real provider is allowed', () => {
    const { registry, factory } = setup({
      ...NO_EMBEDDINGS,
      apiKey: 'sk-ant-test-0123456789',
      useRealProvider: true,
    });
    expect(registry.for({ isDemo: true }).name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });

  it('runs Ask rounds on the mock for a demo user, never through the real factory', async () => {
    const { registry, factory } = setup({
      ...NO_EMBEDDINGS,
      apiKey: 'sk-ant-test-0123456789',
      useRealProvider: true,
    });
    const provider = registry.for({ isDemo: true });
    const chunks = [];
    for await (const chunk of provider.askRound(
      {
        profile: ASK_MODEL_PROFILE.Quick,
        system: '',
        tools: [],
        messages: [
          { role: 'user', content: [{ type: 'text', text: '<question>ai-fail</question>' }] },
        ],
        historyEnd: null,
        toolChoice: 'auto',
        timeoutMs: 1000,
      },
      new AbortController().signal,
    )) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([{ type: 'error', retryable: true }]);
    expect(factory).not.toHaveBeenCalled();
  });

  it('answers tag synonyms from the mock for a demo user, never through the real factory', async () => {
    const { registry, factory } = setup({
      ...NO_EMBEDDINGS,
      apiKey: 'sk-ant-test-0123456789',
      useRealProvider: true,
    });
    const outcome = await registry.for({ isDemo: true }).findTagSynonyms({
      tags: [
        { key: 't1', name: 'javascript' },
        { key: 't2', name: 'js' },
      ],
    });
    expect(outcome).toEqual({ type: 'output', output: { pairs: [{ keep: 't1', merge: 't2' }] } });
    expect(factory).not.toHaveBeenCalled();
  });

  it('builds the real provider once for a regular user in production', () => {
    const config = { ...NO_EMBEDDINGS, apiKey: 'sk-ant-test-0123456789', useRealProvider: true };
    const { registry, factory, real } = setup(config);
    expect(registry.for({ isDemo: false })).toBe(real);
    expect(registry.for({ isDemo: false })).toBe(real);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(config);
  });

  it('reads a stored mock batch with the mock and a real batch with the real provider', () => {
    const { registry, real } = setup({
      ...NO_EMBEDDINGS,
      apiKey: 'sk-ant-test-0123456789',
      useRealProvider: true,
    });
    expect(registry.forBatch('mock')?.name).toBe('mock');
    expect(registry.forBatch('mock')).not.toBe(real);
    expect(registry.forBatch('anthropic')).toBe(real);
    expect(registry.forBatch('other')).toBeNull();
  });

  it('never answers a real batch with the mock when the real provider is not available', () => {
    const { registry, factory } = setup({ ...NO_EMBEDDINGS, apiKey: null, useRealProvider: false });
    expect(registry.forBatch('anthropic')).toBeNull();
    expect(registry.forBatch('mock')?.name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });

  describe('embeddingsFor', () => {
    it('answers the mock without a Voyage key, outside production and for demo users', () => {
      const { registry } = setup({ ...NO_MODEL, ...NO_EMBEDDINGS });
      expect(registry.embeddingsFor({ isDemo: false }).name).toBe('mock');
      const allowed = setup({
        ...NO_MODEL,
        voyageApiKey: 'voyage'.padEnd(20, 'x'),
        useRealEmbeddings: true,
      });
      expect(allowed.registry.embeddingsFor({ isDemo: true }).name).toBe('mock');
    });

    it('builds Voyage once for a regular user when real embeddings are allowed', () => {
      const { registry, factory } = setup({
        ...NO_MODEL,
        voyageApiKey: 'voyage'.padEnd(20, 'x'),
        useRealEmbeddings: true,
      });
      const first = registry.embeddingsFor({ isDemo: false });
      expect(first).toBeInstanceOf(VoyageEmbeddingProvider);
      expect(registry.embeddingsFor({ isDemo: false })).toBe(first);
      // The language model stays on the mock: each provider has its own key and switch.
      expect(registry.for({ isDemo: false }).name).toBe('mock');
      expect(factory).not.toHaveBeenCalled();
    });
  });
});
