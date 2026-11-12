import { execFileSync } from 'node:child_process';
import type { PromoCut } from '../models/promo-cut.interface';
import { PROMO_MEDIA } from '../models/promo-media.const';

/** Encoders the promo needs; Playwright's bundled ffmpeg only has VP8, so a full build is required. */
const REQUIRED_ENCODERS = ['libx264', 'libvpx-vp9', 'libwebp'] as const;

/** The ffmpeg binary: `FFMPEG_PATH`, else `ffmpeg` on the PATH. */
export function ffmpegBinary(): string {
  return process.env['FFMPEG_PATH'] || 'ffmpeg';
}

function run(args: readonly string[]): string {
  return execFileSync(ffmpegBinary(), ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Fails early, with the fix, when ffmpeg is missing or lacks an encoder. */
export function assertFfmpeg(): void {
  let encoders: string;
  try {
    encoders = run(['-encoders']);
  } catch {
    throw new Error(
      `ffmpeg not found (${ffmpegBinary()}). Install a full build (macOS: brew install ffmpeg) or set FFMPEG_PATH.`,
    );
  }
  const missing = REQUIRED_ENCODERS.filter((name) => !new RegExp(`\\s${name}\\s`).test(encoders));
  if (missing.length > 0) {
    throw new Error(`ffmpeg lacks the encoders ${missing.join(', ')}; install a full build.`);
  }
}

/** Seconds with millisecond precision, as ffmpeg reads them. */
function seconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

/**
 * The video filter that keeps `[0, durationMs]` of the input without the `cuts` (page loads,
 * #330): one trimmed piece per kept stretch, joined with no gap.
 */
function keepFilter(durationMs: number, cuts: readonly PromoCut[]): string {
  const pieces: { start: number; end: number }[] = [];
  let from = 0;
  for (const gap of cuts) {
    pieces.push({ start: from, end: gap.start });
    from = gap.end;
  }
  pieces.push({ start: from, end: durationMs });
  const kept = pieces.filter((piece) => piece.end > piece.start);
  const trims = kept.map(
    (piece, index) =>
      `[0:v]trim=start=${seconds(piece.start)}:end=${seconds(piece.end)},setpts=PTS-STARTPTS[v${index}]`,
  );
  const inputs = kept.map((_, index) => `[v${index}]`).join('');
  return `${trims.join(';')};${inputs}concat=n=${kept.length}:v=1:a=0[out]`;
}

/**
 * Cuts the raw Playwright WebM to `[startMs, startMs + durationMs]` without the `cuts` (raw
 * times from `startMs`), and writes the MP4 (H.264, no audio, faststart) and a smaller VP9 WebM.
 */
export function encodeVideo(
  raw: string,
  startMs: number,
  durationMs: number,
  cuts: readonly PromoCut[],
  out: { readonly mp4: string; readonly webm: string },
): void {
  const cut = [
    '-y',
    '-ss',
    seconds(startMs),
    '-i',
    raw,
    '-filter_complex',
    keepFilter(durationMs, cuts),
    '-map',
    '[out]',
    '-an',
  ];
  run([
    ...cut,
    '-c:v',
    'libx264',
    // Fixed so the app can name the codec in `<source type>`: avc1.640028 (High, level 4.0, which
    // allows the 1440 x 900 desktop recording; 3.1 stops at 1280 x 720).
    '-profile:v',
    'high',
    '-level',
    '4.0',
    '-preset',
    'slow',
    '-crf',
    PROMO_MEDIA.H264Crf,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    out.mp4,
  ]);
  run([
    ...cut,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    PROMO_MEDIA.Vp9Crf,
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    '-cpu-used',
    '2',
    out.webm,
  ]);
}

/** The poster: a PNG screenshot scaled to the video size, as WebP. */
export function encodePoster(png: string, width: number, height: number, webp: string): void {
  run([
    '-y',
    '-i',
    png,
    '-vf',
    `scale=${width}:${height}:flags=lanczos`,
    '-c:v',
    'libwebp',
    '-quality',
    PROMO_MEDIA.PosterQuality,
    webp,
  ]);
}
