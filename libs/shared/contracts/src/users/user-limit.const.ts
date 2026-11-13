/**
 * Limits for user fields. `EmailMax` is the maximum length of an email address (RFC 5321);
 * `CustomColoursMax` the own colours (`#rrggbb`) one account keeps as swatches (#335);
 * `CustomEmojiMax` the own emoji the folder emoji picker offers under "Yours" (#363).
 */
export const USER_LIMIT = { EmailMax: 320, CustomColoursMax: 12, CustomEmojiMax: 24 } as const;
