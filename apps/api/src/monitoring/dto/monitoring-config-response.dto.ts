import { ApiProperty } from '@nestjs/swagger';
import type { MonitoringConfig } from '@shelfmark/contracts';

export class MonitoringConfigResponseDto implements MonitoringConfig {
  @ApiProperty({ type: String, nullable: true, example: null })
  dsn!: string | null;

  @ApiProperty({ example: 'production' })
  environment!: string;

  @ApiProperty({ type: String, nullable: true, example: null })
  release!: string | null;
}
