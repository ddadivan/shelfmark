import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, type CreateLinksBatchItem } from '@shelfmark/contracts';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

/** One link of a batch: the same URL, title and hint rules as `CreateLinkDto`. */
export class CreateLinksBatchItemDto implements CreateLinksBatchItem {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/guide/signals' })
  @TrimString()
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
}
