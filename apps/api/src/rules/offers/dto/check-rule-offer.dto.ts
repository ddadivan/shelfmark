import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, type CheckRuleOfferRequest } from '@shelfmark/contracts';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class CheckRuleOfferDto implements CheckRuleOfferRequest {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: LINK_LIMIT.BatchMax,
    uniqueItems: true,
    description: 'Links the user just filed; foreign, missing and trashed ids are ignored',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LINK_LIMIT.BatchMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  linkIds!: string[];
}
