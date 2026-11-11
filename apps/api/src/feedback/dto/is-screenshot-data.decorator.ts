import { registerDecorator, type ValidationArguments } from 'class-validator';
import { FEEDBACK_MESSAGE_LIMIT, type FeedbackScreenshotType } from '@shelfmark/contracts';

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
/** 16 base64 characters decode to the first 12 bytes, enough for every signature below. */
const HEAD_CHARS = 16;

function startsWith(head: Buffer, bytes: readonly number[], offset = 0): boolean {
  return bytes.every((byte, index) => head[offset + index] === byte);
}

const SIGNATURES: Record<FeedbackScreenshotType, (head: Buffer) => boolean> = {
  'image/png': (head) => startsWith(head, [0x89, 0x50, 0x4e, 0x47]),
  'image/jpeg': (head) => startsWith(head, [0xff, 0xd8, 0xff]),
  // RIFF, four size bytes, WEBP
  'image/webp': (head) =>
    startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8),
};

/** Decoded size of canonical base64 without decoding it. */
export function base64DecodedLength(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return (data.length / 4) * 3 - padding;
}

/** True when `data` is canonical base64 within the size limit and its signature matches `type`. */
export function isValidScreenshotData(data: unknown, type: unknown): boolean {
  if (typeof data !== 'string' || data.length === 0 || data.length % 4 !== 0) return false;
  if (data.length > Math.ceil(FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes / 3) * 4) return false;
  if (!BASE64.test(data)) return false;
  const size = base64DecodedLength(data);
  if (size < 1 || size > FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes) return false;
  const check =
    typeof type === 'string' ? Object.entries(SIGNATURES).find(([t]) => t === type) : undefined;
  if (!check) return false;
  return check[1](Buffer.from(data.slice(0, HEAD_CHARS), 'base64'));
}

/** Use on `data`: canonical base64, at most the screenshot limit, magic bytes match `type`. */
export function IsScreenshotData(): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isScreenshotData',
      target: target.constructor,
      propertyName: String(propertyName),
      options: {
        message: `$property must be base64 of a PNG, JPEG or WebP matching type, at most ${FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes} bytes`,
      },
      validator: {
        validate: (value: unknown, args?: ValidationArguments) =>
          isValidScreenshotData(value, (args?.object as { type?: unknown } | undefined)?.type),
      },
    });
  };
}
