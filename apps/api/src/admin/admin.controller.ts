import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { sendFeedbackScreenshot } from '../feedback/send-feedback-screenshot';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminGuard } from './admin.guard';
import {
  AdminFeedbackItemDto,
  AdminStatusResponseDto,
  ListAdminFeedbackResponseDto,
} from './dto/admin-feedback-response.dto';
import { ListAdminFeedbackQueryDto } from './dto/list-admin-feedback-query.dto';
import { UpdateAdminFeedbackDto } from './dto/update-admin-feedback.dto';

/**
 * Admin API (the author). Not an `@AllowAnonymous` route: the global guards need a session, and
 * `AdminGuard` then answers 404 unless the email is in `ADMIN_EMAILS`. The session guard also
 * answers 404 instead of 401 below `/api/admin`, so the routes do not reveal themselves.
 */
@ApiExcludeController()
@ApiTags('admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly feedback: AdminFeedbackService) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Is the signed-in user an admin? 200, or 404 for everyone else' })
  @ApiOkResponse({ type: AdminStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Not an admin' })
  status(): AdminStatusResponseDto {
    return { admin: true };
  }

  @Get('feedback')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Feedback messages of all users, newest first, keyset paginated' })
  @ApiOkResponse({ type: ListAdminFeedbackResponseDto })
  @ApiNotFoundResponse({ description: 'Not an admin' })
  list(@Query() query: ListAdminFeedbackQueryDto): Promise<ListAdminFeedbackResponseDto> {
    return this.feedback.list(query);
  }

  @Patch('feedback/:id')
  @RateLimit(RATE_LIMIT.Admin)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Set the status and/or the reply of a message' })
  @ApiOkResponse({ type: AdminFeedbackItemDto })
  @ApiNotFoundResponse({ description: 'Not an admin, or no such message' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAdminFeedbackDto,
  ): Promise<AdminFeedbackItemDto> {
    return this.feedback.update(id, body);
  }

  @Get('feedback/:id/screenshots/:position')
  @ApiOperation({ summary: 'One screenshot of a message' })
  @ApiOkResponse({ description: 'The image bytes with the stored type' })
  @ApiNotFoundResponse({ description: 'Not an admin, no such message or no screenshot there' })
  async screenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('position', ParseIntPipe) position: number,
    @Res() res: Response,
  ): Promise<void> {
    sendFeedbackScreenshot(res, await this.feedback.findScreenshot(id, position));
  }
}
