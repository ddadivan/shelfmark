import { ApiProperty } from '@nestjs/swagger';
import { NOTIFICATION_LIMIT, type AddNotificationDeviceRequest } from '@shelfmark/contracts';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { isAllowedPushEndpoint } from '../push/push-endpoint-policy';
import { isTimeZone } from '../push/is-time-zone';
import { PushSubscriptionKeysDto } from './push-subscription-keys.dto';

/** `POST /api/me/notifications/devices`. The endpoint must be an allow-listed push service. */
export class AddNotificationDeviceDto implements AddNotificationDeviceRequest {
  @ApiProperty({
    maxLength: NOTIFICATION_LIMIT.EndpointMax,
    description: 'https URL of a known push service (FCM, Mozilla, Apple, Windows)',
  })
  @IsString()
  @MaxLength(NOTIFICATION_LIMIT.EndpointMax)
  @ValidateBy({
    name: 'isPushEndpoint',
    validator: {
      validate: (value: unknown): boolean => isAllowedPushEndpoint(value),
      defaultMessage: (): string => 'endpoint must be an https URL of a supported push service',
    },
  })
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiProperty({ maxLength: NOTIFICATION_LIMIT.DeviceNameMax, example: 'Chrome on macOS' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(NOTIFICATION_LIMIT.DeviceNameMax)
  @NoControlChars()
  name!: string;

  @ApiProperty({ maxLength: NOTIFICATION_LIMIT.TimeZoneMax, example: 'Europe/Berlin' })
  @IsString()
  @ValidateBy({
    name: 'isTimeZone',
    validator: {
      validate: (value: unknown): boolean => isTimeZone(value),
      defaultMessage: (): string => 'timeZone must be an IANA time zone',
    },
  })
  timeZone!: string;
}
