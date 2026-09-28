// One decisive probe: does a real Ollama reply stream into the chat DOM?
// Windows Node 22+, Edge headless with --remote-debugging-port=9223.
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CDP = process.env.RH_CDP ?? 'http://127.0.0.1:9222';
const APP = process.env.RH_APP ?? 'http://localhost:3001/chat/';
const ART = join(tmpdir(), `rh-stream-probe-${Date.now()}`);
await mkdir(ART, { recursive: true });
const report = { steps: [], fetches: [], domSamples: [], errors: [] };

const targets = await (await fetch(`${CDP}/json/list`)).json();
const page = targets.find((t) => t.type === 'page' && t.url === 'about:blank')
  ?? await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => ws.addEventListener('open', resolve, { once: true }));

let id = 0; const pending = new Map();
ws.addEventListener('message', ({ data }) => {
  const event = JSON.parse(data);
  if (event.id && pending.has(event.id)) {
    const { resolve, reject } = pending.get(event.id);
    pending.delete(event.id);
    event.error ? reject(new Error(JSON.stringify(event.error))) : resolve(event.result);
  }
  if (event.method === 'Runtime.exceptionThrown') {
    report.errors.push(String(event.params.exceptionDetails.text ?? '').slice(0, 300));
  }
});
function call(method, params = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timeout: ${method}`)); }, timeout);
    pending.set(key, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
}
async function ev(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.navigate', { url: APP.replace('localhost', '127.0.0.1') });
  for (let i = 0; i < 40; i += 1) {
    if (await ev('document.readyState === "complete" && !!document.querySelector(\'[aria-label="Message the coach"]\')')) break;
    await sleep(250);
  }
  await sleep(1500);
  const baseline = await ev('document.querySelectorAll("article").length');
  await ev(`(() => {
    window.__rhFetches = [];
    const raw = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await raw(...args);
      if (!res.url.includes('/api/llm/stream')) return res;
      const record = { ok: res.ok, chunks: 0, done: false };
      window.__rhFetches.push(record);
      const reader = res.body.getReader();
      return new Response(new ReadableStream({
        async pull(controller) {
          const {value, done} = await reader.read();
          if (done) { record.done = true; controller.close(); }
          else { record.chunks++; controller.enqueue(value); }
        },
        cancel(reason) { return reader.cancel(reason); }
      }), {status: res.status, headers: res.headers});
    };
  })()`);
  await ev(`(() => {
    const ta = document.querySelector('[aria-label="Message the coach"]');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, 'Browser streaming probe: reply with one short sentence about taking a walk.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed';
  })()`);
  await sleep(300);
  await ev(`(() => { const b = document.querySelector('[aria-label="Send message"]'); if (!b || b.disabled) throw Error('Send unavailable'); b.click(); })()`);
  const t0 = Date.now();
  let firstContentMs = null, lastLength = 0, sawGrowth = false, stopSeen = false;
  const samples = [];
  while (Date.now() - t0 < 100000) {
    const state = await ev(`(() => ({
      articles: document.querySelectorAll('article').length,
      chars: [...document.querySelectorAll('article')].map((a) => a.innerText.length).reduce((a, b) => a + b, 0),
      composing: document.body.innerText.includes('Coach is composing'),
      stop: !!document.querySelector('[aria-label="Stop generating"]'),
      alert: [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText).join(' | ').slice(0, 200),
    }))()`);
    if (state.stop) stopSeen = true;
    samples.push({ t: Date.now() - t0, ...state });
    if (lastLength && state.chars > lastLength) sawGrowth = true;
    if (state.chars > lastLength) lastLength = state.chars;
    if (state.articles >= 2 && !state.composing && state.chars > 0 && !state.stop) break;
    await sleep(250);
  }
  const finalText = await ev(`[...document.querySelectorAll('article')].map((a) => a.innerText).join('\\n').slice(0, 600)`);
  report.fetches = await ev('window.__rhFetches ?? []');
  report.domSamples = samples;
  report.finalText = finalText;
  report.assertions = {
    twoArticles: samples.some((s) => s.articles >= 2),
    progressiveDomGrowth: sawGrowth,
    stopButtonAppeared: stopSeen,
    streamFetchOk: (report.fetches ?? []).some((f) => f.ok),
    noErrorAlert: !samples.some((s) => /stopped|failed|error|unavailable/i.test(s.alert ?? '')),
    realContent: finalText.length > 0,
  };
  report.verdict = Object.values(report.assertions).every(Boolean) ? 'STREAMING_VERIFIED_IN_BROWSER' : 'STREAMING_NOT_PROVEN';
} catch (error) {
  report.verifierError = String(error.message ?? error).slice(0, 400);
  report.verdict = 'PROBE_ERROR';
} finally {
  await writeFile(join(ART, 'probe.json'), JSON.stringify(report, null, 2));
  console.log('ARTIFACTS', ART);
  console.log(JSON.stringify(report.assertions ?? {}, null, 2));
  console.log('verdict:', report.verdict ?? 'see probe.json', 'errors:', report.errors.length);
  ws.close();
}
if (report.verdict !== 'STREAMING_VERIFIED_IN_BROWSER') process.exitCode = 1;
