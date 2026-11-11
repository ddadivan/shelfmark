import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EXPORT_FORMAT, LINK_KIND, LINK_LIMIT, TAG_LIMIT } from '@shelfmark/contracts';
import type { ExportFormat, ExportQuery, LinkKind } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** A single `?tag=a` arrives as a string, a repeated one as an array: always an array. */
function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

export class ExportQueryDto implements ExportQuery {
  @ApiProperty({ enum: Object.values(EXPORT_FORMAT) })
  @IsIn(Object.values(EXPORT_FORMAT))
  format!: ExportFormat;

  @ApiPropertyOptional({ format: 'uuid', description: 'Exports this folder and its subfolders.' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Repeated; a link must have all tags (case-insensitive).',
  })
  @IsOptional()
  @Transform(toArray)
  @ArrayMaxSize(LINK_LIMIT.TagFilterMax)
  @IsString({ each: true })
  @MaxLength(TAG_LIMIT.NameMax, { each: true })
  tag?: string[];

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.QueryMax, description: 'Title, note and URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(LINK_LIMIT.QueryMax)
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(LINK_KIND), description: 'Only links of this kind.' })
  @IsOptional()
  @IsIn(Object.values(LINK_KIND))
  kind?: LinkKind;
}
