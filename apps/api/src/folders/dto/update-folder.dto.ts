import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FOLDER_COLOUR,
  FOLDER_ICON,
  FOLDER_LIMIT,
  type FolderColour,
  type FolderIcon,
  type UpdateFolderRequest,
} from '@shelfmark/contracts';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TrimString } from './trim-string.decorator';

export class UpdateFolderDto implements UpdateFolderRequest {
  @ApiPropertyOptional({ minLength: 1, maxLength: FOLDER_LIMIT.NameMax })
  @TrimString()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(FOLDER_LIMIT.NameMax)
  name?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'One of your folders; null moves the folder to the top level',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ enum: Object.values(FOLDER_COLOUR) })
  // Absent is fine, an explicit null is not.
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(Object.values(FOLDER_COLOUR))
  colour?: FolderColour;

  @ApiPropertyOptional({ enum: Object.values(FOLDER_ICON) })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(Object.values(FOLDER_ICON))
  icon?: FolderIcon;
}
