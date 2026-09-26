// Local Chrome integration: real wallet resume, creation panel, broker selection,
// funding handler and mission coordinator; isolated wallet/API/journal fixtures.
// No remote URL, real wallet or chain connection is accepted.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.argv.length, 2, 'This local fixture accepts no wallet or URL arguments.');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(join(root, 'site/broker-v2.js'), 'utf8');
const section = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'Production integration boundary: ' + start);
  return source.slice(from, to);
};
const productFunctions = [
  section('function selectedAgentAccount(', '\nfunction blockerLabel('),
  section('async function loadAgentAccountStatus(', '\nfunction renderAgentAccount('),
  section('function renderAgentGasFunding(', '\nfunction selectedReviewRun('),
  section('function selectPunk(', '\nfunction resetGallery('),
  section('async function activatePunkAgentMission(', '\nfunction showConfirmation('),
].join('\n');
const fundingWiring = section('  const gasForm = one("[data-agent-gas-form]");', '\n  const fundForm = one("[data-fund-form]");');
const walletWiring = section('  window.addEventListener("gogh:wallet-state"', '\n  if (PREVIEW) { previewData()');
const fixture = `
import {mountAgentWalletCreation as realMount} from '/punk-agent-creation-panel.js';
import {recoveryEth} from '/punk-agent-recovery-panel.js';
import {missionFundingReadiness} from '/broker-activation-status.js';
import {setupReownWallet} from '/wallet.js';
const owner='0x'+'1'.repeat(40), registry='0x'+'4'.repeat(40), COLLECTION='0x'+'5'.repeat(40), CHAIN_ID=4663, PREVIEW=false;
const account=id=>'0x'+BigInt(id).toString(16).padStart(40,'0');
const hash=id=>'0x'+BigInt(id).toString(16).padStart(64,'0');
const one=selector=>document.querySelector(selector),set=(selector,text)=>{const n=one(selector);if(n)n.textContent=text;};
const calls=[],held=[],created=new Set(),balances=new Map(),missions=new Set();
const journalKey='fixture:agent-creation:'+innerWidth, protectedKey='fixture:unknown-funding:'+innerWidth;
localStorage.setItem(protectedKey,JSON.stringify({status:'WALLET_REQUESTED',tokenId:'95',transactionHash:null}));
const preserved=localStorage.getItem(protectedKey);
const state={selected:null,punks:[],wallet:{account:owner,chainId:4663},ownershipAccount:owner,
  agentAccounts:new Map(),agentAccountLoading:new Map(),balanceReads:new Map(),reviewInspections:new Map(),balanceRequestId:0};
let holdNextStatus=false,holdSubmit=false,releaseSubmit=null;
let agentCreationControl=null,gasFundingRecovery=null;
const swarmControl=null,swarmReviewGate=null,swarmWalletControl=null,persistentWatchControl=null,forgeSkillAdminControl=null,brokerPreferences=null;
const missionNotifications={observe(){},markRead(){}},ownerRefresh={invalidate(){}};
const selectedReviewKey=()=>null,blockerLabel=value=>value;
const renderReviewAgent=()=>{},renderMissionMonitor=()=>{},renderWelcomeMessage=()=>{},renderMissionBadges=()=>{},renderActivationGuide=()=>{};
const invalidateConversationRequests=()=>{},resetGallery=()=>{},clearTransferredPunkReview=()=>{},renderCollectionWithdrawal=()=>{},scheduleSelectedReviewMissionCheck=()=>{},activateTab=()=>{},addMessage=()=>{};
const hydrateSelected=async()=>{},loadPunkBalances=async punk=>{punk.balanceLoaded=true;};
const ensureV2Session=async()=>{calls.push(['existing-session']);};
const fetchOwnedPunks=async()=>{throw Error('The same owner must not require a new ownership scan.');};
const renderRoster=()=>{};
function renderAgentAccount(){renderAgentGasFunding();}
function renderSelected(){agentCreationControl?.refresh();renderAgentAccount();set('[data-selected-id]',state.selected.tokenId);
  if(!state.agentAccounts.has(state.selected.tokenId))void loadAgentAccountStatus();}
const status=tokenId=>({ok:true,owner,tokenId,chainId:4663,readiness:{setupAvailable:true,blockers:[]},
  runtime:{owner,account:account(tokenId),accountCreated:created.has(tokenId),sessionActive:missions.has(tokenId),nativeBalance:balances.get(tokenId)||'0',entryPointDeposit:'0'}});
async function jsonRequest(path,options){
  const match=path.match(/^\\/api\\/v2\\/punks\\/(\\d+)\\/agent-account$/);
  if(match){const value=status(match[1]);calls.push(['status',match[1]]);
    if(holdNextStatus){holdNextStatus=false;return new Promise(resolve=>held.push(()=>resolve(value)));}return value;}
  const body=JSON.parse(options.body);
  if(path==='/api/v2/agent-account/setup')return {sessionId:'fixture-'+body.tokenId,setup:{artifactHash:hash(body.tokenId),setupTransactions:[
    {purpose:'AUTHORIZE_MISSION_SESSION',from:owner,to:account(body.tokenId),data:'0x1234',value:'0'}]}};
  if(path==='/api/v2/agent-account/receipt'){
    // A background read captured before the confirmed mission must not win later.
    holdNextStatus=true;void loadAgentAccountStatus({fresh:true});await Promise.resolve();
    missions.add(body.tokenId);return {ok:true};}
  throw Error('Unexpected fixture API path: '+path);
}
function provider(){return {request:async({method,params})=>{
  calls.push(['provider',method]);if(method==='eth_accounts')return [owner];if(method==='eth_chainId')return '0x1237';
  if(method==='eth_sendTransaction'&&params[0].data==='0x1234'&&params[0].value==='0x0'){
    calls.push(['mission-confirmation',state.selected.tokenId]);return hash(BigInt(state.selected.tokenId)+2000n);}
  throw Error('No real wallet requests are allowed in this local fixture.');
}};}
const currentWallet={account:{address:owner,isConnected:true,status:'connected'},chainId:4663,provider:provider()},subscriptions={};
const session={ready:async()=>{},open:async()=>{throw Error('Automatic wallet opening is forbidden.');},close:async()=>{},
  getAccount:()=>currentWallet.account,getNetwork:()=>({chainId:currentWallet.chainId}),getProvider:()=>currentWallet.provider,
  subscribeAccount:fn=>{subscriptions.account=fn;return()=>{};},subscribeNetwork:fn=>{subscriptions.network=fn;return()=>{};},
  subscribeProvider:fn=>{subscriptions.provider=fn;return()=>{};}};
// The module's automatic setup saw no Connect button; mount the real wallet controller now with the isolated session.
const connect=document.createElement('button');connect.setAttribute('data-wallet-connect','');document.querySelector('header').append(connect);
const wallet=await setupReownWallet({windowObject:window,documentObject:document,sessionFactory:()=>session});await wallet.ensureSession();
const save=record=>{localStorage.setItem(journalKey,JSON.stringify(record));return record;};
const record=()=>JSON.parse(localStorage.getItem(journalKey)||'null');
const creationClient={getAgentWalletCreationRecord:record,
  readAgentWalletCreation:async(_provider,c)=>({owner,tokenId:c.tokenId,account:account(c.tokenId),created:created.has(c.tokenId)}),
  prepareAgentWalletCreation:async(_provider,c)=>({owner,tokenId:c.tokenId,account:account(c.tokenId),registry,maximumNetworkFeeWei:'130000000000',expiresAt:Date.now()+90000}),
  submitAgentWalletCreation:async(_provider,review,{isCurrent})=>{
    if(!isCurrent())throw Error('Stale fixture submission');calls.push(['creation-confirmation',review.tokenId]);
    save({owner,review,status:'WALLET_REQUESTED',transactionHash:null});
    if(holdSubmit)await new Promise(resolve=>{releaseSubmit=resolve;});
    return save({owner,review,status:'SUBMITTED',transactionHash:hash(review.tokenId)});
  },recoverAgentWalletCreation:async()=>{const saved=record();created.add(saved.review.tokenId);return save({...saved,status:'CONFIRMED'});}};
const mountAgentWalletCreation=options=>realMount({...options,client:creationClient,storage:localStorage,readProvider:{request(){throw Error('Unexpected chain request');}}});
const createGasFundingRecovery=()=>({refresh(){}});
const prepareAgentGasFunding=async(_provider,context,tokenId,source,amount)=>{
  if(context.agent.tokenId!==tokenId||context.agent.runtime.accountCreated!==true)throw Error('Wrong or uncreated Agent wallet');
  calls.push(['fund-review',tokenId]);return {tokenId,source,amount,destination:account(tokenId)};};
const submitAgentGasFunding=async(_provider,plan,{loadContext,isCurrent})=>{
  await loadContext();if(!isCurrent())throw Error('Stale funding review');calls.push(['fund-confirmation',plan.tokenId]);
  localStorage.setItem('fixture:gas:'+plan.tokenId,JSON.stringify({status:'SUBMITTED',plan}));return {hash:hash(BigInt(plan.tokenId)+1000n)};};
const waitForPunkWalletTransactionReceipt=async()=>{};
const recheckAgentGasFunding=async(_provider,_owner,tokenId)=>{
  balances.set(tokenId,'1000000000000000');localStorage.setItem('fixture:gas:'+tokenId,JSON.stringify({status:'CONFIRMED',tokenId}));return {status:'CONFIRMED'};};
${productFunctions}
state.punks=['93','94'].map(tokenId=>({tokenId,account:account(Number(tokenId)+10000),balanceEth:'0',balanceLoaded:true}));state.selected=state.punks[0];
${fundingWiring}
${walletWiring}
for(const button of document.querySelectorAll('[data-select]'))button.onclick=()=>selectPunk(button.dataset.select);
one('[data-fixture-mission]').onclick=async()=>{const tokenId=state.selected.tokenId;
  try{await activatePunkAgentMission({intentHash:hash(tokenId),intent:{expectedOwner:owner,punkTokenId:tokenId,minimumReserveWei:'0'}},text=>set('[data-fixture-result]',text));set('[data-fixture-result]','MISSION ACTIVE '+tokenId);}
  catch(error){set('[data-fixture-result]',error.message);throw error;}};
renderSelected();
window.fixture={state,calls,created,missions,held,record,read:loadAgentAccountStatus,selected:selectedAgentAccount,
  holdStatus:()=>{holdNextStatus=true;},releaseStatuses:()=>{held.splice(0).forEach(resolve=>resolve());},
  holdCreation:()=>{holdSubmit=true;},releaseCreation:()=>{holdSubmit=false;releaseSubmit();},
  background:()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));
    currentWallet.chainId=null;subscriptions.network({chainId:null});},
  foreground:()=>{currentWallet.chainId=4663;currentWallet.provider=provider();
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));},
  preserved:()=>localStorage.getItem(protectedKey)===preserved,storage:()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)]))};
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/broker-v2.css">
<style>body{margin:0;padding:16px}main{max-width:900px;margin:auto}button{margin:8px 4px}dl{overflow-wrap:anywhere}input{max-width:100%;box-sizing:border-box}[hidden]{display:none!important}</style></head><body><main>
<header><h1>Mobile activation regression</h1><p>Local wallet and API fixtures. No real transactions.</p></header>
<nav><button data-select="93">Punk #93</button><button data-select="94">Punk #94</button></nav>
<section data-selected-stage><h2>Selected Punk <span data-selected-id></span></h2><section data-agent-creation-panel></section>
<section data-agent-gas-panel><h3>Agent gas</h3><p data-agent-gas-native></p><p data-agent-gas-deposit></p><p data-agent-gas-destination style="overflow-wrap:anywhere"></p><p data-agent-gas-readiness></p><p data-agent-gas-punk-balance></p>
<button data-agent-gas-setup></button><div data-swarm-funding-context><p data-swarm-funding-allocation></p></div>
<form data-agent-gas-form><select id="agent-gas-source"><option value="OWNER">Owner wallet</option></select><input id="agent-gas-amount" value="0.001"><label><input type="checkbox" data-agent-gas-confirm>Review this Punk’s funding</label><button type="submit">REVIEW &amp; SIMULATE</button></form>
<p data-agent-gas-result></p><a data-agent-gas-transaction hidden>View funding</a><button data-agent-next-mission>Next: mission</button><button data-resume-chat-mission hidden>Review saved mission</button></section>
<p data-current-recall-result></p><button data-fixture-mission>Confirm fixture mission</button><p data-fixture-result></p></section></main><script type="module" src="/fixture.js"></script></body></html>`;

