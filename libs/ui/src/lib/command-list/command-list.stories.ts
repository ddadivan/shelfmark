import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { DialogComponent } from '../dialog/dialog.component';
import { DialogService } from '../dialog/dialog.service';
import { UiDialogRef } from '../dialog/dialog-ref';
import { injectDialogData } from '../dialog/inject-dialog-data';
import { DIALOG_SIZE } from '../dialog/models/dialog-size.const';
import { DIALOG_VARIANT } from '../dialog/models/dialog-variant.const';
import { FaviconComponent } from '../favicon/favicon.component';
import { HighlightComponent } from '../highlight/highlight.component';
import { IconComponent } from '../icon/icon.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { CommandGroupComponent } from './command-group.component';
import { CommandItemComponent } from './command-item.component';
import { CommandListComponent } from './command-list.component';

interface DemoLink {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
}

const LINKS: readonly DemoLink[] = [
  {
    id: 'l1',
    title: 'Angular 22: everything about Signal Forms in 20 minutes',
    meta: 'youtube.com, in Work / Angular',
  },
  {
    id: 'l2',
    title: 'NgRx SignalStore: patterns for real apps',
    meta: 'dev.to, in Work / Angular',
  },
  {
    id: 'l3',
    title: 'Signals vs RxJS: when to use which',
    meta: 'medium.com, note matches: interview prep',
  },
  { id: 'l4', title: 'A wool coat for autumn', meta: 'cos.com, in Wishlist' },
];

const TEXTS = {
  inputLabel: 'Search links, folders and tags',
  placeholder: 'Search links, folders and tags',
};

/** Matching links, a folder and a tag for the query; filtering is the feature's job, here it is local. */
@Component({
  selector: 'ui-command-list-story-results',
  imports: [
    CommandListComponent,
    CommandGroupComponent,
    CommandItemComponent,
    HighlightComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-command-list
      listLabel="Search results"
      inputLabel="Search links, folders and tags"
      placeholder="Search links, folders and tags"
      [busy]="busy()"
      [(query)]="query"
    >
      <kbd slot="input-end">Esc</kbd>
      <span slot="status">{{ links().length }} results</span>
      @if (links().length) {
        <ui-command-group [heading]="links().length + ' links'">
          @for (link of links(); track link.id) {
            <ui-command-item [value]="link.id">
              <ui-highlight [text]="link.title" [query]="query()" />
              <span slot="meta">{{ link.meta }}</span>
              <kbd slot="trailing"><ui-icon name="key-enter" [size]="16" /></kbd>
            </ui-command-item>
          }
        </ui-command-group>
      }
      @if (showFolders()) {
        <ui-command-group heading="Folders and tags">
          <ui-command-item value="folder">
            <ui-highlight text="Work / Angular / Signals" [query]="query()" />
            <span slot="trailing">5 links</span>
          </ui-command-item>
          <ui-command-item value="tag">
            <ui-highlight text="signals" [query]="query()" />
            <span slot="meta">Tag, 12 links</span>
          </ui-command-item>
        </ui-command-group>
      }
      <p slot="empty">Nothing found for “{{ query() }}”</p>
      <span slot="footer"><kbd>↑</kbd> <kbd>↓</kbd> move</span>
      <span slot="footer"
        ><kbd><span aria-hidden="true">↑</span><span class="ui-command-list__sr">Up</span></kbd
        ><kbd><span aria-hidden="true">↓</span><span class="ui-command-list__sr">Down</span></kbd>
        move</span
      >
      <span slot="footer"
        ><kbd
          ><ui-icon name="key-enter" [size]="16" /><span class="ui-command-list__sr"
            >Enter</span
          ></kbd
        >
        open</span
      >
      <span slot="footer"
        ><kbd><ui-icon name="key-command" [size]="16" /></kbd>
        <kbd><ui-icon name="key-enter" [size]="16" /></kbd> open in background</span
      >
    </ui-command-list>
  `,
})
class StoryResultsComponent {
  protected readonly busy = signal(false);
  protected readonly query = signal('signal');
  protected readonly links = computed(() => {
    const terms = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    return LINKS.filter((l) =>
      terms.every((t) => `${l.title} ${l.meta}`.toLowerCase().includes(t)),
    );
  });
  protected readonly showFolders = computed(() => this.query().toLowerCase().includes('signal'));
}

/** The list inside a `ui-dialog`: live through `DialogService`, so focus lands in the input. */
@Component({
  selector: 'ui-command-list-story-dialog',
  imports: [
    DialogComponent,
    CommandListComponent,
    CommandGroupComponent,
    CommandItemComponent,
    IconComponent,
    FaviconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog title="Search" closeLabel="Close" size="md" [phoneFullscreen]="command">
      <ui-command-list
        listLabel="Search results"
        inputLabel="Search links, folders and tags"
        placeholder="Search"
        (selected)="ref.close($event.value)"
      >
        <ui-command-group heading="Links">
          @for (link of links; track link.id) {
            <ui-command-item [value]="link.id">
              <ui-favicon slot="leading" [letter]="link.meta" />
              {{ link.title }}
              <span slot="meta">{{ link.meta }}</span>
            </ui-command-item>
          }
        </ui-command-group>
        <span slot="footer"
          ><kbd><ui-icon name="key-enter" [size]="16" /></kbd> open</span
        >
      </ui-command-list>
    </ui-dialog>
  `,
})
class StoryDialogComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
  protected readonly links = LINKS;
  protected readonly command = injectDialogData<boolean>() === true;
}

