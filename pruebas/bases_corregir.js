// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node bases_corregir.js
// Bases › «Por corregir con el área»: cada aviso que el robot marca para corregir aparece una vez arriba (nuevo o pendiente)
// y en la celda de su base; lo nuevo es lo que el robot vio por primera vez en la última carga; la marca interna nunca se ve.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; require(dir+'/datos/observaciones.js'); require(dir+'/datos/datos.js');
const O = window.IANAMI_OBS, D = window.IANAMI_DATOS, MARCA = '[corregir] ';
let mal = 0; const errs = [], ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } else console.log('  bien: '+t); };
// Lo que esperamos, armado igual que la página: avisos de datos.js + de cada robot, sin repetir dentro de una base
const porBase = {}; (D.bases || []).forEach(b => { porBase[b.n] = (b.obs || []).slice(); });
Object.keys(O).filter(r => r[0]!=='_').forEach(r => Object.keys(O[r]).forEach(n => { if (!porBase[n] && !(O._periodos || {})[n]) return; const l = porBase[n] = porBase[n] || []; O[r][n].forEach(x => { if (l.indexOf(x)<0) l.push(x); }); }));
const V = O._vistos || {}, primera = (n, x) => { let f = null; Object.keys(V).forEach(r => { const d = V[r], v = d && typeof d==='object' ? d[n+'|'+x] : null; if (v && (!f || v<f)) f = v; }); return f; };
const esp = []; Object.keys(porBase).forEach(n => porBase[n].filter(x => x.indexOf(MARCA)===0).forEach(x => esp.push({ n, x, nuevo:primera(n, x)===V._ultima })));
ok(V._ultima && esp.every(e => primera(e.n, e.x)), 'el robot anotó desde qué carga avisa cada cosa por corregir ('+esp.length+' avisos, última carga '+V._ultima+')');
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined });
  const p = await (await b.newContext({ viewport:{ width:1440, height:900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1800);
  await p.getByRole('button', { name:'Bases', exact:true }).first().click(); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const c = document.querySelector('.bs-cor'); if (!c) return null;
    const nuevos = [...c.querySelectorAll(':scope > .bs-cor-l > li')].map(li => li.children[1].innerText.trim());
    const pend = [...c.querySelectorAll('.bs-cor-v .bs-cor-l > li')].reduce((s, li) => s+li.children[1].innerHTML.split('<br>').length, 0);
    const abierto = !!c.querySelector('.bs-cor-v[open]');
    document.querySelectorAll('#vista-otra details').forEach(d => d.open = true);
    const celdas = [...document.querySelectorAll('.bs-oc li')].length, nvCeldas = document.querySelectorAll('.bs-oc .bs-nv').length;
    return { nuevos, pend, abierto, celdas, nvCeldas, marca:document.getElementById('vista-otra').innerText.indexOf('[corregir]')>=0, primero:document.querySelector('#vista-otra h1 + .bs-cor')!=null }; });
  ok(r, 'el cuadro «Por corregir con el área» está arriba de Bases');
  if (r){
    const N = esp.filter(e => e.nuevo), P = esp.filter(e => !e.nuevo);
    ok(r.primero, 'va justo debajo del título, antes que todo lo demás');
    ok(r.nuevos.length===N.length, 'lo nuevo de esta carga se ve sin abrir nada: '+r.nuevos.length+' de '+N.length+' esperados');
    ok(r.pend===P.length && !r.abierto, 'lo pendiente de cargas anteriores queda cerrado y completo: '+r.pend+' de '+P.length);
    ok(r.celdas===esp.length && r.nvCeldas===N.length, 'cada base lo repite en «Corregir con el área» ('+r.celdas+') y marca «Nuevo» en '+r.nvCeldas);
    ok(!r.marca, 'la marca interna «[corregir]» no se ve en la página');
  }
  await p.screenshot({ path:path.join(__dirname,'capturas','bases_corregir.png'), fullPage:false });
  console.log('con problemas '+mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
