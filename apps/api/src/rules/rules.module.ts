import { Module } from '@nestjs/common';
import { RuleOffersController } from './offers/rule-offers.controller';
import { RuleOffersService } from './offers/rule-offers.service';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

@Module({
  controllers: [RulesController, RuleOffersController],
  providers: [RulesService, RuleOffersService],
  exports: [RulesService],
})
export class RulesModule {}
