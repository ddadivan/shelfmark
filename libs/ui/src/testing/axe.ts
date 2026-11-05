import axe from 'axe-core';

/**
 * Runs axe-core on an element and returns the violation messages (empty when clean).
 * Colour contrast is off: jsdom/happy-dom have no layout or computed colours; contrast is
 * checked by the Storybook a11y addon in a real browser.
 */
export async function axeViolations(element: Element): Promise<string[]> {
  const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}
