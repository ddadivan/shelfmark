/**
 * Upper bound for the JSON of one import request (check or batch), below the API's 100 kb body
 * limit with room for the envelope (ADR 0056).
 */
export const IMPORT_REQUEST_BYTES = 80 * 1024;
