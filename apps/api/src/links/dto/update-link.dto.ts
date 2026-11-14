import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LINK_KIND,
  LINK_LIMIT,
  TAG_LIMIT,
  type LinkKind,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

const RAW_TAG_MAX = 4 * TAG_LIMIT.NameMax;

/** `null` is not a value for these fields: only `undefined` (absent) skips validation. */
const present = (_object: unknown, value: unknown): boolean => value !== undefined;

export class UpdateLinkDto implements UpdateLinkRequest {
  @ApiPropertyOptional({ maxLength: LINK_LIMIT.UrlMax })
  @ValidateIf(present)
  @TrimString()
  @IsHttpUrl()
  url?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: LINK_LIMIT.TitleMax })
  @ValidateIf(present)
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(LINK_LIMIT.TitleMax)
  title?: string;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.NoteMax, nullable: true, type: String })
  @IsOptional()
  @IsString()
  @NoControlChars(true)
  @MaxLength(LINK_LIMIT.NoteMax)
  note?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: LINK_LIMIT.TagsMax,
    description: 'The full list of tag names; replaces the current tags',
  })
  @ValidateIf(present)
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(RAW_TAG_MAX, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @ValidateIf(present)
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({
    enum: Object.values(LINK_KIND),
    description: 'Without it a new URL recomputes the kind from the host',
  })
  @ValidateIf(present)
  @IsIn(Object.values(LINK_KIND))
  kind?: LinkKind;

  @ApiPropertyOptional({ description: 'Pin to or unpin from the top of the link folder' })
  @ValidateIf(present)
  @IsBoolean()
  pinnedInFolder?: boolean;
}
