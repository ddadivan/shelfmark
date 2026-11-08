import { readMonitoringSettings } from './read-monitoring-settings';

describe('readMonitoringSettings', () => {
  it('is empty without DSNs and defaults to production', () => {
    expect(readMonitoringSettings({})).toEqual({
      apiDsn: undefined,
      webDsn: undefined,
      environment: 'production',
      release: null,
    });
  });

  it('prefers VERCEL_ENV and reads the release from the commit sha', () => {
    const settings = readMonitoringSettings({
      SENTRY_DSN: 'https://k1@o1.ingest.sentry.io/1',
      SENTRY_WEB_DSN: 'https://k2@o1.ingest.sentry.io/2',
      VERCEL_ENV: 'preview',
      NODE_ENV: 'production',
      VERCEL_GIT_COMMIT_SHA: 'abcdef',
    });
    expect(settings.apiDsn?.projectId).toBe('1');
    expect(settings.webDsn?.projectId).toBe('2');
    expect(settings.environment).toBe('preview');
    expect(settings.release).toBe('abcdef');
  });

  it('falls back to NODE_ENV and ignores a malformed DSN', () => {
    const settings = readMonitoringSettings({ NODE_ENV: 'development', SENTRY_DSN: 'nope' });
    expect(settings.environment).toBe('development');
    expect(settings.apiDsn).toBeUndefined();
  });
});
