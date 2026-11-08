import { ApiProperty } from '@nestjs/swagger';
import {
  FOLDER_DELETE_MODE,
  type DeleteFolderQuery,
  type FolderDeleteMode,
} from '@shelfmark/contracts';
import { IsIn } from 'class-validator';

export class DeleteFolderQueryDto implements DeleteFolderQuery {
  @ApiProperty({ enum: Object.values(FOLDER_DELETE_MODE) })
  @IsIn(Object.values(FOLDER_DELETE_MODE))
  mode!: FolderDeleteMode;
}
