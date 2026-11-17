import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RULE_LIMIT, type CreateRuleRequest } from '@shelfmark/contracts';
import { IsOptional, IsUUID } from 'class-validator';
import { RuleDomain } from './rule-domain.decorator';
import { RuleTags } from './rule-tags.decorator';

export class CreateRuleDto implements CreateRuleRequest {
  @ApiProperty({
    maxLength: RULE_LIMIT.DomainMax,
    example: 'youtube.com',
    description: 'A domain or an address; stored lower case, without www., IDN in punycode',
  })
  @RuleDomain()
  domain!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'One of your live folders' })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: RULE_LIMIT.TagsMax, example: ['video'] })
  @IsOptional()
  @RuleTags()
  tags?: string[];
}
