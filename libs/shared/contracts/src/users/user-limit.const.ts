/**
 * Limits for user fields. `EmailMax` is the maximum length of an email address (RFC 5321);
 * `CustomColoursMax` the own colours (`#rrggbb`) one account keeps as swatches (#335).
 */
export const USER_LIMIT = { EmailMax: 320, CustomColoursMax: 12 } as const;
