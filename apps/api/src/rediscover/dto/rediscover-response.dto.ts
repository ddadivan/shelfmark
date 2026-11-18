import { ApiProperty } from '@nestjs/swagger';
import {
  REDISCOVER_MODE,
  type RediscoverMode,
  type RediscoverResponse,
} from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';

export class RediscoverResponseDto implements RediscoverResponse {
  @ApiProperty({ example: '2026-W47', description: 'ISO week (UTC)' }) week!: string;
  @ApiProperty({ enum: Object.values(REDISCOVER_MODE), nullable: true, type: String })
  mode!: RediscoverMode | null;
  @ApiProperty({ nullable: true, type: String, description: 'Tag or folder name in theme mode' })
  theme!: string | null;
  @ApiProperty({ type: [LinkResponseDto], description: '3 to 5 links; empty = no block' })
  items!: LinkResponseDto[];
}
