import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, type LinkPreviewRequest } from '@shelfmark/contracts';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

export class LinkPreviewRequestDto implements LinkPreviewRequest {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/overview' })
  @TrimString()
  @IsHttpUrl()
  url!: string;
}
