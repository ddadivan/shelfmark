import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { HIGHLIGHT_MAX_TERMS } from './models/highlight-max-terms.const';
import { HighlightComponent } from './highlight.component';
import { highlightParts, queryTerms } from './highlight-parts';

const matches = (text: string, query: string | readonly string[]): string[] =>
  highlightParts(text, query)
    .filter((p) => p.match)
    .map((p) => p.text);

describe('highlightParts', () => {
  it('returns nothing for empty text and one plain run without a match', () => {
    expect(highlightParts('', 'a')).toEqual([]);
    expect(highlightParts('abc', '')).toEqual([{ text: 'abc', match: false }]);
    expect(highlightParts('abc', 'x')).toEqual([{ text: 'abc', match: false }]);
    expect(highlightParts('abc', ['  ', ''])).toEqual([{ text: 'abc', match: false }]);
  });

  it('matches ignoring case and keeps the original case', () => {
    expect(highlightParts('Angular Signals', 'signal')).toEqual([
      { text: 'Angular ', match: false },
      { text: 'Signal', match: true },
      { text: 's', match: false },
    ]);
  });

  it('marks every occurrence', () => {
    expect(matches('aXaxA', 'a')).toEqual(['a', 'a', 'A']);
  });

  it('treats regex characters literally', () => {
    const text = 'a.b a+b (c) [d] a|b ^$ \\';
    expect(matches(text, ['.', '+', '(c)', '[d]', '|', '^$', '\\'])).toEqual([
      '.',
      '+',
      '(c)',
      '[d]',
      '|',
      '^$',
      '\\',
    ]);
    expect(matches('abc', '.*')).toEqual([]);
  });

  it('splits a string on whitespace and takes an array as given', () => {
    expect(matches('Signals vs RxJS', 'rxjs signals')).toEqual(['Signals', 'RxJS']);
    expect(matches('Signals vs RxJS', ['vs RxJS'])).toEqual(['vs RxJS']);
  });

  it('merges overlapping and adjacent matches', () => {
    expect(matches('signal', ['signa', 'gnal'])).toEqual(['signal']);
    expect(matches('signal', ['sig', 'nal'])).toEqual(['signal']);
    expect(matches('signal', ['signal', 'gn'])).toEqual(['signal']);
  });

  it('ignores terms beyond the cap and duplicates', () => {
    const many = Array.from({ length: HIGHLIGHT_MAX_TERMS + 5 }, (_, i) => `t${i}`);
    expect(queryTerms(many)).toHaveLength(HIGHLIGHT_MAX_TERMS);
    expect(queryTerms('a a b')).toEqual(['a', 'b']);
  });
});

@Component({
  imports: [HighlightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p><ui-highlight [text]="text()" [query]="query()" /></p>`,
})
class HostComponent {
  readonly text = signal('Angular 22: <b>Signal</b> Forms');
  readonly query = signal<string | string[]>('signal');
}

describe('HighlightComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders marks as elements and the rest as text', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;
    const marks = [...el.querySelectorAll('mark')].map((m) => m.textContent);
    expect(marks).toEqual(['Signal']);
    expect(el.querySelector('ui-highlight')?.textContent).toBe('Angular 22: <b>Signal</b> Forms');
    expect(el.querySelector('b')).toBeNull();
  });

  it('never creates elements from the text', () => {
    const fixture = setup();
    fixture.componentInstance.text.set('<img src=x> img');
    fixture.componentInstance.query.set('img');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('mark')).toHaveLength(2);
  });

  it('updates when the query changes and drops marks for an empty query', () => {
    const fixture = setup();
    fixture.componentInstance.query.set(['forms']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mark')?.textContent).toBe('Forms');
    fixture.componentInstance.query.set('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mark')).toBeNull();
  });

  it('has no axe violations', async () => {
    const fixture = setup();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});
