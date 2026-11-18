import type { AskAllowance } from './ask-allowance.interface';

/** Ask your shelf state in the AI settings answer. */
export interface AskStatus {
  /** AI on and the Ask switch on: the web shows the Ask entry points. */
  available: boolean;
  allowance: AskAllowance;
}
