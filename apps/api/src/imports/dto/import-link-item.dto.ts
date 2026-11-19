import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type ImportLinkItem } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { IsHttpUrl } from '../../links/dto/is-http-url.decorator';
import { IMPORT_ADDED_AT_PATTERN } from '../models/import-added-at-pattern.const';

const ADDED_AT_MAX = 40;

/** One link of an import batch: the URL, title and tag rules of paste many, plus a note and a date. */
export class ImportLinkItemDto implements ImportLinkItem {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/guide/signals' })
  @IsHttpUrl()
  url!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: LINK_LIMIT.TitleMax })
  @IsOptional()
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(LINK_LIMIT.TitleMax)
  title?: string;

  @ApiProperty({ format: 'uuid', description: 'One per link of the import; a retry replays it' })
  @IsUUID()
  idempotencyKey!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: "A live folder of yours; absent = the import's target folder",
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ type: [String], maxItems: LINK_LIMIT.TagsMax })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(4 * TAG_LIMIT.NameMax, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.NoteMax })
  @IsOptional()
  @IsString()
  @NoControlChars(true)
  @MaxLength(LINK_LIMIT.NoteMax)
  note?: string;

  @ApiPropertyOptional({
    maxLength: ADDED_AT_MAX,
    example: '2021-03-04T10:20:30Z',
    description: 'ISO 8601 with offset; stored as the save date, never in the future',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ADDED_AT_MAX)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(IMPORT_ADDED_AT_PATTERN, { message: 'addedAt must be an ISO 8601 date with an offset' })
  addedAt?: string;
}
