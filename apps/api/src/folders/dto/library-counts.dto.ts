import { ApiProperty } from '@nestjs/swagger';
import type { LibraryCounts } from '@shelfmark/contracts';

export class LibraryCountsDto implements LibraryCounts {
  @ApiProperty() all!: number;
  @ApiProperty() unsorted!: number;
  @ApiProperty() favorites!: number;
}
