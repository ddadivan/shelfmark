import {
  FOLDER_DELETE_MODE,
  PIN_ERROR_MESSAGE,
  PIN_KIND,
  PIN_LIMIT,
  type PinRef,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { expectedFolder } from '../support/expected-folder';
import { expectedLink } from '../support/expected-link';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';

export const PINS_SCENARIOS: readonly ContractScenario[] = [
  scenario('pins', 'a new account has no pins', async ({ pins }) => {
    expectEqual(await pins.list(), { items: [] });
  }),

  scenario(
    'pins',
    'pins a folder and a link in order and flags them',
    async ({ pins, folders, links }) => {
      const folder = await folders.create({ name: 'Reading' });
      const link = await links.create({ url: 'https://a.example/', title: 'A' });
      await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
      const list = await pins.create({ kind: PIN_KIND.Link, id: link.id });
      expectEqual(list, {
        items: [
          {
            kind: PIN_KIND.Folder,
            position: 0,
            folder: expectedFolder('Reading', { id: folder.id, pinned: true }),
            link: null,
          },
          {
            kind: PIN_KIND.Link,
            position: 1,
            folder: null,
            link: expectedLink('https://a.example/', 'A', { id: link.id, pinned: true }),
          },
        ],
      });
      expectEqual((await folders.list()).items[0].pinned, true);
      expectEqual((await links.get(link.id)).pinned, true);
    },
  ),

  scenario('pins', 'pins the same item once', async ({ pins, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
    const again = await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
    expectEqual(again.items.length, 1);
  }),

  scenario('pins', 'unpins an item', async ({ pins, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
    await pins.remove({ kind: PIN_KIND.Folder, id: folder.id });
    expectEqual(await pins.list(), { items: [] });
    expectEqual((await folders.list()).items[0].pinned, false);
  }),

  scenario(
    'pins',
    'reorders the pins and refuses a list that is not exactly the pins',
    async ({ pins, folders }) => {
      const a = await folders.create({ name: 'A' });
      const b = await folders.create({ name: 'B' });
      const refs: PinRef[] = [
        { kind: PIN_KIND.Folder, id: a.id },
        { kind: PIN_KIND.Folder, id: b.id },
      ];
      for (const ref of refs) {
        await pins.create(ref);
      }
      const reordered = await pins.reorder([refs[1], refs[0]]);
      expectEqual(
        reordered.items.map((item) => item.folder?.name),
        ['B', 'A'],
      );
      const mismatch = { status: 400, code: PIN_ERROR_MESSAGE.OrderMismatch };
      await expectError(pins.reorder([refs[0]]), mismatch, 'reorder with a missing pin');
      await expectError(pins.reorder([refs[0], refs[0]]), mismatch, 'reorder with a repeated pin');
    },
  ),

  scenario('pins', 'refuses the eighth pin', async ({ pins, folders }) => {
    for (let index = 0; index < PIN_LIMIT.Max; index++) {
      const folder = await folders.create({ name: `F${index}` });
      await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
    }
    const extra = await folders.create({ name: 'Extra' });
    await expectError(
      pins.create({ kind: PIN_KIND.Folder, id: extra.id }),
      { status: 409, code: PIN_ERROR_MESSAGE.LimitReached },
      'pin past the limit',
    );
  }),

  scenario('pins', 'answers 404 for an item that does not exist', async ({ pins }) => {
    const notFound = { status: 404, code: PIN_ERROR_MESSAGE.NotFound };
    await expectError(
      pins.create({ kind: PIN_KIND.Folder, id: MISSING_ID }),
      notFound,
      'pin folder',
    );
    await expectError(pins.create({ kind: PIN_KIND.Link, id: MISSING_ID }), notFound, 'pin link');
    await expectError(pins.remove({ kind: PIN_KIND.Link, id: MISSING_ID }), notFound, 'unpin');
  }),

  scenario(
    'pins',
    'drops the pin of a link or folder that goes to the Trash',
    async ({ pins, folders, links }) => {
      const folder = await folders.create({ name: 'Reading' });
      const link = await links.create({ url: 'https://a.example/', title: 'A' });
      await pins.create({ kind: PIN_KIND.Folder, id: folder.id });
      await pins.create({ kind: PIN_KIND.Link, id: link.id });
      await links.remove(link.id);
      expectEqual(
        (await pins.list()).items.map((item) => item.kind),
        [PIN_KIND.Folder],
      );
      await folders.remove(folder.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      expectEqual(await pins.list(), { items: [] });
    },
  ),
];
