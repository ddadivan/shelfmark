import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compile } from 'sass';

const UI_SRC = 'libs/ui/src';

/** Finds `libs/ui/src`: the spec folder's ancestor, else walk up from the cwd (Nx runs from the root). */
function findSrcDir(): string {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = resolve(dir, UI_SRC);
    if (existsSync(resolve(candidate, 'styles/_ui.scss'))) {
      return candidate;
    }
    if (dirname(dir) === dir) {
      throw new Error(`Cannot find ${UI_SRC} from ${process.cwd()}`);
    }
  }
}

const compiled = new Map<string, string>();

/**
 * The extra sheets a component loads after `<name>.component.scss` (its `styleUrls`): a sheet is
 * split in several files to stay under the component style budget, the specs read them as one.
 */
function companionSheets(path: string): string[] {
  const source = path.replace(/\.scss$/, '.ts');
  if (!existsSync(source)) {
    return [];
  }
  const urls = /styleUrls:\s*\[([^\]]*)\]/.exec(readFileSync(source, 'utf8'));
  if (!urls) {
    return [];
  }
  return [...urls[1].matchAll(/'\.\/([^']+\.scss)'/g)]
    .map((m) => resolve(dirname(path), m[1]))
    .filter((sheet) => sheet !== path);
}

/**
 * Compiles a component stylesheet (path relative to `libs/ui/src`) to plain CSS, followed by the
 * other sheets of the same component when its `styleUrls` lists more than one.
 */
export function compileScss(relativePath: string): string {
  const path = resolve(findSrcDir(), relativePath);
  let css = compiled.get(path);
  if (css === undefined) {
    css = [path, ...companionSheets(path)].map((sheet) => compile(sheet).css).join('\n');
    compiled.set(path, css);
  }
  return css;
}

/** Returns the brace-matched body of every `@media` block whose query matches `query`. */
export function mediaBlocks(css: string, query: RegExp): string[] {
  const opener = /@media([^{]*)\{/g;
  const bodies: string[] = [];
  for (let m = opener.exec(css); m; m = opener.exec(css)) {
    if (!query.test(m[1])) {
      continue;
    }
    let depth = 1;
    let i = opener.lastIndex;
    for (; i < css.length && depth > 0; i++) {
      depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    }
    bodies.push(css.slice(opener.lastIndex, i - 1));
  }
  return bodies;
}

/** The CSS with every `@media` block matching `query` removed (brace-matched, by position). */
export function withoutMedia(css: string, query: RegExp): string {
  const opener = /@media([^{]*)\{/g;
  let out = '';
  let last = 0;
  for (let m = opener.exec(css); m; m = opener.exec(css)) {
    if (!query.test(m[1])) {
      continue;
    }
    let depth = 1;
    let i = opener.lastIndex;
    for (; i < css.length && depth > 0; i++) {
      depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    }
    out += css.slice(last, m.index);
    last = i;
    opener.lastIndex = i;
  }
  return out + css.slice(last);
}
