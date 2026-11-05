import type { TypeStyleDoc } from './type-style.interface';

export const TYPE_STYLES: readonly TypeStyleDoc[] = [
  { name: 'display', spec: '32 / 38 · 600 · -0.02em', usage: 'Page and empty-state headlines' },
  { name: 'title', spec: '20 / 28 · 600 · -0.01em', usage: 'Dialog and section titles' },
  { name: 'heading', spec: '16 / 24 · 600', usage: 'Card and group headings' },
  { name: 'body', spec: '15 / 22 · 400', usage: 'Running text, inputs' },
  { name: 'label', spec: '13 / 18 · 500', usage: 'Buttons, field labels, menu items' },
  { name: 'caption', spec: '12 / 16 · 400', usage: 'Hints, meta, timestamps' },
  { name: 'mono', spec: '13 / 20 · 400 · mono', usage: 'URLs and code' },
];
