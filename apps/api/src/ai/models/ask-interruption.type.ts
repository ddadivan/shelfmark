/** Why an Ask provider stream stopped early: a deadline or the client going away. */
export type AskInterruption = 'first-token' | 'hard-stop' | 'client';
