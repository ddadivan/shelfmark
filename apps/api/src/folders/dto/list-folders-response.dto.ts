import { ApiProperty } from '@nestjs/swagger';
import type { ListFoldersResponse } from '@shelfmark/contracts';
import { FolderResponseDto } from './folder-response.dto';
import { LibraryCountsDto } from './library-counts.dto';

export class ListFoldersResponseDto implements ListFoldersResponse {
  @ApiProperty({ type: [FolderResponseDto] }) items!: FolderResponseDto[];
  @ApiProperty({ type: LibraryCountsDto }) counts!: LibraryCountsDto;
}
