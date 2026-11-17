import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { CheckRuleOfferDto } from './dto/check-rule-offer.dto';
import { DismissRuleOfferDto } from './dto/dismiss-rule-offer.dto';
import { RuleOfferResponseDto } from './dto/rule-offer-response.dto';
import { RuleOffersService } from './rule-offers.service';

/** Rule offers under `/api/rules/offers` (AI-2, #390, `RULE_OFFER_ENDPOINT`). */
@ApiTags('rules')
@Controller('rules/offers')
export class RuleOffersController {
  constructor(private readonly offers: RuleOffersService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.RuleOffer)
  @ApiOkResponse({ type: RuleOfferResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiOperation({
    summary: 'Is there a rule to offer for the links just filed?',
    description:
      'Read-only. A site qualifies when your newest links of it share one live folder, none was filed by AI, no rule covers it and you did not answer "Not now".',
  })
  check(
    @CurrentUser() user: AuthUser,
    @Body() body: CheckRuleOfferDto,
  ): Promise<RuleOfferResponseDto> {
    return this.offers.check(user.id, body.linkIds);
  }

  @Post('dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.RuleWrite)
  @ApiNoContentResponse({ description: 'Remembered (idempotent)' })
  @ApiBadRequestResponse({ description: 'Not a domain name' })
  @ApiOperation({ summary: '"Not now": never offer a rule for this site again' })
  async dismiss(@CurrentUser() user: AuthUser, @Body() body: DismissRuleOfferDto): Promise<void> {
    await this.offers.dismiss(user.id, body.domain);
  }
}
