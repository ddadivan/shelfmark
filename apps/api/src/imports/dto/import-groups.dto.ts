import { ApiProperty } from '@nestjs/swagger';
import { FOLDER_LIMIT, IMPORT_LIMIT, type ImportGroupsRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { ImportGroupLinkDto } from './import-group-link.dto';

export class ImportGroupsDto implements ImportGroupsRequest {
  @ApiProperty({
    type: [ImportGroupLinkDto],
    minItems: 1,
    maxItems: IMPORT_LIMIT.GroupLinksMax,
    description: 'The links the import would send, in file order; a link is its index',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_LIMIT.GroupLinksMax)
  @ValidateNested({ each: true })
  @Type(() => ImportGroupLinkDto)
  links!: ImportGroupLinkDto[];

  @ApiProperty({
    type: [String],
    maxItems: IMPORT_LIMIT.GroupFolderNamesMax,
    description: "The file's folder names, used as naming hints",
  })
  @IsArray()
  @ArrayMaxSize(IMPORT_LIMIT.GroupFolderNamesMax)
  @IsString({ each: true })
  @NoControlChars(false, { each: true })
  @MaxLength(FOLDER_LIMIT.NameMax, { each: true })
  folderNames!: string[];
}
