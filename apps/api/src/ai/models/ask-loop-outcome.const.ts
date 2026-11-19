/**
 * How one profile's tool loop ended (ADR 0055 point 5): the model answered, asked for the deep
 * profile (accepted), the provider failed, the model refused, a model call gave no first output in
 * time, the hard stop passed, or the client went away.
 */
export const ASK_LOOP_OUTCOME = {
  Answered: 'answered',
  Escalate: 'escalate',
  Failed: 'failed',
  Refused: 'refused',
  FirstOutput: 'first-output',
  HardStop: 'hard-stop',
  Client: 'client',
} as const;
