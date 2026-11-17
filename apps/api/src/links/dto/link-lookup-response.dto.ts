import { ApiProperty } from '@nestjs/swagger';
import type { LinkLookupResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class LinkLookupResponseDto implements LinkLookupResponse {
  @ApiProperty({ type: LinkResponseDto, nullable: true }) link!: LinkResponseDto | null;
}
