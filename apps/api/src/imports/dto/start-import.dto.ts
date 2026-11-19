import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FOLDER_LIMIT,
  IMPORT_LIMIT,
  IMPORT_SOURCE,
  type ImportSource,
  type StartImportRequest,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { ImportFolderDto } from './import-folder.dto';

export class StartImportDto implements StartImportRequest {
  @ApiProperty({ enum: Object.values(IMPORT_SOURCE) })
  @IsIn(Object.values(IMPORT_SOURCE))
  source!: ImportSource;

  @ApiProperty({ minLength: 1, maxLength: IMPORT_LIMIT.FileNameMax })
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(IMPORT_LIMIT.FileNameMax)
  fileName!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'One of your folders; not together with newFolderName',
  })
  @IsOptional()
  @IsUUID()
  targetFolderId?: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: FOLDER_LIMIT.NameMax,
    description: 'A new top-level folder for the import; not together with targetFolderId',
  })
  @IsOptional()
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(FOLDER_LIMIT.NameMax)
  newFolderName?: string;

  @ApiProperty({
    type: [ImportFolderDto],
    maxItems: IMPORT_LIMIT.FoldersMax,
    description: 'Folders of the file, parents before children; empty to flatten',
  })
  @IsArray()
  @ArrayMaxSize(IMPORT_LIMIT.FoldersMax)
  @ValidateNested({ each: true })
  @Type(() => ImportFolderDto)
  folders!: ImportFolderDto[];
}
