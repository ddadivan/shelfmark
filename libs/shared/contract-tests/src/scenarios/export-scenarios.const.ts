import { EXPORT_FORMAT, LINK_KIND } from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const DATED_NAME = (extension: string) =>
  ANY.matching(new RegExp(`^shelfmark-\\d{4}-\\d{2}-\\d{2}\\.${extension}$`));
const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';

export const EXPORT_SCENARIOS: readonly ContractScenario[] = [
  scenario(
    'export',
    'saves the library as a JSON or HTML file named after the day',
    async ({ exports }) => {
      expectEqual(await exports.download({ format: EXPORT_FORMAT.Json }), {
        fileName: DATED_NAME('json'),
      });
      expectEqual(await exports.download({ format: EXPORT_FORMAT.Html }), {
        fileName: DATED_NAME('html'),
      });
    },
  ),

  scenario('export', 'accepts every filter of the link list', async ({ exports, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    const file = await exports.download({
      format: EXPORT_FORMAT.Json,
      folderId: folder.id,
      tag: ['dev', 'news'],
      q: 'angular',
      kind: LINK_KIND.Article,
    });
    expectEqual(file, { fileName: DATED_NAME('json') });
  }),

  scenario(
    'export',
    'answers 404 for a missing folder and 400 for an unknown format',
    async ({ exports }) => {
      await expectError(
        exports.download({ format: EXPORT_FORMAT.Json, folderId: MISSING_ID }),
        { status: 404 },
        'missing folder',
      );
      await expectError(
        exports.download({ format: 'csv' as never }),
        { status: 400 },
        'unknown format',
      );
    },
  ),
];
