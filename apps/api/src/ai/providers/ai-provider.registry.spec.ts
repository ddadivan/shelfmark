import { AiProviderRegistry } from './ai-provider.registry';
import { MockAiProvider } from './mock-ai.provider';
import type { AiConfig } from '../models/ai-config.interface';
import type { AiProvider } from '../models/ai-provider.interface';

function setup(config: AiConfig) {
  const real = new MockAiProvider();
  const factory = vi.fn((): AiProvider => real);
  return { registry: new AiProviderRegistry(config, factory), factory, real };
}

describe('AiProviderRegistry', () => {
  it('answers the mock without a key or outside production, and never builds the real provider', () => {
    const { registry, factory, real } = setup({ apiKey: null, useRealProvider: false });
    expect(registry.for({ isDemo: false })).not.toBe(real);
    expect(registry.for({ isDemo: false }).name).toBe('mock');
    expect(registry.for({ isDemo: true }).name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });

  it('answers the mock for a demo user even when the real provider is allowed', () => {
    const { registry, factory } = setup({
      apiKey: 'sk-ant-test-0123456789',
      useRealProvider: true,
    });
    expect(registry.for({ isDemo: true }).name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });

  it('builds the real provider once for a regular user in production', () => {
    const config = { apiKey: 'sk-ant-test-0123456789', useRealProvider: true };
    const { registry, factory, real } = setup(config);
    expect(registry.for({ isDemo: false })).toBe(real);
    expect(registry.for({ isDemo: false })).toBe(real);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(config);
  });

  it('reads a stored mock batch with the mock and a real batch with the real provider', () => {
    const { registry, real } = setup({ apiKey: 'sk-ant-test-0123456789', useRealProvider: true });
    expect(registry.forBatch('mock')?.name).toBe('mock');
    expect(registry.forBatch('mock')).not.toBe(real);
    expect(registry.forBatch('anthropic')).toBe(real);
    expect(registry.forBatch('other')).toBeNull();
  });

  it('never answers a real batch with the mock when the real provider is not available', () => {
    const { registry, factory } = setup({ apiKey: null, useRealProvider: false });
    expect(registry.forBatch('anthropic')).toBeNull();
    expect(registry.forBatch('mock')?.name).toBe('mock');
    expect(factory).not.toHaveBeenCalled();
  });
});
