import type { AskTextBlock } from './ask-text-block.interface';
import type { AskToolResultBlock } from './ask-tool-result-block.interface';

/** A block of a user message in an Ask transcript. */
export type AskUserBlock = AskTextBlock | AskToolResultBlock;
