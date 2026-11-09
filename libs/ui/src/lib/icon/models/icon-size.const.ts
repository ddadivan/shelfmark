import type { IconSize } from './icon-size.type';

/** Icon sizes in design pixels, matching `--icon-size-sm|md|lg`; `Lg` is the menu and dialog size. */
export const ICON_SIZE = { Sm: 16, Md: 20, Lg: 24 } as const satisfies Record<string, IconSize>;
