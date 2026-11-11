import { ApiProperty } from '@nestjs/swagger';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  isBackgroundOfBase,
  type CustomTheme,
  type CustomThemeAccent,
  type CustomThemeBackground,
  type CustomThemeBase,
  type CustomThemeCorners,
} from '@shelfmark/contracts';
import { IsIn, ValidateBy, type ValidationArguments } from 'class-validator';

/** `background` must be one of the backgrounds of `base` (`CUSTOM_THEME_BACKGROUNDS`). */
function BelongsToBase(): PropertyDecorator {
  return ValidateBy({
    name: 'belongsToBase',
    validator: {
      validate: (value: unknown, args?: ValidationArguments): boolean =>
        isBackgroundOfBase((args?.object as Partial<CustomTheme> | undefined)?.base, value),
      defaultMessage: (): string => 'customTheme.background must be a background of its base',
    },
  });
}

/** The whole Custom theme; every field is required and comes from a curated allow-list. */
export class CustomThemeDto implements CustomTheme {
  @ApiProperty({ enum: Object.values(CUSTOM_THEME_BASE), example: CUSTOM_THEME_BASE.Light })
  @IsIn(Object.values(CUSTOM_THEME_BASE))
  base!: CustomThemeBase;

  @ApiProperty({ enum: Object.values(CUSTOM_THEME_ACCENT), example: CUSTOM_THEME_ACCENT.Ocean })
  @IsIn(Object.values(CUSTOM_THEME_ACCENT))
  accent!: CustomThemeAccent;

  @ApiProperty({
    enum: Object.values(CUSTOM_THEME_BACKGROUND),
    example: CUSTOM_THEME_BACKGROUND.Paper,
    description: 'One of the backgrounds of `base`',
  })
  @IsIn(Object.values(CUSTOM_THEME_BACKGROUND))
  @BelongsToBase()
  background!: CustomThemeBackground;

  @ApiProperty({ enum: Object.values(CUSTOM_THEME_CORNERS), example: CUSTOM_THEME_CORNERS.Soft })
  @IsIn(Object.values(CUSTOM_THEME_CORNERS))
  corners!: CustomThemeCorners;
}
