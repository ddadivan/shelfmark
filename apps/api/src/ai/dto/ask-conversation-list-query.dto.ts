import { ApiPropertyOptional } from '@nestjs/swagger';
import { ASK_HISTORY_LIMIT, type AskConversationListQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** `GET /api/ai/ask/conversations` query. */
export class AskConversationListQueryDto implements AskConversationListQuery {
  @ApiPropertyOptional({ description: 'The nextCursor of the previous page', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9_-]+$/)
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ASK_HISTORY_LIMIT.PageMax,
    default: ASK_HISTORY_LIMIT.PageSize,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ASK_HISTORY_LIMIT.PageMax)
  limit?: number;
}
