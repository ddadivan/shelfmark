import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type CreateLinkRequest } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

/** Upper bound for one raw tag name; the service normalizes it and enforces `TAG_LIMIT.NameMax`. */
const RAW_TAG_MAX = 4 * TAG_LIMIT.NameMax;

export class CreateLinkDto implements CreateLinkRequest {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/overview' })
  @TrimString()
  @IsHttpUrl()
  url!: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: LINK_LIMIT.TitleMax,
    description: 'When absent the server loads the page and uses its title (or the URL)',
  })
  @IsOptional()
  @TrimString()
  @IsString()
  @MinLength(1)
  @MaxLength(LINK_LIMIT.TitleMax)
  title?: string;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.NoteMax })
  @IsOptional()
  @IsString()
  @MaxLength(LINK_LIMIT.NoteMax)
  note?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'One of your folders' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: LINK_LIMIT.TagsMax,
    description: 'Tag names; missing tags are created',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @MaxLength(RAW_TAG_MAX, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'One per dialog session: a repeated request returns the first link',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.UrlMax, description: 'Source hint, never fetched' })
  @IsOptional()
  @TrimString()
  @IsHttpUrl()
  faviconUrl?: string;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.UrlMax, description: 'Source hint, never fetched' })
  @IsOptional()
  @TrimString()
  @IsHttpUrl()
  imageUrl?: string;
}
