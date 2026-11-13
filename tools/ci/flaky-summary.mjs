// Lists the web-e2e tests that passed only on a retry in the job summary of the `e2e` job (#362).
// Reads the JSON files that apps/web-e2e/reporters/flaky.reporter.ts wrote in each shard (an array
// of { project, file, line, title, retries } per file). Flaky tests fail nothing: the list is there
// so they get fixed instead of piling up (ADR 0043).
// Usage: node tools/ci/flaky-summary.mjs <dir>   (appends to $GITHUB_STEP_SUMMARY, else stdout)
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'flaky-reports';
const files = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.json')) : [];
const tests = files.flatMap((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')));

/** Escapes the characters that would break a Markdown table cell. */
const cell = (text) => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ');

const lines = ['## Flaky e2e tests', ''];
if (tests.length === 0) {
  lines.push('No test needed a retry.');
} else {
  tests.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.project.localeCompare(b.project),
  );
  lines.push(
    `${tests.length} test run(s) passed only on a retry. They did not fail the check; please fix them.`,
    '',
    '| Spec | Test | Project | Failed attempts |',
    '| --- | --- | --- | --- |',
    ...tests.map(
      (t) =>
        `| \`${cell(t.file)}:${t.line}\` | ${cell(t.title)} | ${cell(t.project)} | ${t.retries} |`,
    ),
  );
  for (const t of tests) {
    console.log(
      `::warning file=apps/web-e2e/src/${t.file},line=${t.line}::Flaky on ${t.project}: ${t.title}`,
    );
  }
}
const markdown = `${lines.join('\n')}\n`;
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, markdown);
else process.stdout.write(markdown);
