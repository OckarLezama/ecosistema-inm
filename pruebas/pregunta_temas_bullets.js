// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pregunta_temas_bullets.js
// Pregunta a INAMI: temas nuevos (encuentros CBP, caravanas, Registro Civil, documentos vigentes, mexicanos que ingresaron, todos los ingresos),
// «trámites concluidos» completo, vista Bullets (texto para WhatsApp) y Compartir en celular (menú del teléfono) y en computadora (WhatsApp Web + descarga).
const { chromium } = require('playwright'); const path=require('path'); const dir=path.resolve(__dirname,'..');
const Q = [['encuentros CBP','cbp'],['encuentros de mexicanos por sector','cbp'],['caravanas 2025','carn'],['personas en caravanas','carp'],['validaciones del registro civil','va'],['actas de matrimonio pendientes','va'],
  ['documento vigente Venezuela','dv'],['documentos vigentes por estado','dv'],['mexicanos que ingresaron','ingmx'],['todos los ingresos por vía','ing'],['ingresos de extranjeros','ingext'],['extranjeros que ingresaron en 2026','ingext'],['perú trámites concluidos','tram'],['rescatados de Venezuela en diciembre','resc']];
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[];
  for (const [vw,vh,movil] of [[1366,900,false],[400,860,true]]){
    const ctx = await b.newContext({viewport:{width:vw,height:vh}, isMobile:movil, hasTouch:movil, acceptDownloads:true});
    await ctx.addInitScript(m => { window.__abre = []; window.open = (u) => { window.__abre.push(String(u)); return null; }; window.__comp = [];
      if (m){ navigator.canShare = () => true; navigator.share = d => { window.__comp.push({ files:(d.files||[]).length, text:d.text||'' }); return Promise.resolve(); }; }
      else { try { delete Navigator.prototype.canShare; delete Navigator.prototype.share; } catch(e){} navigator.canShare = undefined; } }, movil);
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(vw+' '+e.message+' '+(e.stack||'').split('\n')[1]));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000});
    for (const [t, k] of Q){
      await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, t); await p.waitForTimeout(250);
      const o = await p.evaluate(() => ({ av:document.getElementById('cq-av').textContent, hoja:!!document.querySelector('.cq-hoja,.cq-bul'), frase:document.getElementById('cq-frase').textContent.replace(/\s+/g,' ').slice(0,90) }));
      const ind = await p.evaluate(t => { const P = window.IANAMI_CONSULTA._prueba, q = P.entender(t); return q.ind; }, t);
      if (/No reconocí/.test(o.av) || !o.hoja || ind!==k) errs.push(vw+' «'+t+'» → '+ind+' '+o.av.slice(0,80));
      if (vw===1366) console.log('«'+t+'» →', ind, '|', o.av.slice(0,110)); }
    // lo que escribe el autocompletado (nombre de cada indicador y de cada parte) se entiende completo
    const auto = await p.evaluate(() => { const P = window.IANAMI_CONSULTA._prueba, l = P.IND.map(x => x.nom).concat(P.IND.flatMap(x => (x.partes || []).map(q => x.nom+' '+q.nom.toLowerCase())));
      return l.filter(t => (P.entender(t).avisos || []).some(a => /No reconocí/.test(a))); });
    if (auto.length) errs.push(vw+' autocompletado: '+auto.join(' | '));
    // Bullets
    await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, 'rescatados de Venezuela en diciembre'); await p.waitForTimeout(300);
    await p.click('[data-cqmodo="b"]'); await p.waitForTimeout(300);
    const bu = await p.evaluate(() => ({ li:document.querySelectorAll('.cq-bul li').length, lead:(document.querySelector('.cq-bul li.lead')||{}).textContent, fmtOculto:getComputedStyle(document.querySelector('.cq-fmtg')).display==='none', wa:document.querySelector('[data-cqacc="wa"]').textContent,
      fuera:[...document.querySelectorAll('.cq-bul *')].filter(e => e.getBoundingClientRect().right > document.querySelector('.cq-bul').getBoundingClientRect().right+1).length }));
    await p.screenshot({path:__dirname+'/capturas/bullets-'+vw+'.png', fullPage:false});
    await p.click('[data-cqacc="wa"]'); await p.waitForTimeout(200);
    const abre = await p.evaluate(() => window.__abre.slice(-1)[0] || '');
    console.log(vw, 'bullets', JSON.stringify(bu), '| WhatsApp:', decodeURIComponent(abre).slice(0,90).replace(/\n/g,' ⏎ '));
    if (bu.li<4 || !bu.fmtOculto || bu.fuera || !/^https:\/\/wa\.me\/\?text=\*/.test(abre)) errs.push('bullets '+vw);
    // misma consulta en bullets al cambiar de pregunta (se queda en bullets) y vuelta a ficha
    await p.evaluate(t => { document.getElementById('cq-q').value = t; document.getElementById('cq-f').requestSubmit(); }, 'Venezuela'); await p.waitForTimeout(300);
    const sigue = await p.evaluate(() => !!document.querySelector('.cq-bul'));
    await p.screenshot({path:__dirname+'/capturas/bullets-perfil-'+vw+'.png', fullPage:false});
    await p.click('[data-cqmodo="f"]'); if (movil) await p.waitForFunction(() => !document.querySelector('[data-cqacc="wa"]').classList.contains('prep'), null, {timeout:15000}).catch(() => {}); else await p.waitForTimeout(300); await p.evaluate(() => { window.__abre = []; });
    // Compartir la ficha: con la imagen ya preparada, el toque abre el menú del teléfono (celular) o WhatsApp Web + descarga (computadora)
    const dl = movil ? null : p.waitForEvent('download', {timeout:25000}).catch(() => null);
    await p.click('[data-cqacc="wa"]'); await p.waitForTimeout(400);
    const sh = await p.evaluate(() => ({ comp:window.__comp, abre:window.__abre.slice(-1)[0] || '', msg:document.getElementById('cq-msg').textContent }));
    const d = dl ? await dl : null;
    console.log(vw, 'sigue en bullets', sigue, '| compartir ficha', JSON.stringify({c:sh.comp, a:sh.abre.slice(0,40), m:sh.msg}), d ? '| descarga '+d.suggestedFilename() : '');
    if (!sigue) errs.push('modo '+vw);
    if (movil ? !(sh.comp.length && sh.comp[0].files===1) : !(/wa\.me/.test(sh.abre) && d)) errs.push('compartir '+vw);
    await ctx.close(); }
  console.log('errores', JSON.stringify(errs)); await b.close(); })();
