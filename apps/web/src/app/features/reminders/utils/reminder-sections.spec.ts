import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { REMINDER_GROUP } from '../models/reminder-group.const';
import { reminderSections } from './reminder-sections';

const NOW = new Date(2026, 10, 11, 10, 0);
const at = (days: number, hour: number) => new Date(2026, 10, 11 + days, hour, 0).toISOString();
const link = (id: string, remindAt: string): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  remindAt,
});

describe('reminderSections', () => {
  it('puts due first and groups the upcoming ones by day', () => {
    const sections = reminderSections(
      [link('due', at(-1, 9))],
      [
        link('today', at(0, 18)),
        link('tomorrow', at(1, 9)),
        link('week', at(5, 9)),
        link('later', at(7, 9)),
      ],
      NOW,
    );
    expect(sections.map((section) => [section.group, section.links.map((l) => l.id)])).toEqual([
      [REMINDER_GROUP.Due, ['due']],
      [REMINDER_GROUP.Today, ['today']],
      [REMINDER_GROUP.Tomorrow, ['tomorrow']],
      [REMINDER_GROUP.ThisWeek, ['week']],
      [REMINDER_GROUP.Later, ['later']],
    ]);
  });

  it('leaves out empty sections and counts a reminder that passed meanwhile as due', () => {
    const sections = reminderSections([], [link('passed', at(0, 9)), link('soon', at(1, 9))], NOW);
    expect(sections.map((section) => section.group)).toEqual([
      REMINDER_GROUP.Due,
      REMINDER_GROUP.Tomorrow,
    ]);
    expect(reminderSections([], [], NOW)).toEqual([]);
  });
});
