import { ApiProperty } from '@nestjs/swagger';
import { IMPORT_LIMIT, type FinishImportRequest } from '@shelfmark/contracts';
import { IsInt, Max, Min } from 'class-validator';

export class FinishImportDto implements FinishImportRequest {
  @ApiProperty({ minimum: 0, maximum: IMPORT_LIMIT.LinksMax })
  @IsInt()
  @Min(0)
  @Max(IMPORT_LIMIT.LinksMax)
  skipped!: number;

  @ApiProperty({ minimum: 0, maximum: IMPORT_LIMIT.LinksMax })
  @IsInt()
  @Min(0)
  @Max(IMPORT_LIMIT.LinksMax)
  failed!: number;
}
