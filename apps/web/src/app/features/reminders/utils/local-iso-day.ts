/** The local calendar day of `now` as `YYYY-MM-DD` (the date picker's value). */
export function localIsoDay(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
