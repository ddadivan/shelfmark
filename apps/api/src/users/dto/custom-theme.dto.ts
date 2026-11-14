import { ApiProperty } from '@nestjs/swagger';
import {
  CUSTOM_THEME_ACCENT,
  CUSTOM_THEME_BACKGROUND,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_CORNERS,
  HEX_COLOUR_PATTERN,
  isBackgroundOfBase,
  isHexColour,
  type CustomTheme,
  type CustomThemeAccent,
  type CustomThemeBackground,
  type CustomThemeBase,
  type CustomThemeCorners,
  type HexColour,
} from '@shelfmark/contracts';
import { IsIn, ValidateBy, type ValidationArguments } from 'class-validator';

/** `background` is one of the backgrounds of `base` (`CUSTOM_THEME_BACKGROUNDS`) or an own `#rrggbb` (#335). */
function BelongsToBase(): PropertyDecorator {
  return ValidateBy({
    name: 'belongsToBase',
    validator: {
      validate: (value: unknown, args?: ValidationArguments): boolean =>
        isBackgroundOfBase((args?.object as Partial<CustomTheme> | undefined)?.base, value),
      defaultMessage: (): string =>
        'customTheme.background must be a background of its base or a lower-case #rrggbb colour',
    },
  });
}

/** A curated accent name or an own colour as lower-case `#rrggbb` (#315). */
function IsAccent(): PropertyDecorator {
  const names: readonly string[] = Object.values(CUSTOM_THEME_ACCENT);
  return ValidateBy({
    name: 'isAccent',
    validator: {
      validate: (value: unknown): boolean =>
        (typeof value === 'string' && names.includes(value)) || isHexColour(value),
      defaultMessage: (): string =>
        `customTheme.accent must be one of ${names.join(', ')} or a lower-case #rrggbb colour`,
    },
  });
}

/**
 * The whole Custom theme; every field is required. Base, background and corners come from curated
 * allow-lists; the accent is a curated name or an own `#rrggbb` colour.
 */
export class CustomThemeDto implements CustomTheme {
  @ApiProperty({ enum: Object.values(CUSTOM_THEME_BASE), example: CUSTOM_THEME_BASE.Light })
  @IsIn(Object.values(CUSTOM_THEME_BASE))
  base!: CustomThemeBase;

  @ApiProperty({
    oneOf: [
      { type: 'string', enum: Object.values(CUSTOM_THEME_ACCENT) },
      { type: 'string', pattern: HEX_COLOUR_PATTERN.source },
    ],
    example: CUSTOM_THEME_ACCENT.Ocean,
    description: 'A curated accent name or an own colour as lower-case `#rrggbb`',
  })
  @IsAccent()
  accent!: CustomThemeAccent | HexColour;

  @ApiProperty({
    oneOf: [
      { type: 'string', enum: Object.values(CUSTOM_THEME_BACKGROUND) },
      { type: 'string', pattern: HEX_COLOUR_PATTERN.source },
    ],
    example: CUSTOM_THEME_BACKGROUND.Paper,
    description: 'One of the backgrounds of `base`, or an own colour as lower-case `#rrggbb`',
  })
  @BelongsToBase()
  background!: CustomThemeBackground | HexColour;

  @ApiProperty({ enum: Object.values(CUSTOM_THEME_CORNERS), example: CUSTOM_THEME_CORNERS.Soft })
  @IsIn(Object.values(CUSTOM_THEME_CORNERS))
  corners!: CustomThemeCorners;
}
