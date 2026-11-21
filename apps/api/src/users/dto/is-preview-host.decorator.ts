import { isPreviewHost } from '@shelfmark/contracts';
import { ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * A host for Settings › Library › Sites that open in a new tab (#553): lower-case DNS labels with
 * at least one dot, no scheme, port or path (`isPreviewHost`). Pass `{ each: true }` for a list.
 */
export const IsPreviewHost = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'isPreviewHost',
      validator: {
        validate: (value: unknown): boolean => isPreviewHost(value),
        defaultMessage: (): string => 'each site must be a lower-case host such as example.com',
      },
    },
    options,
  );
