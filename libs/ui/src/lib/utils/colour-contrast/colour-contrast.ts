/** Red, green and blue, 0 to 255. */
type Rgb = readonly [number, number, number];

const HEX = /^#([0-9a-f]{6})$/iu;

/** `#rrggbb` (any case) as RGB, or `null` for anything else. */
export function parseHex(hex: string): Rgb | null {
  const value = HEX.exec(hex.trim())?.[1];
  if (!value) {
    return null;
  }
  const channel = (start: number): number => parseInt(value.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

/** Lower-case `#rrggbb`. */
export function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function rgbOf(hex: string): Rgb {
  const rgb = parseHex(hex);
  if (!rgb) {
    throw new Error(`Not an opaque #rrggbb colour: ${hex}`);
  }
  return rgb;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = rgbOf(hex)
    .map((channel) => channel / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio of two opaque colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `share` (0 to 1) of `over` painted on `under`. */
export function mixHex(under: string, over: string, share: number): string {
  const a = rgbOf(under);
  const b = rgbOf(over);
  const blend = (i: 0 | 1 | 2): number => a[i] + (b[i] - a[i]) * share;
  return toHex([blend(0), blend(1), blend(2)]);
}

/** Hue (0 to 360), saturation and lightness (0 to 1). */
export function hexToHsl(hex: string): readonly [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Hue (0 to 360), saturation and brightness (value), both 0 to 1: the model of a colour picker. */
export function hexToHsv(hex: string): readonly [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) {
    return [0, 0, max];
  }
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / max, max];
}

export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number): number => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return toHex([f(5), f(3), f(1)]);
}