@Component({
  selector: 'ui-command-list-story-demo',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cls-demo">
      <ui-button variant="primary" (click)="open()">Open search</ui-button>
      <p class="cls-result" aria-live="polite">{{ result() }}</p>
    </div>
  `,
})
class StoryDemoComponent {
  /** The command dialog (top, glass) of the search overlay, or the plain dialog / phone sheet. */
  readonly command = input(false);

  private readonly dialogs = inject(DialogService);
  protected readonly result = signal('Nothing chosen yet.');

  protected async open(): Promise<void> {
    const chosen = await this.dialogs.open<StoryDialogComponent, string, boolean>(
      StoryDialogComponent,
      {
        size: DIALOG_SIZE.Md,
        variant: this.command() ? DIALOG_VARIANT.Command : DIALOG_VARIANT.Default,
        data: this.command(),
        autoFocus: 'input',
      },
    ).result;
    this.result.set(chosen ? `Chosen: ${chosen}` : 'Dismissed.');
  }
}

const meta: Meta<CommandListComponent> = {
  title: 'Components/CommandList',
  component: CommandListComponent,
  subcomponents: { CommandGroupComponent, CommandItemComponent },
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The list of the search dialog: a text input on Angular Aria combobox (always expanded, ' +
          '`aria-activedescendant`, focus stays in the input) and a listbox of `ui-command-item`s in ' +
          'optional `ui-command-group`s. Up / Down move and wrap, Home / End jump, Enter emits ' +
          '`selected`, Ctrl or Cmd with Enter or a click emits it with `background: true`. The ' +
          'feature filters and passes `query` and `busy`; slots: `input-end`, `empty`, `footer` ' +
          '(`kbd` is styled). Rows are 44px high on touch.',
      },
    },
  },
  args: {
    inputLabel: TEXTS.inputLabel,
    listLabel: 'Search results',
    placeholder: TEXTS.placeholder,
    busy: false,
  },
};

export default meta;
type Story = StoryObj<CommandListComponent>;

const box = (inner: string): string => `<div class="cls-box">${inner}</div>`;
const imports = [
  StoryResultsComponent,
  StoryDemoComponent,
  CommandListComponent,
  CommandGroupComponent,
  CommandItemComponent,
  HighlightComponent,
  IconComponent,
  FaviconComponent,
];

/** Type to filter; the matching part is marked. Enter or a click chooses, the demo ignores it. */
export const Results: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: box('<ui-command-list-story-results />'),
  }),
};

/** No match: the empty slot sits in a status region and the listbox is hidden. */
export const Empty: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: box(`
      <ui-command-list [inputLabel]="inputLabel" listLabel="Search results" [placeholder]="placeholder" query="rxjs">
        <p slot="empty">Nothing found for “rxjs”</p>
        <span slot="footer"><kbd>Esc</kbd> close</span>
      </ui-command-list>`),
  }),
};

/** `busy` sets `aria-busy` on the list while the results are updating. */
export const Busy: Story = {
  args: { busy: true },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: box(`
      <ui-command-list [inputLabel]="inputLabel" listLabel="Search results" [placeholder]="placeholder" [busy]="busy" query="sig">
        <ui-command-group heading="Links">
          <ui-command-item value="a">Signals vs RxJS: when to use which</ui-command-item>
        </ui-command-group>
      </ui-command-list>`),
  }),
};

/** Items need no group. */
export const WithoutGroups: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: box(`
      <ui-command-list [inputLabel]="inputLabel" listLabel="Search results" [placeholder]="placeholder">
        <ui-command-item value="a">Add link <kbd slot="trailing">A</kbd></ui-command-item>
        <ui-command-item value="b">New folder <kbd slot="trailing">N</kbd></ui-command-item>
        <ui-command-item value="c" disabled>Export (soon)</ui-command-item>
      </ui-command-list>`),
  }),
};

/**
 * The search overlay: a command dialog (glass, 680px, 96px from the top). Focus lands in the
 * input, Esc closes, choosing a row closes with its value; on a phone it is a full page.
 */
export const InDialog: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports },
    template: '<ui-command-list-story-demo [command]="true" />',
  }),
};

/** The same list in a plain centred dialog. */
export const InPlainDialog: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({ moduleMetadata: { imports }, template: '<ui-command-list-story-demo />' }),
};

/** Below 40em the dialog is a bottom sheet; the list scrolls inside it and rows stay 44px on touch. */
export const InPhoneSheet: Story = {
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => ({ moduleMetadata: { imports }, template: '<ui-command-list-story-demo />' }),
};

/** Results, empty and busy in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME) },
    moduleMetadata: { imports },
    template: `
      <div class="cls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="cls-panel">
            <div class="cls-box">
              <ui-command-list listLabel="Search results" inputLabel="Search links" query="signal">
                <kbd slot="input-end">Esc</kbd>
                <ui-command-group heading="3 links">
                  <ui-command-item value="a">
                    <ui-favicon slot="leading" letter="y" />
                    <ui-highlight text="Angular 22: Signal Forms in 20 minutes" query="signal" />
                    <span slot="meta">youtube.com, in Work / Angular</span>
                  </ui-command-item>
                  <ui-command-item value="b">
                    <ui-favicon slot="leading" letter="m" />
                    <ui-highlight text="Signals vs RxJS" query="signal" />
                    <span slot="meta">medium.com</span>
                  </ui-command-item>
                </ui-command-group>
                <ui-command-group heading="Folders and tags">
                  <ui-command-item value="c">
                    <ui-icon slot="leading" name="folder" />
                    <ui-highlight text="Work / Angular / Signals" query="signal" />
                    <span slot="trailing">5 links</span>
                  </ui-command-item>
                  <ui-command-item value="d" disabled>Disabled row</ui-command-item>
                </ui-command-group>
                <span slot="footer"><kbd>↑</kbd> <kbd>↓</kbd> move</span>
                <span slot="footer"><kbd><ui-icon name="key-enter" [size]="16" /></kbd> open</span>
              </ui-command-list>
            </div>
            <div class="cls-box">
              <ui-command-list listLabel="Search results" inputLabel="Search links" query="rxjs">
                <p slot="empty">Nothing found for “rxjs”</p>
              </ui-command-list>
            </div>
            <div class="cls-box">
              <ui-command-list listLabel="Search results" inputLabel="Search links" query="sig" busy>
                <ui-command-item value="a">Signals vs RxJS</ui-command-item>
              </ui-command-list>
            </div>
          </div>
        }
      </div>`,
  }),
};
