import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CreateRuleDto } from './dto/create-rule.dto';
import { ListRulesResponseDto } from './dto/list-rules-response.dto';
import { RuleMatchesResponseDto } from './dto/rule-matches-response.dto';
import { RuleResponseDto } from './dto/rule-response.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RulesService } from './rules.service';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  @ApiOkResponse({ type: ListRulesResponseDto })
  @ApiOperation({ summary: 'Domain rules, sorted by domain' })
  list(@CurrentUser() user: AuthUser): Promise<ListRulesResponseDto> {
    return this.rules.list(user.id);
  }

  @Post()
  @RateLimit(RATE_LIMIT.RuleWrite)
  @ApiCreatedResponse({ type: RuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid domain or tags, or neither folder nor tags' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed folder' })
  @ApiConflictResponse({ description: 'A rule for the domain exists, or the limit is reached' })
  @ApiOperation({ summary: 'Add a rule: links from a domain go to a folder and get tags' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateRuleDto): Promise<RuleResponseDto> {
    return this.rules.create(user.id, body);
  }

  @Get(':id/matches')
  @ApiOkResponse({ type: RuleMatchesResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign rule' })
  @ApiOperation({
    summary: 'Live links in Unsorted the rule matches (for "Apply to existing links")',
  })
  matches(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RuleMatchesResponseDto> {
    return this.rules.matches(user.id, id);
  }

  @Patch(':id')
  @RateLimit(RATE_LIMIT.RuleWrite)
  @ApiOkResponse({ type: RuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid domain or tags, or neither folder nor tags' })
  @ApiNotFoundResponse({
    description: 'Unknown or foreign rule, or an unknown, foreign or trashed folder',
  })
  @ApiConflictResponse({ description: 'A rule for the domain exists' })
  @ApiOperation({ summary: 'Change the domain, folder or tags of a rule' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRuleDto,
  ): Promise<RuleResponseDto> {
    return this.rules.update(user.id, id, body);
  }

  @Delete(':id')
  @RateLimit(RATE_LIMIT.RuleWrite)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign rule' })
  @ApiOperation({ summary: 'Delete a rule (saved links stay as they are)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.rules.remove(user.id, id);
  }
}
