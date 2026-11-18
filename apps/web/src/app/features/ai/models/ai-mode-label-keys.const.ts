import { AI_FEATURE_MODE, type AiFeatureMode } from '@shelfmark/contracts';

/** Short label of each folder / tags mode (the segmented control and the phone row value). */
export const AI_MODE_LABEL_KEYS: Readonly<Record<AiFeatureMode, string>> = {
  [AI_FEATURE_MODE.Suggest]: 'ai.settings.mode.suggest',
  [AI_FEATURE_MODE.Auto]: 'ai.settings.mode.auto',
  [AI_FEATURE_MODE.Off]: 'ai.settings.mode.off',
};
