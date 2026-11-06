import { readAppConfig } from './app-config';
import { NODE_ENV } from './models/node-env.const';

describe('readAppConfig', () => {
  it('defaults to port 3000 and production (fail-safe)', () => {
    expect(readAppConfig({})).toEqual({
      port: 3000,
      nodeEnv: NODE_ENV.Production,
      isProduction: true,
    });
  });

  it('reads PORT and NODE_ENV', () => {
    expect(readAppConfig({ PORT: '8080', NODE_ENV: NODE_ENV.Production })).toEqual({
      port: 8080,
      nodeEnv: NODE_ENV.Production,
      isProduction: true,
    });
  });

  it.each([NODE_ENV.Development, NODE_ENV.Test])('treats %s as non-production', (nodeEnv) => {
    expect(readAppConfig({ NODE_ENV: nodeEnv }).isProduction).toBe(false);
  });

  it('treats an empty PORT as unset', () => {
    expect(readAppConfig({ PORT: '' }).port).toBe(3000);
  });

  it.each(['abc', '0', '70000', '1.5', '0x50', '1e3', ' 80 ', '-1'])('rejects PORT=%j', (port) => {
    expect(() => readAppConfig({ PORT: port })).toThrow(/PORT/);
  });

  it('rejects unknown NODE_ENV', () => {
    expect(() => readAppConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
