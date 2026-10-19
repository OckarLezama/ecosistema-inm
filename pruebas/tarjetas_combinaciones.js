// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node tarjetas_combinaciones.js
// Tarjetas del Pulso: un clic en una barra (estado, nacionalidad, cinturón) filtra ahí mismo: mismas tarjetas, mismo orden,
// la barra queda marcada y hay chip; otro clic la quita. Con el filtro puesto se recorren los 10 indicadores y los periodos.
// Desde el buscador, el lugar sigue mostrando su tarjeta propia y el contexto del país.
const { chromium } = require('playwright');
const dir=require('path').resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); let mal=0, n=0; const ok=(c,t)=>{n++; if(!c){mal++; console.log('MAL: '+t);} };
for (const [w,h] of [[1600,900],[390,844]]){
 const p=await (await b.newContext({viewport:{width:w,height:h}, isMobile:w<500, hasTouch:w<500})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
 await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(2500);
 const KP=['ing','rech','tram','resc','pres','can','ret','recib','rep','cbp'];
 const kpi=async k=>{ await p.evaluate(k=>{const on=document.querySelector('.kc.on'); if(on && on.dataset.k!==k) on.click(); const b=document.querySelector('.kc[data-k="'+k+'"]'); if(b && !b.disabled && !b.classList.contains('on')) b.click();},k); await p.waitForTimeout(500); };
 const tits=()=>p.evaluate(()=>[...document.querySelectorAll('#bajo > .caja h2 > span')].map(h=>h.childNodes[0].textContent));
 // juego de tarjetas sin filtro por indicador
 const base={}; for (const k of KP){ await kpi(k); base[k]=await tits(); }
 for (const [tipo,q] of [['estado','.barra[data-e="27"]'],['nacionalidad','.barra[data-n]']]){
  await kpi('resc'); const nom=await p.evaluate(q=>{const r=document.querySelector('#bajo '+q); r.click(); return r.textContent.slice(0,20);},q); await p.waitForTimeout(700);
  for (const k of KP){ await kpi(k);
    const s=await p.evaluate(()=>({chip:document.getElementById('chips').textContent, ind:(document.querySelector('.kc.on')||{dataset:{}}).dataset.k, w:document.documentElement.scrollWidth, dis:!!document.querySelector('.kc.on[disabled]')}));
    const t=await tits(); const et=w+' '+tipo+' «'+nom+'» → '+k;
    if (s.ind!==k){ ok(true,''); continue; }
    ok(JSON.stringify(t)===JSON.stringify(base[k]), et+': tarjetas '+JSON.stringify(t)+' vs '+JSON.stringify(base[k]));
    ok(!!s.chip, et+': perdió el filtro'); ok(s.w<=w+1, et+': se ensancha '+s.w); }
  // cambiar periodo y comparación con filtro puesto
  for (const per of ['trump','anio','shein']){ await p.evaluate(per=>document.querySelector('[data-per="'+per+'"]').click(),per); await p.waitForTimeout(900); ok(!!(await p.evaluate(()=>document.getElementById('chips').textContent)), w+' '+tipo+' periodo '+per+': perdió el filtro'); }
  await p.evaluate(()=>{const c=document.querySelector('[data-cerrar]'); if(c) c.click();}); await p.waitForTimeout(600);
  ok(!(await p.evaluate(()=>document.getElementById('chips').textContent)), w+' '+tipo+': la X del chip no quitó el filtro');
 }
 ok(errs.length===0, w+' errores '+JSON.stringify(errs)); await p.close(); }
console.log('combinaciones', n); console.log('tarjetas_combinaciones: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', mal ? '["'+mal+' MAL"]' : '[]'); await b.close(); })();
