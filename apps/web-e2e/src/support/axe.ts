import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import type { Page } from '@playwright/test';

/**
 * Runs axe-core (real browser, colour contrast included) on the elements matching `selector`
 * and returns the violations as `rule: help (nodes)`; empty when clean.
 */
export async function axeViolations(page: Page, selector: string): Promise<string[]> {
  await page.addScriptTag({
    content: readFileSync(join(workspaceRoot, 'node_modules/axe-core/axe.min.js'), 'utf8'),
  });
  return page.evaluate<string[], string>(
    `(async () => {
      const results = await globalThis.axe.run(document.querySelector(${JSON.stringify(selector)}));
      return results.violations.map((v) => v.id + ': ' + v.help + ' (' + v.nodes.length + ')');
    })()`,
    selector,
  );
}
