// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node pantalla_completa_28_pantallas.js
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const dir=path.resolve(__dirname,'..');

const FONTS='';
const VP = [[3840,2160],[2560,1440,1],[1536,864,1],[1280,720,1],[1097,617,1],[853,533,1],[1280,712,1],[800,1232,1],[962,601,1],[2560,1440],[1920,1200],[1920,1080],[1600,900],[1440,900],[1366,768],[1280,800],[1280,720],[1366,1024,1],[1180,820,1],[1024,768,1],[1024,600,1],[800,480,1],[844,390,1],[1080,1920,1],[820,1180,1],[768,1024,1],[390,844,1]];
const MODOS = (process.argv[2]||'base,pais,cmp').split(',');
const SHOT = process.argv[3]||'';
(async()=>{ const b=await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); let malos=0; const errs=[];
  for (const [w,h,touch] of VP){
    const ctx=await b.newContext({viewport:{width:w,height:h}, hasTouch:!!touch, isMobile:!!touch && w<900}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(w+'x'+h+' '+e.message));
    await p.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('file://')) return r.continue(); return r.abort(); });
    await p.goto('file://'+dir+'/index.html'); await p.evaluate(()=>Promise.all(['900 20px "Big Shoulders Display"','800 20px "Big Shoulders Display"','600 13px "Barlow Condensed"','700 13px "Barlow Condensed"','500 13px Barlow','600 13px Barlow'].map(f=>document.fonts.load(f)))); await p.waitForTimeout(1200);
    await p.evaluate(pf=>IANAMI_PULSO.sala(pf), process.env.PERFIL||'pulso'); await p.waitForTimeout(2600);
    for (const m of MODOS){
      if (m==='pais'){ await p.fill('#sl-q','venez'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await p.evaluate(()=>document.activeElement.blur()); }
      if (m==='cmp'){ await p.evaluate(()=>document.querySelector('[data-sp="cmp"]').click()); await p.waitForTimeout(200); await p.evaluate(()=>document.getElementById('sl-cmpok').click()); await p.waitForTimeout(1300); }
      const r = await p.evaluate(() => {
        const W = innerWidth, H = innerHeight, sl = document.getElementById('sala'), col = getComputedStyle(sl).overflowY==='auto';
        const vis = el => el && getComputedStyle(el).display!=='none' && el.offsetParent!==null && el.getBoundingClientRect().width>0;
        const sel = ['.sl-h','.sl-ctx','.sl-a','.sl-fr','.sl-q','.sl-t'], L = sel.map(q => [q, sl.querySelector(q)]).filter(x => vis(x[1]));
        const her = document.getElementById('m-her'); if (vis(her)) L.push(['m-her', her]);
        const prob = [];
        // dentro de la pantalla (en columna, el ancho; el alto se desplaza)
        L.forEach(([q,el]) => { const r = el.getBoundingClientRect(); if (r.left< -1 || r.right>W+1 || (!col && (r.top< -1 || r.bottom>H+1))) prob.push('fuera '+q+' '+[r.left,r.top,r.right,r.bottom].map(Math.round)); });
        // sin encimarse (en columna no aplica: van una tras otra)
        if (!col) for (let i=0;i<L.length;i++) for (let j=i+1;j<L.length;j++){ const a=L[i][1].getBoundingClientRect(), c=L[j][1].getBoundingClientRect();
          const ov = Math.min(a.right,c.right)-Math.max(a.left,c.left), ovy = Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
          if (ov>2 && ovy>2) prob.push('encima '+L[i][0]+' / '+L[j][0]+' ('+Math.round(ov)+'x'+Math.round(ovy)+')'); }
        // cifras grandes que no caben en su columna
        sl.querySelectorAll('.sl-big,.sl-m .v').forEach(el => { const r = el.getBoundingClientRect(), pr = el.closest('.sl-a').getBoundingClientRect(); if (r.width>0 && el.scrollWidth > el.parentNode.getBoundingClientRect().width+2) prob.push('cifra ancha '+el.textContent); });
        // la cifra de la izquierda no debe chocar con la frase de la derecha
        // controles de la barra superior: que nada se corte
        sl.querySelectorAll('.sl-h > *').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.right>W+1 || r.left< -1) prob.push('barra corta '+el.className); });
        sl.querySelectorAll('.sl-seg button, .sl-pl, .sl-x').forEach(el => { if (vis(el) && el.scrollWidth>el.clientWidth+1) prob.push('texto cortado '+el.textContent); });
        const tg = document.getElementById('sl-tg').getBoundingClientRect(); if (tg.height<40) prob.push('tiempo bajo '+Math.round(tg.height));
        const pl = document.getElementById('sl-pl').getBoundingClientRect(); if (!(pl.top>=0 && pl.bottom<=H && pl.left>=0 && pl.right<=W && pl.width>20)) prob.push('play no visible '+[pl.left,pl.top,pl.bottom].map(Math.round));
        return { col, prob, sh: Math.round(sl.scrollHeight), u: getComputedStyle(document.getElementById('mapa')).getPropertyValue('--u') };
      });
      const ok = !r.prob.length; if (!ok) malos++;
      console.log((ok?'✓':'✗'), (w+'x'+h).padEnd(10), m.padEnd(5), r.col ? 'columna' : 'pantalla', ok ? '' : JSON.stringify(r.prob));
      if (SHOT && (SHOT==='todo' || SHOT.split(',').includes(w+'x'+h))) await p.screenshot({path:__dirname+'/capturas/v-'+w+'x'+h+'-'+m+'.png'});
    }
    await ctx.close(); }
  console.log('con problemas', malos, 'errores', JSON.stringify(errs)); await b.close(); })();
