import { ApiProperty } from '@nestjs/swagger';
import type { TidyItem } from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';
import { LinkSuggestionDto } from './link-suggestion.dto';

export class TidyItemDto implements TidyItem {
  @ApiProperty({ type: LinkResponseDto }) link!: LinkResponseDto;
  @ApiProperty({
    type: [LinkSuggestionDto],
    description: 'Only suggested rows still worth showing (live folder, tag not on the link yet)',
  })
  suggestions!: LinkSuggestionDto[];
}
