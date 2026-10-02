// Lint regression gate.
//
// `npm run lint` reports 94 problems that pre-date this workflow. Wiring that
// straight into CI would mean the pipeline is red on its first run and nobody
// ever reads it again, so instead the count is recorded and CI fails only when
// it goes UP. `npm run lint:baseline:update` re-records it after an intentional
// cleanup (Phase 6 clears the backlog, then this file is deleted along with the
// extra scripts).
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASELINE_FILE = "eslint-baseline.json";
const REPORT_FILE = "eslint-report.json";

const update = process.argv.includes("--update");

// eslint exits non-zero whenever it finds any error, and the 59 pre-existing
// ones are exactly why the status code is ignored here: the JSON report is the
// signal we want, not the exit code.
//
// eslint's own entry point is spawned with the current interpreter rather than
// through `npx` with `shell: true`, which Node 24 warns about.
const ESLINT_BIN = fileURLToPath(
  new URL("../node_modules/eslint/bin/eslint.js", import.meta.url),
);

try {
  execFileSync(
    process.execPath,
    [ESLINT_BIN, ".", "--format", "json", "-o", REPORT_FILE],
    { stdio: "inherit" },
  );
} catch {
  // Expected: non-zero exit because errors exist. The report is still written.
}

const report = JSON.parse(readFileSync(REPORT_FILE, "utf8"));
rmSync(REPORT_FILE, { force: true });

const total = report.reduce(
  (acc, file) => ({
    errors: acc.errors + file.errorCount,
    warnings: acc.warnings + file.warningCount,
  }),
  { errors: 0, warnings: 0 },
);

const BASELINE_COMMENT =
  "Recorded by `npm run lint:baseline:update`. CI fails only when these counts " +
  "increase. Delete this file (and the lint:baseline scripts) once the backlog reaches zero.";

if (update) {
  const next = { _comment: BASELINE_COMMENT, ...total };
  writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + "\n");
  console.log(
    `Recorded lint baseline: ${total.errors} errors, ${total.warnings} warnings`,
  );
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
const regressions = [];

if (total.errors > baseline.errors) {
  regressions.push(`errors ${baseline.errors} -> ${total.errors}`);
}
if (total.warnings > baseline.warnings) {
  regressions.push(`warnings ${baseline.warnings} -> ${total.warnings}`);
}

if (regressions.length) {
  console.error(
    `\nLint regression: ${regressions.join(", ")}\n` +
      `Baseline (${BASELINE_FILE}): ${baseline.errors} errors, ${baseline.warnings} warnings\n` +
      `Now: ${total.errors} errors, ${total.warnings} warnings\n` +
      `Run \`npm run lint\` for detail. If the increase is intentional, run \`npm run lint:baseline:update\`.`,
  );
  process.exit(1);
}

console.log(
  `Lint within baseline: ${total.errors} errors, ${total.warnings} warnings ` +
    `(baseline ${baseline.errors}/${baseline.warnings})`,
);