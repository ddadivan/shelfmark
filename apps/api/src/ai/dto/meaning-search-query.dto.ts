import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AI_SEARCH_LIMIT, type MeaningSearchQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

/** `GET /api/ai/search`: the service trims and collapses `q` and checks its length again. */
export class MeaningSearchQueryDto implements MeaningSearchQuery {
  @ApiProperty({ minLength: AI_SEARCH_LIMIT.QueryMinChars, maxLength: AI_SEARCH_LIMIT.QueryMax })
  @IsString()
  @NoControlChars()
  // Room for whitespace the service collapses; the normalised query is checked against QueryMax.
  @MaxLength(AI_SEARCH_LIMIT.QueryMax * 2)
  q!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: AI_SEARCH_LIMIT.MeaningMax,
    default: AI_SEARCH_LIMIT.MeaningDefault,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AI_SEARCH_LIMIT.MeaningMax)
  limit?: number;
}
