const { spawnSync } = require('node:child_process');
const { rmSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const outDir = resolve(root, 'out');

// Remove stale export so a failed/partial build can't ship old assets.
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

const nextCli = resolve(__dirname, '../node_modules/next/dist/bin/next');
const result = spawnSync(process.execPath, [nextCli, 'build'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, BUILD_TARGET: 'capacitor' },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`next build exited with code ${result.status}`);
  process.exit(result.status ?? 1);
}

if (!existsSync(outDir)) {
  console.error('Build completed but `out/` was not generated.');
  process.exit(1);
}
console.log('Capacitor web bundle ready in', outDir);
process.exit(0);
