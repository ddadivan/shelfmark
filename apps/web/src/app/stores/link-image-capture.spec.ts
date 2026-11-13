import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { createLinkImageCapture } from './link-image-capture';

const pendingImage = '/api/links/x/image?v=pending';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, imageUrl: pendingImage, faviconUrl: null, ...changes };
}

function setup(over: { epoch?: () => number; isHidden?: (id: string) => boolean } = {}) {
  const resolvers: Array<() => void> = [];
  const request = vi.fn(
    (id: string) =>
      new Promise<LinkResponse>((resolve) => {
        resolvers.push(() => resolve(link(Number(id.slice(3)), { imageUrl: '/done' })));
      }),
  );
  const apply = vi.fn();
  const capture = createLinkImageCapture({
    request,
    current: (id) => link(Number(id.slice(3))),
    isHidden: over.isHidden ?? (() => false),
    epoch: over.epoch ?? (() => 0),
    apply,
  });
  return { capture, request, apply, resolvers };
}

describe('createLinkImageCapture', () => {
  it('asks once per link and ignores links without a pending image', () => {
    const { capture, request } = setup();
    capture.note([link(1), link(2, { imageUrl: '/ready' })]);
    capture.note([link(1)]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('id-1');
  });

  it('runs at most three requests at once and starts the next when one ends', async () => {
    const { capture, request, resolvers } = setup();
    capture.note([link(1), link(2), link(3), link(4)]);
    expect(request).toHaveBeenCalledTimes(3);
    resolvers[0]();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(4));
  });

  it('applies the captured images and title of the asked version', async () => {
    const { capture, apply, resolvers } = setup();
    capture.note([link(1)]);
    resolvers[0]();
    await vi.waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    expect(apply.mock.calls[0][0]).toBe('id-1');
    expect(apply.mock.calls[0][1]).toMatchObject({ imageUrl: '/done' });
  });

  it('drops an answer after the epoch changed or while the link is hidden', async () => {
    let epoch = 0;
    const gone = setup({ epoch: () => epoch });
    gone.capture.note([link(1)]);
    epoch = 1;
    gone.resolvers[0]();
    const hidden = setup({ isHidden: () => true });
    hidden.capture.note([link(1)]);
    hidden.resolvers[0]();
    await Promise.resolve();
    await Promise.resolve();
    expect(gone.apply).not.toHaveBeenCalled();
    expect(hidden.apply).not.toHaveBeenCalled();
  });

  it('asks again after clear()', () => {
    const { capture, request } = setup();
    capture.note([link(1)]);
    capture.clear();
    capture.note([link(1)]);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
