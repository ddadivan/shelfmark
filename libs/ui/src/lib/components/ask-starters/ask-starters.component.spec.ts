import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { AskStartersComponent } from './ask-starters.component';
import type { AskStarterGroup } from './models/ask-starter-group.interface';

const GROUPS: readonly AskStarterGroup[] = [
  { title: 'Find', icon: 'search', questions: ['That ramen recipe', 'The Signal Forms article'] },
  { title: 'Count and compare', icon: 'hash', questions: ['How many links do I have?'] },
];

function setup(compact = false, headingLevel: 2 | 3 = 3) {
  const fixture = TestBed.createComponent(AskStartersComponent);
  fixture.componentRef.setInput('groups', GROUPS);
  fixture.componentRef.setInput('compact', compact);
  fixture.componentRef.setInput('headingLevel', headingLevel);
  const picked: string[] = [];
  fixture.componentInstance.picked.subscribe((question) => picked.push(question));
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, picked };
}

describe('ui-ask-starters', () => {
  it('draws one card per group with its heading and question buttons', () => {
    const { el, picked } = setup();
    const cards = el.querySelectorAll('.ui-ask-starters__card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('h3')?.textContent?.trim()).toBe('Find');
    const buttons = el.querySelectorAll<HTMLButtonElement>('.ui-ask-starters__question');
    expect(buttons.length).toBe(3);
    buttons[1].click();
    expect(picked).toEqual(['The Signal Forms article']);
  });

  it('takes an h2 heading level under a panel title', () => {
    const { el } = setup(false, 2);
    expect(el.querySelectorAll('h2').length).toBe(2);
    expect(el.querySelector('h3')).toBeNull();
  });

  it('shows the first question of every group as a pill when compact', () => {
    const { el, picked } = setup(true);
    expect(el.querySelector('.ui-ask-starters__card')).toBeNull();
    const pills = el.querySelectorAll<HTMLButtonElement>('.ui-ask-starters__pill');
    expect([...pills].map((pill) => pill.textContent?.trim())).toEqual([
      'That ramen recipe',
      'How many links do I have?',
    ]);
    pills[1].click();
    expect(picked).toEqual(['How many links do I have?']);
  });

  it('has no axe violations in both layouts', async () => {
    expect(await axeViolations(setup().el)).toEqual([]);
    expect(await axeViolations(setup(true).el)).toEqual([]);
  });
});
