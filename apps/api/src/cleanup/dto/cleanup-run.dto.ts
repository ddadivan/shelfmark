import { ApiProperty } from '@nestjs/swagger';
import type { CleanupRunRequest } from '@shelfmark/contracts';
import { IsBoolean } from 'class-validator';

export class CleanupRunDto implements CleanupRunRequest {
  @ApiProperty({ description: 'Include the AI checks (honoured only when aiAvailable)' })
  @IsBoolean()
  includeAi!: boolean;
}
