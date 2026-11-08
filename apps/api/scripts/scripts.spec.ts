import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DRIFT_ARGS, dbCheck, refusal } from './db-check.mjs';
import {
  LOCK_FILE,
  MEMORY_FLAG,
  SEPARATOR,
  SHADOW_FLAG,
  acquireLock,
  buildDatabaseEnv,
  databaseUrl,
  isProcessAlive,
  parseArgs,
  runWithLocalDb,
} from './local-db.mjs';
import { DIRECT_URL_VARIABLE, VERCEL_FLAG, migrateDeploy } from './migrate-deploy.mjs';

const DIRECT_URL = 'postgresql://user:hunter2@db.example.test/app';
const LOCAL_URL = 'postgresql://postgres@127.0.0.1:5432/postgres';

const PRODUCTION = { VERCEL: VERCEL_FLAG, VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' };

describe('migrateDeploy', () => {
  const withUrl = (env: Record<string, string>) => ({ ...env, [DIRECT_URL_VARIABLE]: DIRECT_URL });

  it('refuses outside the Vercel build', () => {
    const run = vi.fn(() => 0);
    const result = migrateDeploy({ [DIRECT_URL_VARIABLE]: DIRECT_URL }, run);
    expect(result.code).toBe(1);
    expect(result.message).toMatch(/VERCEL=1/);
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses without the direct URL and never prints a URL', () => {
    const run = vi.fn(() => 0);
    const result = migrateDeploy(PRODUCTION, run);
    expect(result.code).toBe(1);
    expect(result.message).toContain(DIRECT_URL_VARIABLE);
    expect(run).not.toHaveBeenCalled();
  });

  it('migrates production only for the main branch', () => {
    const env = withUrl(PRODUCTION);
    const run = vi.fn(() => 0);
    expect(migrateDeploy(env, run)).toEqual({ code: 0 });
    expect(run).toHaveBeenCalledWith(['migrate', 'deploy'], env);
  });

  it('refuses production for another git ref', () => {
    const run = vi.fn(() => 0);
    const result = migrateDeploy(withUrl({ ...PRODUCTION, VERCEL_GIT_COMMIT_REF: 'feat/x' }), run);
    expect(result.code).toBe(1);
    expect(result.message).toMatch(/branch main/);
    expect(run).not.toHaveBeenCalled();
  });

  it('migrates a preview build', () => {
    const run = vi.fn(() => 0);
    const env = withUrl({ VERCEL: VERCEL_FLAG, VERCEL_ENV: 'preview' });
    expect(migrateDeploy(env, run)).toEqual({ code: 0 });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'development'])('refuses VERCEL_ENV=%s', (target) => {
    const run = vi.fn(() => 0);
    const env = withUrl({ VERCEL: VERCEL_FLAG, ...(target ? { VERCEL_ENV: target } : {}) });
    const result = migrateDeploy(env, run);
    expect(result.code).toBe(1);
    expect(result.message).toMatch(/production or preview/);
    expect(run).not.toHaveBeenCalled();
  });

  it('passes the failing exit code through', () => {
    expect(migrateDeploy(withUrl(PRODUCTION), () => 3)).toEqual({ code: 3 });
  });
});

describe('dbCheck', () => {
  const local = { DATABASE_URL: LOCAL_URL };

  it('deploys the migrations, then checks for drift', () => {
    const run = vi.fn(() => 0);
    expect(dbCheck(run, local)).toBe(0);
    expect(run.mock.calls).toEqual([[['migrate', 'deploy']], [DRIFT_ARGS]]);
  });

  it('stops at a failing deploy without checking drift', () => {
    const run = vi.fn(() => 4);
    expect(dbCheck(run, local)).toBe(4);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('returns the drift exit code', () => {
    const run = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(2);
    expect(dbCheck(run, local)).toBe(2);
  });

  describe('target guard', () => {
    it.each([
      [{ DATABASE_URL: DIRECT_URL }],
      [{ DATABASE_URL: LOCAL_URL, DATABASE_URL_UNPOOLED: DIRECT_URL }],
      [{}],
      [{ DATABASE_URL: 'not a url' }],
    ])('refuses %j outside CI without running Prisma', (env) => {
      const run = vi.fn(() => 0);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(dbCheck(run, env)).toBe(1);
      expect(run).not.toHaveBeenCalled();
      expect(error.mock.calls.flat().join(' ')).not.toContain('hunter2');
      error.mockRestore();
    });

    it.each(['postgresql://u@localhost/db', 'postgresql://u@[::1]:5432/db'])(
      'accepts the loopback URL %s',
      (url) => {
        expect(refusal({ DATABASE_URL: url })).toBeUndefined();
      },
    );

    it('allows any host in CI', () => {
      expect(refusal({ CI: 'true', DATABASE_URL: DIRECT_URL })).toBeUndefined();
    });
  });
});

// Each run boots PGlite (about 1.5 s per database).
const SLOW_TEST_MS = 30_000;

describe('local-db helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('splits flags and command at the separator', () => {
    expect(parseArgs([MEMORY_FLAG, SHADOW_FLAG, SEPARATOR, 'node', 'a.mjs'])).toEqual({
      memory: true,
      shadow: true,
      command: ['node', 'a.mjs'],
    });
    expect(parseArgs([SEPARATOR, 'prisma', 'migrate', 'dev'])).toEqual({
      memory: false,
      shadow: false,
      command: ['prisma', 'migrate', 'dev'],
    });
  });

  it('returns no command without a separator', () => {
    expect(parseArgs([MEMORY_FLAG])).toEqual({ memory: true, shadow: false, command: [] });
  });

  it('builds a loopback connection URL', () => {
    expect(databaseUrl('127.0.0.1:5432')).toBe('postgresql://postgres@127.0.0.1:5432/postgres');
  });

  it('points the database variables at the local servers, shadow only when given', () => {
    expect(buildDatabaseEnv('a', 'b')).toEqual({
      DATABASE_URL: 'a',
      DATABASE_URL_UNPOOLED: 'a',
      SHADOW_DATABASE_URL: 'b',
    });
    expect(buildDatabaseEnv('a')).toEqual({ DATABASE_URL: 'a', DATABASE_URL_UNPOOLED: 'a' });
  });

  it('prints usage and exits 2 without a command', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await runWithLocalDb([MEMORY_FLAG])).toBe(2);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it(
    'runs a command against an in-memory database and returns its exit code',
    async () => {
      const script =
        "process.exit(process.env.DATABASE_URL?.startsWith('postgresql://postgres@127.0.0.1:') && !process.env.SHADOW_DATABASE_URL ? 7 : 1)";
      expect(await runWithLocalDb([MEMORY_FLAG, SEPARATOR, process.execPath, '-e', script])).toBe(
        7,
      );
    },
    SLOW_TEST_MS,
  );

  it(
    'starts a shadow database only with --shadow',
    async () => {
      const script =
        "process.exit(process.env.SHADOW_DATABASE_URL?.startsWith('postgresql://postgres@127.0.0.1:') ? 0 : 1)";
      const argv = [MEMORY_FLAG, SHADOW_FLAG, SEPARATOR, process.execPath, '-e', script];
      expect(await runWithLocalDb(argv)).toBe(0);
    },
    SLOW_TEST_MS,
  );

  it(
    'overrides a real DATABASE_URL and a real SHADOW_DATABASE_URL from the environment',
    async () => {
      vi.stubEnv('DATABASE_URL', DIRECT_URL);
      vi.stubEnv('SHADOW_DATABASE_URL', DIRECT_URL);
      const script =
        "process.exit(Object.values(process.env).some((v) => v?.includes('hunter2')) ? 1 : 0)";
      expect(await runWithLocalDb([MEMORY_FLAG, SEPARATOR, process.execPath, '-e', script])).toBe(
        0,
      );
    },
    SLOW_TEST_MS,
  );
});

describe('acquireLock', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-db-lock-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the pid and removes the file on release', () => {
    const release = acquireLock(dir, () => false, 111);
    expect(readFileSync(join(dir, LOCK_FILE), 'utf8')).toBe('111');
    release();
    expect(existsSync(join(dir, LOCK_FILE))).toBe(false);
  });

  it('refuses while a live process holds the lock', () => {
    writeFileSync(join(dir, LOCK_FILE), '222');
    expect(() => acquireLock(dir, () => true, 111)).toThrow(/in use by process 222/);
    expect(readFileSync(join(dir, LOCK_FILE), 'utf8')).toBe('222');
  });

  it('replaces the lock of a dead process and of a garbled file', () => {
    writeFileSync(join(dir, LOCK_FILE), '222');
    acquireLock(dir, () => false, 111);
    expect(readFileSync(join(dir, LOCK_FILE), 'utf8')).toBe('111');
    writeFileSync(join(dir, LOCK_FILE), 'garbage');
    acquireLock(dir, () => true, 333);
    expect(readFileSync(join(dir, LOCK_FILE), 'utf8')).toBe('333');
  });

  it('knows whether a pid is alive', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(2 ** 22 + 12345)).toBe(false);
  });
});
