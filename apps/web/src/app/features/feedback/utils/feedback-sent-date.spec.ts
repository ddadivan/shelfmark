import { feedbackSentDate } from './feedback-sent-date';

const NOW = new Date(2026, 10, 10, 15, 0, 0);

describe('feedbackSentDate', () => {
  it('is today for the same calendar day', () => {
    expect(feedbackSentDate(new Date(2026, 10, 10, 1, 0, 0).toISOString(), NOW, 'en')).toEqual({
      today: true,
      text: '',
    });
  });

  it('formats another day of this year as day and month', () => {
    expect(feedbackSentDate(new Date(2026, 10, 3, 12).toISOString(), NOW, 'en')).toEqual({
      today: false,
      text: '3 Nov',
    });
  });

  it('adds the year for another year', () => {
    expect(feedbackSentDate(new Date(2025, 9, 12, 12).toISOString(), NOW, 'en').text).toBe(
      '12 Oct 2025',
    );
  });

  it('is empty for an unreadable date', () => {
    expect(feedbackSentDate('nope', NOW, 'en')).toEqual({ today: false, text: '' });
  });
});
