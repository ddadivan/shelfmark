import { ApiPropertyOptional } from '@nestjs/swagger';
import { SHARE_LIMIT, type PublicCollectionQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class PublicCollectionQueryDto implements PublicCollectionQuery {
  @ApiPropertyOptional({ format: 'uuid', description: 'Only the links of this subfolder' })
  @IsOptional()
  @IsUUID()
  folder?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: SHARE_LIMIT.MaxPage, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SHARE_LIMIT.MaxPage)
  page?: number;
}