const output = await mkdtemp('/private/tmp/gogh-mobile-activation-browser-'), profile = await mkdtemp('/private/tmp/gogh-mobile-activation-profile-');
const result = { status: 'RUNNING', mode: 'LOCAL_BROWSER_WITH_WALLET_API_FIXTURES', output, viewports: [], errors: [] };
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end(html); return; }
    if (req.url === '/fixture.js') { res.setHeader('content-type', 'text/javascript'); res.end(fixture); return; }
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (!/^\/[a-z0-9/_.-]+\.(js|css)$/.test(req.url) || req.url.includes('..')) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(await readFile(resolve(root, 'site', '.' + req.url)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const exited = new Promise(done => chrome.once('exit', done)); let ws;
try {
  const endpoint = await new Promise((done, reject) => { let text = ''; const timer = setTimeout(() => reject(Error('Chrome startup timed out')), 20000);
    chrome.once('error', error => { clearTimeout(timer); reject(error); }); chrome.stderr.on('data', value => { text += value; const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); done(match[1]); } }); });
  const target = await (await fetch(`http://${new URL(endpoint).host}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((done, reject) => { ws.onopen = done; ws.onerror = reject; });
  let id = 0; const pending = new Map();
  const call = (method, params = {}) => new Promise((done, reject) => { const number = ++id, timer = setTimeout(() => { pending.delete(number); reject(Error(method + ' timeout')); }, 15000);
    pending.set(number, { done: value => { clearTimeout(timer); done(value); }, reject: error => { clearTimeout(timer); reject(error); } }); ws.send(JSON.stringify({ id: number, method, params })); });
  ws.onmessage = ({ data }) => { const message = JSON.parse(data);
    if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (item) message.error ? item.reject(Error(JSON.stringify(message.error))) : item.done(message.result); }
    if (message.method === 'Runtime.exceptionThrown') result.errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') { const p = message.params;
      if (p.request.url.startsWith(origin + '/')) void call('Fetch.continueRequest', { requestId: p.requestId });
      else { result.errors.push('Blocked external request'); void call('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); } }
  };
  for (const method of ['Runtime.enable', 'Page.enable']) await call(method);
  await call('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  const evaluate = async expression => { const value = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (value.exceptionDetails) throw Error(value.exceptionDetails.exception?.description ?? value.exceptionDetails.text); return value.result.value; };
  const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(done => setTimeout(done, 50)); }
    result.lastUi = await evaluate('({text:document.body.innerText,calls:window.fixture?.calls})'); throw Error('UI timeout: ' + expression); };
  const find = name => `document.querySelector('[data-${name}]')`;
  const click = async name => { assert.equal(await evaluate(find(name) + '.disabled'), false, name + ' enabled'); await evaluate(find(name) + '.click()'); };
  for (const [width, height] of [[375, 812], [320, 740]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    // Each viewport has its own fixture journal; no pending record is cleared.
    await call('Page.navigate', { url: origin }); await until('Boolean(window.fixture)');
    // Neither navigation nor storage mutation occurs between the two Punks below.
    for (const tokenId of ['93', '94']) {
      await evaluate(`document.querySelector('[data-select="${tokenId}"]').click()`);
      await until('fixture.state.agentAccountLoading.size===0');
      await click('agent-wallet-creation-check'); await until('!' + find('agent-wallet-creation-prepare') + '.disabled');
      await click('agent-wallet-creation-prepare'); await until('!' + find('agent-wallet-creation-review') + '.hidden');
      assert.equal(await evaluate(find('agent-wallet-creation-consent') + '.checked'), false);
      await evaluate('fixture.holdCreation()'); await click('agent-wallet-creation-consent'); await click('agent-wallet-creation-confirm');
      await until("fixture.record()?.status==='WALLET_REQUESTED'");
      await evaluate('fixture.background()'); assert.equal(await evaluate('fixture.selected()'), null);
      await evaluate('fixture.foreground()'); await until('fixture.state.agentAccountLoading.size===0');
      assert.equal(await evaluate(`fixture.selected()?.tokenId`), tokenId);
      await evaluate('fixture.releaseCreation()'); await until("fixture.record()?.status==='SUBMITTED' && !document.querySelector('[data-agent-wallet-creation-recover]').disabled");
      assert.match(await evaluate(find('agent-wallet-creation-hash') + '.value'), /^0x[0-9a-f]{64}$/);
      await evaluate('fixture.holdStatus(); void fixture.read()'); await until('fixture.held.length===1');
      await click('agent-wallet-creation-recover'); await until("fixture.record()?.status==='CONFIRMED' && fixture.selected()?.runtime.accountCreated===true && fixture.state.agentAccountLoading.size===0");
      await evaluate('fixture.releaseStatuses()'); assert.equal(await evaluate('fixture.selected()?.runtime.accountCreated'), true);
      await evaluate('fixture.holdStatus(); void fixture.read()'); await until('fixture.held.length===1');
      await click('agent-gas-confirm'); await evaluate(find('agent-gas-form') + '.requestSubmit()'); await until('Boolean(fixture.state.gasFundingPlan) && !fixture.state.gasFundingBusy');
      await evaluate(find('agent-gas-form') + '.requestSubmit()'); await until("!fixture.state.gasFundingBusy && fixture.selected()?.runtime.nativeBalance==='1000000000000000'");
      await evaluate('fixture.releaseStatuses()'); assert.equal(await evaluate(find('agent-gas-native') + '.textContent'), '0.001 ETH');
      await click('fixture-mission'); await until(`document.querySelector('[data-fixture-result]').textContent==='MISSION ACTIVE ${tokenId}'`);
      await evaluate('fixture.releaseStatuses()'); assert.equal(await evaluate('fixture.selected()?.runtime.sessionActive'), true);
      assert.equal(await evaluate('fixture.preserved()'), true, 'Unrelated unknown funding journal preserved');
      if(tokenId==='93') assert.equal(await evaluate("fixture.record().review.tokenId"), '93');
    }
    const confirmations = await evaluate("fixture.calls.filter(call=>['creation-confirmation','fund-confirmation','mission-confirmation'].includes(call[0]))");
    assert.deepEqual(confirmations, ['93','94'].flatMap(tokenId=>[['creation-confirmation',tokenId],['fund-confirmation',tokenId],['mission-confirmation',tokenId]]));
    assert.equal(await evaluate("fixture.calls.some(call=>call[1]==='personal_sign'||call[1]==='eth_requestAccounts')"), false);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(join(output, `complete-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    result.viewports.push({ width, height, sequentialPunks: 2, confirmations, journalPreserved: true, reloadsBetweenPunks: 0 });
  }
  assert.deepEqual(result.errors, []); result.status = 'PASS';
} catch (error) { result.status = 'FAIL'; result.failure = error.stack; process.exitCode = 1; }
finally { await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2)); ws?.close(); chrome.kill('SIGTERM'); await exited; await rm(profile, { recursive: true, force: true }); await new Promise(done => server.close(done)); console.log(JSON.stringify(result, null, 2)); }
