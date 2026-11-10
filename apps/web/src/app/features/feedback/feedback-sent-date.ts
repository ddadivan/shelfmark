import type { FeedbackSentDate } from './models/feedback-sent-date.interface';

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today" for the current day, else "3 Nov" ("3 Nov 2025" for another year), in the locale. */
export function feedbackSentDate(iso: string, now: Date, locale: string): FeedbackSentDate {
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) {
    return { today: false, text: '' };
  }
  if (sameDay(sent, now)) {
    return { today: true, text: '' };
  }
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(sent.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
  return { today: false, text: format.format(sent) };
}
