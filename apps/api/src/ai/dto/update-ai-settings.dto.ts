import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AI_FEATURE_MODE,
  type AiFeatureMode,
  type AiSummaryLanguage,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { IsBoolean, IsIn, ValidateIf } from 'class-validator';
import { AI_SUMMARY_LANGUAGES } from '../models/ai-summary-languages.const';

// Absent is fine, but an explicit null is not (IsOptional would let it through).
const present = (_: unknown, value: unknown): boolean => value !== undefined;

/** `PATCH /api/ai/settings`: the fields to change; the service refuses an empty body. */
export class UpdateAiSettingsDto implements UpdateAiSettingsRequest {
  @ApiPropertyOptional({
    description: 'The main switch; the first true records that the intro was seen',
  })
  @ValidateIf(present)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: Object.values(AI_FEATURE_MODE) })
  @ValidateIf(present)
  @IsIn(Object.values(AI_FEATURE_MODE))
  folderMode?: AiFeatureMode;

  @ApiPropertyOptional({ enum: Object.values(AI_FEATURE_MODE) })
  @ValidateIf(present)
  @IsIn(Object.values(AI_FEATURE_MODE))
  tagsMode?: AiFeatureMode;

  @ApiPropertyOptional()
  @ValidateIf(present)
  @IsBoolean()
  summaries?: boolean;

  @ApiPropertyOptional({ description: 'Send the link note to the model' })
  @ValidateIf(present)
  @IsBoolean()
  includeNotes?: boolean;

  @ApiPropertyOptional({ enum: AI_SUMMARY_LANGUAGES })
  @ValidateIf(present)
  @IsIn(AI_SUMMARY_LANGUAGES)
  summaryLanguage?: AiSummaryLanguage;

  @ApiPropertyOptional({
    description:
      'Search by meaning and related links: title, tag names, summary (and the note with includeNotes) go to the embedding provider',
  })
  @ValidateIf(present)
  @IsBoolean()
  meaningSearch?: boolean;
}
