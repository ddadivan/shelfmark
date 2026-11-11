import { ApiProperty } from '@nestjs/swagger';
import { TRASH_ITEM_KIND, type TrashItemKind, type TrashItemRef } from '@shelfmark/contracts';
import { IsIn, IsUUID } from 'class-validator';

export class TrashItemRefDto implements TrashItemRef {
  @ApiProperty({ enum: Object.values(TRASH_ITEM_KIND) })
  @IsIn(Object.values(TRASH_ITEM_KIND))
  kind!: TrashItemKind;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
