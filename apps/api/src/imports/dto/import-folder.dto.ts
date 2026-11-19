import { ApiProperty } from '@nestjs/swagger';
import { FOLDER_LIMIT, type ImportFolder } from '@shelfmark/contracts';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';

const KEY_MAX = 64;

export class ImportFolderDto implements ImportFolder {
  @ApiProperty({ minLength: 1, maxLength: KEY_MAX, description: 'Unique within the request' })
  @IsString()
  @MinLength(1)
  @MaxLength(KEY_MAX)
  key!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Key of an earlier folder of the request; null = directly under the target',
  })
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(KEY_MAX)
  parentKey!: string | null;

  @ApiProperty({ minLength: 1, maxLength: FOLDER_LIMIT.NameMax })
  @TrimString()
  @IsString()
  @NoControlChars()
  @MinLength(1)
  @MaxLength(FOLDER_LIMIT.NameMax)
  name!: string;
}
