// 把所有圖卡風格 × 三平台拼成檢查用縮圖表：node scripts/test/style-sheet.js <輸出資料夾>
// 產出 styles-nophoto.png、styles-photo.png（有上傳產品照的版本）
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
const STYLES = ['glass', 'bold', 'list', 'photo', 'sale', 'festive', 'magazine', 'chat', 'minimal'];
const NAMES = ['質感玻璃', '大字主視覺', '重點清單卡', '照片疊字', '限時優惠', '節慶禮讚', '雜誌封面', '對話泡泡', '極簡留白'];
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = `http://localhost:${srv.address().port}/`;
  const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'edge-'));
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9362', '--user-data-dir=' + prof, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await (await fetch('http://127.0.0.1:9362/json/version')).json(); break; } catch { await sleep(250); } }
  const tgt = (await (await fetch('http://127.0.0.1:9362/json/list')).json()).find(t => t.type === 'page');
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; const errors = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '?t=sheet' }); await sleep(2500); await ev('localStorage.clear()');
  await send('Page.navigate', { url: base + '?t=sheet2' }); await sleep(3000);
  const sheet = async (name, withPhoto) => {
    const data = await ev(`(async()=>{
      if (${withPhoto}){ const im=new Image();im.src='assets/hero.webp';await im.decode();const c=document.createElement('canvas');c.width=600;c.height=760;c.getContext('2d').drawImage(im,950,195,330,418,0,0,600,760);
        const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const f=new File([b],'p.jpg',{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector('#f-photo');i.files=dt.files;i.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,800)); }
      const sel=document.querySelector('#f-style'), rowH=300, gap=12, rows=[];
      for (const s of ${JSON.stringify(STYLES)}){ sel.value=s; sel.dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,900)); await document.fonts.ready;
        rows.push(['fb','ig','th'].map(k=>{const i=new Image(); i.src=document.querySelector('#cv-'+k).toDataURL(); return i;})); }
      await Promise.all(rows.flat().map(i=>i.decode()));
      const W=rows[0].reduce((a,i)=>a+i.width*rowH/i.height+gap,gap+150);
      const out=document.createElement('canvas'); out.width=W; out.height=rows.length*(rowH+gap)+gap; const x=out.getContext('2d');
      x.fillStyle='#444'; x.fillRect(0,0,out.width,out.height); x.fillStyle='#fff'; x.font='700 26px "Microsoft JhengHei",sans-serif';
      rows.forEach((r,ri)=>{ x.fillText(${JSON.stringify(NAMES)}[ri], 14, gap+ri*(rowH+gap)+rowH/2); let xx=gap+150; r.forEach(i=>{const w=i.width*rowH/i.height; x.drawImage(i,xx,gap+ri*(rowH+gap),w,rowH); xx+=w+gap;}); });
      return out.toDataURL('image/png'); })()`);
    fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64')); console.log('🖼 ', name);
  };
  await sheet('styles-nophoto.png', false);
  await sheet('styles-photo.png', true);
  console.log(errors.length ? '❌ ' + errors.join(' | ') : '✅ 無頁面錯誤');
  ws.close(); edge.kill(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
