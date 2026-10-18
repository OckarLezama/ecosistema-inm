// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node combinaciones_pulso.js
// Tarjetas de abajo del Pulso en todas las combinaciones: los 10 indicadores, cada fila de «Composición» (filtra dónde y quiénes),
// país, estado y punto elegidos, y el cambio de indicador con un punto elegido. Revisa:
//  · el orden: Composición → dónde (puntos y estados) → quiénes (nacionalidades);
//  · que la cifra filtrada cuadre con las bases (periodo Sheinbaum: meses completos, sin prorrateo);
//  · que ninguna tarjeta muestre un punto que no aplica al indicador, ni cifras del país junto a las de un punto;
//  · que la ayuda de la tarjeta de arriba no diga el nombre del punto (sus cifras son del país);
//  · que la liga guarde la parte de Composición y el punto; nada se sale de la pantalla; sin errores de JavaScript.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; for (const f of ['datos.js','puntos.js']) require(dir+'/datos/'+f); const D = window.IANAMI_DATOS, PT = window.IANAMI_PUNTOS;
// Máximo por estado de una parte (desglose kc, categorías cats), con meses completos
function maxEstado(kc, cats){ const c = D.comp[kc], o = {}; for (let i=0;i<c.length;i+=5) if (cats.indexOf(c[i+3])>=0) o[c[i+1]] = (o[c[i+1]] || 0) + c[i+4]; return Math.max(0, ...Object.values(o)); }
function maxNat(kc, cats){ const c = D.comp[kc], o = {}, OT = D.nats.length-2; for (let i=0;i<c.length;i+=5) if (cats.indexOf(c[i+3])>=0 && c[i+2]<OT) o[c[i+2]] = (o[c[i+2]] || 0) + c[i+4]; return Math.max(0, ...Object.values(o)); }
const num = t => { t = String(t).replace(/,/g,'').trim(); const m = t.match(/([\d.]+)\s*(M|mil)?/); if (!m) return NaN; return +m[1]*(m[2]==='M' ? 1e6 : m[2]==='mil' ? 1e3 : 1); };
const cerca = (a, b) => Math.abs(a-b) <= Math.max(1, b*0.006);          // «x.xx M» redondea a 0.5%
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0, rev = 0; const ok = (c, t) => { rev++; if (!c){ mal++; console.log('  MAL: '+t); } };
  const abre = async (w, h, q) => { const ctx = await b.newContext({ viewport:{ width:w, height:h } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(w+': '+e.message)); p.on('console', m => { if (m.type()==='error') errs.push(w+' consola: '+m.text()); });
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort()); await p.goto('file://'+dir+'/index.html'+(q || '')); await p.waitForTimeout(1600); return p; };
  const cajas = p => p.evaluate(() => [...document.querySelectorAll('#bajo > .caja')].map(e => ({ t:(e.querySelector('h2 > span') || e).textContent.replace(/\s+/g,' ').trim(), punto:e.dataset.punto || null, x:[...e.querySelectorAll('.barra .x, .fila .x')].map(z => z.textContent) })));
  const ruta = p => p.evaluate(() => { const r = document.getElementById('ruta-bajo'); return r && !r.hidden ? r.textContent.replace(/\s+/g,' ') : ''; });
  const p = await abre(1600, 1000);
  const inds = await p.evaluate(() => [...document.querySelectorAll('#kpis .kc[data-k]')].map(e => e.dataset.k));
  ok(inds.length===10, 'diez indicadores ('+inds.length+')');
  for (const k of inds){
    await p.click('.kc[data-k="'+k+'"]'); await p.waitForTimeout(700);
    let c = await cajas(p);
    ok(/^Composición/.test(c[0].t), k+': Composición va primero ('+c[0].t+')');
    const iE = c.findIndex(x => / por estado| por sector/.test(x.t)), iN = c.findIndex(x => /nacionalidades/i.test(x.t));
    ok(iE>0 && (iN<0 || iN>iE), k+': dónde va antes que quiénes');
    if (k==='ing' || k==='rech') ok(c.findIndex(x => /Puntos de ingreso|por punto/.test(x.t))===1, k+': los puntos van después de Composición');
    ok(await ruta(p)==='', k+': sin filtro no aparece «Estás viendo»');
    const filas = await p.evaluate(() => [...document.querySelectorAll('#bajo [data-cruce]')].map(e => e.dataset.cruce));
    ok(k==='rech' ? filas.length===0 : filas.length>0, k+(k==='rech' ? ': Rechazos no filtra por Rechazo/Internación (no son partes de los rechazos)' : ': Composición tiene filas que filtran'));
    // la primera fila de cada grupo
    const vistos = new Set();
    for (const f of filas){ const g = f.split(':').slice(0,2).join(':'); if (vistos.has(g)) continue; vistos.add(g);
      await p.click('#bajo [data-cruce="'+f+'"]'); await p.waitForTimeout(600);
      const r = await ruta(p), nom = await p.evaluate(f => { const e = document.querySelector('#bajo [data-cruce="'+f+'"]'); return e.querySelector('span:not(.b)') ? e.querySelector('span:not(.b)').textContent.trim() : e.textContent.trim(); }, f);
      c = await cajas(p);
      const on = await p.evaluate(f => document.querySelector('#bajo [data-cruce="'+f+'"]').classList.contains('on'), f);
      ok(on, f+': la fila elegida queda marcada');
      ok(r.indexOf(nom.split(' ')[0])>=0, f+': «Estás viendo» dice la parte ('+nom+')');
      const dE = c.find(x => / por estado| por sector/.test(x.t)); ok(dE && dE.t.indexOf(nom.split(' ')[0])>=0, f+': la tarjeta de dónde dice la parte');
      if (k!=='rep') { const dN = c.find(x => /^Nacionalidades/.test(x.t)); ok(dN && dN.t.indexOf(nom.split(' ')[0])>=0, f+': la tarjeta de quiénes dice la parte'); }
      // cifra: el estado con más registros de esa parte = el de la base
      const g0 = await p.evaluate(f => { const [k, g, i] = f.split(':'); return null; }, f);
      const q = f.split(':'), sel = { ing:{via:['ing_via',[[0],[1],[2]]]}, resc:{rei:['resc_rei',[[0],[1]]], des:['resc_des',[[0],[1],[2]]]}, ret:{tipo:['ret_tipo',[[1],[0]]]}, recib:{edad:['recib_edad',[[1],[0]]]},
        rep:{ad:['rep_comp',[[0],[1]]], me:['rep_comp',[[2],[3]]], co:['rep_comp',[[4],[5]]], mo:['rep_comp',[[6],[7]]]}, tram:{tipo:['tram_tipo',null]}, pres:{est:['pres_est',null]},
        can:{sx:['can_nna',[[6,7,8,9,10,11],[0,1,2,3,4,5]]], ed:['can_nna',[[0,1,2,6,7,8],[3,4,5,9,10,11]]], co:['can_nna',[[0,3,6,9],[1,4,7,10],[2,5,8,11]]], ad:['can_ad',[[1],[0]]]} }[k];
      if (sel && sel[q[1]] && dE && dE.x.length){ const [kc, cs] = sel[q[1]], cats = cs ? cs[+q[2]] : [+q[2]];
        ok(cerca(num(dE.x[0]), maxEstado(kc, cats)), f+': estado con más = base ('+dE.x[0]+' / '+maxEstado(kc, cats)+')');
        const dN = c.find(x => /^Nacionalidades/.test(x.t)); if (dN && dN.x.length) ok(cerca(num(dN.x[0]), maxNat(kc, cats)), f+': nacionalidad con más = base ('+dN.x[0]+' / '+maxNat(kc, cats)+')'); }
      if (k==='ing'){ const pc = c.find(x => /^Puntos de ingreso/.test(x.t)), via = +q[2], o = {}; for (let i=0;i<PT.ing.c.length;i+=5) if (PT.ing.c[i+3]%3===via){ const j = Math.floor(PT.ing.c[i+3]/3); o[j] = (o[j] || 0) + PT.ing.c[i+4]; }
        ok(pc && cerca(num(pc.x[0]), Math.max(...Object.values(o))), f+': punto con más de esa vía = base'); }
      await p.click('#bajo [data-cruce="'+f+'"]'); await p.waitForTimeout(500);
      ok(await ruta(p)==='', f+': segundo clic quita la parte'); }
    await p.click('.kc[data-k="'+k+'"]'); await p.waitForTimeout(400);      // se apaga el indicador
  }
  // Punto de internación: va primero, sin tarjetas del país; al cambiar a Rechazos se queda; a Rescatados se quita
  await p.click('.kc[data-k="ing"]'); await p.waitForTimeout(800);
  await p.click('#bajo [data-ptos="ing"] [data-pto]'); await p.waitForTimeout(1500);
  let c = await cajas(p); const pn = c[0].punto;
  ok(!!pn, 'punto: su tarjeta va primero ('+c[0].t+')');
  ok(!c.some(x => /^Composición| por estado|^Principales nacionalidades/.test(x.t)), 'punto: no se mezclan tarjetas del país');
  ok((await ruta(p)).indexOf(pn)>=0, 'punto: «Estás viendo» lo dice');
  await p.hover('.kc[data-k="ing"]'); await p.waitForTimeout(900);
  ok(!(await p.evaluate(() => document.getElementById('kpi-tip').textContent)).includes(pn), 'punto: la ayuda de la tarjeta de arriba no dice el punto');
  const tot = await p.evaluate(() => +document.querySelector('#bajo [data-punto] .num').textContent.replace(/,/g,'')), j = PT.ing.cats.indexOf(pn); let esp = 0; for (let i=0;i<PT.ing.c.length;i+=5) if (Math.floor(PT.ing.c[i+3]/3)===j) esp += PT.ing.c[i+4];
  ok(tot===esp, 'punto: ingresos del punto = base ('+tot+' / '+esp+')');
  await p.click('.kc[data-k="rech"]'); await p.waitForTimeout(900); c = await cajas(p);
  ok(c[0].punto===pn, 'punto + Rechazos: el punto se queda');
  await p.click('.kc[data-k="resc"]'); await p.waitForTimeout(900); c = await cajas(p);
  ok(!c.some(x => x.punto) && !c.some(x => x.t.indexOf(pn)>=0) && await ruta(p)==='', 'punto + Rescatados: el punto se quita');
  ok(await p.evaluate(() => { const a = document.getElementById('aviso-breve'); return !!a && /se quitó el punto/.test(a.textContent); }), 'punto + Rescatados: avisa que se quitó');
  // País y estado: su tarjeta primero, luego Composición
  await p.click('.kc[data-k="ing"]'); await p.waitForTimeout(700); await p.click('#bajo [data-n]'); await p.waitForTimeout(1300); c = await cajas(p);
  ok(await p.evaluate(() => /todos sus indicadores/.test(document.querySelector('#bajo > .caja').textContent)) && /^Composición/.test(c[1].t) && !c.some(x => /^Principales nacionalidades/.test(x.t)), 'país: su tarjeta, luego Composición, sin lista de nacionalidades '+JSON.stringify(c.map(x => x.t)));
  await p.click('#bajo [data-cruce="ing:via:0"]'); await p.waitForTimeout(600);
  ok(/Ingresos.*›.*›.*Aérea/.test(await ruta(p)), 'país + vía aérea: «Estás viendo» dice los dos');
  await p.click('#bajo [data-cruce="ing:via:0"]'); await p.waitForTimeout(400);
  // Liga con parte y punto
  const q = await p.evaluate(() => { const u = new URL(location.href); return u.search; });
  await p.close();
  const p2 = await abre(1600, 1000, '?per=shein&i=ing&c=via:2'); ok(/Marítima/.test(await ruta(p2)), 'liga: abre con la parte de Composición'); await p2.close();
  const p3 = await abre(1600, 1000, '?per=shein&i=pres&l=pem1'); await p3.waitForTimeout(800); c = await cajas(p3);
  ok(!!c[0].punto && /^Nacionalidades/.test((c[1] || {}).t || ''), 'liga: estación con sus nacionalidades ('+(c[0] || {}).t+')'); await p3.close();
  const p4 = await abre(1600, 1000, '?per=shein&i=rep&l=prep0'); await p4.waitForTimeout(800); c = await cajas(p4);
  ok(!!c[0].punto && /Puntos de repatriación/.test((c[1] || {}).t || ''), 'liga: punto de repatriación'); 
  await p4.click('#bajo [data-pto^="rep:"]:not(.on)'); await p4.waitForTimeout(1300); const c2 = await cajas(p4); ok(c2[0].punto && c2[0].punto!==c[0].punto, 'repatriación: clic en otro punto lo cambia'); await p4.close();
  // Otros periodos: Trump, un año y un mes; cada indicador con la primera fila de su Composición elegida
  for (const per of ['?per=trump', '?per=anio&a=2025', '?per=anio&a=2026&m=3']){ const px = await abre(1600, 1000, per);
    for (const k of inds){ await px.evaluate(k => window.IANAMI_PULSO.verInd(k), k); await px.waitForTimeout(500);
      const f = await px.evaluate(() => { const e = document.querySelector('#bajo [data-cruce]'); return e ? e.dataset.cruce : null; }); if (f){ await px.click('#bajo [data-cruce="'+f+'"]'); await px.waitForTimeout(500); }
      const t = await px.evaluate(() => document.getElementById('bajo').textContent);
      ok(!/NaN|undefined|Infinity/.test(t) && t.length>50, per+' '+k+(f ? ' · '+f : '')+': tarjetas sin cifras rotas'); }
    await px.close(); }
  // Celular: nada se sale
  const p5 = await abre(390, 844, '?per=shein&i=ing&c=via:0'); await p5.waitForTimeout(900);
  ok(await p5.evaluate(() => [...document.querySelectorAll('#bajo .caja, #ruta-bajo')].every(e => e.getBoundingClientRect().right <= innerWidth+1)), 'celular: nada se sale'); await p5.close();
  console.log('combinaciones: '+rev+' revisiones, '+(mal ? mal+' MAL' : 'todas bien')); console.log('errores', JSON.stringify(errs)); await b.close(); if (mal) console.log('MAL '+mal); })();
