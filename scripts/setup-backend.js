const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const venvDir = path.join(backendDir, 'venv');
const isWindows = process.platform === 'win32';
const venvPython = path.join(venvDir, isWindows ? 'Scripts/python.exe' : 'bin/python');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backendDir,
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? 1}.`);
  }
}

function findPython() {
  const candidates = process.env.PYTHON
    ? [[process.env.PYTHON, []]]
    : isWindows
      ? [['py', ['-3.11']], ['py', ['-3']]]
      : [['python3', []], ['python', []]];

  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, '--version'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const version = `${result.stdout ?? ''} ${result.stderr ?? ''}`.match(/Python (\d+)\.(\d+)/);
    const major = version ? Number(version[1]) : 0;
    const minor = version ? Number(version[2]) : 0;
    if (result.status === 0 && version && (major > 3 || (major === 3 && minor >= 11))) {
      return { command, prefix };
    }
  }

  throw new Error('Python 3.11 or newer was not found. Install Python, then run npm run setup:backend again.');
}

try {
  if (!fs.existsSync(venvPython)) {
    const python = findPython();
    console.log(`Creating the backend virtual environment with ${python.command}…`);
    run(python.command, [...python.prefix, '-m', 'venv', venvDir]);
  }

  const importCheck = spawnSync(venvPython, ['-c', 'import fastapi, uvicorn; import app.main'], {
    cwd: backendDir,
    stdio: 'ignore',
    windowsHide: true,
  });

  if (importCheck.status === 0) {
    console.log('Backend environment is ready.');
  } else {
    console.log('Installing backend requirements. This may take several minutes.');
    run(venvPython, ['-m', 'pip', 'install', '-r', path.join(backendDir, 'requirements.txt')]);
    console.log('Backend environment is ready.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
