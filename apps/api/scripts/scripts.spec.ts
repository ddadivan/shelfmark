import { DRIFT_ARGS, dbCheck } from './db-check.mjs';
import {
  MEMORY_FLAG,
  SEPARATOR,
  buildDatabaseEnv,
  databaseUrl,
  parseArgs,
  runWithLocalDb,
} from './local-db.mjs';
import { DIRECT_URL_VARIABLE, VERCEL_FLAG, migrateDeploy } from './migrate-deploy.mjs';
import { PRISMA_ENV } from './prisma-cli.mjs';

const DIRECT_URL = 'postgresql://user:hunter2@db.example.test/app';

describe('migrateDeploy', () => {
  it('refuses outside the Vercel build', () => {
    const run = vi.fn(() => 0);
    const result = migrateDeploy({ [DIRECT_URL_VARIABLE]: DIRECT_URL }, run);
    expect(result.code).toBe(1);
    expect(result.message).toMatch(/VERCEL=1/);
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses without the direct URL and never prints a URL', () => {
    const run = vi.fn(() => 0);
    const result = migrateDeploy({ VERCEL: VERCEL_FLAG }, run);
    expect(result.code).toBe(1);
    expect(result.message).toContain(DIRECT_URL_VARIABLE);
    expect(run).not.toHaveBeenCalled();
  });

  it('runs prisma migrate deploy on Vercel with the environment', () => {
    const env = { VERCEL: VERCEL_FLAG, [DIRECT_URL_VARIABLE]: DIRECT_URL };
    const run = vi.fn(() => 0);
    expect(migrateDeploy(env, run)).toEqual({ code: 0 });
    expect(run).toHaveBeenCalledWith(['migrate', 'deploy'], env);
  });

  it('passes the failing exit code through', () => {
    const env = { VERCEL: VERCEL_FLAG, [DIRECT_URL_VARIABLE]: DIRECT_URL };
    expect(migrateDeploy(env, () => 3)).toEqual({ code: 3 });
  });
});

describe('dbCheck', () => {
  it('deploys the migrations, then checks for drift', () => {
    const run = vi.fn(() => 0);
    expect(dbCheck(run)).toBe(0);
    expect(run.mock.calls).toEqual([[['migrate', 'deploy']], [DRIFT_ARGS]]);
  });

  it('stops at a failing deploy without checking drift', () => {
    const run = vi.fn(() => 4);
    expect(dbCheck(run)).toBe(4);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('returns the drift exit code', () => {
    const run = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(2);
    expect(dbCheck(run)).toBe(2);
  });
});

// Each run boots two PGlite instances (about 3 s).
const SLOW_TEST_MS = 30_000;

describe('local-db helpers', () => {
  it('splits flags and command at the separator', () => {
    expect(parseArgs([MEMORY_FLAG, SEPARATOR, 'node', 'a.mjs'])).toEqual({
      memory: true,
      command: ['node', 'a.mjs'],
    });
    expect(parseArgs([SEPARATOR, 'prisma', 'migrate', 'dev'])).toEqual({
      memory: false,
      command: ['prisma', 'migrate', 'dev'],
    });
  });

  it('returns no command without a separator', () => {
    expect(parseArgs([MEMORY_FLAG])).toEqual({ memory: true, command: [] });
  });

  it('builds a loopback connection URL', () => {
    expect(databaseUrl('127.0.0.1:5432')).toBe('postgresql://postgres@127.0.0.1:5432/postgres');
  });

  it('points every database variable at the local servers', () => {
    expect(buildDatabaseEnv('a', 'b')).toEqual({
      DATABASE_URL: 'a',
      DATABASE_URL_UNPOOLED: 'a',
      SHADOW_DATABASE_URL: 'b',
    });
  });

  it('prints usage and exits 2 without a command', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await runWithLocalDb([MEMORY_FLAG])).toBe(2);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it(
    'runs a command against in-memory databases and returns its exit code',
    async () => {
      const script =
        "process.exit(process.env.DATABASE_URL?.startsWith('postgresql://postgres@127.0.0.1:') && process.env.SHADOW_DATABASE_URL ? 7 : 1)";
      expect(await runWithLocalDb([MEMORY_FLAG, SEPARATOR, process.execPath, '-e', script])).toBe(
        7,
      );
    },
    SLOW_TEST_MS,
  );

  it(
    'overrides a real DATABASE_URL from the environment',
    async () => {
      vi.stubEnv('DATABASE_URL', DIRECT_URL);
      const script = "process.exit(process.env.DATABASE_URL.includes('hunter2') ? 1 : 0)";
      expect(await runWithLocalDb([MEMORY_FLAG, SEPARATOR, process.execPath, '-e', script])).toBe(
        0,
      );
      vi.unstubAllEnvs();
    },
    SLOW_TEST_MS,
  );
});

describe('prisma-cli', () => {
  it('keeps the CLI quiet', () => {
    expect(PRISMA_ENV).toEqual({ CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' });
  });
});
