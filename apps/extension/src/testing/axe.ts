import axe from 'axe-core';

/**
 * Runs axe-core on an element and returns the violation messages (empty when clean).
 * Colour contrast is off: the unit-test DOM has no layout or computed colours; the e2e run and
 * the Storybook a11y addon cover contrast in a real browser.
 */
export async function axeViolations(element: Element): Promise<string[]> {
  const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}
