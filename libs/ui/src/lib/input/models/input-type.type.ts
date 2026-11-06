import type { INPUT_TYPE } from './input-type.const';

/** `text`: plain; `url`: monospace, URL keyboard; `search`: search icon, `loading` spinner. */
export type InputType = (typeof INPUT_TYPE)[keyof typeof INPUT_TYPE];
