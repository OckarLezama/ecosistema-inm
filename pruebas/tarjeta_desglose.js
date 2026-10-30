// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node tarjeta_desglose.js
// Pulso: en cualquier periodo (Sheinbaum, Trump, cada año, cada mes y rangos que cruzan meses o semanas) y con cualquier filtro
// (estado, nacionalidad, región), la cifra de cada tarjeta es igual a la suma de su desglose en la ayuda:
// rescatados = 1.ª vez + reincidentes · trámites = con tarjeta + sin tarjeta · ingresos = extranjeros + mexicanos · encuentros = otros países + mexicanos.
// Sin filtro, la tarjeta también es igual a lo que responde Pregunta a INAMI (el mismo motor que usan Informes y la vista tablet).
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR, DD = window.IANAMI_DATOS;
const n = s => +String(s).replace(/,/g, ''), T = (k, a, b) => Math.round(M.total({ ind:M.INDK[k], d0:a, d1:b, filtros:{} }));
const finB = k => M.finBase(M.BASES[M.INDK[k].b]), FIN = DD.corte;
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0, bien = 0;
  const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } else bien++; };
  const p = await (await b.newContext({ viewport:{ width:1600, height:950 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  const ve = DD.ests.indexOf('Veracruz'), ch = DD.ests.indexOf('Chiapas'), hn = DD.nats.findIndex(x => x[0]==='Honduras'), vz = DD.nats.findIndex(x => x[0]==='Venezuela');
  const PER = [['', 'Sheinbaum', ['2024-10-01', FIN]], ['per=trump', 'Trump', ['2025-01-20', FIN]], ['per=anio&a=2024', 'año 2024', ['2024-10-01', '2024-12-31']], ['per=anio&a=2025', 'año 2025', ['2025-01-01', '2025-12-31']], ['per=anio&a=2026', 'año 2026', ['2026-01-01', FIN]]]
    .concat([1,2,3,4,5,6,7,8,9,10].map(m => ['per=anio&a=2026&m='+m, 'mes '+m+' 2026', null]))
    .concat([['per=pers&de=2026-09-20&a=2026-09-30', '20–30 sep 2026', ['2026-09-20', '2026-09-30']], ['per=pers&de=2025-01-15&a=2025-02-10', '15 ene–10 feb 2025', ['2025-01-15', '2025-02-10']],
             ['per=pers&de=2024-12-25&a=2025-01-25', '25 dic 2024–25 ene 2025', ['2024-12-25', '2025-01-25']], ['per=pers&de=2026-10-19&a=2026-10-25', 'semana 19–25 oct 2026', ['2026-10-19', '2026-10-25']]]);
  const FIL = [['', 'sin filtro'], ['l=e'+ve, 'Veracruz'], ['l=e'+ch, 'Chiapas'], ['l=n'+hn, 'Honduras'], ['l=n'+vz, 'Venezuela'], ['r=CA', 'Centroamérica']];
  const tip = async k => { const e = await p.$('.kc[data-k="'+k+'"]:not([disabled])'); if (!e) return null; await e.hover(); await p.waitForTimeout(350); return p.$eval('#kpi-tip', x => x.innerText.replace(/\s+/g, ' ')); };
  const card = async k => n((await p.$eval('.kc[data-k="'+k+'"]', e => e.innerText)).match(/\d{1,3}(,\d{3})+|\d+/)[0]);
  for (const [qp, pn, rg] of PER) for (const [qf, fn] of FIL){
    const q = '?ver=pulso'+(qp ? '&'+qp : '&per=shein')+(qf ? '&'+qf : ''), et = pn+' · '+fn;
    await p.goto('file://'+dir+'/index.html'+q); await p.waitForTimeout(1500);
    let t = await tip('resc'), m, c;
    if (t){ m = t.match(/Eventos: ([\d,]+) · personas \(1ra vez\): ([\d,]+) · reincidentes: ([\d,]+)/); c = await card('resc'); ok(m && n(m[1])===c && n(m[2])+n(m[3])===c, et+' · rescatados '+c+' vs '+(m ? m.slice(1).join(' / ') : 'sin desglose')); }
    t = await tip('tram'); if (t){ m = t.match(/Expiden tarjetas: ([\d,]+) · no expiden: ([\d,]+)/); c = await card('tram'); ok(!m || n(m[1])+n(m[2])===c, et+' · trámites '+c+' vs '+(m ? m.slice(1).join(' + ') : '')); }
    if (!/l=n|r=/.test(qf)){ t = await tip('ing'); m = t && t.match(/Ingresaron al país ([\d,]+) personas: extranjeros ([\d,]+) .* mexicanos ([\d,]+)/); c = await card('ing').catch(() => null);
      ok(m && n(m[1])===n(m[2])+n(m[3]), et+' · ingresos = extranjeros + mexicanos'); }
    if (!qf){ t = await tip('cbp'); if (t){ m = t.match(/Encuentros ([\d,]+): otros países ([\d,]+) .* mexicanos ([\d,]+)/); c = await card('cbp'); ok(m && n(m[1])===c && n(m[2])+n(m[3])===c, et+' · encuentros '+c); } }
    // sin filtro: la tarjeta = Pregunta a INAMI con el mismo periodo
    if (!qf && rg){ for (const k of ['resc','ing','tram','pres']){ const fb = rg[1]<finB(k) ? rg[1] : finB(k);
      // ingresos se ve abreviado en la tarjeta («100.39 M»): se usa la cifra completa de su ayuda
      const v = k==='ing' ? n(((await tip('ing')).match(/Ingresaron al país ([\d,]+)/) || [0, 0])[1]) : await card(k);
      ok(v===T(k, rg[0], fb), et+' · '+k+' tarjeta '+v+' = Pregunta a INAMI '+T(k, rg[0], fb)); } }
  }
  console.log('bien', bien); console.log('con problemas', mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
