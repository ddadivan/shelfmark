import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FOLDER_COLOUR,
  FOLDER_EMOJI_MAX_CODE_POINTS,
  FOLDER_ICON,
  FOLDER_LIMIT,
  HEX_COLOUR_PATTERN,
  type FolderColour,
  type FolderEmoji,
  type FolderIcon,
  type HexColour,
  type UpdateFolderRequest,
} from '@shelfmark/contracts';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { IsFolderColour } from './is-folder-colour.decorator';
import { IsFolderIcon } from './is-folder-icon.decorator';
import { TrimString } from './trim-string.decorator';
import { TrimToNull } from './trim-to-null.decorator';

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

  @ApiPropertyOptional({
    oneOf: [
      { type: 'string', enum: Object.values(FOLDER_COLOUR) },
      { type: 'string', pattern: HEX_COLOUR_PATTERN.source },
    ],
    description: 'A built-in colour name or an own colour as lower-case `#rrggbb`',
  })
  // Absent is fine, an explicit null is not.
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsFolderColour()
  colour?: FolderColour | HexColour;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'string', enum: Object.values(FOLDER_ICON) },
      { type: 'string', maxLength: FOLDER_EMOJI_MAX_CODE_POINTS, description: 'Exactly one emoji' },
    ],
    description: 'A known icon name or exactly one emoji (one grapheme, nothing else)',
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsFolderIcon()
  icon?: FolderIcon | FolderEmoji;

  @ApiPropertyOptional({ description: 'Show the folder with a background in its colour (#440)' })
  // Absent is fine, an explicit null is not.
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  highlighted?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: FOLDER_LIMIT.DescriptionMax,
    description: 'Short description, trimmed; blank or null removes it (#418)',
  })
  @TrimToNull()
  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(FOLDER_LIMIT.DescriptionMax)
  @NoControlChars()
  description?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'One of your live links in this folder (its preview is the cover); null for none',
  })
  @IsOptional()
  @IsUUID()
  coverLinkId?: string | null;
}
