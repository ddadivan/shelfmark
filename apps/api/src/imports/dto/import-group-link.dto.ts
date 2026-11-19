import { ApiProperty } from '@nestjs/swagger';
import { IMPORT_LIMIT, type ImportGroupLink } from '@shelfmark/contracts';
import { IsString, Matches, MaxLength } from 'class-validator';

/** One link sent for grouping: only the scheme of the URL is checked, the text is cut by length. */
export class ImportGroupLinkDto implements ImportGroupLink {
  @ApiProperty({
    maxLength: IMPORT_LIMIT.GroupTitleMax,
    description: 'The bookmark title, or the URL when it has none',
  })
  @IsString()
  @MaxLength(IMPORT_LIMIT.GroupTitleMax)
  title!: string;

  @ApiProperty({
    maxLength: IMPORT_LIMIT.GroupUrlMax,
    example: 'https://angular.dev/guide/signals',
    description: 'http(s) URL, cut by the client',
  })
  @IsString()
  @MaxLength(IMPORT_LIMIT.GroupUrlMax)
  @Matches(/^https?:\/\//iu, { message: 'url must start with http:// or https://' })
  url!: string;
}
