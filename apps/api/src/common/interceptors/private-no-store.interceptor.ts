import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { PRIVATE_NO_STORE } from './models/private-no-store.const';

/**
 * Sets `Cache-Control: private, no-store` before the pipes and the handler run, so an error answer
 * of the route (a 400 from a parse pipe, a 404) is never cached either. For routes that write
 * private content with `@Res()`, where `@Header()` does not apply.
 */
@Injectable()
export class PrivateNoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', PRIVATE_NO_STORE);
    return next.handle();
  }
}
