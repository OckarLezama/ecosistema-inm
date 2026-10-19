// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node tarjetas_pulso.js
// Tarjetas del Pulso: un clic en una barra (estado, nacionalidad, cinturón) filtra ahí mismo: mismas tarjetas, mismo orden,
// la barra queda marcada y hay chip; otro clic la quita. Con el filtro puesto se recorren los 10 indicadores y los periodos.
// Desde el buscador, el lugar sigue mostrando su tarjeta propia y el contexto del país.
const { chromium } = require('playwright');
const dir=require('path').resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(2500);
const st=()=>p.evaluate(()=>({tit:[...document.querySelectorAll('#bajo > .caja h2 > span')].map(h=>h.childNodes[0].textContent), on:[...document.querySelectorAll('#bajo .barra.on')].map(x=>x.textContent.slice(0,30)), chip:document.getElementById('chips').textContent, sinTag:[...document.querySelectorAll('#bajo .caja')].filter(c=>c.querySelector('.barra.on')&&c.querySelector('.tag')).length, w:document.documentElement.scrollWidth}));
let mal=0; const ok=(c,t)=>{ if(!c){mal++; console.log('MAL: '+t);} };
const casos=[]; 
for (const agr of ['e','c']){
 if (agr==='c'){ await p.evaluate(()=>document.querySelector('[data-agr="c"]').click()); await p.waitForTimeout(1500); }
 for (const k of [null,'ing','rech','tram','resc','pres','can','ret','recib','rep','cbp']){
  await p.evaluate(k=>{ const on=document.querySelector('.kc.on'); if(on) on.click(); if(k){ const b=document.querySelector('.kc[data-k="'+k+'"]'); if(b && !b.disabled) b.click(); } },k); await p.waitForTimeout(700);
  const base=await st(); const nb=await p.evaluate(()=>[...document.querySelectorAll('#bajo .caja')].map((c,i)=>[...c.querySelectorAll('.barra[data-n],.barra[data-e],.barra[data-g]')].length? i : -1).filter(i=>i>=0));
  for (const ci of nb){ for (const fila of [0,4]){
    const sel=await p.evaluate(([ci,f])=>{const r=[...document.querySelectorAll('#bajo .caja')][ci].querySelectorAll('.barra[data-n],.barra[data-e],.barra[data-g]')[f]; if(!r) return null; const a=r.dataset.n!=null?'n':r.dataset.e!=null?'e':'g'; const t=r.textContent.slice(0,25); r.click(); return {t, q:'#bajo .barra[data-'+a+'="'+r.dataset[a]+'"]'};},[ci,fila]);
    const txt = sel && sel.t;
    if(txt==null) continue; await p.waitForTimeout(600); const a=await st();
    const et=(agr+'/'+(k||'panorama')+' card'+ci+' «'+txt+'»');
    ok(JSON.stringify(a.tit)===JSON.stringify(base.tit), et+': cambió el juego de tarjetas '+JSON.stringify(base.tit)+' → '+JSON.stringify(a.tit));
    ok(await p.evaluate(q=>{const l=[...document.querySelectorAll(q)]; return l.length>0 && l.every(x=>x.classList.contains('on'));}, sel.q), et+': no quedó marcada la barra elegida');
    ok(a.chip.length>0, et+': sin chip de filtro');
    ok(a.sinTag===0, et+': etiqueta repetida en la tarjeta marcada');
    ok(a.w<=1600, et+': la página se ensancha '+a.w);
    // otro clic en la misma barra: quita el filtro
    await p.evaluate(q=>document.querySelector(q).click(), sel.q); await p.waitForTimeout(600);
    const c=await st(); ok(!c.chip && JSON.stringify(c.on)===JSON.stringify(base.on) && JSON.stringify(c.tit)===JSON.stringify(base.tit), et+': el segundo clic no regresó a como estaba ('+c.chip+' '+JSON.stringify(c.on)+')');
    casos.push(et); } }
 } }
// desde el buscador / mapa: sigue mostrando la ficha completa del lugar
await p.evaluate(()=>{ const on=document.querySelector('.kc.on'); if(on) on.click(); document.querySelector('[data-agr="e"]').click(); }); await p.waitForTimeout(800);
await p.evaluate(()=>window.IANAMI_PULSO.verLugar('e','Chiapas')); await p.waitForTimeout(1500);
const m=await st(); ok(/Chiapas/.test(m.tit[0]||''), 'desde el buscador: primero va la tarjeta del lugar ('+m.tit[0]+')');
await p.evaluate(()=>window.IANAMI_PULSO.verLugar('n','Venezuela')); await p.waitForTimeout(1500);
const v=await p.evaluate(()=>[...document.querySelectorAll('#bajo > .caja h2 > span')].map(h=>h.textContent)); ok(v.some(t=>/Contexto/.test(t)), 'desde el buscador: Venezuela trae su contexto');
console.log('clics probados', casos.length); console.log('tarjetas_pulso: '+(mal ? mal+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
