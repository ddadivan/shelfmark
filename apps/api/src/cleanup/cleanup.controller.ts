import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CleanupApplyResponseDto } from './dto/cleanup-apply-response.dto';
import { CleanupApplyDto } from './dto/cleanup-apply.dto';
import { CleanupReportDto } from './dto/cleanup-report.dto';
import { CleanupUndoResponseDto } from './dto/cleanup-undo-response.dto';
import { CleanupUndoDto } from './dto/cleanup-undo.dto';
import { CleanupRunDto } from './dto/cleanup-run.dto';
import { CleanupApplyService } from './cleanup-apply.service';
import { CleanupUndoService } from './cleanup-undo.service';
import { CleanupService } from './cleanup.service';

/** Library clean-up (F5, `CLEANUP_ENDPOINT`). Thin: the services own the rules. */
@ApiTags('cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(
    private readonly cleanup: CleanupService,
    private readonly applyService: CleanupApplyService,
    private readonly undoService: CleanupUndoService,
  ) {}

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

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.CleanupApply)
  @ApiOkResponse({ type: CleanupApplyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or nothing selected' })
  @ApiOperation({
    summary: 'Apply the selected rows in one step',
    description:
      'Only ids of the stored report and live rows of the user count; others are skipped. Copies go to Trash with one shared time, merges use the tag merge. Answers the Undo payload.',
  })
  apply(
    @CurrentUser() user: AuthUser,
    @Body() body: CleanupApplyDto,
  ): Promise<CleanupApplyResponseDto> {
    return this.applyService.apply(user.id, body);
  }

  @Post('undo')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.CleanupApply)
  @ApiOkResponse({ type: CleanupUndoResponseDto })
  @ApiOperation({
    summary: 'Undo a clean-up run',
    description:
      'The undo payload of the apply answer, unchanged. Conditional on the current state; foreign ids change nothing. Works with AI off.',
  })
  undo(
    @CurrentUser() user: AuthUser,
    @Body() body: CleanupUndoDto,
  ): Promise<CleanupUndoResponseDto> {
    return this.undoService.undo(user.id, body);
  }
}
