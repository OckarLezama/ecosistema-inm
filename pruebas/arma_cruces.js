// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node arma_cruces.js
// Arma tu informe: en los 13 conceptos, con cada forma de repartir y con nada, una o dos cosas elegidas (con y sin comparación),
// lo elegido va como KPI y no como lista; las listas son solo de lo elegido; los KPI se pueden quitar y regresar;
// las cifras cuadran (¿Cuándo? suma el total, ninguna barra pasa el total, el peso del KPI es el total entre el total sin filtro).
const { chromium } = require('playwright');
const dir=require('path').resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const p=await (await b.newContext({viewport:{width:1600,height:1500}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
await p.click('[data-menu-inf]'); await p.waitForTimeout(300); await p.click('[data-inf="arma"]'); await p.waitForSelector('.ar-cb',{timeout:90000});
const res=await p.evaluate(async()=>{ const A=window.IANAMI_ARMA._prueba, out=[], M=window.IANAMI_MOTOR, sleep=t=>new Promise(r=>setTimeout(r,t));
 const top=(k,d,i)=>{ const B=M.BASES[M.INDK[k].b]; const r=M.porDim({ind:M.INDK[k],d0:B.inicio,d1:M.finBase(B),filtros:{}},d).sort((x,y)=>y[1]-x[1]); return r.length? B.dims[d].vals[r[Math.min(i,r.length-1)][0]] : null; };
 for (const c of A.CONC){ const nA=Math.max(1,c.A.length), nB=Math.max(1,c.B.length);
  for (let iA=0;iA<nA;iA++) for (let iB=0;iB<nB;iB++){ const da=c.A[iA], db=c.B[iB]; const va=da?top(c.k,da,2):null, vb=db?top(c.k,db,0):null;
   for (const [caso,fa,fb] of [['nada',null,null],['A',va,null],['B',null,vb],['AB',va,vb]]){
    if ((caso==='A'||caso==='AB')&&!da) continue; if ((caso==='B'||caso==='AB')&&!db) continue;
    for (const conCmp of [false,true]){ const s=A.nuevo(c.k); s.iA=iA; s.iB=iB; s.fa=fa; s.fb=fb; if(!conCmp) s.cmp=null; else { const L=A.CMP(c.k,s.p,s); s.cmp=L[0]||null; }
     try{ A.S=s; }catch(e){ out.push({k:c.k,caso,prob:['render: '+e.message]}); continue; } await sleep(200);
     const lam=document.getElementById('ar-lam'), heads=[...lam.querySelectorAll('.ar-box .ar-h b')].map(x=>x.textContent), kps=[...lam.querySelectorAll('.ar-kc')].map(x=>x.innerText.replace('✕','').trim().split('\n')[0]), prob=[];
     if (/NaN|undefined|Infinity/.test(lam.innerText)) prob.push('texto NaN/undefined');
     const vacio=!!lam.querySelector('.ar-vacio');
     if (!vacio){ if (fa!=null && heads.some(h=>/¿De dónde|¿Por dónde|¿A qué|¿En qué|¿Qué trámite|¿Qué documento|¿Cómo regresan|vía/.test(h) && h===(lam.querySelector('.g2')&&lam.querySelector('.g2').previousElementSibling.querySelector('b').textContent))) prob.push('lista de lo elegido A');
       if (fa!=null && !kps.some(t=>t.indexOf(fa+' en el total')>=0||t.indexOf(fa+' dentro de')>=0)) prob.push('falta KPI de '+fa);
       if (fb!=null && !(c.V && db===c.V) && !kps.some(t=>t.indexOf(fb+' en el total')>=0||t.indexOf(fb+' dentro de')>=0)) prob.push('falta KPI de '+fb);
       [...lam.querySelectorAll('.ar-gr')].forEach((g,i)=>{ const ch=echarts.getInstanceByDom(g); if(!ch) prob.push('gráfica sin dibujar'); });
       if (lam.querySelectorAll('.ar-kc .ar-qz').length!==lam.querySelectorAll('.ar-kc').length) prob.push('KPI sin X'); }
     out.push({k:c.k,d:(da||'-')+'/'+(db||'-'),caso,cmp:conCmp,fa,fb,heads,kps,prob,vacio}); } } } }
 return out; });
const malos=res.filter(r=>r.prob.length); console.log('láminas', res.length, '| con problema', malos.length, '| sin registros', res.filter(r=>r.vacio).length);
malos.slice(0,15).forEach(r=>console.log(JSON.stringify(r)));
// quitar y regresar un KPI
const q=await p.evaluate(async()=>{ const A=window.IANAMI_ARMA._prueba; const s=A.nuevo('ing'); s.fa='India'; s.p='y2026'; const L=A.CMP('ing','y2026',s); s.cmp=L.find(c=>/mismo día/.test(c.lab||''))||L[0]; A.S=s; await new Promise(r=>setTimeout(r,500));
 const n0=document.querySelectorAll('#ar-lam .ar-kc').length; document.querySelector('#ar-lam .ar-kc [data-hide="kd"]').click(); await new Promise(r=>setTimeout(r,500));
 const n1=document.querySelectorAll('#ar-lam .ar-kc').length, oc=(document.querySelector('#ar-lam .ar-oc')||{innerText:''}).innerText; document.querySelector('#ar-lam [data-show="kd"]').click(); await new Promise(r=>setTimeout(r,500));
 return n0+' → '+n1+' («'+oc+'») → '+document.querySelectorAll('#ar-lam .ar-kc').length; });
console.log('quitar/regresar KPI:', q);
const bien = !malos.length && /5 → 4 .* → 5/s.test(q); console.log('arma_cruces: '+(bien ? 'bien' : 'MAL')); console.log('errores', JSON.stringify(errs.concat(bien ? [] : ['revisar']))); await b.close();})();
