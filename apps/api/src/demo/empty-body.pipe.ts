import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isRecord } from '../common/util/is-record';

/**
 * Accepts only "no body": nothing sent, or an empty JSON object. Any field is a 400, the same
 * outcome `forbidNonWhitelisted` gives a DTO route. (A DTO without properties cannot do this: with
 * no body at all the parser leaves `undefined`, which the global pipe rejects.)
 */
@Injectable()
export class EmptyBodyPipe implements PipeTransform<unknown, undefined> {
  transform(value: unknown): undefined {
    const empty =
      value === undefined ||
      (isRecord(value) && !Array.isArray(value) && Object.keys(value).length === 0);
    if (!empty) throw new BadRequestException('Request body must be empty');
    return undefined;
  }
}
