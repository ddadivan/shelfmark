import { ApiProperty } from '@nestjs/swagger';
import { FOLDER_LIMIT, type ImportGroup } from '@shelfmark/contracts';

export class ImportGroupDto implements ImportGroup {
  @ApiProperty({ example: 'g1', description: 'Stable within the response' }) key!: string;
  @ApiProperty({ maxLength: FOLDER_LIMIT.NameMax }) name!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'A live folder of yours the group files into; null = a new folder',
  })
  folderId!: string | null;
  @ApiProperty({ type: [Number], description: 'Indexes into the request links, ascending' })
  linkIndexes!: number[];
}
