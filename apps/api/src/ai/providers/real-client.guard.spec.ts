import Anthropic from '@anthropic-ai/sdk';
import { readAiConfig } from '../config/ai-config';

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
      });
    }
  });

  it('runs this suite as development, so the real provider is off for every spec', () => {
    expect(readAiConfig().useRealProvider).toBe(false);
  });
});
