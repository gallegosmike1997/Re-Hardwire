const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const nextCli = resolve(__dirname, '../node_modules/next/dist/bin/next');
const result = spawnSync(process.execPath, [nextCli, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, BUILD_TARGET: 'capacitor' },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
