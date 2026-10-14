// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node consultas_40.js
// Batería de consultas: el texto libre se interpreta en la página y las cifras se comparan con un cálculo independiente sobre los datos crudos
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');
global.window={}; require('../datos/control.js'); require('../datos/proteccion.js'); require('../datos/regulacion.js');
const C=window.IANAMI_CVM, P=window.IANAMI_PMV, G=window.IANAMI_REG;
const dia = (ini, s) => Math.round((new Date(s+'T00:00:00') - new Date(ini+'T00:00:00'))/864e5);
const S = (T, f, col) => { let t=0; const v=T[col||'v']; for (let i=0;i<T.d.length;i++) if (f(i)) t+=v[i]; return t; };
const enR = (T, ini, a, b) => i => T.d[i]>=dia(ini,a) && T.d[i]<=dia(ini,b);
const MX = C.dic.n.indexOf('México'), n = x => C.dic.n.indexOf(x), e = x => C.dic.e.indexOf(x);
// Las fechas esperadas se calculan desde el corte de cada tabla (igual que la página), no fijas: así la prueba sirve con cualquier actualización
const iso = f => f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');
const masD = (s, k) => { const f = new Date(s+'T00:00:00'); f.setDate(f.getDate()+k); return iso(f); };
const finT = (T, ini, fin) => fin!=null ? masD(ini, fin) : masD(ini, Math.max(...T.d));
const mesR = (m, fin) => { const F = new Date(fin+'T00:00:00'); let y = F.getFullYear(); if (new Date(y, m, 1) > F) y--; return [iso(new Date(y, m, 1)), iso(new Date(y, m+1, 0))]; };
const ultMes = fin => { const F = new Date(fin+'T00:00:00'); let y = F.getFullYear(), m = F.getMonth(); if (iso(new Date(y, m+1, 0)) > fin){ m--; if (m<0){ m = 11; y--; } } return [iso(new Date(y, m, 1)), iso(new Date(y, m+1, 0))]; };
const antMes = r => { const a = new Date(r[0]+'T00:00:00'); return [iso(new Date(a.getFullYear(), a.getMonth()-1, 1)), iso(new Date(a.getFullYear(), a.getMonth(), 0))]; };
const FC = k => finT(C[k], C.inicio, C.fin && C.fin[k]), FP = finT(P.rep, P.inicio), FG = masD(G.inicio, G.dias-1);
const A = C.inicio, Z = FC('orr'), NOV = mesR(10, FC('ing')), NOVr = mesR(10, FP), NOVs = mesR(10, FC('seg')), DICg = mesR(11, FG);
const UM = ultMes(FC('orr')), UMa = antMes(UM), DICi = mesR(11, FC('ing')), NOVi = mesR(10, FC('ing'));
const T3 = (() => { const F = new Date(FC('nna')+'T00:00:00'); return [iso(new Date(F.getFullYear(), F.getMonth()-2, 1)), FC('nna')]; })();
const orr = (f, col) => S(C.orr, i => enR(C.orr, C.inicio, A, Z)(i) && f(i), col);
const REI = new Set(C.orr.e.filter((x,i) => C.orr.rei[i]>0));       // O.R. que registran reincidencia (la página limita el total a esas)
const sdf = i => Math.max(0, C.orr.v[i]-C.orr.pre[i]-C.orr.can[i]);
const casos = [
 ['de los rescatados cuántos fueron presentados y cuántos canalizados', {ind:'resc', partes:['pre','can']}, { total:orr(()=>1), p0:orr(()=>1,'pre'), p1:orr(()=>1,'can') }],
 ['rescatados por nacionalidad', {ind:'resc', desg:'n'}, { total:orr(()=>1), top:['Venezuela', orr(i=>C.orr.n[i]===n('Venezuela'))] }],
 ['rescatados venezolanos en Chiapas', {ind:'resc'}, { total:orr(i=>C.orr.e[i]===e('Chiapas') && C.orr.n[i]===n('Venezuela')) }],
 ['rescatados de Venezuela en Chiapas', {ind:'resc'}, { total:orr(i=>C.orr.e[i]===e('Chiapas') && C.orr.n[i]===n('Venezuela')) }],
 ['de los rescatados cuántos no tienen destino', {ind:'resc'}, { total:orr(()=>1) }],
 ['de los rescatados cuantos reincidentes', {ind:'resc', partes:['rei']}, { total:orr(i=>REI.has(C.orr.e[i])), p0:orr(()=>1,'rei') }],
 ['rescatados mujeres', {ind:'resc'}, { total:orr(()=>1), aviso:true }],
 ['internaciones por vía', {ind:'ing', desg:'via'}, { total:S(C.ing, i=>C.ing.n[i]!==MX) }],
 ['internaciones de Venezuela contra Colombia', {ind:'ing', cmp:true}, { total:S(C.ing, i=>C.ing.n[i]===n('Venezuela')||C.ing.n[i]===n('Colombia')) }],
 ['internaciones aéreas por nacionalidad', {ind:'ing', partes:['aer'], desg:'n'}, { total:S(C.ing, i=>C.ing.n[i]!==MX), p0:S(C.ing, i=>C.ing.n[i]!==MX && C.ing.vi[i]===0) }],
 ['internaciones en noviembre', {ind:'ing'}, { total:S(C.ing, i=>C.ing.n[i]!==MX && enR(C.ing, C.inicio, ...NOV)(i)) }],
 ['rechazos por mes', {ind:'rech', desg:'t'}, { total:S(C.seg, i=>C.seg.n[i]!==MX && C.seg.r[i]===1) }],
 ['rechazos de Colombia por punto', {ind:'rech', desg:'p'}, { total:S(C.seg, i=>C.seg.n[i]===n('Colombia') && C.seg.r[i]===1) }],
 ['casos de segunda revisión cuántos terminaron en rechazo', {ind:'seg', partes:['rch']}, { total:S(C.seg, i=>C.seg.n[i]!==MX), p0:S(C.seg, i=>C.seg.n[i]!==MX && C.seg.r[i]===1) }],
 ['presentados por estación', {ind:'pres', desg:'est'}, { total:S(C.pre, ()=>1) }],
 ['presentados en Tabasco', {ind:'pres'}, { total:S(C.pre, i=>C.pre.e[i]===e('Tabasco')) }],
 ['retornados cuántos deportados', {ind:'ret', partes:['dep']}, { total:S(C.ret,()=>1,'dep')+S(C.ret,()=>1,'ra'), p0:S(C.ret,()=>1,'dep') }],
 ['NNA canalizados no acompañados por nacionalidad', {ind:'nna', partes:['c1'], desg:'n'}, { total:S(C.nna,()=>1), p0:S(C.nna, i=>C.nna.c[i]===1) }],
 ['NNA canalizados por edad', {ind:'nna', desg:'edad'}, { total:S(C.nna,()=>1) }],
 ['NNA de Honduras por mes', {ind:'nna', desg:'t'}, { total:S(C.nna, i=>C.nna.n[i]===n('Honduras')) }],
 ['adultos acompañantes cuántos mujeres', {ind:'adu', partes:['muj']}, { total:S(C.adu,()=>1), p0:S(C.adu, i=>C.adu.s[i]===1) }],
 ['recibidos de EE. UU. cuántos menores', {ind:'rec', partes:['me']}, { total:S(C.rec,()=>1,'ad')+S(C.rec,()=>1,'me'), p0:S(C.rec,()=>1,'me') }],
 ['repatriados por punto en noviembre', {ind:'rep', desg:'p'}, { total:S(P.rep, i=>enR(P.rep, P.inicio, ...NOVr)(i)) }],
 ['de los repatriados cuántos NNA no acompañados', {ind:'rep', partes:['na']}, { total:S(P.rep,()=>1), p0:S(P.rep,()=>1,'na') }],
 ['repatriados en vuelos PRIM por semana', {ind:'rep', partes:['aer']}, { total:S(P.rep,()=>1), p0:S(P.rep, i=>P.rep.m[i]===1) }],
 ['repatriados en Matamoros', {ind:'rep'}, { total:S(P.rep, i=>P.dic.p[P.rep.p[i]]==='Matamoros') }],
 ['repatriados por nacionalidad', {ind:'rep'}, { total:S(P.rep,()=>1), aviso:true }],
 ['trámites por documento en Chiapas', {ind:'tram', desg:'doc'}, { total:S(G.cols, i=>G.cols.e[i]===G.dic.e.indexOf('Chiapas')) }],
 ['trámites de mujeres', {ind:'tram', partes:['muj']}, { total:S(G.cols,()=>1), p0:S(G.cols, i=>G.cols.s[i]===1) }],
 ['trámites de Cuba contra Venezuela contra Haití', {ind:'tram', cmp:true}, { total:['Cuba','Venezuela','Haití'].reduce((t,x)=>t+S(G.cols, i=>G.cols.n[i]===G.dic.n.indexOf(x)),0) }],
 ['trámites por oficina en diciembre', {ind:'tram', desg:'of'}, { total:S(G.cols, i=>enR(G.cols, G.inicio, ...DICg)(i)) }],
 ['de los rescatados cuántos fueron presentados comparado con el sistema', {ind:'resc', partes:['pre'], tipo:'fuentes'}, { total:orr(()=>1), p0:orr(()=>1,'pre'), sis:S(C.pre,()=>1) }],
 ['cuántas visas humanitarias', {ind:'tram'}, { total:S(G.cols, i=>G.cols.c[i]===G.condiciones.indexOf('Vis. Humanitario')) }],
 ['repatriados mujeres por punto', {ind:'rep', partes:['am'], desg:'p'}, { total:S(P.rep,()=>1), p0:S(P.rep,()=>1,'am') }],
 ['NNA canalizados en Chiapas contra Tabasco', {ind:'nna', cmp:true}, { total:S(C.nna, i=>C.nna.e[i]===e('Chiapas')||C.nna.e[i]===e('Tabasco')) }],
 ['trámites de Cuba por mes', {ind:'tram', desg:'t'}, { total:S(G.cols, i=>G.cols.n[i]===G.dic.n.indexOf('Cuba')) }],
 ['internaciones por punto top 15', {ind:'ing', desg:'p'}, { total:S(C.ing, i=>C.ing.n[i]!==MX) }],
 ['rechazos de hondureños en noviembre', {ind:'rech'}, { total:S(C.seg, i=>C.seg.n[i]===n('Honduras') && C.seg.r[i]===1 && enR(C.seg, C.inicio, ...NOVs)(i)) }],
 ['deportados por nacionalidad', {ind:'ret', partes:['dep']}, { total:S(C.ret,()=>1,'dep')+S(C.ret,()=>1,'ra'), p0:S(C.ret,()=>1,'dep') }],
 ['algo sin sentido xyz', {}, { aviso:true }],
 // Fase 1: cambio entre periodos, fechas relativas y quincenas
 ['qué nacionalidad de rescatados creció más', {ind:'resc', tipo:'cambio', desg:'n', d0:UM[0], d1:UM[1]}, { total:orr(i=>enR(C.orr, C.inicio, ...UM)(i)), tA:orr(i=>enR(C.orr, C.inicio, ...UMa)(i)) }],
 ['internaciones noviembre contra diciembre', {ind:'ing', tipo:'cambio', d0:DICi[0], d1:DICi[1]}, { total:S(C.ing, i=>C.ing.n[i]!==MX && enR(C.ing, C.inicio, ...DICi)(i)), tA:S(C.ing, i=>C.ing.n[i]!==MX && enR(C.ing, C.inicio, ...NOVi)(i)) }],
 ['rescatados que más bajaron por O.R.', {ind:'resc', tipo:'cambio', desg:'e'}, { total:orr(i=>enR(C.orr, C.inicio, ...UM)(i)) }],
 ['rescatados últimos 30 días', {ind:'resc', d0:masD(Z,-29), d1:Z}, { total:orr(i=>enR(C.orr, C.inicio, masD(Z,-29), Z)(i)) }],
 ['NNA canalizados en el último trimestre', {ind:'nna', d0:T3[0], d1:T3[1]}, { total:S(C.nna, enR(C.nna, C.inicio, ...T3)) }],
 ['repatriados primera quincena de noviembre', {ind:'rep', partes:[], d0:NOVr[0], d1:masD(NOVr[0],14)}, { total:S(P.rep, i=>enR(P.rep, P.inicio, NOVr[0], masD(NOVr[0],14))(i)) }],
 ['por qué subieron los rescates', {ind:'resc', tipo:'cambio'}, { aviso:true }]
];
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[]; let ok=0, mal=0;
  const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000}); await p.waitForTimeout(300);
  for (const [txt, esp, num] of casos){
    const r = await p.evaluate(t => { const X = window.IANAMI_CONSULTA._prueba, q = X.entender(t), R = X.calcular(q);
      return { ind:q.ind, partes:q.partes, desg:q.desg, cmp:q.cmp, filtros:q.filtros, d0:q.d0, d1:q.d1, total:R.total, p:R.partes.map(x=>x.v), top:R.listas[0] && R.listas[0].filas[0] ? [R.listas[0].filas[0].nom, R.listas[0].filas[0].v] : null, tipo:R.tipo, tA:R.cam ? R.cam.tA : null, resp:R.resp, sis:R.sis ? R.sis.pre : null, avisos:R.avisos, tit:X.titulo(R) }; }, txt);
    const f = []; for (const k of Object.keys(esp)){ const a = JSON.stringify(r[k]), e2 = JSON.stringify(esp[k]); if (k==='partes' ? JSON.stringify([...r.partes].sort())!==JSON.stringify([...esp.partes].sort()) : a!==e2) f.push(k+' '+a+'≠'+e2); }
    if (num.total!=null && Math.round(r.total)!==num.total) f.push('total '+r.total+'≠'+num.total);
    if (num.p0!=null && Math.round(r.p[0])!==num.p0) f.push('parte '+r.p[0]+'≠'+num.p0);
    if (num.p1!=null && Math.round(r.p[1])!==num.p1) f.push('parte2 '+r.p[1]+'≠'+num.p1);
    if (num.top && (!r.top || r.top[0]!==num.top[0] || Math.round(r.top[1])!==num.top[1])) f.push('top '+JSON.stringify(r.top));
    if (num.aviso && !r.avisos.length) f.push('faltó aviso');
    if (num.sis!=null && r.sis!==num.sis) f.push('sistema '+r.sis+'≠'+num.sis);
    if (num.tA!=null && Math.round(r.tA)!==num.tA) f.push('periodo anterior '+r.tA+'≠'+num.tA);
    if (!r.resp) f.push('sin respuesta en una frase');
    if (!num.aviso && r.avisos.some(a => a.startsWith('No reconoc'))) f.push('aviso de más');
    f.length ? mal++ : ok++;
    console.log((f.length?'✗':'✓'), txt.padEnd(62).slice(0,62), r.tipo.padEnd(7), '«'+r.tit+'»', r.avisos.length ? '⚠ '+r.avisos.join(' | ') : '', f.length ? '\n     '+f.join(' · ') : ''); }
  console.log('OK', ok, 'MAL', mal, 'errores', JSON.stringify(errs)); await b.close(); })();
