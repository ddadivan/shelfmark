const NEWLINE = 0x0a;

function parseHeader(bytes: Buffer): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lists the item types of a Sentry envelope by walking its item headers (the first line is the
 * envelope header and is skipped). Returns `undefined` when the structure is malformed.
 * Item payloads are skipped by their declared `length`, or up to the next newline without one.
 */
export function readEnvelopeItemTypes(envelope: Buffer): string[] | undefined {
  const types: string[] = [];
  let position = envelope.indexOf(NEWLINE);
  if (position === -1) return types;
  position += 1;

  while (position < envelope.length) {
    let headerEnd = envelope.indexOf(NEWLINE, position);
    if (headerEnd === -1) headerEnd = envelope.length;
    if (headerEnd === position) {
      // Blank line between items.
      position += 1;
      continue;
    }
    const header = parseHeader(envelope.subarray(position, headerEnd));
    const type = header?.['type'];
    if (header === undefined || typeof type !== 'string') return undefined;
    types.push(type);

    const length = header['length'];
    position = headerEnd + 1;
    if (typeof length === 'number') {
      if (!Number.isInteger(length) || length < 0 || position + length > envelope.length) {
        return undefined;
      }
      position += length;
    } else {
      const payloadEnd = envelope.indexOf(NEWLINE, position);
      position = payloadEnd === -1 ? envelope.length : payloadEnd;
    }
    if (envelope[position] === NEWLINE) position += 1;
  }
  return types;
}
