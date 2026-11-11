import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FEEDBACK_STATUS,
  PAGE_LIMIT,
  type FeedbackStatus,
  type ListAdminFeedbackQuery,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListAdminFeedbackQueryDto implements ListAdminFeedbackQuery {
  @ApiPropertyOptional({ enum: Object.values(FEEDBACK_STATUS) })
  @IsOptional()
  @IsIn(Object.values(FEEDBACK_STATUS))
  status?: FeedbackStatus;

  @ApiPropertyOptional({ description: 'nextCursor of the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_LIMIT.CursorMax)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: PAGE_LIMIT.Max, default: PAGE_LIMIT.Default })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_LIMIT.Max)
  limit?: number;
}
