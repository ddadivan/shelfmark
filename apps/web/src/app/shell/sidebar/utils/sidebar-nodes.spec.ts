import { feedbackNodes, fixedNodes, trashNodes } from './sidebar-nodes';
import type { SidebarLabels } from '../models/sidebar-labels.interface';

const LABELS: SidebarLabels = {
  all: 'All links',
  unsorted: 'Unsorted',
  favorites: 'Favorites',
  actions: 'Actions for {name}',
  recent: 'Recently opened',
  reminders: 'Reminders',
  trash: 'Trash',
  feedback: 'Send feedback',
  whatsNew: "What's new",
  extension: 'Get the extension',
  whatsNewDot: 'new',
};

describe('sidebar nodes', () => {
  it('builds the fixed rows with counts', () => {
    const nodes = fixedNodes(LABELS, { all: 5, unsorted: 2, favorites: 1 });
    expect(nodes.map((node) => [node.id, node.name, node.count])).toEqual([
      ['all', 'All links', 5],
      ['unsorted', 'Unsorted', 2],
      ['favorites', 'Favorites', 1],
      ['recent', 'Recently opened', undefined],
      ['reminders', 'Reminders', undefined],
    ]);
  });

  it('counts the due reminders on the Reminders row, even without link counts', () => {
    const reminders = fixedNodes(LABELS, null, 2).find((node) => node.id === 'reminders');
    expect(reminders).toMatchObject({ name: 'Reminders', icon: 'bell', count: 2 });
  });

  it('leaves the counts out without counts', () => {
    expect(fixedNodes(LABELS, null).every((node) => !('count' in node))).toBe(true);
  });

  it('builds the feedback row', () => {
    expect(feedbackNodes(LABELS)).toEqual([
      { id: 'whats-new', name: "What's new", icon: 'gift' },
      { id: 'feedback', name: 'Send feedback', icon: 'message' },
    ]);
    expect(feedbackNodes(LABELS, true)[0]).toEqual({
      id: 'whats-new',
      name: "What's new",
      icon: 'gift',
      dot: 'new',
    });
  });

  it('leads the footer with "Get the extension" once the banner was closed (#455)', () => {
    expect(feedbackNodes(LABELS, false, true).map((node) => node.id)).toEqual([
      'extension',
      'whats-new',
      'feedback',
    ]);
    expect(feedbackNodes(LABELS, false, true)[0]).toEqual({
      id: 'extension',
      name: 'Get the extension',
      icon: 'download',
    });
  });

  it('builds the trash row with or without a count', () => {
    expect(trashNodes(LABELS, 3)[0]).toMatchObject({ id: 'trash', count: 3 });
    expect('count' in (trashNodes(LABELS, undefined)[0] ?? {})).toBe(false);
  });
});
