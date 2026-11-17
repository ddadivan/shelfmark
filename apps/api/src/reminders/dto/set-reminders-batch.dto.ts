import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, type SetRemindersBatchRequest } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { IsRemindAt } from './is-remind-at.decorator';

export class SetRemindersBatchDto implements SetRemindersBatchRequest {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: LINK_LIMIT.BatchMax,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LINK_LIMIT.BatchMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'Same rules as a single reminder; null clears the reminders',
  })
  // Required: `null` clears, a missing field is a 400 like any other bad value.
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsRemindAt()
  remindAt!: string | null;
}
