import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { FeedbackPromptResponseDto } from './dto/feedback-prompt-response.dto';
import { RecordFeedbackDto } from './dto/record-feedback.dto';
import { RecordRatingPromptViewDto } from './dto/record-rating-prompt-view.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get('prompt')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Which rating dialog to show now (the latest unanswered milestone)' })
  @ApiOkResponse({ type: FeedbackPromptResponseDto })
  prompt(@CurrentUser() user: AuthUser): Promise<FeedbackPromptResponseDto> {
    return this.feedback.prompt(user.id);
  }

  @Post()
  @RateLimit(RATE_LIMIT.Feedback)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Save a rating, feedback or a skip; a repeat for the same milestone appends the comment',
  })
  @ApiNoContentResponse({ description: 'Saved' })
  @ApiBadRequestResponse({ description: 'Invalid body, or the combined comment is too long' })
  @ApiForbiddenResponse({ description: 'Demo user, or a foreign Origin' })
  @ApiConflictResponse({
    description: 'Onboarding pending, milestone not reached yet, or a different score is stored',
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  record(@CurrentUser() user: AuthUser, @Body() body: RecordFeedbackDto): Promise<void> {
    return this.feedback.record(user.id, body);
  }

  @Post('rating-prompt/views')
  @RateLimit(RATE_LIMIT.RatingPromptView)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Count one display of the rating prompt for the session user (also for a demo user); the count is only read in the database',
  })
  @ApiNoContentResponse({ description: 'Counted' })
  @ApiBadRequestResponse({ description: 'Unknown milestone' })
  @ApiForbiddenResponse({ description: 'A foreign Origin' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  recordPromptView(
    @CurrentUser() user: AuthUser,
    @Body() body: RecordRatingPromptViewDto,
  ): Promise<void> {
    return this.feedback.recordPromptView(user.id, body.milestone);
  }
}
