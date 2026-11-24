import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  MCP_LIMIT,
  MCP_TOKEN_ACCESS,
  MCP_TOKEN_EXPIRY_DAYS,
  type McpTokenAccess,
} from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  RadioGroupComponent,
  SegmentedControlComponent,
  SettingsRowComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  UiDialogRef,
  type RadioOption,
  type SegmentedOption,
} from '@shelfmark/ui';
import { MCP_NAME_ERROR } from '../../models/mcp-name-error.const';
import { MCP_TOKEN_ERROR_KEY } from '../../models/mcp-token-error-key.const';
import type { McpTokenError } from '../../models/mcp-token-error.type';
import { McpTokensStore } from '../../services/mcp-tokens.store';
import { copyText } from '../../utils/copy-text';
import { maskSecret } from '../../utils/mask-secret';

/** The segmented value of "Never" in Expires. */
const EXPIRY_NEVER = 'never';

/**
 * Create a personal MCP token (AiConnect board 2, Shelf 15-tools "New token"): a name, Access
 * (read only, or read and save), Expires (30 days, 90 days, never) and "Include my notes" (off), then the
 * shown-once view with the masked token, Copy and the warning. The secret lives only in this
 * dialog's signal: never in a store, storage or log, and cleared when the dialog closes (Done,
 * Esc, the close button or the scrim). A phone shows it as a bottom sheet (`ui-dialog`).
 */
@Component({
  selector: 'app-create-token-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    RadioGroupComponent,
    SegmentedControlComponent,
    SettingsRowComponent,
    SwitchComponent,
    TranslocoPipe,
  ],
  templateUrl: './create-token-dialog.component.html',
  styleUrl: './create-token-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTokenDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly MCP_LIMIT = MCP_LIMIT;
  protected readonly MCP_TOKEN_ERROR_KEY = MCP_TOKEN_ERROR_KEY;

  private readonly store = inject(McpTokensStore);
  private readonly ref = inject<UiDialogRef<void>>(UiDialogRef);
  private readonly doc = inject(DOCUMENT);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly secretField = viewChild<InputComponent>('secretField');

  private readonly model = signal({ name: '' });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.name, { message: () => this.text('ai.connect.create.required') });
      validate(path.name, ({ value }): ValidationError.WithoutFieldTree | undefined =>
        value() !== '' && value().trim() === ''
          ? { kind: MCP_NAME_ERROR.Blank, message: this.text('ai.connect.create.required') }
          : undefined,
      );
      maxLength(path.name, MCP_LIMIT.NameMax, {
        message: () => this.text('ai.connect.create.tooLong', { max: MCP_LIMIT.NameMax }),
      });
    },
    {
      submission: {
        action: () => this.create(),
        onInvalid: () => {
          this.form().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
      },
    },
  );

  protected readonly includeNotes = signal(false);
  /** Shelf 15-tools: "Read only" or "Read and save" (fixed per token). */
  protected readonly access = signal<McpTokenAccess>(MCP_TOKEN_ACCESS.Read);
  /** Expires: `30`, `90` or `never` as the segmented value. */
  protected readonly expiry = signal<string>(String(MCP_TOKEN_EXPIRY_DAYS[1]));

  protected readonly accessOptions = computed<RadioOption[]>(() =>
    Object.values(MCP_TOKEN_ACCESS).map((value) => ({
      value,
      title: this.text(`ai.connect.create.accessOption.${value}.title`),
      description: this.text(`ai.connect.create.accessOption.${value}.hint`),
    })),
  );
  protected readonly expiryOptions = computed<SegmentedOption[]>(() => [
    ...MCP_TOKEN_EXPIRY_DAYS.map((days) => ({
      value: String(days),
      label: this.text('ai.connect.create.days', { count: days }),
    })),
    { value: EXPIRY_NEVER, label: this.text('ai.connect.create.never') },
  ]);
  protected readonly saving = signal(false);
  protected readonly error = signal<McpTokenError | null>(null);

  /** The new token's name and secret; `null` before creation and after closing. */
  private readonly created = signal<{ name: string; secret: string } | null>(null);
  protected readonly createdName = computed(() => this.created()?.name ?? '');
  protected readonly secret = computed(() => this.created()?.secret ?? '');
  protected readonly masked = computed(() => maskSecret(this.secret()));
  protected readonly shown = computed(() => this.created() !== null);
  protected readonly title = computed(() => {
    const created = this.created();
    return created === null
      ? this.text('ai.connect.create.title')
      : this.text('ai.connect.secret.title', { name: created.name });
  });
  /** The clipboard refused: the whole token is shown in a selected read-only field. */
  protected readonly copyFailed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clear();
    });
  }

  protected setAccess(value: string): void {
    const access = Object.values(MCP_TOKEN_ACCESS).find((item) => item === value);
    if (access) this.access.set(access);
  }

  protected setExpiry(value: string): void {
    this.expiry.set(value);
  }

  protected setIncludeNotes(on: boolean): void {
    this.includeNotes.set(on);
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected async copy(): Promise<void> {
    if (await copyText(this.doc, this.secret())) {
      this.copyFailed.set(false);
      this.toasts.show({ kind: TOAST_KIND.Success, title: this.text('ai.connect.secret.copied') });
      return;
    }
    this.copyFailed.set(true);
    // The field appears with this change; select it once it is drawn.
    queueMicrotask(() => this.secretField()?.select());
  }

  protected done(): void {
    this.clear();
    this.ref.close();
  }

  private async create(): Promise<undefined> {
    // Enter in the shown-once view must not create a second token.
    if (this.saving() || this.shown()) return;
    this.saving.set(true);
    this.error.set(null);
    this.ref.setLocked(true);
    const name = this.model().name.trim();
    const days = MCP_TOKEN_EXPIRY_DAYS.find((item) => String(item) === this.expiry()) ?? null;
    const result = await this.store.create({
      name,
      includeNotes: this.includeNotes(),
      access: this.access(),
      expiresInDays: days,
    });
    this.ref.setLocked(false);
    this.saving.set(false);
    if (result.ok) {
      this.created.set({ name: result.response.token.name, secret: result.response.secret });
    } else {
      this.error.set(result.error);
    }
    return undefined;
  }

  private clear(): void {
    this.created.set(null);
    this.copyFailed.set(false);
  }

  /** Reads `i18n` so a message re-translates when the language changes or loads. */
  private text(key: string, params?: Record<string, unknown>): string {
    this.i18n();
    return this.transloco.translate(key, params);
  }
}
