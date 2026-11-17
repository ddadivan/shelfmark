import { ApiProperty } from '@nestjs/swagger';
import {
  AI_FEATURE_MODE,
  type AiFeatureMode,
  type AiSettings,
  type AiSummaryLanguage,
} from '@shelfmark/contracts';
import { AI_SUMMARY_LANGUAGES } from '../models/ai-summary-languages.const';

export class AiSettingsDto implements AiSettings {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: Object.values(AI_FEATURE_MODE) }) folderMode!: AiFeatureMode;
  @ApiProperty({ enum: Object.values(AI_FEATURE_MODE) }) tagsMode!: AiFeatureMode;
  @ApiProperty() summaries!: boolean;
  @ApiProperty() includeNotes!: boolean;
  @ApiProperty({ enum: AI_SUMMARY_LANGUAGES }) summaryLanguage!: AiSummaryLanguage;
}
