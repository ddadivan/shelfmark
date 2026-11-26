import { describe, expect, it } from 'vitest';
import { nextPaint } from './next-paint';

describe('nextPaint', () => {
  it('resolves after a frame and a task', async () => {
    let done = false;
    const wait = nextPaint(document).then(() => (done = true));
    expect(done).toBe(false);
    await wait;
    expect(done).toBe(true);
  });

  it('resolves at once without a window', async () => {
    const doc = document.implementation.createHTMLDocument('x');
    await expect(nextPaint(doc)).resolves.toBeUndefined();
  });
});
