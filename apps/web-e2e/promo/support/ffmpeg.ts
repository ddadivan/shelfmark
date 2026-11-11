import { execFileSync } from 'node:child_process';
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
 * Cuts the raw Playwright WebM to `[startMs, startMs + durationMs]` and writes the MP4
 * (H.264, no audio, faststart) and a smaller VP9 WebM.
 */
export function encodeVideo(
  raw: string,
  startMs: number,
  durationMs: number,
  out: { readonly mp4: string; readonly webm: string },
): void {
  const cut = ['-y', '-ss', seconds(startMs), '-i', raw, '-t', seconds(durationMs), '-an'];
  run([
    ...cut,
    '-c:v',
    'libx264',
    // Fixed so the app can name the codec in `<source type>`: avc1.64001F (High, level 3.1).
    '-profile:v',
    'high',
    '-level',
    '3.1',
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
