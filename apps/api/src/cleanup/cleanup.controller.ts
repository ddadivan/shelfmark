import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CleanupReportDto } from './dto/cleanup-report.dto';
import { CleanupRunDto } from './dto/cleanup-run.dto';
import { CleanupService } from './cleanup.service';

/** Library clean-up (F5, `CLEANUP_ENDPOINT`). Thin: the services own the rules. */
@ApiTags('cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(private readonly cleanup: CleanupService) {}

  @Get()
  @ApiOkResponse({ type: CleanupReportDto })
  @ApiOperation({
    summary: 'The stored clean-up report, read live',
    description:
      'State none before the first run. Trashed links and deleted tags drop out; a group with fewer than two live members is left out.',
  })
  report(@CurrentUser() user: AuthUser): Promise<CleanupReportDto> {
    return this.cleanup.report(user.id);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.CleanupRun)
  @ApiOkResponse({ type: CleanupReportDto })
  @ApiConflictResponse({ description: 'A check is already running' })
  @ApiOperation({
    summary: 'Check the library',
    description:
      'Exact duplicates and tag variants now; with includeAi and access (AI on, AI pack, a run left this month) the AI checks continue in the background (poll the AI tick).',
  })
  run(@CurrentUser() user: AuthUser, @Body() body: CleanupRunDto): Promise<CleanupReportDto> {
    return this.cleanup.run(user, body.includeAi);
  }
}
