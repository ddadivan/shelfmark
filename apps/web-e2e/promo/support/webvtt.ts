import type { PromoCue } from '../models/promo-cue.interface';

/** `00:00:18.000` for 18 000 ms. */
function timestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** A WebVTT file with one numbered cue per caption. */
export function toWebVtt(cues: readonly PromoCue[]): string {
  const blocks = cues.map(
    (cue, index) => `${index + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}`,
  );
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}
