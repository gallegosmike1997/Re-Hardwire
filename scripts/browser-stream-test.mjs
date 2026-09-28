// Run with Node 22+ on Windows while Edge remote debugging listens on 9222.
import assert from 'node:assert/strict';
const pages = await (await fetch('http://localhost:9222/json/list')).json();
const page = pages.find(p => p.url.includes('localhost:3001')) || pages.find(p => p.url === 'about:blank');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const requests = [], errors = [];
ws.addEventListener('message', ({data}) => {
  const event = JSON.parse(data);
  if (event.id) { const p = pending.get(event.id); pending.delete(event.id); event.error ? p.reject(event.error) : p.resolve(event.result); }
  if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request.url);
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { pending.set(++id, {resolve,reject}); ws.send(JSON.stringify({id,method,params})); }); }
async function evaluate(expression) { const r = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true}); if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const sleep = ms => new Promise(r => setTimeout(r,ms));
async function wait(expression, timeout = 120000) { const start = Date.now(); while(Date.now()-start < timeout) { if(await evaluate(expression)) return; await sleep(300); } throw Error('Timed out: '+expression); }
try {
  await call('Network.enable'); await call('Runtime.enable');
  await call('Page.navigate', {url:'http://localhost:3001/chat/'});
  await wait('!!document.querySelector("textarea")'); await sleep(2000);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('New session'))?.click()`);
  await evaluate(`(() => { const el=document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'Describe ten small steps for preparing a relaxing walk, with a sentence for each.'); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(300);
  await evaluate(`document.querySelector('[aria-label="Send message"]').click()`);
  await wait(`!!document.querySelector('[aria-label="Stop generating"]')`);
  await wait(`document.querySelectorAll('article').length >= 2`);
  const first = await evaluate(`document.querySelectorAll('article')[1].innerText`);
  await sleep(700);
  const second = await evaluate(`document.querySelectorAll('article')[1].innerText`);
  assert.notEqual(first,second,'Assistant text should grow during streaming');
  await evaluate(`document.querySelector('[aria-label="Stop generating"]').click()`);
  await wait(`!document.querySelector('[aria-label="Stop generating"]')`);
  const stopped = await evaluate(`document.querySelectorAll('article')[1].innerText`);
  await sleep(1200);
  assert.equal(await evaluate(`document.querySelectorAll('article')[1].innerText`),stopped);
  assert(requests.some(url=>url.endsWith('/api/llm/stream')));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,streamRequest:true,incremental:true,stop:true,errors},null,2));
} finally { ws.close(); }
