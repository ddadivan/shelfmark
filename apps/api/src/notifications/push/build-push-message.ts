import type { PushMessage } from '../models/push-message.interface';

/** Where a click on a reminder lands: Today, whose Due list holds every due reminder. */
const REMINDERS_URL = '/today';
const SETTINGS_URL = '/settings/notifications';
const ICON = '/icons/icon-192.png';
/** A push title or body longer than this is cut (push services cap the payload near 4 KB). */
const TEXT_MAX = 200;

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > TEXT_MAX ? `${flat.slice(0, TEXT_MAX - 1)}…` : flat;
}

function message(title: string, body: string, tag: string, url: string): PushMessage {
  return {
    notification: {
      title: clip(title),
      body: clip(body),
      icon: ICON,
      tag,
      data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url } } },
    },
  };
}

/** The host of a saved URL without `www.`, or an empty string. */
function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * One due reminder: the link's title and its site (Shelf 12-notify "How a reminder arrives"). The
 * tag is per link, so a second push for the same link replaces the first on the device.
 */
export function reminderMessage(link: { id: string; title: string; url: string }): PushMessage {
  const site = siteOf(link.url);
  return message(
    link.title || site || 'Reminder',
    site ? `Reminder · ${site}` : 'Reminder',
    `sm-reminder-${link.id}`,
    REMINDERS_URL,
  );
}

/** Several due reminders at once: one message instead of a burst. */
export function remindersSummaryMessage(count: number): PushMessage {
  return message(
    `${count} reminders are due`,
    'Open Shelfmark to see them in Today.',
    'sm-reminders',
    REMINDERS_URL,
  );
}

/** "Send a test" in Settings › Notifications. */
export function testMessage(): PushMessage {
  return message(
    'Notifications are on',
    'This is how a reminder from Shelfmark will look.',
    'sm-test',
    SETTINGS_URL,
  );
}
