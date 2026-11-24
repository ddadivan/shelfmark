import { ApiProperty } from '@nestjs/swagger';
import type { AccountDeletionStatus } from '@shelfmark/contracts';

export class AccountDeletionStatusDto implements AccountDeletionStatus {
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the account will be deleted for good; null = no deletion scheduled',
  })
  deletionScheduledAt!: string | null;
}
