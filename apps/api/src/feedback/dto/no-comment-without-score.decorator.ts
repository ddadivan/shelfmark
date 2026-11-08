import { registerDecorator, type ValidationArguments } from 'class-validator';

/** A comment needs a score: "not now" (score null) carries no text. Use on the comment property. */
export function NoCommentWithoutScore(): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'noCommentWithoutScore',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: 'comment requires a score' },
      validator: {
        validate: (value: unknown, args?: ValidationArguments) =>
          value === undefined || (args?.object as { score?: unknown } | undefined)?.score !== null,
      },
    });
  };
}
