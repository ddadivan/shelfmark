import { ApiProperty } from '@nestjs/swagger';
import { PIN_KIND, type PinKind, type PinResponse } from '@shelfmark/contracts';
import { FolderResponseDto } from '../../folders/dto/folder-response.dto';
import { LinkResponseDto } from '../../links/dto/link-response.dto';

export class PinResponseDto implements PinResponse {
  @ApiProperty({ enum: Object.values(PIN_KIND) }) kind!: PinKind;
  @ApiProperty({ description: '0-based place in the sidebar' }) position!: number;
  @ApiProperty({ type: FolderResponseDto, nullable: true }) folder!: FolderResponseDto | null;
  @ApiProperty({ type: LinkResponseDto, nullable: true }) link!: LinkResponseDto | null;
}
