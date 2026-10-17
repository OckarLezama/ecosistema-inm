// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node vista_tablet.js
// Vista tablet («De un vistazo»): el ícono de la barra la abre; 10 tarjetas; la cifra de la hoja cuadra con las bases;
// Pulso se abre con el mismo indicador; la búsqueda abre la ficha del país o, si no es lugar, Pregunta a INAMI;
// el informe migratorio se abre encima y al cerrarlo se regresa a la vista. Además: los menús de Informes y Procesos se cierran
// cuando el cursor sale de la ventana. En escritorio, monitor grande, tableta y celular.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js']) require(dir+'/datos/'+f);
require(dir+'/js/consulta.js'); const M = window.IANAMI_MOTOR;
const FIN = ['ing','rech','tram','resc','pres','nna','ret','rec','rep','cbp'].map(k => M.finBase(M.BASES[M.INDK[k].b])).sort()[0];
const T = (k, a, b) => M.total({ ind:M.INDK[k], d0:a, d1:b, filtros:{} });
const CAP = process.argv[2];
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined }); const errs = []; let mal = 0; const ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } };
  for (const [w, h, tac] of [[1600, 900, false], [2560, 1440, false], [1180, 820, true], [390, 844, true]]){
    const ctx = await b.newContext({ viewport:{ width:w, height:h }, hasTouch:tac, isMobile:tac && w<500 }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(w+': '+e.message)); p.on('console', m => { if (m.type()==='error') errs.push(w+' consola: '+m.text()); });
    await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1200);
    const vz = s => p.locator('#vistazo').locator(s);   // Playwright entra al Shadow DOM con locator
    await p.click('#b-vz'); await vz('.ch').first().waitFor({ timeout:60000 }); await p.waitForTimeout(2200);
    ok(await vz('.ch').count()===10, w+' diez tarjetas'); ok(await vz('#cargav').isHidden(), w+' sin pantalla de carga');
    if (CAP) await p.screenshot({ path:CAP+'/vz_'+w+'_inicio.png' });
    // hoja de Rescatados: la cifra del periodo Sheinbaum cuadra con la base
    await vz('.ch[data-i="3"]').click(); await p.waitForTimeout(1300);
    const n = +(await vz('.big[data-n]').getAttribute('data-n')); ok(n===T('resc', '2024-10-01', FIN), w+' rescatados Sheinbaum = base ('+n+' / '+T('resc', '2024-10-01', FIN)+')');
    ok(await vz('[data-share]').count()===0 && await vz('[data-ask]').count()===0, w+' sin Compartir ni Preguntar en la hoja');
    for (const j of [1, 2, 3]){ await vz('[data-tab="'+j+'"]').click(); await p.waitForTimeout(700); if (CAP && j===1) await p.screenshot({ path:CAP+'/vz_'+w+'_hoja.png' }); }
    // a Pulso con el indicador
    await vz('.sh [data-pulso]').click(); await p.waitForTimeout(900);
    ok(await p.$eval('#vistazo', e => e.style.display)==='none', w+' Pulso cierra la vista'); ok(await p.$eval('#vista-pulso', e => !e.hidden), w+' Pulso visible');
    // de vuelta: búsqueda de un país → ficha
    await p.click('#b-vz'); await p.waitForTimeout(900); await vz('[data-x]').first().click().catch(() => {}); await p.waitForTimeout(500);
    await vz('[data-bq]').click(); await p.waitForTimeout(300); await vz('#bqin').fill('venez'); await p.waitForTimeout(200); await vz('#bqin').press('Enter'); await p.waitForTimeout(1500);
    const fi = await vz('#sh').innerText(); ok(/Venezuela/.test(fi) && /lugar \d+ de \d+/.test(fi) && /pesa más/.test(fi), w+' ficha de Venezuela con lugar y frase');
    ok(await vz('.fg').count()>=2, w+' ficha agrupada');
    // un indicador se despliega con sus 5 principales (Rescatados de Venezuela: los estados)
    await vz('.fgb[data-fx="3"]').click(); await p.waitForTimeout(700);
    ok(await vz('.fgi.on .fgdi .it').count()>=3 && /estados/i.test(await vz('.fgi.on .fgt2').innerText()), w+' rescatados de Venezuela se despliegan por estado');
    if (CAP) await p.screenshot({ path:CAP+'/vz_'+w+'_ficha.png' });
    // un mes con comparación: chips en la ficha
    await vz('[data-pm]').click(); await p.waitForTimeout(300); await vz('[data-ay="2025"]').click(); await p.waitForTimeout(400); await vz('[data-per="m2025-03"]').click(); await p.waitForTimeout(1500);
    ok(await vz('.fg .dch').count()>0, w+' ficha con cambio contra el periodo de comparación');
    await vz('[data-x]').first().click(); await p.waitForTimeout(400);
    // la búsqueda es solo de lugares: un texto que no es lugar no abre nada
    await vz('[data-bq]').click(); await vz('#bqin').fill('rescatados de honduras en chiapas'); await p.waitForTimeout(200);
    ok(await vz('[data-bqi]').count()===0, w+' la búsqueda no ofrece preguntas'); await vz('#bqin').press('Escape'); await p.waitForTimeout(300);
    // informe migratorio encima; al cerrarlo, regresa a la vista
    await vz('[data-inf]').click(); await p.waitForSelector('.inf', { timeout:60000 }); await p.waitForTimeout(1200);
    if (CAP) await p.screenshot({ path:CAP+'/vz_'+w+'_informe.png' });
    await p.click('[data-infx]'); await p.waitForTimeout(500);
    ok(!(await p.$('.inf')) && await p.$eval('#vistazo', e => e.style.display)==='block', w+' al cerrar el informe se regresa a la vista');
    await vz('[data-salir]').click(); await p.waitForTimeout(300); ok(await p.$eval('#vistazo', e => e.style.display)==='none' && await p.$eval('#vista-pulso', e => !e.hidden), w+' Salir lleva al Pulso');
    if (w===1600){   // menús con cursor: se cierran si el cursor sale de la ventana
      await p.hover('[data-menu-inf]'); await p.waitForTimeout(250); ok(await p.$eval('#menu-inf', e => !e.hidden), 'menú Informes se abre con el cursor');
      await p.hover('#menu-inf'); await p.evaluate(() => document.body.dispatchEvent(new MouseEvent('mouseout', { bubbles:true, relatedTarget:null }))); await p.waitForTimeout(400);
      ok(await p.$eval('#menu-inf', e => e.hidden), 'menú Informes se cierra al salir de la ventana');
      await p.hover('[data-menu-dir]'); await p.waitForTimeout(250); await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(100);
      ok(await p.$eval('#menu-dir', e => e.hidden), 'menú Procesos se cierra al perder el foco');
      await p.hover('[data-menu-dir]'); await p.waitForTimeout(250); await p.hover('[data-menu-inf]'); await p.waitForTimeout(60);
      ok(await p.$eval('#menu-dir', e => e.hidden) && await p.$eval('#menu-inf', e => !e.hidden), 'al pasar de Procesos a Informes, Procesos se cierra al instante');
      await p.mouse.click(700, 600); await p.waitForTimeout(100); ok(await p.$eval('#menu-inf', e => e.hidden), 'un clic sobre el mapa cierra el menú'); }
    await ctx.close(); }
  await b.close(); errs.forEach(e => console.log('  ERROR: '+e)); console.log(mal ? 'vista_tablet: '+mal+' fallas' : 'vista_tablet: todo bien'); console.log('errores '+JSON.stringify(errs)); process.exit(mal || errs.length ? 1 : 0); })();
