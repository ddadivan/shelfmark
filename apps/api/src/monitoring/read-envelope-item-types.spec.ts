import { readEnvelopeItemTypes } from './read-envelope-item-types';

const header = '{"dsn":"https://k@o1.ingest.sentry.io/2"}';

function envelope(...lines: string[]): Buffer {
  return Buffer.from(lines.join('\n'));
}

describe('readEnvelopeItemTypes', () => {
  it('lists item types without a declared length', () => {
    expect(readEnvelopeItemTypes(envelope(header, '{"type":"event"}', '{"message":"x"}'))).toEqual([
      'event',
    ]);
  });

  it('skips payloads by declared length, even when they contain newlines', () => {
    const payload = '{"a":"x\\ny"}\n{"type":"attachment"}';
    const buffer = envelope(
      header,
      `{"type":"event","length":${Buffer.byteLength(payload)}}`,
      payload,
      '{"type":"session"}',
      '{}',
    );
    expect(readEnvelopeItemTypes(buffer)).toEqual(['event', 'session']);
  });

  it('returns an empty list for a header-only envelope', () => {
    expect(readEnvelopeItemTypes(Buffer.from(header))).toEqual([]);
    expect(readEnvelopeItemTypes(envelope(header, ''))).toEqual([]);
  });

  it('tolerates blank lines and a missing trailing payload', () => {
    expect(readEnvelopeItemTypes(envelope(header, '', '{"type":"event"}'))).toEqual(['event']);
  });

  it.each([
    ['a non-JSON item header', envelope(header, 'nope', '{}')],
    ['a header without a type', envelope(header, '{"length":1}', 'x')],
    ['a non-object header', envelope(header, '[1]', '{}')],
    ['a length past the end', envelope(header, '{"type":"event","length":99}', '{}')],
    ['a negative length', envelope(header, '{"type":"event","length":-1}', '{}')],
    ['a fractional length', envelope(header, '{"type":"event","length":1.5}', '{}')],
  ])('rejects %s', (_label, buffer) => {
    expect(readEnvelopeItemTypes(buffer)).toBeUndefined();
  });
});
