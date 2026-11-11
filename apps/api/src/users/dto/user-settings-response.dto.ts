import { ApiProperty } from '@nestjs/swagger';
import {
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
  warnDuplicates!: boolean;

  @ApiProperty({ example: true })
  fetchPreviews!: boolean;

  @ApiProperty({ example: false })
  keepQuery!: boolean;

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
}
