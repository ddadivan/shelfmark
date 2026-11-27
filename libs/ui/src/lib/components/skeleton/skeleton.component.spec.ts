import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { SKELETON_SHAPE } from './models/skeleton-shape.const';
import type { SkeletonShape } from './models/skeleton-shape.type';
import { SkeletonComponent } from './skeleton.component';

@Component({
  imports: [SkeletonComponent],
  template: `<ui-skeleton [shape]="shape()" [count]="count()" [selectable]="selectable()" />`,
})
class HostComponent {
  readonly shape = signal<SkeletonShape>(SKELETON_SHAPE.Line);
  readonly count = signal<number | string>(1);
  readonly selectable = signal(false);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const skeleton = host.querySelector('ui-skeleton') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, skeleton, update };
}

const ITEM_SELECTOR: Record<SkeletonShape, string> = {
  card: '.ui-skeleton__card',
  row: '.ui-skeleton__row',
  tree: '.ui-skeleton__tree-row',
  preview: '.ui-skeleton__preview',
  line: '.ui-skeleton__line',
  block: '.ui-skeleton__box',
  history: '.ui-skeleton__history',
};

describe('SkeletonComponent', () => {
  it('is decorative and a single line by default', () => {
    const { skeleton } = setup();
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.classList.contains('ui-skeleton--line')).toBe(true);
    expect(skeleton.querySelectorAll(ITEM_SELECTOR.line).length).toBe(1);
  });

  it.each(Object.values(SKELETON_SHAPE))('shape %s renders its items and host class', (shape) => {
    const { skeleton, update } = setup();
    update((c) => {
      c.shape.set(shape);
      c.count.set(3);
    });
    expect(skeleton.classList.contains(`ui-skeleton--${shape}`)).toBe(true);
    expect(skeleton.querySelectorAll(ITEM_SELECTOR[shape]).length).toBe(3);
    expect(skeleton.querySelector('.ui-skeleton__block')).not.toBeNull();
  });

  it('card has a 16:9 media block, two title lines and a meta line (Shelf y-skc)', () => {
    const { skeleton, update } = setup();
    update((c) => c.shape.set(SKELETON_SHAPE.Card));
    expect(skeleton.querySelector('.ui-skeleton__media')).not.toBeNull();
    expect(skeleton.querySelectorAll('.ui-skeleton__title').length).toBe(2);
    expect(skeleton.querySelectorAll('.ui-skeleton__card .ui-skeleton__line--meta').length).toBe(1);
    expect(skeleton.querySelector('.ui-skeleton__chip')).toBeNull();
  });

  it('history is a history row, with a checkbox only when selectable', () => {
    const { skeleton, update } = setup();
    update((c) => c.shape.set(SKELETON_SHAPE.History));
    expect(skeleton.querySelector('.ui-skeleton__history-preview')).not.toBeNull();
    expect(skeleton.querySelectorAll('.ui-skeleton__history-main > *').length).toBe(2);
    expect(skeleton.querySelector('.ui-skeleton__history-trail')).not.toBeNull();
    expect(skeleton.querySelector('.ui-skeleton__check')).toBeNull();
    update((c) => c.selectable.set(true));
    expect(skeleton.querySelector('.ui-skeleton__check')).not.toBeNull();
  });

  it('tree rows end with a count placeholder', () => {
    const { skeleton, update } = setup();
    update((c) => c.shape.set(SKELETON_SHAPE.Tree));
    expect(skeleton.querySelector('.ui-skeleton__tree-row .ui-skeleton__count')).not.toBeNull();
  });

  it('accepts a numeric string and clamps count to 0..50', () => {
    const { skeleton, update } = setup();
    update((c) => c.count.set('4'));
    expect(skeleton.querySelectorAll(ITEM_SELECTOR.line).length).toBe(4);
    update((c) => c.count.set(500));
    expect(skeleton.querySelectorAll(ITEM_SELECTOR.line).length).toBe(50);
    update((c) => c.count.set(-2));
    expect(skeleton.querySelectorAll(ITEM_SELECTOR.line).length).toBe(0);
    update((c) => c.count.set('abc'));
    expect(skeleton.querySelectorAll(ITEM_SELECTOR.line).length).toBe(0);
  });

  it('has no axe violations for every shape', async () => {
    const { host, update } = setup();
    for (const shape of Object.values(SKELETON_SHAPE)) {
      update((c) => {
        c.shape.set(shape);
        c.count.set(2);
      });
      expect(await axeViolations(host)).toEqual([]);
    }
  });
});
