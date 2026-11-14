import { LINK_ERROR_MESSAGE, REMINDER_ERROR_MESSAGE, REMINDER_LIMIT } from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { expectedLink } from '../support/expected-link';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const HOUR_MS = 60 * 60 * 1000;

/** An ISO time `hours` from now (a due reminder cannot be set: it becomes due on its own). */
function inHours(hours: number): string {
  return new Date(Date.now() + hours * HOUR_MS).toISOString();
}

export const REMINDERS_SCENARIOS: readonly ContractScenario[] = [
  scenario('reminders', 'a new account has no reminders', async ({ reminders }) => {
    expectEqual(await reminders.list(), { due: [], upcoming: [] });
    expectEqual(await reminders.count(), { due: 0 });
  }),

  scenario(
    'reminders',
    'sets a reminder and lists the link as upcoming',
    async ({ reminders, links }) => {
      const link = await links.create({ url: 'https://a.example/', title: 'A' });
      const at = inHours(20);
      const expected = expectedLink('https://a.example/', 'A', { id: link.id, remindAt: at });
      expectEqual(await reminders.set(link.id, at), expected);
      expectEqual(await links.get(link.id), expected);
      expectEqual(await reminders.list(), { due: [], upcoming: [expected] });
      expectEqual(await reminders.count(), { due: 0 });
    },
  ),

  scenario(
    'reminders',
    'lists upcoming reminders soonest first and changes one',
    async ({ reminders, links }) => {
      const later = await links.create({ url: 'https://later.example/', title: 'Later' });
      const sooner = await links.create({ url: 'https://soon.example/', title: 'Soon' });
      await reminders.set(later.id, inHours(48));
      await reminders.set(sooner.id, inHours(2));
      expectEqual(
        (await reminders.list()).upcoming.map((item) => item.id),
        [sooner.id, later.id],
      );
      const moved = inHours(72);
      expectEqual((await reminders.set(sooner.id, moved)).remindAt, moved);
      expectEqual(
        (await reminders.list()).upcoming.map((item) => item.id),
        [later.id, sooner.id],
      );
    },
  ),

  scenario(
    'reminders',
    'clears a reminder, twice without an error',
    async ({ reminders, links }) => {
      const link = await links.create({ url: 'https://a.example/', title: 'A' });
      await reminders.set(link.id, inHours(5));
      await reminders.clear(link.id);
      await reminders.clear(link.id);
      expectEqual((await links.get(link.id)).remindAt, null);
      expectEqual(await reminders.list(), { due: [], upcoming: [] });
    },
  ),

  scenario('reminders', 'refuses a time in the past', async ({ reminders, links }) => {
    const link = await links.create({ url: 'https://a.example/', title: 'A' });
    await expectError(reminders.set(link.id, inHours(-1)), {
      status: 400,
      code: REMINDER_ERROR_MESSAGE.NotInFuture,
    });
    await expectError(reminders.setMany({ ids: [link.id], remindAt: inHours(-1) }), {
      status: 400,
      code: REMINDER_ERROR_MESSAGE.NotInFuture,
    });
    expectEqual((await links.get(link.id)).remindAt, null);
  }),

  scenario('reminders', 'refuses a time too far ahead', async ({ reminders, links }) => {
    const link = await links.create({ url: 'https://a.example/', title: 'A' });
    await expectError(reminders.set(link.id, inHours((REMINDER_LIMIT.MaxAheadDays + 1) * 24)), {
      status: 400,
      code: REMINDER_ERROR_MESSAGE.TooFarAhead,
    });
  }),

  scenario('reminders', 'answers 404 for a missing link', async ({ reminders }) => {
    const notFound = { status: 404, code: LINK_ERROR_MESSAGE.NotFound };
    await expectError(reminders.set(MISSING_ID, inHours(3)), notFound, 'set');
    await expectError(reminders.clear(MISSING_ID), notFound, 'clear');
  }),

  scenario(
    'reminders',
    'sets and clears one reminder on several links, ignoring missing ids',
    async ({ reminders, links }) => {
      const first = await links.create({ url: 'https://one.example/', title: 'One' });
      const second = await links.create({ url: 'https://two.example/', title: 'Two' });
      const at = inHours(10);
      expectEqual(
        await reminders.setMany({ ids: [second.id, MISSING_ID, first.id], remindAt: at }),
        {
          updated: 2,
          links: [
            expectedLink('https://two.example/', 'Two', { id: second.id, remindAt: at }),
            expectedLink('https://one.example/', 'One', { id: first.id, remindAt: at }),
          ],
        },
      );
      expectEqual((await reminders.list()).upcoming.length, 2);
      const cleared = await reminders.setMany({ ids: [first.id, second.id], remindAt: null });
      expectEqual(
        cleared.links.map((link) => link.remindAt),
        [null, null],
      );
      expectEqual(await reminders.list(), { due: [], upcoming: [] });
    },
  ),

  scenario('reminders', 'refuses an empty batch', async ({ reminders }) => {
    await expectError(reminders.setMany({ ids: [], remindAt: null }), { status: 400 });
  }),
];
