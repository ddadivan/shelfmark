import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RETRY_AFTER_HEADER } from '../common/rate-limit/models/retry-after-header.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { FeedbackScreenshotUploadDto } from './dto/feedback-screenshot-upload.dto';
import { SendFeedbackDto } from './dto/send-feedback.dto';
import {
  FeedbackMessageResponseDto,
  ListFeedbackMessagesResponseDto,
} from './dto/feedback-message-response.dto';
import { FeedbackLimitExceededException } from './feedback-limit-exceeded.exception';
import { FeedbackMessagesService } from './feedback-messages.service';
import { sendFeedbackScreenshot } from './send-feedback-screenshot';

@ApiTags('feedback')
@Controller('feedback/messages')
export class FeedbackMessagesController {
  constructor(private readonly messages: FeedbackMessagesService) {}

  @Post()
  @RateLimit(RATE_LIMIT.Feedback)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Send a message (idea, problem or other); screenshots follow one by one',
  })
  @ApiCreatedResponse({ type: FeedbackMessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiTooManyRequestsResponse({ description: 'Too many messages this hour, see Retry-After' })
  async send(
    @CurrentUser() user: AuthUser,
    @Body() body: SendFeedbackDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FeedbackMessageResponseDto> {
    try {
      return await this.messages.send(user.id, body);
    } catch (error) {
      if (error instanceof FeedbackLimitExceededException) {
        res.setHeader(RETRY_AFTER_HEADER, String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Your messages, newest first (at most 100)' })
  @ApiOkResponse({ type: ListFeedbackMessagesResponseDto })
  list(@CurrentUser() user: AuthUser): Promise<ListFeedbackMessagesResponseDto> {
    return this.messages.list(user.id);
  }

  // The JSON body limit of this one route is raised in `configureApp` (one base64 screenshot).
  @Post(':id/screenshots')
  @RateLimit(RATE_LIMIT.Feedback)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Attach one screenshot to one of your messages (at most 3, right after sending)',
  })
  @ApiCreatedResponse({ type: FeedbackMessageResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid image, already 3 screenshots, or too long after sending',
  })
  @ApiNotFoundResponse({ description: 'Foreign or missing message' })
  attachScreenshot(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FeedbackScreenshotUploadDto,
  ): Promise<FeedbackMessageResponseDto> {
    return this.messages.attachScreenshot(user.id, id, body);
  }

  @Get(':id/screenshots/:position')
  @ApiOperation({ summary: 'One screenshot of one of your messages' })
  @ApiOkResponse({ description: 'The image bytes with the stored type' })
  @ApiNotFoundResponse({ description: 'Foreign, missing or no screenshot at this position' })
  async screenshot(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('position', ParseIntPipe) position: number,
    @Res() res: Response,
  ): Promise<void> {
    sendFeedbackScreenshot(res, await this.messages.findScreenshot(user.id, id, position));
  }
}
