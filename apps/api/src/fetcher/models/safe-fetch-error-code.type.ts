import type { SAFE_FETCH_ERROR_CODE } from './safe-fetch-error-code.const';

export type SafeFetchErrorCode = (typeof SAFE_FETCH_ERROR_CODE)[keyof typeof SAFE_FETCH_ERROR_CODE];
