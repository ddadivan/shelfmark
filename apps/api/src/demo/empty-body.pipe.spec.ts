import { BadRequestException } from '@nestjs/common';
import { EmptyBodyPipe } from './empty-body.pipe';

describe('EmptyBodyPipe', () => {
  const pipe = new EmptyBodyPipe();

  it.each([undefined, {}])('accepts no body: %j', (value) => {
    expect(pipe.transform(value)).toBeUndefined();
  });

  it.each([[{ a: 1 }], [[]], [[1]], ['text'], [0], [null]])('rejects %j with a 400', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
