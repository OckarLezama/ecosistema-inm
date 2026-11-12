// Prueba automática de IA-NAMI (Playwright). Ejecutar desde la carpeta pruebas: node por_anio.js
// «Pregunta a INAMI» · totales por año: cuando el periodo abarca más de un año aparecen los totales de cada año
// (barras en horizontal, datos en vertical, renglón en Bullets); suman el total; con un solo año o en comparaciones no aparecen;
// los años incompletos dicen qué meses cubren; en NNA las cifras de 1 a 4 salen como «menos de 5».
const { chromium } = require('playwright'); const path = require('path'); const dir = path.resolve(__dirname, '..');
let mal = 0; const errs = [], ok = (c, t) => { if (!c){ mal++; console.log('  MAL: '+t); } else console.log('  bien: '+t); };
const num = s => { s = String(s).replace(/\*/g, '').trim(); const m = s.match(/^(\d+)(?: MILL(?:ÓN|ONES) (\d+))?(?: MIL (\d+))?$/); if (!m) return +s.replace(/,/g, '');
  return m[2]!=null ? +m[1]*1e6 + +m[2]*1e3 + +(m[3] || 0) : m[3]!=null ? +m[1]*1e3 + +m[3] : +m[1]; };
(async () => { const b = await chromium.launch({ executablePath:process.env.CHROMIUM || undefined });
  const p = await (await b.newContext({ viewport:{ width:1440, height:1000 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://'+dir+'/index.html'); await p.waitForTimeout(1500); await p.click('#b-consulta'); await p.waitForSelector('#cq-q', { timeout:120000 });
  const preguntar = async t => { await p.fill('#cq-q', t); await p.getByRole('button', { name:'Consultar' }).click(); await p.waitForTimeout(1500); };
  const vista = () => p.evaluate(() => { const h = document.querySelector('.cq-hoja'); if (!h) return null;
    return { barrasTotal:h.querySelectorAll('.cq-kc.con-a .kc-a .pa-c').length, tarjetaDatos:h.querySelectorAll('.cq-kc.ka .ta-r, .cq-kc.ka .tc span').length,
      perfilBarras:h.querySelectorAll('.t-perfil .pc .pa').length, perfilDatos:h.querySelectorAll('.t-perfil .pc .tc').length, franja:h.querySelectorAll('.cqc-an .cqc-ay').length,
      meses:[...h.querySelectorAll('.pa-s, .ta-y em, .tc i, .cqc-ay .y em')].map(x => x.textContent).join(' | '), desborda:h.scrollHeight>h.clientHeight+2 }; });
  const bul = t => p.evaluate(t => { const X = window.IANAMI_CONSULTA._prueba, R = X.calcular(X.entender(t)); return { txt:X.textoBullets(R), total:R.total }; }, t);

  console.log('Horizontal');
  await preguntar('rescates en chiapas'); let v = await vista();
  ok(v && v.barrasTotal===3, 'una consulta de varios años lleva 3 barras (2024, 2025, 2026) en la tarjeta del total');
  ok(v && /oct–dic/.test(v.meses) && /ene–\d+ nov/.test(v.meses), 'los años incompletos dicen qué meses cubren ('+(v && v.meses.split(' | ').slice(0,3).join(', '))+')');
  let x = await bul('rescates en chiapas'), linea = (x.txt.split('\n').find(l => /Por año:/.test(l)) || ''), vals = [...linea.matchAll(/\*([^*]+)\*/g)].map(m => num(m[1]));
  ok(vals.length===3 && Math.abs(vals.reduce((s, y) => s+y, 0)-x.total)<1, 'Bullets trae «Por año» y sus 3 totales suman el total ('+vals.join(' + ')+' = '+x.total+')');
  await preguntar('china'); v = await vista();
  ok(v && v.perfilBarras>=8, 'el perfil de China lleva barras por año en cada tarjeta ('+(v && v.perfilBarras)+')');
  await preguntar('caravanas'); v = await vista();
  ok(v && v.franja===3, 'caravanas lleva la franja por año arriba de la lista');
  x = await bul('caravanas'); ok(/Por año: 2024 \(oct–dic\) \*\d+\* caravanas/.test(x.txt), 'Bullets de caravanas trae caravanas y personas por año');

  console.log('Sin totales por año');
  await preguntar('rescates en 2025'); v = await vista();
  ok(v && !v.barrasTotal && !v.tarjetaDatos, 'con un solo año no aparecen');
  ok(!/Por año:/.test((await bul('rescates en 2025')).txt), 'ni en Bullets');
  await preguntar('canalizados al dif de chiapas contra tabasco'); v = await vista();
  ok(v && !v.barrasTotal && !v.tarjetaDatos, 'en una comparación no aparecen');

  console.log('Periodo «a la fecha»');
  const per = await p.evaluate(() => { const X = window.IANAMI_CONSULTA._prueba; return ['china de octubre 2024 a la fecha', 'rescates desde enero 2025', 'caravanas a partir de enero 2026', 'ingresos de octubre 2025'].map(t => { const q = X.entender(t); return [t, q.d0, q.d1]; }); });
  ok(per[0][1]==='2024-10-01' && per[0][2]>'2026-01-01', '«de octubre 2024 a la fecha» va de oct 2024 al último dato ('+per[0][2]+')');
  ok(per[1][1]==='2025-01-01' && per[1][2]>'2026-01-01', '«desde enero 2025» va hasta el último dato');
  ok(per[2][1]==='2026-01-01', '«a partir de enero 2026» empieza en enero 2026');
  ok(per[3][1]==='2025-10-01' && per[3][2]==='2025-10-31', '«de octubre 2025» sigue siendo solo ese mes');

  console.log('NNA');
  const prot = await p.evaluate(() => { const X = window.IANAMI_CONSULTA._prueba, B = X.BASES.nna, l = [];
    (B.dims.n.vals || []).forEach(nom => { const R = X.calcular(X.entender('nna canalizados de '+nom)); const t = X.textoBullets(R), li = t.split('\n').find(s => /Por año:/.test(s)); if (li) l.push(li); });
    return l; });
  const peque = prot.filter(li => /\*[1-4]\*/.test(li)), conMenos = prot.filter(li => /menos de 5|MENOS DE 5/i.test(li));
  ok(prot.length>0 && !peque.length, 'en NNA ningún año sale con 1 a 4 ('+prot.length+' nacionalidades revisadas'+(peque.length ? '; mal: '+peque[0] : '')+')');
  ok(conMenos.length>0, 'y los que caen en ese rango dicen «menos de 5» ('+conMenos.length+')');

  console.log('Vertical (celular)');
  await preguntar('rescates en chiapas'); await p.click('[data-cqfmt="v"]'); await p.waitForTimeout(1500); v = await vista();
  ok(v && v.tarjetaDatos===3 && !v.barrasTotal, 'en vertical van como datos en la tarjeta «Por año», sin barras');
  ok(v && !v.desborda, 'y la hoja no se desborda');
  await preguntar('china'); v = await vista();
  ok(v && v.perfilDatos>=8 && !v.perfilBarras, 'el perfil en vertical lleva los datos por año, sin barras');
  ok(v && !v.desborda, 'y no se desborda');
  await preguntar('caravanas'); v = await vista();
  ok(v && v.tarjetaDatos===3 && !v.franja, 'caravanas en vertical: tarjeta «Por año» en las cifras');
  ok(v && !v.desborda, 'y no se desborda');
  await p.screenshot({ path:path.join(__dirname, 'capturas', 'por_anio.png') });
  console.log('con problemas '+mal); console.log('errores', JSON.stringify(errs)); await b.close(); })();
