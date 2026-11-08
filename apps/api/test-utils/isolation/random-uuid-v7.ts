import { randomBytes } from 'node:crypto';

/** A random id with the shape of a UUIDv7 (the ids of the database), for ids that must not exist. */
export function randomUuidV7(): string {
  const bytes = randomBytes(16);
  const time = BigInt(Date.now());
  for (let i = 0; i < 6; i += 1) {
    bytes[i] = Number((time >> BigInt(8 * (5 - i))) & 0xffn);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
