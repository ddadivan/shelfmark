import type { HELP_VOTE } from './help-vote.const';

export type HelpVote = (typeof HELP_VOTE)[keyof typeof HELP_VOTE];
