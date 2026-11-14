import { ApiProperty } from '@nestjs/swagger';
import { FOLDER_LIMIT, type ReorderFoldersRequest } from '@shelfmark/contracts';
import { ArrayMaxSize, IsArray, IsUUID, ValidateIf } from 'class-validator';

export class ReorderFoldersDto implements ReorderFoldersRequest {
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'The parent whose subfolders are reordered; null = the top level',
  })
  // Required, but null is a value: only a non-null parent must be a UUID.
  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  parentId!: string | null;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: FOLDER_LIMIT.PerUserMax,
    description: 'Every live subfolder of the parent exactly once, in the new order',
  })
  @IsArray()
  @ArrayMaxSize(FOLDER_LIMIT.PerUserMax)
  @IsUUID(undefined, { each: true })
  ids!: string[];
}
