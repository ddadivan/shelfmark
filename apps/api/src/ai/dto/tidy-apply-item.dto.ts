import { ApiProperty } from '@nestjs/swagger';
import { TIDY_LIMIT, type TidyApplyItem } from '@shelfmark/contracts';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class TidyApplyItemDto implements TidyApplyItem {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  linkId!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: TIDY_LIMIT.SuggestionIdsPerLinkMax,
    uniqueItems: true,
    description:
      'The chips left selected; ids that are not open suggestions of the link are ignored',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TIDY_LIMIT.SuggestionIdsPerLinkMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  suggestionIds!: string[];
}
