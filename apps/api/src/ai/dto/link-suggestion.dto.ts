import { ApiProperty } from '@nestjs/swagger';
import {
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type LinkSuggestion,
  type SuggestionKind,
  type SuggestionState,
} from '@shelfmark/contracts';

export class LinkSuggestionDto implements LinkSuggestion {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(SUGGESTION_KIND) }) kind!: SuggestionKind;
  @ApiProperty({ enum: Object.values(SUGGESTION_STATE) }) state!: SuggestionState;
  @ApiProperty({ nullable: true, type: String }) tagName!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
}
