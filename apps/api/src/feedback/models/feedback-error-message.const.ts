/** Error messages of the feedback API, one place so the service and the tests agree. */
export const FEEDBACK_ERROR_MESSAGE = {
  DemoUser: 'Feedback is not available in demo mode',
  OnboardingPending: 'Complete onboarding first',
  MilestoneNotReached: 'This milestone has not been reached yet',
  ScoreMismatch: 'This milestone already has a different score',
  CommentTooLong: 'The combined comment is too long',
  MessageLimit: 'Too many messages, try again later',
} as const;
