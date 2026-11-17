import { ApiProperty } from '@nestjs/swagger';
import { AI_SEARCH_STATE, type AiSearchState, type AiSearchStatus } from '@shelfmark/contracts';

export class AiSearchStatusDto implements AiSearchStatus {
  @ApiProperty({ enum: Object.values(AI_SEARCH_STATE) }) state!: AiSearchState;
  @ApiProperty({ minimum: 0, description: 'Live links with a current vector' }) ready!: number;
  @ApiProperty({ minimum: 0, description: 'Live links' }) total!: number;
}
