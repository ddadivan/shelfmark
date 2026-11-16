import { SHEET_DRAG_END } from './models/sheet-drag-end.const';
import { SheetDragTracker } from './sheet-drag-tracker';

function pointer(
  target: Element,
  type: string,
  clientY: number,
  timeStamp: number,
  init: { pointerId?: number; pointerType?: string; button?: number } = {},
): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, clientY, button: init.button ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'touch' });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
  return event as PointerEvent;
}

function setup() {
  const sheet = document.createElement('div');
  const handle = document.createElement('div');
  const button = document.createElement('button');
  handle.append(button);
  sheet.append(handle);
  sheet.getBoundingClientRect = () => ({ height: 400 }) as DOMRect;
  const tracker = new SheetDragTracker();
  return { sheet, handle, button, tracker };
}

const offset = (sheet: HTMLElement) => sheet.style.getPropertyValue('--ui-sheet-drag');

describe('SheetDragTracker', () => {
  it('follows the finger down only and closes past 30% of the height', () => {
    const { sheet, handle, tracker } = setup();
    expect(tracker.start(pointer(handle, 'pointerdown', 100, 0))).toBe(true);
    expect(tracker.active).toBe(true);
    tracker.move(pointer(handle, 'pointermove', 60, 50), sheet);
    expect(offset(sheet)).toBe('0px');
    tracker.move(pointer(handle, 'pointermove', 250, 400), sheet);
    expect(offset(sheet)).toBe('150px');
    expect(tracker.end(pointer(handle, 'pointerup', 250, 500), sheet)).toBe(SHEET_DRAG_END.Close);
    expect(offset(sheet)).toBe('150px');
    expect(tracker.active).toBe(false);
  });

  it('blurs the focused control once the sheet starts to move, so open popups close', () => {
    const { sheet, handle, tracker } = setup();
    document.body.append(sheet);
    const field = document.createElement('input');
    sheet.append(field);
    field.focus();
    const onBlur = vi.fn();
    field.addEventListener('blur', onBlur);
    tracker.start(pointer(handle, 'pointerdown', 100, 0));
    expect(document.activeElement).toBe(field);
    tracker.move(pointer(handle, 'pointermove', 60, 20), sheet);
    expect(document.activeElement).toBe(field);
    tracker.move(pointer(handle, 'pointermove', 130, 40), sheet);
    expect(document.activeElement).not.toBe(field);
    expect(onBlur).toHaveBeenCalledTimes(1);
    tracker.move(pointer(handle, 'pointermove', 200, 60), sheet);
    expect(onBlur).toHaveBeenCalledTimes(1);
    sheet.remove();
  });

  it('snaps back after a short slow drag, closes on a flick', () => {
    const { sheet, handle, tracker } = setup();
    tracker.start(pointer(handle, 'pointerdown', 100, 0));
    tracker.move(pointer(handle, 'pointermove', 140, 400), sheet);
    expect(tracker.end(pointer(handle, 'pointerup', 140, 450), sheet)).toBe(SHEET_DRAG_END.Snap);
    expect(offset(sheet)).toBe('0px');
    tracker.start(pointer(handle, 'pointerdown', 100, 1000));
    tracker.move(pointer(handle, 'pointermove', 120, 1010), sheet);
    tracker.move(pointer(handle, 'pointermove', 160, 1030), sheet);
    expect(tracker.end(pointer(handle, 'pointerup', 160, 1035), sheet)).toBe(SHEET_DRAG_END.Close);
  });

  it('ignores controls, secondary mouse buttons, other pointers and a second start', () => {
    const { sheet, handle, button, tracker } = setup();
    expect(tracker.start(pointer(button, 'pointerdown', 100, 0))).toBe(false);
    expect(
      tracker.start(pointer(handle, 'pointerdown', 100, 0, { pointerType: 'mouse', button: 2 })),
    ).toBe(false);
    expect(tracker.end(pointer(handle, 'pointerup', 100, 0), sheet)).toBeNull();
    tracker.start(pointer(handle, 'pointerdown', 100, 0));
    expect(tracker.start(pointer(handle, 'pointerdown', 100, 0, { pointerId: 2 }))).toBe(false);
    tracker.move(pointer(handle, 'pointermove', 300, 10, { pointerId: 2 }), sheet);
    expect(offset(sheet)).toBe('');
    expect(tracker.end(pointer(handle, 'pointerup', 300, 20, { pointerId: 2 }), sheet)).toBeNull();
    expect(tracker.cancel(pointer(handle, 'pointercancel', 300, 20, { pointerId: 2 }), sheet)).toBe(
      false,
    );
    expect(tracker.cancel(pointer(handle, 'pointercancel', 300, 20), sheet)).toBe(true);
    expect(offset(sheet)).toBe('0px');
  });
});
