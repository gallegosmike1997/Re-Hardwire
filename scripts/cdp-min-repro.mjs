// Minimal CDP repro: which step hangs — new tab, Page.enable, or navigation?
// Run with Node 22+ while Edge listens on --remote-debugging-port=9223.
const CDP = process.env.RH_CDP ?? 'http://127.0.0.1:9223';
const APP_URL = process.env.RH_APP_URL ?? 'http://localhost:3001/chat/';
const COMMAND_TIMEOUT = 5000;

const log = (...parts) => console.log(new Date().toISOString().slice(11, 23), ...parts);

const targets = await (await fetch(`${CDP}/json/list`)).json();
log('targets:', JSON.stringify(targets.map((t) => ({ type: t.type, url: t.url })), null, 1));

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('close', ({ code, reason }) => log('ws close:', code, reason || '(no reason)'));
  ws.addEventListener('error', () => log('ws error event'));
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(`${entry.method} -> ${JSON.stringify(message.error)}`));
      else entry.resolve(message.result);
      return;
    }
    if (message.method) events.push(message.method);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => {
      pending.delete(key);
      log('TIMEOUT waiting for', method, '| still pending:', [...pending.values()].map((p) => p.method).join(', ') || '(none)');
      reject(new Error(`CDP timeout after ${COMMAND_TIMEOUT}ms: ${method}`));
    }, COMMAND_TIMEOUT);
    pending.set(key, { method, resolve, reject, timer });
    log('send', method);
    ws.send(JSON.stringify({ id: key, method, params }));
  });
  const waitOpen = () => new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true });
    ws.addEventListener('error', () => reject(new Error('WebSocket failed')), { once: true });
    setTimeout(() => reject(new Error('ws open timeout')), COMMAND_TIMEOUT);
  });
  return { ws, call, events, waitOpen };
}

async function tryCase(label, target, url) {
  log('---', label, '->', url);
  const session = connect(target.webSocketDebuggerUrl);
  try {
    await session.waitOpen();
    log('ws open');
    await session.call('Runtime.enable');
    await session.call('Page.enable');
    const nav = await session.call('Page.navigate', { url });
    log('navigate resolved:', JSON.stringify(nav));
    const probe = session.call('Runtime.evaluate', {
      expression: 'document.readyState + " | " + document.title',
      returnByValue: true,
    });
    const result = await Promise.race([probe, new Promise((r) => setTimeout(() => r({ timeout: true }), 8000))]);
    log('page state:', JSON.stringify(result?.result?.value ?? result));
  } catch (error) {
    log(label, 'FAILED:', error.message);
  } finally {
    try { session.ws.close(); } catch {}
  }
}

const blank = targets.find((t) => t.type === 'page' && t.url === 'about:blank');
if (blank) await tryCase('existing tab, navigate to about:blank', blank, 'about:blank');
if (blank) await tryCase('existing tab, navigate to app', blank, APP_URL);

const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
log('created tab:', created.id);
const fresh = connect(created.webSocketDebuggerUrl);
try {
  await fresh.waitOpen();
  const evalResult = await fresh.call('Runtime.evaluate', { expression: '6*7', returnByValue: true });
  log('fresh tab eval 6*7 =', evalResult.result.value);
  await fresh.call('Page.enable');
  const nav = await fresh.call('Page.navigate', { url: 'about:blank' });
  log('fresh tab navigate to about:blank resolved:', JSON.stringify(nav));
  await fresh.call('Page.navigate', { url: APP_URL }).then(
    (r) => log('fresh tab navigate to app resolved:', JSON.stringify(nav === undefined ? null : nav) || '', JSON.stringify(r)),
    (error) => log('fresh tab navigate to app FAILED:', error.message),
  );
} catch (error) {
  log('fresh tab FAILED:', error.message);
} finally {
  try { fresh.ws.close(); } catch {}
  await fetch(`${CDP}/json/close/${created.id}`).catch(() => {});
}
