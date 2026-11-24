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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { AddNotificationDeviceResponseDto } from './dto/add-notification-device-response.dto';
import { AddNotificationDeviceDto } from './dto/add-notification-device.dto';
import { NotificationDeviceDto } from './dto/notification-device.dto';
import { NotificationSettingsResponseDto } from './dto/notification-settings-response.dto';
import { NotificationTestResponseDto } from './dto/notification-test-response.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsService } from './notifications.service';

@ApiTags('me')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
@Controller('me/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'What may be pushed, quiet hours, devices and the VAPID public key' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  get(@CurrentUser() user: AuthUser): Promise<NotificationSettingsResponseDto> {
    return this.notifications.get(user.id);
  }

  @Patch()
  @RateLimit(RATE_LIMIT.NotificationWrite)
  @ApiOperation({ summary: 'Change what may be pushed or the quiet hours; send only the changes' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid value, extra field, or one quiet hours bound without the other',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsResponseDto> {
    return this.notifications.update(user.id, body);
  }

  @Post('devices')
  @RateLimit(RATE_LIMIT.NotificationWrite)
  @ApiOperation({ summary: 'Turn push on for this browser: store its push subscription' })
  @ApiCreatedResponse({ type: AddNotificationDeviceResponseDto })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid body or an endpoint that is not a supported push service',
  })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: 'Too many devices' })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponseDto, description: 'Not configured' })
  addDevice(
    @CurrentUser() user: AuthUser,
    @Body() body: AddNotificationDeviceDto,
  ): Promise<AddNotificationDeviceResponseDto> {
    return this.notifications.addDevice(user.id, body);
  }

  @Get('devices/:id')
  @ApiOperation({ summary: 'One device with push on (name and times only)' })
  @ApiOkResponse({ type: NotificationDeviceDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Unknown or foreign device' })
  getDevice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationDeviceDto> {
    return this.notifications.getDevice(user.id, id);
  }

  @Delete('devices/:id')
  @RateLimit(RATE_LIMIT.NotificationWrite)
  @ApiOperation({ summary: 'Turn push off for one device' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Unknown or foreign device' })
  removeDevice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationSettingsResponseDto> {
    return this.notifications.removeDevice(user.id, id);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.NotificationTest)
  @ApiOperation({ summary: 'Send a sample notification to every device of the account' })
  @ApiOkResponse({ type: NotificationTestResponseDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponseDto, description: 'Not configured' })
  test(@CurrentUser() user: AuthUser): Promise<NotificationTestResponseDto> {
    return this.delivery.test(user.id);
  }
}
