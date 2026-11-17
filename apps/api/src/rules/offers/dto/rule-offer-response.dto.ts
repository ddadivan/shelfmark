import { ApiProperty } from '@nestjs/swagger';
import type { RuleOfferResponse } from '@shelfmark/contracts';
import { RuleOfferDto } from './rule-offer.dto';

export class RuleOfferResponseDto implements RuleOfferResponse {
  @ApiProperty({ type: RuleOfferDto, nullable: true }) offer!: RuleOfferDto | null;
}
