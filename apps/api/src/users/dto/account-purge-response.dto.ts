import { ApiProperty } from '@nestjs/swagger';
import type { AccountPurgeResponse } from '../models/account-purge-response.interface';

export class AccountPurgeResponseDto implements AccountPurgeResponse {
  @ApiProperty({ minimum: 0, example: 1 })
  deleted!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
