import { registerDecorator } from 'class-validator';
import { FEEDBACK_LIMIT } from '@shelfmark/contracts';

/** The key is required: the value is null ("not now") or an integer from 1 to 10. */
export function IsFeedbackScore(): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isFeedbackScore',
      target: target.constructor,
      propertyName: String(propertyName),
      options: {
        message: `$property must be null or an integer from ${FEEDBACK_LIMIT.ScoreMin} to ${FEEDBACK_LIMIT.ScoreMax}`,
      },
      validator: {
        validate: (value: unknown) =>
          value === null ||
          (typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= FEEDBACK_LIMIT.ScoreMin &&
            value <= FEEDBACK_LIMIT.ScoreMax),
      },
    });
  };
}
