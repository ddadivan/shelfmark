import { isAiFeatureMode, isAiSummaryLanguage } from './ai-setting-values';

describe('AI setting values', () => {
  it('knows the folder and tags modes', () => {
    expect(['suggest', 'auto', 'off'].every(isAiFeatureMode)).toBe(true);
    expect(isAiFeatureMode('always')).toBe(false);
    expect(isAiFeatureMode(null)).toBe(false);
  });

  it('knows the summary languages, without "Match my browser"', () => {
    expect(['app', 'en', 'de', 'uk'].every(isAiSummaryLanguage)).toBe(true);
    expect(isAiSummaryLanguage('browser')).toBe(false);
    expect(isAiSummaryLanguage('xx')).toBe(false);
  });
});
