import { ApiProperty } from '@nestjs/swagger';
import { RULE_LIMIT, type DismissRuleOfferRequest } from '@shelfmark/contracts';
import { RuleDomain } from '../../dto/rule-domain.decorator';

export class DismissRuleOfferDto implements DismissRuleOfferRequest {
  @ApiProperty({ maxLength: RULE_LIMIT.DomainMax, example: 'youtube.com' })
  @RuleDomain()
  domain!: string;
}
