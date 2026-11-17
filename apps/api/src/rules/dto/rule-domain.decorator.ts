import { normalizeRuleDomain, RULE_ERROR_MESSAGE } from '@shelfmark/contracts';
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, ValidateBy } from 'class-validator';

/**
 * A rule domain: the input (a domain or a whole address) becomes `normalizeRuleDomain` before
 * validation; text without a domain name stays as sent and fails with `InvalidDomain`.
 */
export const RuleDomain = (): PropertyDecorator =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizeRuleDomain(value) ?? value) : value,
    ),
    IsString(),
    ValidateBy({
      name: 'isRuleDomain',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && normalizeRuleDomain(value) === value,
        defaultMessage: () => RULE_ERROR_MESSAGE.InvalidDomain,
      },
    }),
  );
