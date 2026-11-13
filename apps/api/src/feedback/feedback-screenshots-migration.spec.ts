import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { migrationFiles } from '../../test-utils/test-database';

const MIGRATION = '20261118120000_feedback_screenshots';
const USER = '0193a3a0-0000-7000-8000-000000000001';
const WITH_SHOT = '0193a3a0-0000-7000-8000-000000000101';
const WITHOUT_SHOT = '0193a3a0-0000-7000-8000-000000000102';
const RATING = '0193a3a0-0000-7000-8000-000000000103';

/**
 * The screenshot move of #352 on a database that already holds feedback: an existing screenshot
 * becomes position 0 of the new table with its bytes and type, and the old columns are gone.
 */
describe(`migration ${MIGRATION}`, () => {
  let db: PGlite;
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { pg_trgm } });
    const files = migrationFiles();
    const index = files.findIndex((file) => file.includes(MIGRATION));
    expect(index).toBeGreaterThan(0);
    for (const file of files.slice(0, index)) await db.exec(readFileSync(file, 'utf8'));

    await db.exec(`
      INSERT INTO users (id, name, email, updated_at)
      VALUES ('${USER}', 'Old', 'old@example.test', now());
    `);
    await db.query(
      `INSERT INTO feedback (id, user_id, kind, comment, screenshot, screenshot_type, updated_at)
       VALUES ($1, $2, 'problem', 'with a shot', $3, 'image/png', now())`,
      [WITH_SHOT, USER, bytes],
    );
    await db.query(
      `INSERT INTO feedback (id, user_id, kind, comment, updated_at)
       VALUES ($1, $2, 'idea', 'no shot', now())`,
      [WITHOUT_SHOT, USER],
    );
    await db.query(
      `INSERT INTO feedback (id, user_id, milestone, score, updated_at)
       VALUES ($1, $2, 'day3', 7, now())`,
      [RATING, USER],
    );
    for (const file of files.slice(index)) await db.exec(readFileSync(file, 'utf8'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('copies an existing screenshot as position 0 with its bytes and type', async () => {
    const { rows } = await db.query<{
      feedback_id: string;
      position: number;
      bytes: Uint8Array;
      type: string;
    }>('SELECT feedback_id, position, bytes, type FROM feedback_screenshots');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ feedback_id: WITH_SHOT, position: 0, type: 'image/png' });
    expect(Buffer.from(rows[0]?.bytes ?? []).equals(bytes)).toBe(true);
  });

  it('keeps every feedback row and drops the old columns', async () => {
    const { rows } = await db.query<{ id: string }>('SELECT id FROM feedback ORDER BY id');
    expect(rows.map((row) => row.id)).toEqual([WITH_SHOT, WITHOUT_SHOT, RATING]);
    const columns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'feedback'`,
    );
    const names = columns.rows.map((row) => row.column_name);
    expect(names).not.toContain('screenshot');
    expect(names).not.toContain('screenshot_type');
  });

  it('still keeps the rating-or-message shape', async () => {
    await expect(
      db.query(
        `INSERT INTO feedback (id, user_id, comment, updated_at)
         VALUES ('0193a3a0-0000-7000-8000-000000000104', $1, 'neither', now())`,
        [USER],
      ),
    ).rejects.toThrow();
  });
});
