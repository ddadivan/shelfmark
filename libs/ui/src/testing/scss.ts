import { existsSync } from 'node:fs';
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

/** Compiles a component stylesheet (path relative to `libs/ui/src`) to plain CSS. */
export function compileScss(relativePath: string): string {
  return compile(resolve(findSrcDir(), relativePath)).css;
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

/** The CSS with every `@media` block matching `query` removed (brace-matched). */
export function withoutMedia(css: string, query: RegExp): string {
  let out = css;
  for (const body of mediaBlocks(css, query)) {
    out = out.replace(body, '');
  }
  return out;
}
