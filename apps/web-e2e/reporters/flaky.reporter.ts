import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { FullConfig, Reporter, Suite } from '@playwright/test/reporter';
import type { FlakyTest } from './models/flaky-test.interface.ts';

/**
 * Lists the tests that passed only on a retry (#362). With FLAKY_REPORT_DIR set (CI), writes them
 * as JSON to a file of its own in that folder, so the two Playwright runs of a PR shard do not
 * overwrite each other; the `e2e` job collects the files into the job summary
 * (tools/ci/flaky-summary.mjs). Writes nothing when no test was flaky and never fails a run.
 */
export default class FlakyReporter implements Reporter {
  private rootDir = '';
  private suite: Suite | undefined;

  onBegin(config: FullConfig, suite: Suite): void {
    this.rootDir = config.rootDir;
    this.suite = suite;
  }

  onEnd(): void {
    const dir = process.env['FLAKY_REPORT_DIR'];
    if (!dir || !this.suite) return;
    const flaky: FlakyTest[] = this.suite
      .allTests()
      .filter((test) => test.outcome() === 'flaky')
      .map((test) => ({
        project: test.parent.project()?.name ?? '',
        file: relative(this.rootDir, test.location.file),
        line: test.location.line,
        // titlePath: root, project, file, then the describe blocks and the title.
        title: test.titlePath().slice(3).join(' › '),
        retries: test.results.filter((result) => result.status !== 'passed').length,
      }));
    if (flaky.length === 0) return;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `flaky-${process.pid}-${Date.now()}.json`), JSON.stringify(flaky));
  }

  printsToStdio(): boolean {
    return false;
  }
}
