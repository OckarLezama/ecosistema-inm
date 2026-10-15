// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node proteccion_plazos.js
// Protección al migrante: las tres pestañas se pintan sin errores, con mapas, y las cifras cuadran con los datos;
// Guatemala-Honduras se cruza con Ciudad Hidalgo de Repatriados. Regulación: el análisis de plazos (dentro de Trámites)
// abre, dentro + fuera = total y las listas van de mayor a menor; el motivo de estancia se cruza con nacionalidad y mes. Se prueba en escritorio y en celular.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; require(dir+'/datos/proteccion.js'); const PM = window.IANAMI_PMV;
const suma = (o, k) => o.t[k].reduce((a,b) => a+b, 0), miles = n => Math.round(n).toLocaleString('en-US');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  for (const [w,h] of [[1440,900],[400,860]]){
    const p = await (await b.newContext({ viewport:{ width:w, height:h } })).newPage(); p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => IANAMI_NAV.ir('proteccion', {})); await p.waitForSelector('#pm-mp', { timeout:60000 }); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!echarts.getInstanceByDom(document.getElementById('pm-mp'))), w+' mapa de puntos');
    ok(await p.evaluate(() => document.querySelectorAll('#pm-ds .pm-hm .c').length===70), w+' calendario 10 × 7');
    ok(await p.evaluate(() => /Ver los \d+ puntos/.test(document.getElementById('pm-pf-m').textContent)), w+' perfil con «ver todos»');
    for (const k of ['gh','com']){ if (!PM.otros[k]) continue; await p.evaluate(k => document.querySelector('[data-pvista="'+k+'"]').click(), k); await p.waitForTimeout(1500);
      const txt = await p.evaluate(() => document.getElementById('cv-body').innerText);
      ok(txt.indexOf(miles(suma(PM.otros[k], "v")))>=0, w+' '+k+' total '+miles(suma(PM.otros[k], 'v')));
      ok(await p.evaluate(k => !!echarts.getInstanceByDom(document.getElementById(k==='gh' ? 'pm-gh-mapa' : 'pm-cm-mapa')), k), w+' '+k+' mapa');
      const v = await p.evaluate(() => [...document.querySelectorAll('#cv-body .barra .x')].map(e => +e.textContent.replace(/,/g,'')));
      ok(k!=='com' || v.slice(0, PM.otros.com.dic.p.length).every((x,i,a) => !i || x<=a[i-1]), w+' '+k+' aeropuertos de mayor a menor');
      if (k==='gh') ok(/aparecen el mismo día/.test(txt), w+' gh cruce con Ciudad Hidalgo'); }
    await p.evaluate(() => document.querySelector('[data-pvista="rep"]').click()); await p.waitForTimeout(1000);
    await p.evaluate(() => IANAMI_NAV.ir('regulacion', {})); await p.waitForSelector('#rg-pzb [data-rpza]', { timeout:60000 });
    ok(await p.evaluate(() => !document.querySelector('[data-rvista="pz"]')), w+' sin pestaña Plazos');
    await p.evaluate(() => document.querySelector('[data-rpza]').click()); await p.waitForTimeout(1500);
    const pz = await p.evaluate(() => { const n = s => +s.replace(/[^\d]/g,''); const l = document.querySelector('.pzb-l').innerText, m = l.match(/Dentro ([\d,]+)[\s\S]*Fuera ([\d,]+)/), T = n(document.querySelector('.pzb-big span b').textContent);
      const pc = [...document.querySelectorAll('.pzt-r b.num')].map(e => parseFloat(e.textContent)), of = [...document.querySelectorAll('.pzh b.num')].map(e => parseFloat(e.textContent));
      return { d:n(m[1]), f:n(m[2]), T:T, pc:pc, of:of, celdas:document.querySelectorAll('.pzh .c').length }; });
    ok(pz.d+pz.f===pz.T, w+' plazos: dentro + fuera = total ('+pz.d+' + '+pz.f+' vs '+pz.T+')');
    ok(pz.pc.length>0 && pz.pc.every((x,i,a) => !i || x<=a[i-1]), w+' tipos de trámite de mayor a menor atraso');
    ok(pz.of.length>0 && pz.of.every((x,i,a) => !i || x<=a[i-1]), w+' oficinas de mayor a menor atraso');
    ok(pz.celdas>=pz.of.length, w+' mapa de calor oficina × mes');
    await p.screenshot({ path:path.join(__dirname,'capturas','plazos_'+w+'.png') });
    for (const v of ['nat','mes','res']){ await p.evaluate(v => document.querySelector('[data-rmotv="'+v+'"]').click(), v); await p.waitForTimeout(900);
      ok(await p.evaluate(v => v==='res' ? document.querySelectorAll('#rg-mot .barra').length>3 : !!echarts.getInstanceByDom(document.getElementById('rg-mot-g')), v), w+' motivo de estancia: '+v); }
  }
  console.log(mal ? 'con problemas '+mal : 'todo bien'); console.log('errores', JSON.stringify(errs)); await b.close(); })();
