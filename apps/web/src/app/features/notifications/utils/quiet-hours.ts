/** The 24 whole hours as `HH:00`, the choices of the quiet hours. */
export function quietHourValues(): string[] {
  return Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
}
