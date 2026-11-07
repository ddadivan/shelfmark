import { ApiPropertyOptional } from '@nestjs/swagger';
import { FOLDER_LIMIT, type UpdateFolderRequest } from '@shelfmark/contracts';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TrimString } from './trim-string';

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
}
