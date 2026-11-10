RatingScale asks for a 1–10 score with square buttons that are easy to hit.

**Angular:** `ui-rating-scale` — model `score: number | null`, inputs `min` (1), `max` (10), `lowLabel`, `highLabel`; Angular Aria radio group (arrows move, digits 1–9 and 0 pick).

**Classes:** `sm-rating` (10 columns, 8px gap; 5 columns under 520px), `sm-rating__item` (square, at least 48px, `surface-hover`; hover `surface-pressed`; press scales to 0.94; `is-on` or `aria-checked="true"` = `primary`), `sm-rating__ends` for the two end labels.

- Used by the rating dialog (3 days, 1 week, 1 month, 1 year after sign-up). Picking 1–7 asks what would make it better; 8–10 thanks and closes.
- A read-only copy shows the chosen score at the top of the follow-up step (`role="img"` with an `aria-label`).
