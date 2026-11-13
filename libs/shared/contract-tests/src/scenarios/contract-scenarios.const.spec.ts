import { CONTRACT_SCENARIOS } from './contract-scenarios.const';

describe('CONTRACT_SCENARIOS', () => {
  it('has a unique name for every scenario, prefixed by its domain', () => {
    const names = CONTRACT_SCENARIOS.map((scenario) => scenario.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => /^[a-z]+: \S/.test(name))).toBe(true);
  });

  it('covers every domain of the issue', () => {
    const domains = new Set(CONTRACT_SCENARIOS.map((scenario) => scenario.name.split(':')[0]));
    expect([...domains].sort()).toEqual([
      'export',
      'feedback',
      'folders',
      'links',
      'pins',
      'settings',
      'sharing',
      'tags',
      'trash',
      'views',
    ]);
  });
});
