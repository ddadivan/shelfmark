import type { AskOpaqueBlock } from './ask-opaque-block.interface';
import type { AskTextBlock } from './ask-text-block.interface';
import type { AskToolCallBlock } from './ask-tool-call-block.interface';

/** A block of an assistant message in an Ask transcript. */
export type AskAssistantBlock = AskTextBlock | AskToolCallBlock | AskOpaqueBlock;
