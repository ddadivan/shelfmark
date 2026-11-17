import { ApiProperty } from '@nestjs/swagger';
import type { TidyApplyResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';
import { TidyUndoDto } from './tidy-undo.dto';

export class TidyApplyResponseDto implements TidyApplyResponse {
  @ApiProperty({ type: [LinkResponseDto], description: 'The changed links, in request order' })
  links!: LinkResponseDto[];
  @ApiProperty({ description: 'Links changed' }) applied!: number;
  @ApiProperty({ description: 'Links moved into a folder' }) folders!: number;
  @ApiProperty({ description: 'Tags added over all links' }) tagsAdded!: number;
  @ApiProperty({ description: 'Selected tags left off: the link would pass the tag limit' })
  skipped!: number;
  @ApiProperty({ type: TidyUndoDto, description: 'Send back unchanged to undo the run' })
  undo!: TidyUndoDto;
}
