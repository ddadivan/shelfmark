import { Injectable } from '@nestjs/common';
import type { TagLinksChangedListener } from './models/tag-links-changed-listener.type';

/**
 * A small seam for modules that `TagsModule` must not import: `AiModule` imports `TagsModule`, so
 * the embed pass (AI-3) registers here instead of being injected into `TagsService`. `TagsService`
 * calls `linksChanged` after a rename, delete or merge has committed and flagged vectors stale.
 * Listeners must not throw (the embed kick never does).
 */
@Injectable()
export class TagChangeHooks {
  private readonly listeners: TagLinksChangedListener[] = [];

  onLinksChanged(listener: TagLinksChangedListener): void {
    this.listeners.push(listener);
  }

  async linksChanged(userId: string): Promise<void> {
    for (const listener of this.listeners) await listener(userId);
  }
}
