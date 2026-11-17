import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type CreateLinksBatchItem } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { DefaultHttpsScheme } from './default-https-scheme.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

/** One link of a batch: the same URL, title and hint rules as `CreateLinkDto`. */
export class CreateLinksBatchItemDto implements CreateLinksBatchItem {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/guide/signals' })
  @DefaultHttpsScheme()
  @IsHttpUrl()
  url!: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: LINK_LIMIT.TitleMax,
    description: 'When absent the URL is stored; the lazy image capture fills in the page title',
  })
  @IsOptional()
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(LINK_LIMIT.TitleMax)
  title?: string;

  @ApiProperty({
    format: 'uuid',
    description: 'One per link and dialog session: a retried batch replays the links of known keys',
  })
  @IsUUID()
  idempotencyKey!: string;

  @ApiPropertyOptional({
    maxLength: LINK_LIMIT.UrlMax,
    description: 'Source hint from a loaded preview; fetched later by the image capture',
  })
  @IsOptional()
  @TrimString()
  @IsHttpUrl()
  faviconUrl?: string;

  @ApiPropertyOptional({
    maxLength: LINK_LIMIT.UrlMax,
    description: 'Source hint from a loaded preview; fetched later by the image capture',
  })
  @IsOptional()
  @TrimString()
  @IsHttpUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: "This link's folder, in place of the batch folder",
  })
  // Absent means no folder (or the domain rule's folder); an explicit null is refused (#423).
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: LINK_LIMIT.TagsMax,
    description: "This link's tag names, in place of the batch tags",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(4 * TAG_LIMIT.NameMax, { each: true })
  tags?: string[];
}
