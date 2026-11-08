import { dueFeedbackMilestone, reachedFeedbackMilestone } from './due-feedback-milestone';
import type { FeedbackMilestone } from './feedback-milestone.type';

const DAY = 86_400_000;
const created = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number): Date => new Date(created.getTime() + ms);
const none = new Set<FeedbackMilestone>();

describe('dueFeedbackMilestone', () => {
  it('is null just before day 3', () => {
    expect(dueFeedbackMilestone(created, at(3 * DAY - 1), none)).toBeNull();
  });

  it('is day3 exactly at 3 days', () => {
    expect(dueFeedbackMilestone(created, at(3 * DAY), none)).toBe('day3');
  });

  it('is week1 on day 10 without answers (day3 is skipped)', () => {
    expect(dueFeedbackMilestone(created, at(10 * DAY), none)).toBe('week1');
  });

  it('is null on day 10 when week1 was answered, even if day3 was not', () => {
    expect(dueFeedbackMilestone(created, at(10 * DAY), new Set(['week1']))).toBeNull();
  });

  it('is null when the only reached milestone was answered', () => {
    expect(dueFeedbackMilestone(created, at(4 * DAY), new Set(['day3']))).toBeNull();
  });

  it('is month1 at 30 days and year1 on day 400', () => {
    expect(dueFeedbackMilestone(created, at(30 * DAY), none)).toBe('month1');
    expect(dueFeedbackMilestone(created, at(400 * DAY), new Set(['month1']))).toBe('year1');
  });
});

describe('reachedFeedbackMilestone', () => {
  it('is null before day 3 and ignores answers', () => {
    expect(reachedFeedbackMilestone(created, at(DAY))).toBeNull();
    expect(reachedFeedbackMilestone(created, at(8 * DAY))).toBe('week1');
  });
});
