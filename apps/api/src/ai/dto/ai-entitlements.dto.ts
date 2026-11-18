import { ApiProperty } from '@nestjs/swagger';
import {
  ACCOUNT_PLAN,
  AI_TIER,
  type AccountPlan,
  type AiEntitlements,
  type AiTier,
} from '@shelfmark/contracts';

export class AiEntitlementsDto implements AiEntitlements {
  @ApiProperty({ enum: Object.values(ACCOUNT_PLAN) }) plan!: AccountPlan;
  @ApiProperty({ enum: Object.values(AI_TIER) }) aiTier!: AiTier;
}
