import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector, Service, signal } from '@angular/core';
import {
  FOLDER_LIMIT,
  IMPORT_ERROR_MESSAGE,
  type ImportFolder,
  type ImportGroupLink,
  type ImportGroupsRequest,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { hasApiMessage } from '../../../core/api/api-error';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportGroupDraft } from '../models/import-group-draft.interface';
import type { ImportGroupPlace } from '../models/import-group-place.interface';
import type { ImportGroupsAssignment } from '../models/import-groups-assignment.interface';
import { IMPORT_GROUPS_ERROR } from '../models/import-groups-error.const';
import type { ImportGroupsError } from '../models/import-groups-error.type';
import { cleanLine } from '../utils/clean-text';

/**
 * Step 2a of the import dialog (scoped to it): the AI groups the API made for the links of the
 * file, which the user can rename, untick and move links between. Nothing is written here; the
 * ticked groups become part of the plan when the import starts (`assignment`).
 */
@Service()
export class ImportGroupsService {
  private readonly injector = inject(Injector);
  private token = 0;

  readonly loading = signal(false);
  readonly error = signal<ImportGroupsError | null>(null);
  /** The links the groups were asked for; group indexes point into this list. */
  readonly links = signal<readonly ImportGroupLink[]>([]);
  readonly groups = signal<readonly ImportGroupDraft[]>([]);
  /** Indexes that fit no topic ("Other"): they go to the target. */
  readonly rest = signal<readonly number[]>([]);

  readonly linkCount = computed(() => this.links().length);
  readonly groupCount = computed(
    () => this.groups().filter((g) => g.linkIndexes.length > 0).length,
  );
  /** Groups that become folders: ticked, new, holding at least one link. */
  readonly newFolders = computed(() =>
    this.groups().filter((g) => g.included && g.folderId === null && g.linkIndexes.length > 0),
  );
  /** A ticked new group needs a name. */
  readonly valid = computed(() => this.newFolders().every((g) => this.cleanName(g.name) !== ''));

  readonly assignment = computed<ImportGroupsAssignment>(() => {
    const places = new Map<number, ImportGroupPlace>();
    const folders: ImportFolder[] = [];
    for (const group of this.groups()) {
      if (!group.included || group.linkIndexes.length === 0) continue;
      if (group.folderId === null) {
        folders.push({ key: group.key, parentKey: null, name: this.cleanName(group.name) });
        for (const index of group.linkIndexes) places.set(index, { folderKey: group.key });
      } else {
        for (const index of group.linkIndexes) places.set(index, { folderId: group.folderId });
      }
    }
    return { folders, places };
  });

  /** Asks the API for groups; a failure shows as `error` (nothing was taken from the allowance). */
  async load(request: ImportGroupsRequest): Promise<void> {
    const token = ++this.token;
    this.loading.set(true);
    this.error.set(null);
    this.links.set(request.links);
    this.groups.set([]);
    this.rest.set([]);
    try {
      const response = await firstValueFrom(this.injector.get(IMPORT_API).groups(request));
      if (token !== this.token) return;
      this.groups.set(
        response.groups.map((group) => ({
          key: group.key,
          name: group.name,
          folderId: group.folderId,
          included: true,
          linkIndexes: group.linkIndexes,
        })),
      );
      this.rest.set(response.rest);
    } catch (error) {
      if (token !== this.token) return;
      this.error.set(
        error instanceof HttpErrorResponse &&
          error.status === HttpStatusCode.Conflict &&
          !hasApiMessage(error, IMPORT_ERROR_MESSAGE.AiUnavailable)
          ? IMPORT_GROUPS_ERROR.Allowance
          : IMPORT_GROUPS_ERROR.Failed,
      );
    } finally {
      if (token === this.token) this.loading.set(false);
    }
  }

  /** Drops the groups and any answer still on its way (Back to the check). */
  reset(): void {
    this.token++;
    this.loading.set(false);
    this.error.set(null);
    this.links.set([]);
    this.groups.set([]);
    this.rest.set([]);
  }

  rename(key: string, name: string): void {
    this.update(key, { name: name.slice(0, FOLDER_LIMIT.NameMax) });
  }

  setIncluded(key: string, included: boolean): void {
    this.update(key, { included });
  }

  /** Moves a link to another group, or to "Other" (`null`). */
  move(index: number, to: string | null): void {
    this.groups.update((groups) =>
      groups.map((group) => {
        const without = group.linkIndexes.filter((item) => item !== index);
        return group.key === to
          ? { ...group, linkIndexes: [...without, index].sort((a, b) => a - b) }
          : { ...group, linkIndexes: without };
      }),
    );
    this.rest.update((rest) => {
      const without = rest.filter((item) => item !== index);
      return to === null ? [...without, index].sort((a, b) => a - b) : without;
    });
  }

  /** Where a link is now: a group key, or `null` for "Other". */
  placeOf(index: number): string | null {
    return this.groups().find((group) => group.linkIndexes.includes(index))?.key ?? null;
  }

  private update(key: string, change: Partial<ImportGroupDraft>): void {
    this.groups.update((groups) =>
      groups.map((group) => (group.key === key ? { ...group, ...change } : group)),
    );
  }

  private cleanName(name: string): string {
    return cleanLine(name, FOLDER_LIMIT.NameMax);
  }
}
