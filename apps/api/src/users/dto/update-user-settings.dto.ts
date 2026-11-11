import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DATE_FORMAT,
  INTERFACE_LANGUAGE,
  TIME_FORMAT,
  WEEK_START,
  type DateFormat,
  type InterfaceLanguage,
  type TimeFormat,
  type WeekStart,
  APP_FONT,
  CARD_PREVIEW,
  DENSITY,
  TEXT_SIZE,
  type AppFont,
  type CardPreview,
  type Density,
  type TextSize,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  type LibrarySort,
  type LibraryView,
  type LinkOpenTarget,
  type MotionPreference,
  type ThemePreference,
  type TrashRetentionDays,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, IsUUID, ValidateIf, ValidateNested } from 'class-validator';
import { CustomThemeDto } from './custom-theme.dto';

// Absent is fine, but an explicit null is not (IsOptional would let it through).
const present = (_: unknown, value: unknown): boolean => value !== undefined;
// Absent and null are both fine (null is Unsorted); anything else must be a uuid.
const notNull = (_: unknown, value: unknown): boolean => value !== undefined && value !== null;

export class UpdateUserSettingsDto implements UpdateUserSettingsRequest {
  @ApiPropertyOptional({ enum: TRASH_RETENTION_DAYS, example: 30 })
  @ValidateIf(present)
  @IsIn(TRASH_RETENTION_DAYS)
  trashRetentionDays?: TrashRetentionDays;

  @ApiPropertyOptional({ example: true })
  @ValidateIf(present)
  @IsBoolean()
  folderColours?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Pause history: opens are not recorded' })
  @ValidateIf(present)
  @IsBoolean()
  pauseHistory?: boolean;

  @ApiPropertyOptional({ enum: Object.values(THEME_PREFERENCE), example: THEME_PREFERENCE.Custom })
  @ValidateIf(present)
  @IsIn(Object.values(THEME_PREFERENCE))
  theme?: ThemePreference;

  @ApiPropertyOptional({ type: CustomThemeDto, description: 'Always all four fields' })
  @ValidateIf(present)
  @IsObject()
  @ValidateNested()
  @Type(() => CustomThemeDto)
  customTheme?: CustomThemeDto;

  @ApiPropertyOptional({
    enum: Object.values(MOTION_PREFERENCE),
    example: MOTION_PREFERENCE.Reduced,
    description: '`full` never overrides a device that asks for reduced motion',
  })
  @ValidateIf(present)
  @IsIn(Object.values(MOTION_PREFERENCE))
  motion?: MotionPreference;

  @ApiPropertyOptional({ enum: Object.values(LIBRARY_VIEW), example: LIBRARY_VIEW.Cards })
  @ValidateIf(present)
  @IsIn(Object.values(LIBRARY_VIEW))
  defaultView?: LibraryView;

  @ApiPropertyOptional({ enum: Object.values(LIBRARY_SORT), example: LIBRARY_SORT.Newest })
  @ValidateIf(present)
  @IsIn(Object.values(LIBRARY_SORT))
  defaultSort?: LibrarySort;

  @ApiPropertyOptional({
    enum: Object.values(LINK_OPEN_TARGET),
    example: LINK_OPEN_TARGET.NewTab,
  })
  @ValidateIf(present)
  @IsIn(Object.values(LINK_OPEN_TARGET))
  openLinksIn?: LinkOpenTarget;

  @ApiPropertyOptional({ example: true, description: 'Link counts in the sidebar' })
  @ValidateIf(present)
  @IsBoolean()
  showFolderCounts?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'One of your live folders, or null for Unsorted (404 for a foreign or gone one)',
  })
  @ValidateIf(notNull)
  @IsUUID()
  newLinksFolderId?: string | null;

  @ApiPropertyOptional({ example: true, description: 'The add-link duplicate notice' })
  @ValidateIf(present)
  @IsBoolean()
  warnDuplicates?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Off: new links keep only their address (no page fetch, no images)',
  })
  @ValidateIf(present)
  @IsBoolean()
  fetchPreviews?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Off: tracking parameters (utm_*, fbclid, gclid, …) are removed on save',
  })
  @ValidateIf(present)
  @IsBoolean()
  keepQuery?: boolean;

  @ApiPropertyOptional({ enum: Object.values(TEXT_SIZE), example: TEXT_SIZE.M })
  @ValidateIf(present)
  @IsIn(Object.values(TEXT_SIZE))
  textSize?: TextSize;

  @ApiPropertyOptional({ enum: Object.values(APP_FONT), example: APP_FONT.Onest })
  @ValidateIf(present)
  @IsIn(Object.values(APP_FONT))
  font?: AppFont;

  @ApiPropertyOptional({ enum: Object.values(DENSITY), example: DENSITY.Comfortable })
  @ValidateIf(present)
  @IsIn(Object.values(DENSITY))
  density?: Density;

  @ApiPropertyOptional({ enum: Object.values(CARD_PREVIEW), example: CARD_PREVIEW.Large })
  @ValidateIf(present)
  @IsIn(Object.values(CARD_PREVIEW))
  cardPreview?: CardPreview;

  @ApiPropertyOptional({ example: true, description: 'Domain and favicon on cards' })
  @ValidateIf(present)
  @IsBoolean()
  cardSite?: boolean;

  @ApiPropertyOptional({ example: true, description: 'The note on cards' })
  @ValidateIf(present)
  @IsBoolean()
  cardNotes?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Tag chips on cards' })
  @ValidateIf(present)
  @IsBoolean()
  cardTags?: boolean;

  @ApiPropertyOptional({ enum: Object.values(INTERFACE_LANGUAGE), example: INTERFACE_LANGUAGE.Fr })
  @ValidateIf(present)
  @IsIn(Object.values(INTERFACE_LANGUAGE))
  language?: InterfaceLanguage;

  @ApiPropertyOptional({ enum: Object.values(DATE_FORMAT), example: DATE_FORMAT.Default })
  @ValidateIf(present)
  @IsIn(Object.values(DATE_FORMAT))
  dateFormat?: DateFormat;

  @ApiPropertyOptional({ enum: Object.values(TIME_FORMAT), example: TIME_FORMAT.H24 })
  @ValidateIf(present)
  @IsIn(Object.values(TIME_FORMAT))
  timeFormat?: TimeFormat;

  @ApiPropertyOptional({ enum: Object.values(WEEK_START), example: WEEK_START.Monday })
  @ValidateIf(present)
  @IsIn(Object.values(WEEK_START))
  weekStart?: WeekStart;

  @ApiPropertyOptional({ example: true, description: 'Spell-check in note fields' })
  @ValidateIf(present)
  @IsBoolean()
  spellcheck?: boolean;
}
