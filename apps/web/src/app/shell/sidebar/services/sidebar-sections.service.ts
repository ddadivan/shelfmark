import { Service, signal } from '@angular/core';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../models/sidebar-collapsed-storage-key.const';
import { SIDEBAR_SECTION } from '../models/sidebar-section.const';
import type { SidebarSection } from '../models/sidebar-section.type';

const SECTIONS: readonly string[] = Object.values(SIDEBAR_SECTION);

function isSection(value: unknown): value is SidebarSection {
  return typeof value === 'string' && SECTIONS.includes(value);
}

function readCollapsed(): ReadonlySet<SidebarSection> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter(isSection) : []);
  } catch {
    return new Set();
  }
}

/**
 * Which desktop sidebar sections (Pinned, Folders, Tags) are folded under their heading (#556), a
 * device preference in `localStorage`: read once (safely: garbage or blocked storage means all
 * open), written on every change, removed when every section is open again.
 */
@Service()
export class SidebarSections {
  private readonly folded = signal(readCollapsed());

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
    try {
      if (next.size === 0) {
        localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      } else {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify([...next]));
      }
    } catch {
      // Storage blocked: the sections stay as they are for this page only.
    }
  }
}
