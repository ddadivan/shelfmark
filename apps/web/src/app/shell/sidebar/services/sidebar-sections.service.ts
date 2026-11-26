import { inject, Service, signal } from '@angular/core';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SIDEBAR_SECTION } from '../models/sidebar-section.const';
import type { SidebarSection } from '../models/sidebar-section.type';

const SECTIONS: readonly string[] = Object.values(SIDEBAR_SECTION);

function isSection(value: unknown): value is SidebarSection {
  return typeof value === 'string' && SECTIONS.includes(value);
}

/** Until the person folds or opens a section, Tags starts folded (Shelf reference sidebar). */
const DEFAULT_COLLAPSED: readonly SidebarSection[] = [SIDEBAR_SECTION.Tags];

function readCollapsed(storage: SafeStorage): ReadonlySet<SidebarSection> {
  // Not stored, garbage or blocked: the default. A stored non-list means "all open".
  const stored = storage.getJsonValue(STORAGE_KEY.SidebarCollapsed);
  if (stored === undefined) {
    return new Set(DEFAULT_COLLAPSED);
  }
  return new Set(Array.isArray(stored) ? stored.filter(isSection) : []);
}

/**
 * Which desktop sidebar sections (Pinned, Folders, Tags) are folded under their heading (#556), a
 * device preference in `localStorage`: read once (no choice yet, garbage or blocked storage means
 * the default: Tags folded, as in the Shelf reference), written on every change (an empty list
 * when every section is open).
 */
@Service()
export class SidebarSections {
  private readonly storage = inject(SafeStorage);
  private readonly folded = signal(readCollapsed(this.storage));

  collapsed(section: SidebarSection): boolean {
    return this.folded().has(section);
  }

  setCollapsed(section: SidebarSection, collapsed: boolean): void {
    if (this.collapsed(section) === collapsed) {
      return;
    }
    const next = new Set(this.folded());
    if (collapsed) {
      next.add(section);
    } else {
      next.delete(section);
    }
    this.folded.set(next);
    // Storage blocked: the sections stay as they are for this page only.
    this.storage.setJson(STORAGE_KEY.SidebarCollapsed, [...next]);
  }
}
