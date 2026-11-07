import type { HTTP_METHOD } from './http-method.const';

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];
