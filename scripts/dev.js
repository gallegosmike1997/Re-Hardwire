const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');
const nextCli = path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const isWindows = process.platform === 'win32';
const pythonPath = path.join(
  backendDir,
  isWindows ? 'venv/Scripts/python.exe' : 'venv/bin/python',
);
const python = fs.existsSync(pythonPath)
  ? pythonPath
  : (process.env.PYTHON || (isWindows ? 'py' : 'python3'));
const pythonArgs = python === 'py' ? ['-3'] : [];
const children = [];
let stopping = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portIsAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

async function backendIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:8000/health', {
      signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.status === 'online';
  } catch {
    return false;
  }
}

async function frontendIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:3000/', {
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (isWindows) {
    const killer = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', path.join(__dirname, 'stop-process-tree.ps1'),
      '-RootPid', String(child.pid),
    ], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.unref();
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) stopChild(child);
  const forceExit = setTimeout(() => process.exit(exitCode), 1800);
  forceExit.unref();
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

function startBackend() {
  const args = [
    ...pythonArgs,
    '-m', 'uvicorn', 'app.main:app', '--reload',
    '--host', '127.0.0.1', '--port', '8000',
  ];
  const child = spawn(python, args, {
    cwd: backendDir,
    stdio: 'inherit',
    windowsHide: true,
    detached: !isWindows,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Backend could not start: ${error.message}`);
    console.error('Run "npm run setup:backend" to install its Python dependencies.');
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`Backend stopped${code === null ? '' : ` with exit code ${code}`}.`);
      stopAll(code || 1);
    }
  });
  return child;
}

function startFrontend() {
  const child = spawn(process.execPath, [nextCli, 'dev', '--port', '3000'], {
    cwd: frontendDir,
    stdio: 'inherit',
    windowsHide: true,
    detached: !isWindows,
    env: { ...process.env, PORT: process.env.PORT || '3000' },
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Frontend could not start: ${error.message}`);
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`Frontend stopped${code === null ? '' : ` with exit code ${code}`}.`);
      stopAll(code || 0);
    }
  });
  return child;
}

async function waitForBackend(child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (stopping || child.exitCode !== null || child.signalCode !== null) {
      throw new Error('The backend process exited before its health check passed.');
    }
    if (await backendIsReady()) return;
    await delay(500);
  }
  throw new Error('The backend did not become ready within 60 seconds.');
}

async function main() {
  const existingBackend = await backendIsReady();
  const existingFrontend = await frontendIsReady();

  if (existingBackend) {
    console.log('Backend is already ready at http://localhost:8000.');
  } else {
    if (!fs.existsSync(pythonPath)) {
      throw new Error(
        `Backend environment not found at ${pythonPath}. Run "npm run setup:backend" first.`,
      );
    }
    console.log('Starting the local backend…');
    const backend = startBackend();
    await waitForBackend(backend);
    console.log('Backend ready at http://localhost:8000.');
  }

  if (existingFrontend) {
    console.log('Frontend is already ready at http://localhost:3000.');
  } else {
    if (!fs.existsSync(nextCli)) {
      throw new Error('Frontend dependencies are missing. Run "npm --prefix frontend ci" first.');
    }
    if (!(await portIsAvailable(3000, '127.0.0.1'))) {
      throw new Error('Port 3000 is occupied by another service. Stop it and run "npm run dev" again.');
    }
    console.log('Starting the frontend at http://localhost:3000…');
    startFrontend();
  }

  if (!children.length) {
    console.log('Both development services are already running.');
  } else {
    console.log('Press Ctrl+C to stop the development services.');
  }
}

main().catch((error) => {
  console.error(error.message);
  stopAll(1);
});
