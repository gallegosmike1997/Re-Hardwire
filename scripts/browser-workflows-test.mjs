// Node 22+; Windows Edge with --remote-debugging-port=9223. Uses a NEW tab.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CDP = process.env.RH_CDP ?? 'http://127.0.0.1:9223';
const artifacts = join(tmpdir(), `rh-workflows-${Date.now()}`);
await mkdir(artifacts);
const page = await (async () => {
  const targets = await (await fetch(`${CDP}/json/list`)).json();
  const blank = targets.find((t) => t.type === 'page' && t.url === 'about:blank');
  return blank ?? (await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json());
})();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0; const pending=new Map(), errors=[], results={};
ws.addEventListener('message',({data})=>{
 const e=JSON.parse(data);
 if(e.id && pending.has(e.id)){const p=pending.get(e.id);pending.delete(e.id);e.error?p.reject(Error(JSON.stringify(e.error))):p.resolve(e.result);}
 if(e.method==='Runtime.exceptionThrown')errors.push(e.params.exceptionDetails.text);
 if(e.method==='Page.javascriptDialogOpening')void call('Page.handleJavaScriptDialog',{accept:true});
});
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP timeout: '+method));},15000);pending.set(key,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id:key,method,params}));});}
async function ev(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<80;i++){if(await ev(expression))return;await sleep(250);}throw Error('Timeout: '+expression);}
async function click(text){await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Button unavailable: '+${JSON.stringify(text)});b.click()})()`);await sleep(300);}
async function navigate(route){await call('Page.navigate',{url:'http://127.0.0.1:3001/'+route+'/'});await wait('document.readyState === "complete"');await sleep(1500);}
async function check(name,fn){try{const outcome=await fn();results[name]=outcome ?? 'PASS';}catch(e){results[name]='FAIL: '+e.message;}console.log(name,results[name]);}
let originalStorage, originalProfile;
const marker='Browser workflow fixture '+Date.now();
try {
 await call('Page.enable');await call('Runtime.enable');
 await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
 await navigate('chat');
 originalStorage=await ev('JSON.stringify(localStorage)');
 originalProfile=await ev(`fetch('http://localhost:8000/api/profile').then(r=>r.json())`);
 await ev(`localStorage.setItem('re-hardwire-conversations',JSON.stringify({timestamp:Date.now(),data:{sessionId:${JSON.stringify(marker)},messages:[{role:'user',content:${JSON.stringify(marker)}},{role:'assistant',content:'A short walk can be a gentle fresh start.'}]}}))`);
 await navigate('chat');
 await check('historySave',async()=>{await click('Save conversation');await wait(`document.body.innerText.includes('Session saved.')`);});
 await check('exports',async()=>{
   for(const [button,ext] of [['Export JSON','json'],['Export text','txt']]){
     await click(button);await sleep(1000);
     const file=(await readdir(artifacts)).find(f=>f.endsWith('.'+ext));assert(file,'Download missing');
     const text=await readFile(join(artifacts,file),'utf8');assert(text.includes(marker));
     if(ext==='json')assert.equal(JSON.parse(text).messages.length,2);
   }
 });
 await check('historyReopen',async()=>{await click('New session');await ev(`document.querySelector('details').open=true`);await ev(`[...document.querySelectorAll('details li button')].find(b=>b.textContent.includes(${JSON.stringify(marker)})).click()`);await wait('document.querySelectorAll("article").length===2');});
 await check('pdf',async()=>{const r=await call('Page.printToPDF',{printBackground:true});await writeFile(join(artifacts,'conversation.pdf'),Buffer.from(r.data,'base64'));assert(Buffer.from(r.data,'base64').toString().startsWith('%PDF'));return 'CREATED: header verified; transcript extraction not verified';});
 await check('historyDelete',async()=>{await ev(`document.querySelector('details').open=true; [...document.querySelectorAll('details li')].find(li=>li.textContent.includes(${JSON.stringify(marker)})).querySelector('button:last-child').click()`);await wait(`![...document.querySelectorAll('details li')].some(li=>li.textContent.includes(${JSON.stringify(marker)}))`);});
 await navigate('settings');
 await check('themePersistence',async()=>{
   await ev(`(()=>{const s=document.querySelector('[aria-label="Color theme"]');s.value='light';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
   await navigate('settings');
   assert.equal(await ev('document.documentElement.dataset.theme'),'light');
   const color=await ev('getComputedStyle(document.querySelector("h1")).color');
   assert.notEqual(color,'rgb(241, 245, 249)','Daylight heading remains nearly white');
 });
 await navigate('chat');
 await check('nativeDictation',async()=>{
   results.voiceCapability=await ev(`({recognition:!!(window.SpeechRecognition||window.webkitSpeechRecognition),synthesis:!!window.speechSynthesis})`);
   const available=await ev(`!!document.querySelector('[aria-label="Start dictation"]')`);
   if(!available){results.voiceObservation='Dictation absent: disabled or unsupported';return 'BLOCKED: dictation disabled or unsupported';}
   await ev(`document.querySelector('[aria-label="Start dictation"]').click()`);await sleep(3000);
   results.voiceObservation=await ev(`({transcript:document.querySelector('[aria-label="Message the coach"]').value.trim(),listening:!!document.querySelector('[aria-label="Stop dictation"]'),alerts:[...document.querySelectorAll('[role="alert"]')].map(e=>e.innerText)})`);
   await ev(`document.querySelector('[aria-label="Stop dictation"]')?.click()`);
   if(results.voiceObservation.transcript) return 'PASS: native transcript reached composer';
   if(results.voiceObservation.alerts.some(a=>a.includes('Microphone access was denied'))) {
     results.microphoneDenialHandling='PASS';
     return 'BLOCKED: microphone denied; transcription not verified';
   }
   return 'BLOCKED: no native transcript observed';
 });
 await check('nativeSpeak',async()=>{
   await ev(`(()=>{
     window.__speechEvents=[];
     const synth=window.speechSynthesis;
     if(!synth) return;
     const speak=synth.speak.bind(synth);
     synth.speak=u=>{for(const name of ['start','end','error'])u.addEventListener(name,e=>window.__speechEvents.push({type:name,error:e.error}));speak(u)};
   })()`);
   const available=await ev(`[...document.querySelectorAll('article button')].some(b=>b.textContent.trim()==='Speak'&&!b.disabled)`);
   if(!available)return 'BLOCKED: speech disabled or unsupported';
   await click('Speak');await sleep(5000);
   results.speechEvents=await ev('window.__speechEvents');
   await ev(`window.speechSynthesis?.cancel()`);
   return results.speechEvents.some(e=>e.type==='start')
     ? 'EVENTS VERIFIED: native playback started; audible output not verified'
     : 'BLOCKED: native playback did not start; see speechEvents';
 });
 assert.deepEqual(errors,[]);
} finally {
 if(originalStorage)await ev(`localStorage.clear();Object.entries(${originalStorage}).forEach(([k,v])=>localStorage.setItem(k,v))`);
 await writeFile(join(artifacts,'results.json'),JSON.stringify({results,errors},null,2));
 console.log('ARTIFACTS',artifacts);
 ws.close();
}
if(Object.values(results).some(r=>typeof r==='string'&&r.startsWith('FAIL')))process.exitCode=1;

