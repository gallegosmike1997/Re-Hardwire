// Windows Node 22+ and a dedicated Edge debugging session; no app mocks.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const endpoint = process.env.RH_CDP ?? 'http://127.0.0.1:9223';
const target = await (await fetch(`${endpoint}/json/new?about:blank`, {
  method: 'PUT', signal: AbortSignal.timeout(5000),
})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Error('Browser connection timed out')), 5000);
  ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
  ws.addEventListener('error', () => { clearTimeout(timer); reject(Error('Browser connection failed')); }, { once: true });
});
let id = 0;
const pending = new Map();
const report = { result: 'FAIL', consoleErrors: [], networkErrors: [], responses: [] };
ws.addEventListener('message', ({ data }) => {
  const event = JSON.parse(data);
  if (event.id && pending.has(event.id)) {
    const task = pending.get(event.id); pending.delete(event.id);
    event.error ? task.reject(Error(JSON.stringify(event.error))) : task.resolve(event.result);
  }
  if (event.method === 'Runtime.exceptionThrown') report.consoleErrors.push(event.params.exceptionDetails);
  if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') report.consoleErrors.push(event.params.args);
  if (event.method === 'Network.loadingFailed') report.networkErrors.push(event.params);
  if (event.method === 'Network.responseReceived' && event.params.response.url.includes('/api/llm')) {
    report.responses.push({ url: event.params.response.url, status: event.params.response.status });
  }
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(key, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
}
async function evaluate(expression) {
  const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await evaluate(expression);
    if (value) return value;
    await sleep(200);
  }
  throw Error(`Timed out after ${timeout / 1000}s: ${expression}`);
}
const assistantSelector = 'article:not(.flex-row-reverse)';
try {
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Page.navigate', { url: 'http://127.0.0.1:3001/chat/' });
  await wait(`document.readyState === 'complete' && document.querySelector('[aria-label="Message the coach"]') && !document.querySelector('[aria-label="Stop generating"]')`, 20000);
  await sleep(1500);
  const baseline = await evaluate(`document.querySelectorAll('${assistantSelector}').length`);
  await evaluate(`document.querySelector('[aria-label="Message the coach"]').focus()`);
  await call('Input.insertText', { text: 'Browser acceptance check: reply with one short encouraging sentence about taking a walk.' });
  await wait(`document.querySelector('[aria-label="Send message"]')?.disabled === false`, 5000);
  await evaluate(`document.querySelector('[aria-label="Send message"]').click()`);
  const start = Date.now();
  report.reply = await wait(`(() => {
    const messages = [...document.querySelectorAll('${assistantSelector}')];
    if (messages.length <= ${baseline}) return false;
    const reply = [...messages.at(-1).querySelectorAll('div.rounded-xl p')].map(p => p.innerText).join('\\n');
    return reply.trim() || false;
  })()`, 60000);
  report.replyAppearedMs = Date.now() - start;
  report.result = 'PASS';
} catch (error) {
  report.failure = error.message;
} finally {
  try {
    report.domSnippet = await evaluate(`document.querySelector('main')?.innerText.slice(-2500) ?? document.body.innerText.slice(-2500)`);
    report.alerts = await evaluate(`[...document.querySelectorAll('[role="alert"]')].map(e => e.innerText)`);
  } catch (error) { report.captureError = error.message; }
  const path = join(tmpdir(), `rh-chat-acceptance-${Date.now()}.json`);
  await writeFile(path, JSON.stringify(report, null, 2));
  console.log(report.result, report.reply ? `Assistant DOM text: ${JSON.stringify(report.reply)}` : report.failure);
  console.log('DOM snippet:', report.domSnippet);
  console.log('Browser errors:', JSON.stringify(report.consoleErrors));
  console.log('Network errors:', JSON.stringify(report.networkErrors));
  console.log('ARTIFACT:', path);
  ws.close();
}
if (report.result !== 'PASS') process.exitCode = 1;
