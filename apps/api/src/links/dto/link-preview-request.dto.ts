import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, type LinkPreviewRequest } from '@shelfmark/contracts';
import { DefaultHttpsScheme } from './default-https-scheme.decorator';
import { IsHttpUrl } from './is-http-url.decorator';

export class LinkPreviewRequestDto implements LinkPreviewRequest {
  @ApiProperty({ maxLength: LINK_LIMIT.UrlMax, example: 'https://angular.dev/overview' })
  @DefaultHttpsScheme()
  @IsHttpUrl()
  url!: string;
}
