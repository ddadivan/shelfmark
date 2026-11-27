import { copyText } from './copy-text';

function docWith(clipboard: unknown): Document {
  return { defaultView: { navigator: { clipboard } } } as unknown as Document;
}

describe('copyText', () => {
  it('writes the text to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyText(docWith({ writeText }), 'abc')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('is false without a clipboard, for empty text, or when the browser refuses', async () => {
    expect(await copyText(docWith(undefined), 'abc')).toBe(false);
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await copyText(docWith({ writeText }), '')).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(await copyText(docWith({ writeText }), 'abc')).toBe(false);
  });
});
