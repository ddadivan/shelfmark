import type { FlagCode } from '../../flag/models/flag-code.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One choice of `ui-radio-group`; `title` and `description` are already translated. */
export interface RadioOption {
  readonly value: string;
  readonly title: string;
  /** Explanation under the title. */
  readonly description?: string;
  /** A flag before the title (the language list, #315); decorative, the title names it. */
  readonly flag?: FlagCode;
  /** An icon before the title when there is no flag; decorative. */
  readonly icon?: IconName;
  /** `lang` of the title, for a name written in its own language ("Deutsch"). */
  readonly lang?: string;
}
