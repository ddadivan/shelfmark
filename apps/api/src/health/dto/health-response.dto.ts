import { ApiProperty } from '@nestjs/swagger';
import type { HealthResponse } from '@shelfmark/contracts';

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ format: 'date-time', example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;
}
