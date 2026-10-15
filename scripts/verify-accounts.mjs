import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
console.log(
  "Esperando credenciales JSON por stdin (sin trazas ni archivos de sesión).",
);
process.stdin.setRawMode?.(true);
const rl = readline.createInterface({ input: process.stdin });
let input;
for await (const line of rl) {
  input = JSON.parse(line);
  rl.close();
  process.stdin.setRawMode?.(false);
  break;
}
const env = {
  ...process.env,
  PLAYWRIGHT_CHANNEL: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  BTS_TEST_ADMIN_USERNAME: input.admin.username,
  BTS_TEST_ADMIN_PASSWORD: input.admin.password,
  BTS_TEST_EDITOR_USERNAME: input.editor.username,
  BTS_TEST_EDITOR_PASSWORD: input.editor.password,
};
input = null;
const result = spawnSync(
  process.execPath,
  [
    require.resolve("@playwright/test/cli"),
    "test",
    ...(process.argv.includes("--all") ? [] : ["tests/e2e/accounts.spec.ts"]),
  ],
  { stdio: "inherit", env },
);
process.exit(result.status ?? 1);
