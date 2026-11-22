import { TOOLTIP_GROUP_WARM_MS } from './models/tooltip-group.const';
import type { TooltipGroupMember } from './models/tooltip-group-member.interface';

/**
 * Shared state of a `uiTooltipGroup`: which tooltip is open, whether the group is warm (one is
 * open, or one closed less than 300 ms ago) and where the last panel sat, so the next one can
 * travel from there.
 */
export class TooltipGroupState {
  private active: TooltipGroupMember | null = null;
  private warmUntil = 0;
  private lastRect: DOMRect | null = null;

  /** A neighbour opens at once (no delay) while the group is warm. */
  isWarm(): boolean {
    return this.active !== null || Date.now() < this.warmUntil;
  }

  /** `member` opened: the previous one closes instantly. Returns where the last panel was. */
  open(member: TooltipGroupMember): DOMRect | null {
    const previous = this.active;
    const warm = this.isWarm();
    this.active = member;
    if (previous && previous !== member) {
      previous.closeNow();
    }
    return warm ? this.lastRect : null;
  }

  /** Remembers the place of a panel that is about to go. */
  remember(rect: DOMRect | null): void {
    if (rect) {
      this.lastRect = rect;
    }
  }

  /** `member` closed: the group stays warm for a moment. */
  closed(member: TooltipGroupMember): void {
    if (this.active === member) {
      this.active = null;
      this.warmUntil = Date.now() + TOOLTIP_GROUP_WARM_MS;
    }
  }

  /** The pointer left the group: close at once and go cold. */
  leave(): void {
    const active = this.active;
    this.active = null;
    this.warmUntil = 0;
    this.lastRect = null;
    active?.closeNow();
  }
}
