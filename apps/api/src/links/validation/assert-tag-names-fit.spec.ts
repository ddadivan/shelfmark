import { BadRequestException } from '@nestjs/common';
import { TAG_ERROR_MESSAGE, TAG_LIMIT } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import { assertTagNamesFit } from './assert-tag-names-fit';

describe('assertTagNamesFit', () => {
  it('accepts no names and names within the limit', () => {
    expect(() => assertTagNamesFit(undefined)).not.toThrow();
    expect(() => assertTagNamesFit(['a'.repeat(TAG_LIMIT.NameMax)])).not.toThrow();
  });

  it('refuses a name past the limit with the contract message', () => {
    expect(() => assertTagNamesFit(['ok', 'a'.repeat(TAG_LIMIT.NameMax + 1)])).toThrow(
      new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong),
    );
  });
});
