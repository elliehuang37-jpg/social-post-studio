// 產生教學截圖（AI 為模擬回應，不花費用）：node scripts/test/tutorial-shots.js <輸出資料夾>
// 用 headless Edge 開本機頁面，依序截：首頁、稿單、AI 設定、生成結果、單張樣張、合規提醒、手機版，
// 並直接匯出四種風格與三平台的圖卡 PNG（簡報用）。
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'tutorial-shots')); fs.mkdirSync(OUT, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 模擬 AI 回覆：虛構品牌「小日子保養所」的三平台文案
const DATA = {
  fb: { headline: '換季乾到卡粉？', sub: '玻尿酸保濕精華，秋冬新上市', points: ['三重分子玻尿酸', '無添加香料', '30ml 約用 2 個月'],
    caption: '早上化好妝，中午鼻翼就開始浮粉，是不是很熟悉？\n\n換季的時候，皮膚最需要的不是更厚的乳霜，而是先把水分補進去。小日子保養所這次推出「玻尿酸保濕精華」，用三重分子玻尿酸，從表面到深層一起補水，質地清爽、一抹就吸收，上妝前用也不會搓泥。\n\n✔ 三重分子玻尿酸，水感不黏膩\n✔ 無添加香料，敏弱肌也能安心用\n✔ 30ml 早晚使用約可用 2 個月\n\n📣 11/25–11/30 首購 85 折，滿 999 再送旅行組。\n👉 點連結搶首購優惠',
    hashtags: ['玻尿酸精華', '換季保養', '小日子保養所'] },
  ig: { headline: '先補水，再上妝', sub: '秋冬的第一瓶保濕精華', points: ['一抹就吸收', '敏弱肌可用', '用約 2 個月'],
    caption: '妝容服不服貼，其實取決於上妝前那一步 💧\n\n小日子保養所「玻尿酸保濕精華」\n・三重分子玻尿酸，水感清爽\n・無添加香料，換季敏弱肌也能用\n・30ml 早晚使用約 2 個月\n\n🎁 11/25–11/30 首購 85 折，滿 999 送旅行組\n連結在主頁，先收藏這篇，換季不慌張 ✨',
    hashtags: ['保濕精華', '秋冬保養', '上妝不卡粉', '敏弱肌', '小日子保養所'] },
  th: { headline: '換季臉在抗議嗎', sub: '我最近的保濕解法', points: ['水感清爽', '無香料', '上妝不搓泥'],
    caption: '每年一到秋天，我的臉就開始乾到上妝卡粉😮‍💨\n\n最近換成小日子保養所的玻尿酸精華，最有感的是上妝前擦完不會搓泥，中午補妝也比較服貼。無香料這點對我這種換季就敏感的人很加分。\n\n剛好 11/25 開始首購 85 折，有在找保濕品的可以看看。\n\n你們換季都怎麼救皮膚？',
    hashtags: ['換季保養'] }
};
const MOCK = `(()=>{const real=window.fetch;window.fetch=async(u,o)=>{if(!String(u).includes('api.anthropic.com'))return real(u,o);
  const b=JSON.parse(o.body);const t=b.messages[0].content.map(c=>c.text||'').join('');let text;
  if(t.includes('連線成功'))text='連線成功';else text='\`\`\`json\\n'+JSON.stringify(${JSON.stringify(DATA)})+'\\n\`\`\`';
  await new Promise(r=>setTimeout(r,300));return new Response(JSON.stringify({content:[{type:'text',text}],stop_reason:'end_turn'}),{status:200})}})()`;

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'edge-'));
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9361', '--user-data-dir=' + prof, '--no-first-run', '--lang=zh-TW', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await (await fetch('http://127.0.0.1:9361/json/version')).json(); break; } catch { await sleep(250); } }
  const tgt = (await (await fetch('http://127.0.0.1:9361/json/list')).json()).find(t => t.type === 'page');
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; const errors = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + ' → ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  const size = (w, h, s = 1) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile: w < 700 });
  const open = async url => { await send('Page.navigate', { url: base + url }); await sleep(2500); };
  const snap = async name => { await sleep(600); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64')); console.log('📸', name); };
  // 單一元素截圖（頁面座標）
  const snapEl = async (name, sel, pad = 12) => {
    await ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'start'})`); await sleep(500);
    const r = await ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height}})()`);
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale: 1 } });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(s.result.data, 'base64')); console.log('📸', name);
  };
  const saveCanvas = async (name, k) => { const d = await ev(`document.querySelector('#cv-${k}').toDataURL('image/png')`); fs.writeFileSync(path.join(OUT, name), Buffer.from(d.split(',')[1], 'base64')); console.log('🖼 ', name); };
  const setStyle = s => ev(`(()=>{const e=document.querySelector('#f-style');e.value='${s}';e.dispatchEvent(new Event('change'));return 1})()`);
  // 從主視覺圖裁出 IG 卡片裡的產品照，當作「上傳的產品照」
  const PHOTO = `(async()=>{const im=new Image();im.src='assets/hero.webp';await im.decode();const c=document.createElement('canvas');c.width=600;c.height=760;c.getContext('2d').drawImage(im,950,195,330,418,0,0,600,760);
    const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));const f=new File([b],'產品照.jpg',{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector('#f-photo');i.files=dt.files;i.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,800));return 1})()`;

  await size(1440, 900); await open(''); await ev(`localStorage.clear()`); await open('?t=1');
  await snap('01-home.png');
  await snapEl('02-brief.png', '#brief');
  await ev(`localStorage.setItem('sps-ai', JSON.stringify({key:'sk-ant-demo',model:'claude-sonnet-5-5'}))`);
  await open('?t=2'); await ev(MOCK);
  await ev(`document.querySelector('#aiState').click()`); await ev(`document.querySelector('#aiKey').value='sk-ant-api03-••••••••••••'`);
  await ev(`document.querySelector('#aiTestMsg').textContent='連線成功（連線成功）。可以開始用 AI 生成了。'`); await snap('03-ai-settings.png');
  await ev(`document.querySelector('#aiCancel').click()`);
  await ev(PHOTO);
  await ev(`document.querySelector('#genBtn').click()`); await sleep(1500);
  await ev(`window.scrollTo(0, document.querySelector('.grid').getBoundingClientRect().top+scrollY-12)`); await snap('04-generated.png');
  await snapEl('05-board-ig.png', '#board-ig');
  await snapEl('06-board-fb.png', '#board-fb');
  await snapEl('07-board-threads.png', '#board-th');
  for (const k of ['fb', 'ig', 'th']) await saveCanvas(`card-${k}-glass.png`, k);
  for (const s of ['bold', 'list', 'photo', 'sale', 'festive', 'magazine', 'chat', 'minimal']) { await setStyle(s); await sleep(400); await saveCanvas(`style-${s}.png`, 'ig'); }
  await setStyle('glass'); await sleep(300); await saveCanvas('style-glass.png', 'ig');
  // 合規提醒：在 FB 文案加入疑慮字詞
  await ev(`(()=>{const t=document.querySelector('#cap-fb');t.value=t.value.replace('從表面到深層一起補水','保證 100% 根治乾燥');t.dispatchEvent(new Event('input'));return 1})()`);
  await snapEl('08-compliance.png', '#flags-fb', 16);
  await ev(`(()=>{const t=document.querySelector('#cap-fb');t.value=t.value.replace('保證 100% 根治乾燥','從表面到深層一起補水');t.dispatchEvent(new Event('input'));return 1})()`);
  // 手機版
  await size(390, 844, 2); await open('?t=3'); await snap('09-mobile-top.png');
  await ev(`window.scrollTo(0, document.querySelector('#boards').getBoundingClientRect().top+scrollY-8)`); await snap('10-mobile-board.png');
  console.log(errors.length ? '❌ 頁面錯誤：' + errors.join(' | ') : '✅ 無頁面錯誤');
  ws.close(); edge.kill(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
