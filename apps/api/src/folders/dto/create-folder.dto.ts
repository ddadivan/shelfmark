import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FOLDER_LIMIT, type CreateFolderRequest } from '@shelfmark/contracts';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TrimString } from './trim-string';

export class CreateFolderDto implements CreateFolderRequest {
  @ApiProperty({ minLength: 1, maxLength: FOLDER_LIMIT.NameMax, example: 'Recipes' })
  @TrimString()
  @IsString()
  @MinLength(1)
  @MaxLength(FOLDER_LIMIT.NameMax)
  name!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'One of your folders; omit for top level' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
