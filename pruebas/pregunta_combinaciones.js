// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node pregunta_combinaciones.js
// Pregunta a INAMI: cada indicador con cada nacionalidad, estado, punto, oficina y sector (con y sin acentos, antes y después)
// debe entenderse completo, sin «No reconocí», y con el filtro correcto. También escribe con el autocompletado en el navegador.
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
global.window = {}; global.document = { getElementById(){ return null; } };
for (const f of ['datos.js','control.js','proteccion.js','regulacion.js','vocabulario.js','plazos.js']) { try { require(dir+'/datos/'+f); } catch(e){} }
require(dir+'/js/consulta.js'); const P = window.IANAMI_CONSULTA._prueba;
const sa = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const CORTO = { resc:'rescatados', ing:'ingreso', seg:'segunda revision', rech:'rechazos', pres:'presentados', ret:'retornados', nna:'nna', adu:'adultos acompañantes', rec:'recibidos', rep:'repatriados', tram:'tramites', cbp:'encuentros', dv:'documentos vigentes', va:'validaciones de actas', carp:'personas en caravanas', carn:'caravanas', ingmx:'mexicanos que ingresaron', ingall:'todos los ingresos' };
const errs = []; let n = 0;
for (const ind of P.IND){ const B = P.BASES[ind.b];
  for (const dim of ['n','e','p','of','sec','sal']){ const D = B.dims[dim]; if (!D) continue;
    D.vals.forEach((v,i) => { if (!v || /^(Otras|Sin dato|México)$/.test(v)) return;
      for (const t of [ind.nom+' '+v, (CORTO[ind.k]||ind.nom)+' '+sa(v), sa(v)+' '+(CORTO[ind.k]||ind.nom)]){ n++;
        const q = P.entender(t), av = (q.avisos||[]).filter(a => /No reconoc/.test(a));
        if (av.length || q.ind!==ind.k || !(Object.keys(q.filtros).length || q.partes.length || (ind.k==='rec' && /ee\.? ?uu/i.test(v)))) errs.push(t+' → '+q.ind+' '+JSON.stringify(q.filtros)+' '+av.join(' ')); } }); } }
console.log('combinaciones', n, 'con problemas', errs.length); errs.slice(0, 20).forEach(e => console.log('  ✗', e));
(async()=>{ const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined}); const p = await (await b.newContext({viewport:{width:1366,height:900}})).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', {timeout:120000});
  for (const [escribe, espera] of [['ingreso quintana ro','quintana roo'], ['repatriados tul','tulum'], ['rescatados países ba','países bajos'], ['ingreso','ingresos'], ['rechazos nuevo le','nuevo leon']]){
    await p.fill('#cq-q', ''); await p.type('#cq-q', escribe, {delay:15}); await p.waitForTimeout(250);
    if (await p.isVisible('#cq-sug')) await p.keyboard.press('Enter'); const val = await p.inputValue('#cq-q');
    await p.keyboard.press('Enter'); await p.waitForTimeout(400); const av = await p.evaluate(() => document.getElementById('cq-av').textContent);
    console.log('«'+escribe+'» → «'+val.trim()+'»', /No reconoc/.test(av) ? '✗ '+av.slice(0,90) : '✓');
    if (/No reconoc/.test(av) || (espera && sa(val).indexOf(espera.normalize('NFD').replace(/[̀-ͯ]/g,''))<0)) errs.push('autocompletar '+escribe); }
  console.log('errores', JSON.stringify(errs.slice(0,5))); await b.close(); })();
