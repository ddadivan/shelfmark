import { APP_PATH } from '../../../models/app-path.const';
import { SETTINGS_PATH } from '../../settings/models/settings-path.const';
import { CLEANUP_SEGMENT } from './cleanup-segment.const';

/** The clean-up page (Settings › Library › Clean up; You › Library › Clean up on the phone). */
export const CLEANUP_HREF = `/${APP_PATH.Settings}/${SETTINGS_PATH.Library}/${CLEANUP_SEGMENT}`;
