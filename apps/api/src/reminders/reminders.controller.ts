import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { LinkResponseDto } from '../links/dto/link-response.dto';
import { UpdateLinksBatchResponseDto } from '../links/dto/update-links-batch-response.dto';
import { ListRemindersResponseDto } from './dto/list-reminders-response.dto';
import { ReminderCountResponseDto } from './dto/reminder-count-response.dto';
import { SetReminderDto } from './dto/set-reminder.dto';
import { SetRemindersBatchDto } from './dto/set-reminders-batch.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @ApiOkResponse({ type: ListRemindersResponseDto })
  @ApiOperation({ summary: 'Links with a reminder: due ones and upcoming ones' })
  list(@CurrentUser() user: AuthUser): Promise<ListRemindersResponseDto> {
    return this.reminders.list(user.id);
  }

  // Declared before `:linkId`, so "count" is never read as an id.
  @Get('count')
  @ApiOkResponse({ type: ReminderCountResponseDto })
  @ApiOperation({ summary: 'How many links are due (for the sidebar badge)' })
  count(@CurrentUser() user: AuthUser): Promise<ReminderCountResponseDto> {
    return this.reminders.count(user.id);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.ReminderWrite)
  @ApiOkResponse({ type: UpdateLinksBatchResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body, a past time or one too far ahead' })
  @ApiOperation({
    summary: 'Set or clear the same reminder on up to 100 of your links (bulk actions)',
    description:
      'Foreign, missing and trashed ids are ignored; the answer lists the changed links.',
  })
  setMany(
    @CurrentUser() user: AuthUser,
    @Body() body: SetRemindersBatchDto,
  ): Promise<UpdateLinksBatchResponseDto> {
    return this.reminders.setMany(user.id, body.ids, body.remindAt);
  }

  @Put(':linkId')
  @RateLimit(RATE_LIMIT.ReminderWrite)
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body, a past time or one too far ahead' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed link' })
  @ApiOperation({ summary: 'Set or change the reminder of a link (also snooze)' })
  set(
    @CurrentUser() user: AuthUser,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() body: SetReminderDto,
  ): Promise<LinkResponseDto> {
    return this.reminders.set(user.id, linkId, body.remindAt);
  }

  @Delete(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.ReminderWrite)
  @ApiNoContentResponse({ description: 'Cleared (Done); idempotent' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed link' })
  @ApiOperation({ summary: 'Clear the reminder of a link (Done)' })
  async clear(
    @CurrentUser() user: AuthUser,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.reminders.set(user.id, linkId, null);
  }
}
