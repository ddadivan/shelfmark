import { ApiPropertyOptional } from '@nestjs/swagger';
import { RULE_LIMIT, type UpdateRuleRequest } from '@shelfmark/contracts';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { RuleDomain } from './rule-domain.decorator';
import { RuleTags } from './rule-tags.decorator';

/** `null` is not a value for these fields: only `undefined` (absent) skips validation. */
const present = (_object: unknown, value: unknown): boolean => value !== undefined;

export class UpdateRuleDto implements UpdateRuleRequest {
  @ApiPropertyOptional({ maxLength: RULE_LIMIT.DomainMax, example: 'youtube.com' })
  @ValidateIf(present)
  @RuleDomain()
  domain?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null removes the folder' })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: RULE_LIMIT.TagsMax })
  @ValidateIf(present)
  @RuleTags()
  tags?: string[];
}
