import { ASK_PERIOD, type AskAllowance } from '@shelfmark/contracts';
import { pluralKey } from '../../../core/i18n/plural-key';

/** The "{n} questions left today / this month" key and count for an allowance. */
export function askAllowanceLine(allowance: AskAllowance): { key: string; count: number } {
  const base = allowance.period === ASK_PERIOD.Day ? 'ai.ask.left.day' : 'ai.ask.left.month';
  return { key: pluralKey(base, allowance.questionsLeft), count: allowance.questionsLeft };
}
