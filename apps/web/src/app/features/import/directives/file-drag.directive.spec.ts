import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FileDragDirective } from './file-drag.directive';

@Component({
  imports: [FileDragDirective],
  template: `<div
    appFileDrag
    [appFileDragDisabled]="off()"
    (draggingChange)="states.push($event)"
    (fileDropped)="files.push($event)"
  >
    <span id="child">child</span>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly off = signal(false);
  readonly states: boolean[] = [];
  readonly files: File[] = [];
}

function dragEvent(type: string, types: string[] = ['Files'], files: File[] = []): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: { types, files, dropEffect: 'none' } });
  return event;
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    area: root.querySelector('div') as HTMLElement,
    child: root.querySelector('#child') as HTMLElement,
  };
}

describe('FileDragDirective', () => {
  it('reports dragging once while a file is over the area, with a counter for children', () => {
    const { host, area, child } = setup();

    area.dispatchEvent(dragEvent('dragenter'));
    child.dispatchEvent(dragEvent('dragenter'));
    area.dispatchEvent(dragEvent('dragleave'));
    expect(host.states).toEqual([true]);

    child.dispatchEvent(dragEvent('dragleave'));
    expect(host.states).toEqual([true, false]);
  });

  it('emits the first dropped file and clears the dragging state', () => {
    const { host, area } = setup();
    const first = new File(['a'], 'a.html');

    area.dispatchEvent(dragEvent('dragenter'));
    area.dispatchEvent(dragEvent('drop', ['Files'], [first, new File(['b'], 'b.html')]));

    expect(host.files).toEqual([first]);
    expect(host.states).toEqual([true, false]);
  });

  it('leaves a drop that something inside already took, so the file is read once', () => {
    const { host, child } = setup();
    child.addEventListener('drop', (event) => event.preventDefault());

    child.dispatchEvent(dragEvent('drop', ['Files'], [new File(['a'], 'a.html')]));

    expect(host.files).toEqual([]);
  });

  it('ignores anything but files and does nothing while disabled', () => {
    const { fixture, host, area } = setup();

    area.dispatchEvent(dragEvent('dragenter', ['text/plain']));
    area.dispatchEvent(dragEvent('drop', ['text/plain']));
    fixture.componentInstance.off.set(true);
    fixture.detectChanges();
    area.dispatchEvent(dragEvent('dragenter'));
    area.dispatchEvent(dragEvent('drop', ['Files'], [new File(['a'], 'a.html')]));

    expect(host.states).toEqual([]);
    expect(host.files).toEqual([]);
  });

  it('accepts the drop by cancelling dragover for files only', () => {
    const { area } = setup();
    const files = dragEvent('dragover');
    const text = dragEvent('dragover', ['text/plain']);

    area.dispatchEvent(files);
    area.dispatchEvent(text);

    expect(files.defaultPrevented).toBe(true);
    expect(text.defaultPrevented).toBe(false);
  });
});
