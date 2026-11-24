import { computed, signal } from '@angular/core';
import type { ReaderArticle } from '@shelfmark/contracts';
import { PREVIEW_MODE } from '../app/features/link-preview/models/preview-mode.const';
import type { PreviewMode } from '../app/features/link-preview/models/preview-mode.type';
import { READER_SETTINGS_DEFAULT } from '../app/features/reader/models/reader-settings-default.const';
import type { ReaderSettings } from '../app/features/reader/models/reader-settings.interface';

/** A stand-in for `PreviewReaderService` in component specs: writable state, spied actions. */
export function createPreviewReaderStub() {
  const mode = signal<PreviewMode>(PREVIEW_MODE.Site);
  const article = signal<ReaderArticle | null>(null);
  const loading = signal(false);
  const settings = signal<ReaderSettings>({ ...READER_SETTINGS_DEFAULT });
  const detailsOpen = signal(false);
  return {
    mode,
    article,
    loading,
    settings,
    detailsOpen,
    reading: computed(() => mode() === PREVIEW_MODE.Reader),
    empty: computed(() => mode() === PREVIEW_MODE.Reader && !loading() && article() === null),
    meta: signal(''),
    notice: signal(''),
    setMode: vi.fn((next: PreviewMode) => mode.set(next)),
    toggleDetails: vi.fn(() => detailsOpen.update((open) => !open)),
    setSettings: vi.fn((change: Partial<ReaderSettings>) =>
      settings.update((all) => ({ ...all, ...change })),
    ),
    onProgress: vi.fn(() => Promise.resolve()),
  };
}

export type PreviewReaderStub = ReturnType<typeof createPreviewReaderStub>;

/** A stand-in for `LinkActionsService` with the actions the Link page calls. */
export function createLinkActionsStub() {
  return {
    edit: vi.fn(() => Promise.resolve()),
    toggleFavorite: vi.fn(() => Promise.resolve()),
    togglePinInFolder: vi.fn(() => Promise.resolve()),
    togglePinToSidebar: vi.fn(() => Promise.resolve()),
    move: vi.fn(() => Promise.resolve()),
    remind: vi.fn(() => Promise.resolve()),
    createRule: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    open: vi.fn(),
  };
}
