import { ApiProperty } from '@nestjs/swagger';
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
  type FolderEmoji,
  type HexColour,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  type LibrarySort,
  type LibraryView,
  type LinkOpenTarget,
  type MotionPreference,
  type ThemePreference,
  type TrashRetentionDays,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { CustomThemeDto } from './custom-theme.dto';

export class UserSettingsResponseDto implements UserSettingsResponse {
  @ApiProperty({ enum: TRASH_RETENTION_DAYS, example: 30 })
  trashRetentionDays!: TrashRetentionDays;

  @ApiProperty({ example: true })
  folderColours!: boolean;

  @ApiProperty({ example: false, description: 'Pause history: opens are not recorded' })
  pauseHistory!: boolean;

  @ApiProperty({ enum: Object.values(THEME_PREFERENCE), example: THEME_PREFERENCE.System })
  theme!: ThemePreference;

  @ApiProperty({ type: CustomThemeDto })
  customTheme!: CustomThemeDto;

  @ApiProperty({
    type: [String],
    example: ['#3a7bd5'],
    description: 'Own colours (lower-case #rrggbb, at most 12): swatches for folders and the theme',
  })
  customColours!: HexColour[];

  @ApiProperty({
    type: [String],
    example: ['🦩'],
    description:
      'Own emoji (each one emoji, at most 24): offered under "Yours" in the emoji picker',
  })
  customEmoji!: FolderEmoji[];

  @ApiProperty({ enum: Object.values(MOTION_PREFERENCE), example: MOTION_PREFERENCE.System })
  motion!: MotionPreference;

  @ApiProperty({
    example: false,
    description: 'False until theme, customTheme or motion is first saved',
  })
  appearanceSaved!: boolean;

  @ApiProperty({ enum: Object.values(LIBRARY_VIEW), example: LIBRARY_VIEW.Cards })
  defaultView!: LibraryView;

  @ApiProperty({ enum: Object.values(LIBRARY_SORT), example: LIBRARY_SORT.Newest })
  defaultSort!: LibrarySort;

  @ApiProperty({ enum: Object.values(LINK_OPEN_TARGET), example: LINK_OPEN_TARGET.NewTab })
  openLinksIn!: LinkOpenTarget;

  @ApiProperty({ example: true })
  showFolderCounts!: boolean;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null is Unsorted, also once the chosen folder is gone or in Trash',
  })
  newLinksFolderId!: string | null;

  @ApiProperty({ example: true })
  fetchPreviews!: boolean;

  @ApiProperty({ enum: Object.values(TEXT_SIZE), example: TEXT_SIZE.M })
  textSize!: TextSize;

  @ApiProperty({ enum: Object.values(APP_FONT), example: APP_FONT.Onest })
  font!: AppFont;

  @ApiProperty({ enum: Object.values(DENSITY), example: DENSITY.Comfortable })
  density!: Density;

  @ApiProperty({ enum: Object.values(CARD_PREVIEW), example: CARD_PREVIEW.Large })
  cardPreview!: CardPreview;

  @ApiProperty({ example: true })
  cardSite!: boolean;

  @ApiProperty({ example: true })
  cardNotes!: boolean;

  @ApiProperty({ example: true })
  cardTags!: boolean;

  @ApiProperty({ enum: Object.values(INTERFACE_LANGUAGE), example: INTERFACE_LANGUAGE.Browser })
  language!: InterfaceLanguage;

  @ApiProperty({ enum: Object.values(DATE_FORMAT), example: DATE_FORMAT.Default })
  dateFormat!: DateFormat;

  @ApiProperty({ enum: Object.values(TIME_FORMAT), example: TIME_FORMAT.Default })
  timeFormat!: TimeFormat;

  @ApiProperty({ enum: Object.values(WEEK_START), example: WEEK_START.Default })
  weekStart!: WeekStart;

  @ApiProperty({
    example: false,
    description: 'False until a language setting is first written (the web keeps a local choice)',
  })
  languageSaved!: boolean;
}
