import { holdRowsStill, reorderDropLine, setReorderDropLine } from './reorder-drop-line';

/** An element whose box is `top`..`top + height`, `left`..`left + width` (jsdom has no layout). */
function box(top: number, height: number, left = 0, width = 200): HTMLElement {
  const element = document.createElement('li');
  element.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  return element;
}

describe('reorderDropLine (#315)', () => {
  const list = box(100, 200, 10, 220);
  // Rows of 36px with a 1px gap; the placeholder holds the second place (the dragged row).
  const rows = [box(100, 36, 14, 212), box(137, 36, 14, 212), box(174, 36, 14, 212)];
  const placeholder = rows[1];

  it('is hidden while the row is over its own place', () => {
    expect(reorderDropLine(list, rows, placeholder, 1)).toBeNull();
  });

  it('sits in the middle of the gap after the target row when moving down', () => {
    const items = [
      box(100, 36, 14, 212),
      placeholder,
      box(174, 36, 14, 212),
      box(211, 36, 14, 212),
    ];
    expect(reorderDropLine(list, items, placeholder, 2)).toEqual({
      top: 210.5 - 100,
      left: 4,
      width: 212,
    });
  });

  it('sits in the middle of the gap before the target row when moving up', () => {
    const items = [box(100, 36), box(137, 36), placeholder];
    const up = box(174, 36);
    const line = reorderDropLine(list, [items[0], items[1], up], up, 1);
    expect(line?.top).toBeCloseTo(136.5 - 100);
  });

  it('straddles the edge at the ends of the list', () => {
    // The first row to the end: after the last row, no gap below it.
    const first = box(100, 36);
    expect(reorderDropLine(list, [first, box(137, 36), box(174, 36)], first, 2)?.top).toBe(110);
    // The last row to the start: before the first row, no gap above it.
    const last = box(174, 36);
    expect(reorderDropLine(list, [box(100, 36), box(137, 36), last], last, 0)?.top).toBe(0);
  });

  it('takes the width of the row background from rowOf', () => {
    const inner = box(137, 36, 30, 180);
    const line = reorderDropLine(list, [placeholder, rows[2]], placeholder, 1, () => inner);
    expect(line).toMatchObject({ left: 20, width: 180 });
  });

  it('sets and clears the line on the list', () => {
    const element = document.createElement('ul');
    setReorderDropLine(element, { top: 10.5, left: 4, width: 212 });
    expect(element.classList).toContain('ui-drop-line--shown');
    expect(element.style.getPropertyValue('--ui-drop-line-top')).toBe('10.5px');
    expect(element.style.getPropertyValue('--ui-drop-line-width')).toBe('212px');

    setReorderDropLine(element, null);
    expect(element.classList).not.toContain('ui-drop-line--shown');
    expect(element.style.getPropertyValue('--ui-drop-line-top')).toBe('');
  });

  it('removes the sort offsets CDK wrote, so the rows hold still', () => {
    const rows = [document.createElement('li'), document.createElement('li')];
    rows[0].style.transform = 'translate3d(0, 37px, 0)';
    rows[1].style.transform = 'translate3d(0, -37px, 0)';
    holdRowsStill(rows);
    expect(rows.map((row) => row.style.transform)).toEqual(['', '']);
  });
});
