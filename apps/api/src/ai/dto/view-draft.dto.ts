import { ApiProperty } from '@nestjs/swagger';
import { VIEW_DRAFT_FIELD, type ViewDraft, type ViewDraftField } from '@shelfmark/contracts';
import { SavedViewQueryDto } from '../../views/dto/saved-view-query.dto';

export class ViewDraftDto implements ViewDraft {
  @ApiProperty({ type: SavedViewQueryDto }) query!: SavedViewQueryDto;
  @ApiProperty({ enum: Object.values(VIEW_DRAFT_FIELD), isArray: true, description: 'Rows AI set' })
  set!: ViewDraftField[];
  @ApiProperty({ description: 'Suggested name' }) name!: string;
  @ApiProperty({ nullable: true, type: String, description: 'What the filter cannot express' })
  note!: string | null;
  @ApiProperty({ type: [String], description: 'Names that did not fit the limits' })
  dropped!: string[];
}
