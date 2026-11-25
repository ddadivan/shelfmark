import type { HtmlElement } from '../../preview/models/html-element.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import type { ReaderTableData } from '../models/reader-table-data.interface';
import { childrenOf, isDropped, isElement } from './html-tree';
import { collectInline } from './inline-spans';
import { SpanBuilder } from './span-builder';

const NO_STYLE = { href: null, code: false, emphasis: false, strong: false };
const SECTION_TAGS: ReadonlySet<string> = new Set(['thead', 'tbody', 'tfoot']);

function cellText(cell: HtmlElement, ctx: ReaderInlineContext): string {
  const builder = new SpanBuilder();
  collectInline(cell, NO_STYLE, builder, ctx);
  return builder
    .finish(READER_EXTRACT_LIMIT.CellCharsMax, READER_EXTRACT_LIMIT.SpansMax)
    .map((span) => span.text)
    .join('');
}

/**
 * A simple table as rows of cell text (at most `TableRowsMax` rows of `TableColumnsMax` cells);
 * the first row is a header when it is in a `<thead>` or made of `<th>` cells. `null` when there is
 * no text, or the table is a one-cell layout box.
 */
export function collectTable(table: HtmlElement, ctx: ReaderInlineContext): ReaderTableData | null {
  const rows: string[][] = [];
  let header = false;
  const readRow = (row: HtmlElement, inHead: boolean): void => {
    if (rows.length >= READER_EXTRACT_LIMIT.TableRowsMax) return;
    const cells = childrenOf(row).filter(
      (cell): cell is HtmlElement =>
        isElement(cell) &&
        (cell.tagName === 'td' || cell.tagName === 'th') &&
        !isDropped(cell, ctx.options),
    );
    const texts = cells
      .slice(0, READER_EXTRACT_LIMIT.TableColumnsMax)
      .map((cell) => cellText(cell, ctx));
    if (texts.every((text) => text === '')) return;
    if (rows.length === 0) header = inHead || cells.every((cell) => cell.tagName === 'th');
    rows.push(texts);
  };
  for (const child of childrenOf(table)) {
    if (!isElement(child) || isDropped(child, ctx.options)) continue;
    if (child.tagName === 'tr') {
      readRow(child, false);
    } else if (SECTION_TAGS.has(child.tagName)) {
      for (const row of childrenOf(child)) {
        if (isElement(row) && row.tagName === 'tr' && !isDropped(row, ctx.options)) {
          readRow(row, child.tagName === 'thead');
        }
      }
    }
  }
  const single = rows.length === 1 && rows[0]?.length === 1;
  return rows.length === 0 || single ? null : { rows, header };
}
