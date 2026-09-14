import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use the project's existing TypeScript compiler; no test dependency needed.
const build = mkdtempSync(join(tmpdir(), "todaysroad-journal-test-"));
try {
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "lib/journal.ts", "lib/theme.ts", "lib/spots.ts", "lib/spot-content.ts", "lib/spot-preview.ts", "lib/recommend.ts", "lib/map-vision.ts", "lib/codex-map-vision.ts", "lib/map-tile.ts", "--resolveJsonModule", "--esModuleInterop", "--module", "commonjs", "--target", "es2020", "--skipLibCheck", "--outDir", build], { stdio: "inherit" });
  execFileSync(process.execPath, ["--test", "tests/journal.test.cjs", "tests/theme.test.cjs", "tests/spots.test.cjs", "tests/image-route.test.cjs", "tests/codex-map-vision.test.cjs"], { stdio: "inherit", env: { ...process.env, JOURNAL_TEST_BUILD: build } });
} finally { rmSync(build, { recursive: true, force: true }); }
