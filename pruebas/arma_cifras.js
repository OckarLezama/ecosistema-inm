// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node arma_cifras.js
// Arma tu informe: en los 13 conceptos, con cada forma de repartir y con nada, una o dos cosas elegidas (con y sin comparación),
// lo elegido va como KPI y no como lista; las listas son solo de lo elegido; los KPI se pueden quitar y regresar;
// las cifras cuadran (¿Cuándo? suma el total, ninguna barra pasa el total, el peso del KPI es el total entre el total sin filtro).
const { chromium } = require('playwright');
const dir=require('path').resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const p=await (await b.newContext({viewport:{width:1600,height:1500}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
await p.click('[data-menu-inf]'); await p.waitForTimeout(300); await p.click('[data-inf="arma"]'); await p.waitForSelector('.ar-cb',{timeout:90000});
const res=await p.evaluate(async()=>{ const A=window.IANAMI_ARMA._prueba, M=window.IANAMI_MOTOR, sleep=t=>new Promise(r=>setTimeout(r,t)), out=[];
 const top=(k,d,i)=>{ const B=M.BASES[M.INDK[k].b]; const r=M.porDim({ind:M.INDK[k],d0:B.inicio,d1:M.finBase(B),filtros:{}},d).sort((x,y)=>y[1]-x[1]); const v = r.length? B.dims[d].vals[r[Math.min(i,r.length-1)][0]] : null; return d!=='p' || !v ? v : /^AICM/.test(v) ? 'AICM' : /^Cancún T/.test(v) ? 'Cancún' : /^Los Cabos/.test(v) ? 'Los Cabos' : /^Monterrey T/.test(v) ? 'Monterrey' : /^Guadalajara/.test(v) ? 'Guadalajara' : v; };
 const num=t=>+String(t).replace(/[^\d.]/g,'');
 const lee=()=>{ const l=document.getElementById('ar-lam'), ks=[...l.querySelectorAll('.ar-kc')]; const V=num(ks[0].querySelector('.ar-kv').textContent);
   const g1=l.querySelector('.g1'), c1=g1&&echarts.getInstanceByDom(g1), y=c1?c1.getOption().series[0].data.filter(v=>v!=null).reduce((a,b)=>a+b,0):null;
   const lists=[...l.querySelectorAll('.g2,.g3,.gx')].map(g=>{const o=echarts.getInstanceByDom(g).getOption(); return o.series[0].data.map(d=>+(d.value!=null?d.value:d));});
   return {V,y,lists,ks:ks.map(k=>k.innerText.replace('✕','').trim()),fra:l.querySelector('.ar-fra').innerText,vacio:!!l.querySelector('.ar-vacio')}; };
 for (const c of A.CONC){ for (let iB=0;iB<Math.max(1,c.B.length);iB++){ const da=c.A[0], db=c.B[iB]; for (const i of [0,3]){ const fa=da?top(c.k,da,i):null; if(!fa) continue;
   for (const conCmp of [false,true]){
    const mk=(fa,fb)=>{ const s=A.nuevo(c.k); s.iB=iB; s.fa=fa; s.fb=fb; if(!conCmp) s.cmp=null; else { const L=A.CMP(c.k,s.p,s); s.cmp=L.find(x=>x.fa==null)||null; } A.S=s; };
    mk(null,null); await sleep(150); const r0=lee(); mk(fa,null); await sleep(150); const r1=lee(); const prob=[];
    if (r1.vacio) { out.push({k:c.k,fa,prob:['vacío']}); continue; }
    if (r1.y!=null && Math.abs(r1.y-r1.V)>Math.max(2,r1.V*0.002)) prob.push('¿Cuándo? suma '+r1.y+' ≠ total '+r1.V);
    r1.lists.forEach((l,j)=>{ if (Math.max(...l)>r1.V*1.002+1) prob.push('lista '+j+' con barra mayor al total'); });
    const sh=r1.ks.find(t=>t.indexOf(fa+' en el total')===0); if(!sh) prob.push('sin KPI de peso'); else { const pk=+(sh.split('\n')[1]||'').replace('%',''); const pe=r1.V/r0.V*100; if (Math.abs(pk-(pe<1?+pe.toFixed(2):Math.round(pe)))>0.011) prob.push('peso KPI '+pk+' vs calculado '+pe.toFixed(2)); }
    if (/NaN|undefined/.test(r1.fra)) prob.push('frase rota');
    out.push({k:c.k,dB:db,fa,cmp:conCmp,V:r1.V,V0:r0.V,fra:r1.fra,prob}); } } } }
 return out; });
const m=res.filter(r=>r.prob.length); console.log('láminas revisadas', res.length, '| con problema', m.length); m.forEach(r=>console.log(JSON.stringify(r)));
res.filter(r=>r.cmp).slice(0,14).forEach(r=>console.log('·', r.k, r.fa, '→', r.fra));
console.log('arma_cifras: '+(m.length ? m.length+' MAL' : 'bien')); console.log('errores', JSON.stringify(errs.concat(m.length ? ['cifras'] : []))); await b.close();})();
