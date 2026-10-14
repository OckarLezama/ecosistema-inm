// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node mouse_zoom.js
// En pantallas grandes la página usa CSS zoom: el mouse sobre una gráfica debe señalar el dato que está debajo (no otro).
const { chromium } = require('playwright'); const path=require('path'); const dir=process.argv[2] || path.resolve(__dirname,'..');
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const errs=[]; let mal=0, bien=0;
  for (const [w,h] of [[1440,900],[2560,1440],[3840,2160]]){
    const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1200);
    for (let [k, prm, tab] of [['control',{vista:'int'}],['control',{vista:'est'}],['control',{vista:'can'}],['regulacion',{}],['regulacion',{},'dv'],['regulacion',{},'val']]){
      await p.evaluate(([k,prm]) => IANAMI_NAV.ir(k, prm), [k,prm]); await p.waitForTimeout(2200);
      if (tab){ await p.click('[data-rvista="'+tab+'"]'); await p.waitForTimeout(2200); prm = { vista:tab }; }
      await p.evaluate(() => document.querySelectorAll('[data-cdet]:not(.on),[data-rdet]:not(.on)').forEach(b => b.click())); await p.waitForTimeout(1500);   // abre «Detalle» para probar también esas gráficas
      const n = await p.evaluate(() => document.querySelectorAll('#vista-otra [_echarts_instance_]').length);
      for (let ci=0; ci<n; ci++){
        await p.evaluate(ci => { const el = document.querySelectorAll('#vista-otra [_echarts_instance_]')[ci]; el && el.scrollIntoView({block:'center'}); }, ci); await p.waitForTimeout(350);
        const o = await p.evaluate(ci => { const el = document.querySelectorAll('#vista-otra [_echarts_instance_]')[ci], c = el && echarts.getInstanceByDom(el); if (!c || !el.offsetWidth) return null;
          const r = el.getBoundingClientRect(), op = c.getOption(), s = (op.series || [])[0]; if (!s) return null;
          if (s.type==='sankey' || s.type==='heatmap'){ const dat = c.getModel().getSeriesByIndex(0).getData(); let i = Math.floor(dat.count()/2), px;
            if (s.type==='sankey'){ const L = dat.getItemLayout(i); if (!L) return null; const li = c.getModel().getSeriesByIndex(0).layoutInfo || {x:0,y:0}; px = [li.x + L.x + L.dx/2, li.y + L.y + L.dy/2]; }
            else { const v = dat.getValues ? dat.getValues(i) : null; const raw = s.data[i]; const vv = raw && raw.value ? raw.value : raw; px = c.convertToPixel({seriesIndex:0}, [vv[0], vv[1]]); }
            if (!px || isNaN(px[0])) return null; window.__vis = {}; c.off('mouseover'); c.on('mouseover', e => { if (e.seriesIndex===0 && e.dataType!=='edge') window.__vis.m = e.dataIndex; });
            const k = r.width/el.offsetWidth; return { ci, i, tipo:s.type, x:r.left + px[0]*k, y:r.top + px[1]*k, id:(el.closest('.caja') && el.closest('.caja').querySelector('h2') ? el.closest('.caja').querySelector('h2').textContent.slice(0,40) : el.id) }; }
          if (!s.data || s.data.length<2 || !/line|bar|scatter/.test(s.type)) return null; const k = r.width/el.offsetWidth;
          const i = Math.floor(s.data.length/2), d = s.data[i], v = d && typeof d==='object' && !Array.isArray(d) ? d.value : d; let px;
          const hor = op.yAxis && op.yAxis[0] && op.yAxis[0].type==='category';
          try { px = s.type==='scatter' ? c.convertToPixel({seriesIndex:0}, v) : hor ? c.convertToPixel({seriesIndex:0}, [Array.isArray(v) ? v[0] : v, i]) : c.convertToPixel({seriesIndex:0}, [i, Array.isArray(v) ? v[1] : v]); } catch(e){ return null; }
          if (!px || isNaN(px[0]) || isNaN(px[1])) return null; window.__vis = {}; c.off('mouseover'); c.on('mouseover', e => { if (e.seriesIndex===0) window.__vis.m = e.dataIndex; });
          c.off('updateAxisPointer'); c.on('updateAxisPointer', e => { const a = (e.axesInfo || []).find(x => x.axisDim===(hor ? 'y' : 'x')); if (a) window.__vis.a = typeof a.value==='number' ? a.value : -1; });
          if (s.type==='bar' && !hor) px[1] = px[1] + 3;              // dentro de la barra
          if (s.type==='bar' && hor) px[0] = px[0] - 3;
          return { ci, i, tipo:s.type+(hor?'-h':''), x:r.left + px[0]*k, y:r.top + px[1]*k, id:(el.closest('.caja') && el.closest('.caja').querySelector('h2') ? el.closest('.caja').querySelector('h2').textContent.slice(0,40) : el.id) }; }, ci);
        if (!o) continue;
        await p.mouse.move(o.x-25, o.y-25); await p.mouse.move(o.x, o.y, { steps:3 }); await p.waitForTimeout(250);
        const vis = await p.evaluate(() => window.__vis); const vio = vis.m!=null ? vis.m : vis.a; const ok = vio===o.i;
        ok ? bien++ : mal++; if (!ok || process.env.VER) console.log(ok ? '✓' : '✗', w, k, prm.vista||'', o.tipo, o.id, 'esperaba', o.i, 'marcó', vio); }
    }
    await p.close(); }
  console.log('bien', bien, 'MAL', mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
