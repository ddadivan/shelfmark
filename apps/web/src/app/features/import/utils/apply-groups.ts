import type { ImportGroupsAssignment } from '../models/import-groups-assignment.interface';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ImportPlanLink } from '../models/import-plan-link.interface';

/**
 * Puts the AI groups into a flat plan: the ticked new groups become folders directly under the
 * target, a link of a ticked existing group gets that folder's id, everything else stays in the
 * target. `plan.links` is the list the groups were asked for, so indexes line up.
 */
export function applyGroups(plan: ImportPlan, assignment: ImportGroupsAssignment): ImportPlan {
  const links = plan.links.map((link, index): ImportPlanLink => {
    const place = assignment.places.get(index);
    if (place?.folderId !== undefined)
      return { ...link, folderKey: null, folderId: place.folderId };
    if (place?.folderKey !== undefined) return { ...link, folderKey: place.folderKey };
    return { ...link, folderKey: null };
  });
  return { ...plan, folders: assignment.folders, links };
}
