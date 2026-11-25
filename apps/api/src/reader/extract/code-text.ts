import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_CODE_LANGUAGE } from '../models/reader-code-language.const';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import { attributeOf, childrenOf, isDropped, isElement, namesOf, textValue } from './html-tree';

const LINE_BREAK = '\n';
const LINE_BOX_TAGS: ReadonlySet<string> = new Set(['div', 'p', 'li', 'tr', 'section']);
const LINE_NUMBER_CLASS =
  /(?:^|[\s_-])(?:line-?numbers?|linenos?|gutter|lineno|hljs-ln-numbers)(?:[\s_-]|$)/i;

/**
 * The text of a code element with its line breaks: `<br>` and line boxes (`<div class="line">`)
 * end a line, copy buttons, hidden parts and line-number gutters are left out. Iterative over
 * a bounded number of nodes; stops after `maxChars` characters.
 */
export function codeText(root: HtmlElement, ctx: ReaderInlineContext, maxChars: number): string {
  const parts: string[] = [];
  let length = 0;
  let endsWithBreak = true;
  const push = (value: string): void => {
    if (value === '') return;
    parts.push(value);
    length += value.length;
    endsWithBreak = value.endsWith(LINE_BREAK);
  };
  // `null` marks the end of a line box.
  const stack: (HtmlNode | null)[] = [root];
  while (
    stack.length > 0 &&
    length <= maxChars &&
    ctx.visited.count < READER_EXTRACT_LIMIT.NodesMax
  ) {
    const node = stack.pop();
    if (node === undefined) continue;
    ctx.visited.count++;
    if (node === null) {
      if (!endsWithBreak) push(LINE_BREAK);
      continue;
    }
    const text = textValue(node);
    if (text !== null) {
      push(text);
      continue;
    }
    if (!isElement(node)) continue;
    if (node !== root) {
      if (isDropped(node, ctx.options) || LINE_NUMBER_CLASS.test(namesOf(node))) continue;
      if (node.tagName === 'br') {
        push(LINE_BREAK);
        continue;
      }
      if (LINE_BOX_TAGS.has(node.tagName)) stack.push(null);
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  return parts.join('');
}

function languageFrom(element: HtmlElement): string | null {
  const candidates: string[] = [];
  for (const name of READER_CODE_LANGUAGE.Attributes) {
    const value = attributeOf(element, name);
    if (value !== undefined) candidates.push(value);
  }
  const classes = attributeOf(element, 'class') ?? '';
  for (const pattern of [READER_CODE_LANGUAGE.Class, READER_CODE_LANGUAGE.Brush]) {
    const match = pattern.exec(classes);
    if (match?.[1] !== undefined) candidates.push(match[1]);
  }
  for (const candidate of candidates) {
    const name = candidate.trim().toLowerCase();
    if (!READER_CODE_LANGUAGE.None.test(name) && READER_CODE_LANGUAGE.Valid.test(name)) return name;
  }
  return null;
}

/** The language a page marks on a `<pre>`, its `<code>` or the two boxes around it; else `null`. */
export function codeLanguage(pre: HtmlElement): string | null {
  const code = childrenOf(pre).find((child) => isElement(child) && child.tagName === 'code');
  const around: HtmlElement[] = [pre];
  if (code !== undefined && isElement(code)) around.push(code);
  let parent: HtmlNode | undefined = pre.parentNode ?? undefined;
  for (let level = 0; level < 2 && parent !== undefined && isElement(parent); level++) {
    around.push(parent);
    parent = parent.parentNode ?? undefined;
  }
  for (const element of around) {
    const language = languageFrom(element);
    if (language !== null) return language;
  }
  return null;
}
