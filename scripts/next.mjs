import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const mode = process.argv[2] || "build";
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), mode, ...process.argv.slice(3)],
  { stdio: "inherit", env: { ...process.env, BTS_BUILD_DIR: ".next-build" } },
);
process.exit(result.status ?? 1);
