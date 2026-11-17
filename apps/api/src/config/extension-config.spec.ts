import { readExtensionConfig } from './extension-config';
import { NODE_ENV } from './models/node-env.const';

const ID = 'abcdefghijklmnopabcdefghijklmnop';
const OTHER = 'ponmlkjihgfedcbaponmlkjihgfedcba';
const origin = (id: string): string => `chrome-extension://${id}`;

describe('readExtensionConfig', () => {
  it('trusts no extension in production when unset or empty', () => {
    expect(readExtensionConfig({ NODE_ENV: NODE_ENV.Production })).toEqual({
      origins: [],
      allowAny: false,
    });
    expect(
      readExtensionConfig({ NODE_ENV: NODE_ENV.Production, EXTENSION_ORIGINS: ' , ' }),
    ).toEqual({ origins: [], allowAny: false });
  });

  it('parses a trimmed, de-duplicated list', () => {
    const config = readExtensionConfig({
      NODE_ENV: NODE_ENV.Production,
      EXTENSION_ORIGINS: `${origin(ID)}, ${origin(OTHER)} ,${origin(ID)},`,
    });
    expect(config).toEqual({ origins: [origin(ID), origin(OTHER)], allowAny: false });
  });

  it('accepts any extension origin outside production', () => {
    expect(readExtensionConfig({ NODE_ENV: NODE_ENV.Development }).allowAny).toBe(true);
    expect(readExtensionConfig({ NODE_ENV: NODE_ENV.Test }).allowAny).toBe(true);
  });

  it('never accepts any extension origin on a Vercel deployment, whatever NODE_ENV says', () => {
    for (const vercelEnv of ['preview', 'production', 'development']) {
      expect(
        readExtensionConfig({ NODE_ENV: NODE_ENV.Development, VERCEL_ENV: vercelEnv }).allowAny,
      ).toBe(false);
    }
  });

  it.each([
    ['a wildcard', 'chrome-extension://*'],
    ['a wildcard inside the id', `chrome-extension://${'a'.repeat(31)}*`],
    ['a short id', `chrome-extension://${'a'.repeat(31)}`],
    ['a long id', `chrome-extension://${'a'.repeat(33)}`],
    ['letters beyond p', `chrome-extension://${'q'.repeat(32)}`],
    ['upper case', `chrome-extension://${'A'.repeat(32)}`],
    ['a trailing slash', `${origin(ID)}/`],
    ['a path', `${origin(ID)}/popup.html`],
    ['another scheme', `https://${ID}`],
  ])('fails boot on %s, naming the variable and not the value', (_name, value) => {
    for (const nodeEnv of [NODE_ENV.Production, NODE_ENV.Test]) {
      let message = '';
      try {
        readExtensionConfig({ NODE_ENV: nodeEnv, EXTENSION_ORIGINS: value });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain('EXTENSION_ORIGINS');
      expect(message).not.toContain(value);
    }
  });
});
