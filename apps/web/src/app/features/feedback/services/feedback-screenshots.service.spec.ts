import { TestBed } from '@angular/core/testing';
import { FEEDBACK_SCREENSHOT_ERROR } from '../models/feedback-screenshot-error.const';
import { FeedbackScreenshots } from './feedback-screenshots.service';

const png = (name: string): File => new File(['hello'], name, { type: 'image/png' });

function setup(): FeedbackScreenshots {
  TestBed.configureTestingModule({ providers: [FeedbackScreenshots] });
  return TestBed.inject(FeedbackScreenshots);
}

describe('FeedbackScreenshots (#352)', () => {
  it('adds valid files in order and gives their uploads', async () => {
    const shots = setup();

    await shots.add([png('a.png'), png('b.png')]);

    expect(shots.items().map((item) => item.name)).toEqual(['a.png', 'b.png']);
    expect(shots.uploads()).toEqual([
      { type: 'image/png', data: btoa('hello') },
      { type: 'image/png', data: btoa('hello') },
    ]);
    expect(shots.error()).toBeNull();
    expect(shots.canAdd()).toBe(true);
  });

  it('keeps at most three and reports the rest as too many', async () => {
    const shots = setup();

    await shots.add([png('a.png'), png('b.png')]);
    await shots.add([png('c.png'), png('d.png')]);

    expect(shots.items().map((item) => item.name)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(shots.error()).toBe(FEEDBACK_SCREENSHOT_ERROR.Count);
    expect(shots.canAdd()).toBe(false);
  });

  it('skips an invalid file, keeps the valid ones and reports the first problem', async () => {
    const shots = setup();

    await shots.add([
      new File(['x'], 'notes.pdf', { type: 'application/pdf' }),
      png('a.png'),
      new File([], 'empty.png', { type: 'image/png' }),
    ]);

    expect(shots.items().map((item) => item.name)).toEqual(['a.png']);
    expect(shots.error()).toBe(FEEDBACK_SCREENSHOT_ERROR.Type);
  });

  it('removes one by index and clears the problem; an empty pick changes nothing', async () => {
    const shots = setup();
    await shots.add([png('a.png'), png('b.png'), png('c.png'), png('d.png')]);

    shots.remove(1);

    expect(shots.items().map((item) => item.name)).toEqual(['a.png', 'c.png']);
    expect(shots.error()).toBeNull();
    await shots.add([]);
    expect(shots.items()).toHaveLength(2);
  });
});
