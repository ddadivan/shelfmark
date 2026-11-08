import { FEEDBACK_MILESTONE } from './feedback-milestone.const';
import { FEEDBACK_MILESTONE_DAYS } from './feedback-milestone-days.const';
import type { FeedbackMilestone } from './feedback-milestone.type';

const DAY_MS = 86_400_000;

/** Milestones ordered by their day count, ascending. */
const ASCENDING = Object.values(FEEDBACK_MILESTONE).sort(
  (a, b) => FEEDBACK_MILESTONE_DAYS[a] - FEEDBACK_MILESTONE_DAYS[b],
);

/** The latest milestone reached `days * 24h` after sign-up, or null when none is reached yet. */
export function reachedFeedbackMilestone(createdAt: Date, now: Date): FeedbackMilestone | null {
  let reached: FeedbackMilestone | null = null;
  for (const milestone of ASCENDING) {
    if (now.getTime() >= createdAt.getTime() + FEEDBACK_MILESTONE_DAYS[milestone] * DAY_MS) {
      reached = milestone;
    }
  }
  return reached;
}

/**
 * The milestone to ask about: the latest one reached, unless it was already answered. Earlier
 * unanswered milestones are skipped on purpose (one prompt at a time, never a backlog).
 */
export function dueFeedbackMilestone(
  createdAt: Date,
  now: Date,
  answered: ReadonlySet<FeedbackMilestone>,
): FeedbackMilestone | null {
  const reached = reachedFeedbackMilestone(createdAt, now);
  return reached !== null && !answered.has(reached) ? reached : null;
}
