/* ==================================================================
   IA-NAMI · CONSULTAR
   Ventana para preguntar a las bases. La consulta se arma con cuatro
   combos (Qué, Desglose, Filtros, Periodo) que solo ofrecen lo que
   existe en cada base, o con texto libre que llena esos combos y avisa
   lo que no entendió. La respuesta es una hoja de una página
   (horizontal o vertical) que se descarga en PDF, se comparte como
   imagen, y que lleva a la sección del tablero que corresponde.
   Usa los datos que ya cargan los procesos: datos/control.js,
   datos/proteccion.js y datos/regulacion.js.
   ÍNDICE  [1] BASES   [2] INDICADORES   [3] CÁLCULO   [4] TEXTO LIBRE
           [5] HOJA (plantillas)   [6] VENTANA Y COMBOS   [7] DESCARGAS
   ================================================================== */
(function(){
'use strict';
const CV = window.IANAMI_CVM, PM = window.IANAMI_PMV, RG = window.IANAMI_REG;
if (!CV && !PM && !RG) return;

/* ==== [1] BASES =================================================== */
// Cada base: tabla columnar, día de inicio, número de días, dimensiones (nombre, columna, valores) y filtro de renglones
const tabla = o => { const t = {}; Object.keys(o).forEach(k => { t[k] = Int32Array.from(o[k]); }); t.N = t.d.length; return t; };
const fecha0 = s => new Date(s+'T00:00:00');
const SEXO = ['Hombres','Mujeres'];
const BASES = {};
function base(k, b){ b.ini = fecha0(b.inicio); BASES[k] = b; }
if (CV){
  const D = CV.dic, MX = D.n.indexOf('México'), E = {nom:'O.R.', col:'e', vals:D.e}, N = {nom:'Nacionalidad', col:'n', vals:D.n};
  const T = { ing:tabla(CV.ing), seg:tabla(CV.seg), pre:tabla(CV.pre), ret:tabla(CV.ret), nna:tabla(CV.nna), adu:tabla(CV.adu), orr:tabla(CV.orr), rec:tabla(CV.rec) };
  T.orr.sd = T.orr.v.map((x,i) => Math.max(0, x-T.orr.pre[i]-T.orr.can[i]));        // rescatados sin destino registrado
  T.rec.v = T.rec.ad.map((x,i) => x+T.rec.me[i]); T.ret.v = T.ret.dep.map((x,i) => x+T.ret.ra[i]);
  const reiOR = new Set(); T.orr.rei.forEach((v,i) => { if (v>0) reiOR.add(T.orr.e[i]); });
  const c = { inicio:CV.inicio, dias:CV.dias, fuente:'DGCVM' };
  base('ing', Object.assign({}, c, { T:T.ing, ex:i => T.ing.n[i]!==MX, dims:{ e:E, n:N, p:{nom:'Punto de internación', col:'p', vals:D.p}, via:{nom:'Vía', col:'vi', vals:['Aérea','Terrestre','Marítima (cruceros)']} } }));
  base('seg', Object.assign({}, c, { T:T.seg, ex:i => T.seg.n[i]!==MX, dims:{ e:E, n:N, p:{nom:'Punto de internación', col:'p', vals:D.p}, res:{nom:'Resultado', col:'r', vals:['Internación','Rechazo']} } }));
  base('pre', Object.assign({}, c, { T:T.pre, dims:{ e:E, n:N, est:{nom:'Estación', col:'s', vals:D.s} } }));
  base('ret', Object.assign({}, c, { T:T.ret, dims:{ e:E, n:N } }));
  base('nna', Object.assign({}, c, { fuente:'SIRENNA', T:T.nna, dims:{ e:E, n:N, sexo:{nom:'Sexo', col:'s', vals:SEXO}, edad:{nom:'Edad', col:'g', vals:CV.edades.slice(0,3)}, cond:{nom:'Condición', col:'c', vals:CV.clases}, mot:{nom:'Motivo de salida', col:'m', vals:CV.motivos} } }));
  base('adu', Object.assign({}, c, { fuente:'SIRENNA', T:T.adu, dims:{ e:E, n:N, sexo:{nom:'Sexo', col:'s', vals:SEXO}, mot:{nom:'Motivo de salida', col:'m', vals:CV.motivos} } }));
  base('orr', Object.assign({}, c, { fuente:'DGCOR', T:T.orr, reiOR:reiOR, dims:{ e:E, n:N } }));
  base('rec', Object.assign({}, c, { fuente:'DGCOR', T:T.rec, dims:{ e:E, n:N } }));
}
if (PM) base('rep', { inicio:PM.inicio, dias:PM.dias, fuente:'DGPMV', T:tabla(PM.rep), dims:{ e:{nom:'O.R.', col:'e', vals:PM.dic.e}, p:{nom:'Punto de repatriación', col:'p', vals:PM.dic.p}, mod:{nom:'Modalidad', col:'m', vals:['Terrestre','Aérea (vuelos PRIM)']} } });
if (RG) base('tram', { inicio:RG.inicio, dias:RG.dias, fuente:'DGRAM', T:tabla(RG.cols), dims:{ e:{nom:'Estado', col:'e', vals:RG.dic.e}, n:{nom:'Nacionalidad', col:'n', vals:RG.dic.n}, of:{nom:'Oficina', col:'o', vals:RG.dic.o},
  doc:{nom:'Documento', col:'c', vals:RG.condiciones}, tipo:{nom:'Tipo de trámite', col:'t', vals:RG.dic.t}, res:{nom:'Resultado', col:'r', vals:RG.dic.r}, sexo:{nom:'Sexo', col:'s', vals:RG.sexos}, edad:{nom:'Edad', col:'a', vals:RG.edades} } });

/* ==== [2] INDICADORES ============================================= */
// art/cu: artículo y «cuántos» con su género. partes: subconjuntos de la misma base (g = grupo de partes que no se traslapan).
// sin: palabras que lo reconocen en texto libre. ir: sección del tablero que lo muestra.
const IND = [
  { k:'resc', nom:'rescatados', art:'los', cu:'cuántos', b:'orr', sin:['rescat'], proc:'Control migratorio · Rescates', ir:{d:'control', vista:'est', em:'res'},
    partes:[ {k:'pre', nom:'Presentados en estación', q:'fueron presentados', med:'pre', g:1, sin:['presentad']}, {k:'can', nom:'Canalizados al DIF', q:'fueron canalizados', med:'can', g:1, sin:['canaliz']},
             {k:'sd', nom:'Sin destino registrado', q:'no tienen destino registrado', med:'sd', g:1, sin:['sin destino','destino']}, {k:'pv', nom:'Primera vez', q:'eran de primera vez', med:'pv', g:2, sin:['primera vez']},
             {k:'rei', nom:'Reincidentes', q:'eran reincidentes', med:'rei', g:2, rei:true, sin:['reincid']} ] },
  { k:'ing', nom:'internaciones', art:'las', cu:'cuántas', b:'ing', sin:['internacion','ingres','entrad','llegad'], proc:'Control migratorio · Internaciones', ir:{d:'control', vista:'int'}, nota:'Extranjeros que se internaron al país; no incluye mexicanos.',
    partes:[ {k:'aer', nom:'Vía aérea', q:'fueron por vía aérea', ex:(T,i) => T.vi[i]===0, g:1, sin:['aere','avion','aeropuert']}, {k:'ter', nom:'Vía terrestre', q:'fueron por vía terrestre', ex:(T,i) => T.vi[i]===1, g:1, sin:['terrestre']},
             {k:'mar', nom:'Cruceros', q:'fueron de cruceros', ex:(T,i) => T.vi[i]===2, g:1, sin:['crucero','maritim']} ] },
  { k:'seg', nom:'casos de segunda revisión', art:'los', cu:'cuántos', b:'seg', sin:['segunda revision','revision'], proc:'Control migratorio · Internaciones', ir:{d:'control', vista:'int'},
    partes:[ {k:'rch', nom:'Rechazados', q:'terminaron en rechazo', ex:(T,i) => T.r[i]===1, g:1, sin:['rechaz']}, {k:'int', nom:'Internados', q:'se internaron', ex:(T,i) => T.r[i]===0, g:1, sin:['internad']} ] },
  { k:'rech', nom:'rechazos', art:'los', cu:'cuántos', b:'seg', ex:(T,i) => T.r[i]===1, sin:['rechaz','inadmi'], proc:'Control migratorio · Internaciones', ir:{d:'control', vista:'int'}, nota:'Personas a las que, en segunda revisión, se les negó la internación; no incluye mexicanos.' },
  { k:'pres', nom:'presentados en el sistema', art:'los', cu:'cuántos', b:'pre', sin:['presentad'], proc:'Control migratorio · Rescates', ir:{d:'control', vista:'est', em:'pre'}, nota:'Personas presentadas según el sistema de DGCVM.' },
  { k:'ret', nom:'retornados', art:'los', cu:'cuántos', b:'ret', sin:['retorn','deport'], proc:'Control migratorio · Rescates', ir:{d:'control', vista:'est', em:'ra'},
    partes:[ {k:'ra', nom:'Retorno asistido', q:'salieron por retorno asistido', med:'ra', g:1, sin:['retorno asistido','asistid']}, {k:'dep', nom:'Deportación', q:'fueron deportados', med:'dep', g:1, sin:['deport']} ] },
  { k:'nna', nom:'NNA canalizados', art:'los', cu:'cuántos', b:'nna', sin:['nna','menores','ninas','ninos','adolescent','canaliz'], proc:'Control migratorio · Canalizados', ir:{d:'control', vista:'can'}, nna:true, nota:'Niñas, niños y adolescentes canalizados según SIRENNA.',
    partes:[ {k:'c0', nom:'Acompañados', q:'iban acompañados', ex:(T,i) => T.c[i]===0, g:1, sin:['acompanad']}, {k:'c1', nom:'No acompañados', q:'iban no acompañados', ex:(T,i) => T.c[i]===1, g:1, sin:['no acompanad','solos']},
             {k:'c2', nom:'Separados', q:'iban separados', ex:(T,i) => T.c[i]===2, g:1, sin:['separad']}, {k:'m1', nom:'Retorno asistido', q:'salieron por retorno asistido', ex:(T,i) => T.m[i]===1, g:2, sin:['retorno asistido']},
             {k:'m2', nom:'Regularización', q:'se regularizaron', ex:(T,i) => T.m[i]===2, g:2, sin:['regulariz']} ] },
  { k:'adu', nom:'adultos que acompañan a NNA', art:'los', cu:'cuántos', b:'adu', sin:['adultos acompan','acompanantes'], proc:'Control migratorio · Canalizados', ir:{d:'control', vista:'can', can:'adu'},
    partes:[ {k:'muj', nom:'Mujeres', q:'eran mujeres', ex:(T,i) => T.s[i]===1, g:1, sin:['mujer']}, {k:'hom', nom:'Hombres', q:'eran hombres', ex:(T,i) => T.s[i]===0, g:1, sin:['hombre']} ] },
  { k:'rec', nom:'recibidos de EE. UU.', art:'los', cu:'cuántos', b:'rec', sin:['recibid'], proc:'Control migratorio · Canalizados', ir:{d:'control', vista:'can'}, nota:'Extranjeros que EE. UU. entregó a México, según las O.R. de la frontera norte.',
    partes:[ {k:'ad', nom:'Adultos', q:'eran adultos', med:'ad', g:1, sin:['adulto']}, {k:'me', nom:'Menores', q:'eran menores', med:'me', g:1, sin:['menor']} ] },
  { k:'rep', nom:'mexicanos repatriados', art:'los', cu:'cuántos', b:'rep', sin:['repatriad','repatriacion'], proc:'Protección al migrante · Repatriados', ir:{d:'proteccion'}, nna:true, nota:'Mexicanos que EE. UU. entregó a México por garitas, puentes y vuelos PRIM.',
    partes:[ {k:'ad', nom:'Adultos', q:'eran adultos', med:'ad', g:1, sin:['adulto']}, {k:'me', nom:'NNA', q:'eran NNA', med:'me', g:1, sin:['nna','menores']},
             {k:'ah', nom:'Hombres adultos', q:'eran hombres adultos', med:'ah', g:2, sin:['hombre']}, {k:'am', nom:'Mujeres adultas', q:'eran mujeres adultas', med:'am', g:2, sin:['mujer']},
             {k:'ac', nom:'NNA acompañados', q:'eran NNA acompañados', med:'ac', g:3, sin:['acompanad']}, {k:'na', nom:'NNA no acompañados', q:'eran NNA no acompañados', med:'na', g:3, sin:['no acompanad','solos']},
             {k:'aer', nom:'Vuelos PRIM', q:'llegaron en vuelos PRIM', ex:(T,i) => T.m[i]===1, g:4, sin:['vuelo','aere','prim']} ] },
  { k:'tram', nom:'trámites concluidos', art:'los', cu:'cuántos', b:'tram', sin:['tramite','documento','residen','visa','tarjeta'], proc:'Regulación migratoria', ir:{d:'regulacion'}, nota:'Trámites que concluyeron en el INM, con o sin documento.',
    partes: RG ? RG.dic.r.slice(0,3).map((r,j) => ({ k:'r'+j, nom:r, q:['fueron positivos','fueron negativos','se cancelaron'][j] || 'fueron '+r.toLowerCase(), ex:(T,i) => T.r[i]===j, g:1, sin:[['positiv'],['negativ'],['cancelad']][j] || [] }))
             .concat([{k:'muj', nom:'Mujeres', q:'fueron de mujeres', ex:(T,i) => T.s[i]===1, g:2, sin:['mujer']}]) : [] }
].filter(x => BASES[x.b]);
const INDK = Object.fromEntries(IND.map(x => [x.k, x]));
const parteDe = (ind, k) => (ind.partes || []).find(p => p.k===k);

/* ==== [3] CÁLCULO ================================================= */
const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'], MESC = MES.map(m => m.slice(0,3));
const iso = f => f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');
const sumaDias = (s, n) => { const f = fecha0(s); f.setDate(f.getDate()+n); return iso(f); };
const difDias = (a, b) => Math.round((fecha0(b) - fecha0(a))/864e5);
const fechaTxt = s => { const f = fecha0(s); return f.getDate()+' '+MESC[f.getMonth()]+' '+f.getFullYear(); };
const rangoTxt = (a, b) => { const x = fecha0(a), y = fecha0(b); return x.getFullYear()===y.getFullYear() ? x.getDate()+' '+MESC[x.getMonth()]+' – '+y.getDate()+' '+MESC[y.getMonth()]+' '+y.getFullYear() : fechaTxt(a)+' – '+fechaTxt(b); };
const finBase = B => sumaDias(B.inicio, B.dias-1);
// Rango común de todas las bases (para el combo de periodo)
const INI = IND.map(x => BASES[x.b].inicio).sort()[0], FIN = IND.map(x => finBase(BASES[x.b])).sort().slice(-1)[0];

// Suma de una medida con filtros. o: { ind, med, ex, filtros{dim:[valores]}, d0, d1, key(i) → índice, nk }
function suma(o){
  const ind = o.ind, B = BASES[ind.b], T = B.T, out = new Float64Array(o.nk || 1);
  const a = Math.max(0, difDias(B.inicio, o.d0)), z = Math.min(B.dias, difDias(B.inicio, o.d1)+1); if (z<=a) return out;
  const v = T[o.med || 'v'], fs = Object.keys(o.filtros || {}).filter(k => o.filtros[k].length && B.dims[k]).map(k => [T[B.dims[k].col], new Set(o.filtros[k])]);
  const rei = o.rei ? B.reiOR : null;
  for (let i=0;i<T.N;i++){ const d = T.d[i]; if (d<a || d>=z) continue;
    if (B.ex && !B.ex(i)) continue; if (ind.ex && !ind.ex(T,i)) continue; if (o.ex && !o.ex(T,i)) continue; if (rei && !rei.has(T.e[i])) continue;
    let ok = true; for (const f of fs) if (!f[1].has(f[0][i])){ ok = false; break; } if (!ok) continue;
    out[o.key ? o.key(T,i,d) : 0] += v[i]; }
  return out;
}
const total = o => suma(o)[0];
const medParte = (ind, p) => p ? { med:p.med, ex:p.ex } : {};
// Por dimensión: [[índice, valor], …] de mayor a menor
function porDim(o, dim){ const B = BASES[o.ind.b], D = B.dims[dim], nk = D.vals.length, x = suma(Object.assign({}, o, { nk:nk+1, key:(T,i) => { const v = T[D.col][i]; return v>=0 && v<nk ? v : nk; } }));
  return [...Array(nk).keys()].filter(k => x[k]>0).sort((a,b) => x[b]-x[a]).map(k => [k, x[k]]); }
// Cubetas de tiempo dentro del rango: día, semana (lunes a domingo) o mes
function cubetas(d0, d1, g){
  const n = difDias(d0, d1)+1; g = g==='auto' ? (n<=35 ? 'd' : n<=200 ? 's' : 'm') : g; const l = [];
  let a = d0; while (a<=d1){ const f = fecha0(a); let b;
    if (g==='d') b = a; else if (g==='s'){ const dw = (f.getDay()+6)%7; b = sumaDias(a, 6-dw); } else b = iso(new Date(f.getFullYear(), f.getMonth()+1, 0));
    if (b>d1) b = d1; l.push({ a:a, b:b, inc: g==='s' ? difDias(a,b)<6 : g==='m' ? (fecha0(a).getDate()!==1 || iso(new Date(fecha0(b).getFullYear(), fecha0(b).getMonth()+1, 0))!==b) : false }); a = sumaDias(b, 1); }
  return { g:g, l:l };
}
function serie(o, C){ const B = BASES[o.ind.b], map = new Int32Array(B.dias).fill(-1);
  C.l.forEach((c,k) => { for (let d=Math.max(0,difDias(B.inicio,c.a)); d<=Math.min(B.dias-1,difDias(B.inicio,c.b)); d++) map[d] = k; });
  const x = suma(Object.assign({}, o, { nk:C.l.length+1, key:(T,i,d) => map[d]<0 ? C.l.length : map[d] })); return Array.from(x).slice(0, C.l.length); }

/* ==== [4] TEXTO LIBRE ============================================= */
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();
const VACIAS = new Set('de del la las el los en y o a por que cuantos cuantas cuanto cuanta fueron fue son eran es con para al se un una mas cual cuales como hay total totales numero cantidad quiero ver dame muestrame entre desde hasta durante periodo ultimo ultima ultimos ultimas su sus lo le les mi me nos ese esa este esta estos estas todo toda todos todas cada casos personas gente migrantes eran iban llegaron salieron tienen terminaron tuvieron hubo han fue registrados registradas cifra cifras datos no'.split(' '));
const DESG_TXT = [['nacionalidad','n'],['pais','n'],['paises','n'],['origen','n'],['estado','e'],['estados','e'],['entidad','e'],['o r','e'],['or','e'],['oficina de representacion','e'],['punto','p'],['puntos','p'],['estacion','est'],['estaciones','est'],['via','via'],['sexo','sexo'],['edad','edad'],['condicion','cond'],['motivo','mot'],['documento','doc'],['tipo','tipo'],['resultado','res'],['oficina','of'],['modalidad','mod'],['mes','t:m'],['meses','t:m'],['semana','t:s'],['dia','t:d'],['dias','t:d']];
// Vocabulario que genera robot/vocabulario.py (nombres alternos, gentilicios, abreviaturas, sinónimos)
const VOC = window.IANAMI_VOC || { n:{}, e:{}, p:{}, gent:{}, sin:{} };
const GENT = VOC.gent;
// Formas completas de las palabras del dominio: sirven para corregir errores de escritura («rescatdos» → «rescatados»)
const FORMAS = ('rescatados rescatadas rescates rescate presentados presentadas canalizados canalizadas internaciones internados ingresos rechazos rechazados '+
  'repatriados repatriadas tramites tramite documentos documento retornados deportados recibidos adultos adultas menores mujeres hombres acompanados '+
  'solos separados aereo aerea aereos vuelos terrestre cruceros maritimo nacionalidad nacionalidades estado estados punto puntos estacion estaciones '+
  'oficina oficinas modalidad condicion motivo sexo edad resultado tipo mes meses semana semanas dia dias mensual semanal diario contra comparado '+
  'sistema sirenna reincidentes primera vez destino visas residentes regularizacion retorno asistido positivos negativos cancelados principales top').split(' ');
let DICC = null;   // palabras conocidas, se arma la primera vez
function diccionario(){
  if (DICC) return DICC; const w = new Set(FORMAS.concat(MES));
  const mete = t => norm(t).split(' ').forEach(x => { if (x.length>=3) w.add(x); });
  Object.values(BASES).forEach(B => Object.values(B.dims).forEach(D => D.vals.forEach(mete)));
  IND.forEach(x => { mete(x.nom); (x.partes || []).forEach(p => mete(p.nom)); });
  ['n','e','p'].forEach(k => Object.keys(VOC[k] || {}).forEach(mete)); Object.keys(VOC.sin || {}).forEach(mete);
  VACIAS.forEach(x => w.delete(x)); DICC = [...w]; return DICC;
}
// Distancia de edición (con transposición), cortando cuando pasa del máximo
function distancia(a, b, max){
  if (Math.abs(a.length-b.length)>max) return max+1; const d = [];
  for (let i=0;i<=a.length;i++){ d[i] = [i]; } for (let j=1;j<=b.length;j++) d[0][j] = j;
  for (let i=1;i<=a.length;i++){ let mn = 1e9; for (let j=1;j<=b.length;j++){ const c = a[i-1]===b[j-1] ? 0 : 1;
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+c); if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1); mn = Math.min(mn, d[i][j]); }
    if (mn>max) return max+1; }
  return d[a.length][b.length];
}
// Prepara el texto: aplica sinónimos y corrige palabras mal escritas; devuelve el texto y las correcciones hechas
function preparar(txt){
  let t = ' '+norm(txt)+' '; const fix = [];
  Object.keys(VOC.sin || {}).sort((a,b) => b.length-a.length).forEach(k => { const v = VOC.sin[k]; t = t.split(' '+k+' ').join(' '+(v ? v+' ' : '')); });
  const D = diccionario(), raices = IND.flatMap(x => x.sin.concat((x.partes || []).flatMap(p => p.sin))).concat(Object.keys(GENT));
  t = ' '+t.trim().split(' ').map(w => {
    if (w.length<5 || VACIAS.has(w) || /\d/.test(w) || D.indexOf(w)>=0 || raices.some(r => w.startsWith(r))) return w;
    const max = w.length>=8 ? 2 : 1; let mejor = null, dm = max+1;
    for (const c of D){ if (c[0]!==w[0] || Math.abs(c.length-w.length)>max) continue; const x = distancia(w, c, max); if (x<dm){ dm = x; mejor = c; if (x===1 && max===1) break; } }
    if (mejor){ fix.push([w, mejor]); return mejor; } return w;
  }).join(' ')+' ';
  return { t:t, fix:fix };
}
// Palabras clave de documentos (DGRAM) → texto que contiene el nombre del documento
const DOCK = [['humanitari','Humanitario'],['regional','Regional'],['fronteriz','Fronterizo'],['permanente','Permanente'],['estudiant','Estudiante'],['temporal','Temporal'],['adopcion','Adopción'],['empleador','empleador']];
function entender(txt){
  const pre = preparar(txt); let t = pre.t; const usado = [], avisos = [], q = nuevaQ(), pos = {};
  const toma = w => { const i = t.indexOf(' '+w+' '); if (i<0) return false; usado.push(w); t = t.slice(0,i)+' '+'_'.repeat(w.length)+' '+t.slice(i+w.length+2); return true; };
  const tomaRaiz = r => { const m = t.match(new RegExp(' ('+r+'[a-zñ]*)')); if (!m) return false; return toma(m[1]); };
  const tomaTodo = r => { let k = 0; while (tomaRaiz(r)) k++; return k>0; };
  const filtro = (dim, i, at) => { q.filtros[dim] = q.filtros[dim] || []; if (q.filtros[dim].indexOf(i)<0 && q.filtros[dim].length<3){ q.filtros[dim].push(i); pos[dim+':'+i] = at; } };
  // 1. indicador: el que aparece primero; se consume solo esa palabra (las demás pueden ser partes, como «deportados»)
  const cand = IND.map(x => { let at = 1e9, w = ''; x.sin.forEach(s => { const m = t.match(new RegExp(' ('+s+'[a-zñ]*)')); if (m && m.index<at){ at = m.index; w = m[1]; } }); return [x, at, w]; }).filter(x => x[1]<1e9).sort((a,b) => a[1]-b[1]);
  if (cand.length){ q.ind = cand[0][0].k; toma(cand[0][2]);
    // si la palabra que dio el indicador es también una de sus partes («deportados»), cuenta como parte
    (cand[0][0].partes || []).forEach(p => { if (p.sin.some(sx => cand[0][2].startsWith(sx))) q.partes.push(p.k); }); }
  const ind = INDK[q.ind], B = BASES[ind.b];
  if (q.ind==='rec'){ ['de ee uu','de eeuu','de estados unidos','ee uu','eeuu','estados unidos'].some(toma); }
  // 2. desglose: «por X»
  DESG_TXT.slice().sort((a,b) => b[0].length-a[0].length).forEach(([w,d]) => { if (t.indexOf(' por '+w+' ')>=0){ toma('por'); toma(w);
    if (d.startsWith('t:')){ q.desg = 't'; q.gran = d.slice(2); } else if (B.dims[d]) q.desg = d; else avisos.push(cap(ind.nom)+' no se puede desglosar por '+w+': esta base no lo trae.'); } });
  if (/ (mensual|diari|semanal)/.test(t)){ q.desg = 't'; q.gran = / mensual/.test(t) ? 'm' : / semanal/.test(t) ? 's' : 'd'; tomaRaiz('mensual') || tomaRaiz('semanal') || tomaRaiz('diari'); }
  // 3. partes: primero por su nombre completo («NNA no acompañados»), luego por sus palabras clave
  const P = (ind.partes || []).slice().sort((a,b) => norm(b.nom).length-norm(a.nom).length);
  P.forEach(p => { if (toma(norm(p.nom))){ q.partes.push(p.k); p.sin.forEach(tomaTodo); } });
  P.slice().sort((a,b) => Math.max(...b.sin.map(x => x.length))-Math.max(...a.sin.map(x => x.length))).forEach(p => { if (q.partes.indexOf(p.k)<0 && p.sin.some(sx => tomaRaiz(sx))){ q.partes.push(p.k); p.sin.forEach(tomaTodo); } });
  ind.sin.forEach(tomaTodo);
  // 4. valores de filtro (nombres de nacionalidades, estados, puntos…), el más largo primero; se guardan en el orden del texto
  const vals = []; Object.keys(B.dims).forEach(dim => B.dims[dim].vals.forEach((v,i) => { const n = norm(v); if (n.length>=4) vals.push([n, dim, i]); }));
  vals.push(['eeuu','n',B.dims.n ? B.dims.n.vals.indexOf('EE. UU.') : -1], ['ee uu','n',B.dims.n ? B.dims.n.vals.indexOf('EE. UU.') : -1], ['cdmx','e',B.dims.e ? B.dims.e.vals.indexOf('Ciudad de México') : -1]);
  ['n','e','p'].forEach(dim => { if (!B.dims[dim]) return; Object.keys(VOC[dim] || {}).forEach(a => { const i = B.dims[dim].vals.indexOf(VOC[dim][a]); if (i>=0 && a.length>=2 && !VACIAS.has(a) && ['sin','son','ver','col','mor'].indexOf(a)<0) vals.push([a, dim, i]); }); });
  vals.filter(v => v[2]>=0).sort((a,b) => b[0].length-a[0].length).forEach(([n,dim,i]) => { const at = t.indexOf(' '+n+' '); if (at>=0 && toma(n)) filtro(dim, i, at); });
  if (B.dims.n) Object.keys(GENT).forEach(g => { const m = t.match(new RegExp(' ('+g+'[a-zñ]*)')); if (m){ const i = B.dims.n.vals.indexOf(GENT[g]); if (i>=0){ filtro('n', i, m.index); toma(m[1]); } } });
  if (B.dims.doc) DOCK.forEach(([w,txt]) => { const m = t.match(new RegExp(' ('+w+'[a-zñ]*)')); if (m){ const i = B.dims.doc.vals.findIndex(v => v.indexOf(txt)>=0); if (i>=0){ filtro('doc', i, m.index); toma(m[1]); tomaRaiz('visa') || tomaRaiz('tarjeta') || tomaRaiz('residen'); } } });
  Object.keys(q.filtros).forEach(d => q.filtros[d].sort((a,b) => pos[d+':'+a]-pos[d+':'+b]));
  // 5. periodo
  const anio = t.match(/ (20\d\d) /), mes = MES.findIndex(m => t.indexOf(' '+m+' ')>=0);
  if (mes>=0){ toma(MES[mes]); const y = anio ? +anio[1] : fecha0(FIN).getFullYear(); if (anio) toma(anio[1]); q.d0 = iso(new Date(y, mes, 1)); q.d1 = iso(new Date(y, mes+1, 0)); }
  else if (anio){ toma(anio[1]); q.d0 = anio[1]+'-01-01'; q.d1 = anio[1]+'-12-31'; }
  if (toma('sheinbaum')){ q.d0 = '2024-10-01'; }
  if (/ ultim[oa] mes /.test(t)){ tomaRaiz('ultim'); toma('mes'); q.d0 = iso(new Date(fecha0(FIN).getFullYear(), fecha0(FIN).getMonth(), 1)); }
  if (/ ultima semana /.test(t)){ tomaRaiz('ultim'); toma('semana'); q.d0 = sumaDias(FIN, -6); }
  // 6. comparar, fuente y top
  if (/ (sistema|sirenna) /.test(t) && q.ind==='resc'){ q.fuente = 'cmp'; toma('sistema'); toma('sirenna'); tomaRaiz('compar'); }
  if (/ (vs|contra|comparad|compara|frente a) /.test(t)){ q.cmp = true; ['vs','contra','frente'].forEach(w => { while (toma(w)); }); tomaRaiz('compar'); }
  const top = t.match(/ (?:top|principales|primer[oa]s) (\d{1,2}) /); if (top){ q.top = Math.max(3, Math.min(30, +top[1])); tomaRaiz('top') || tomaRaiz('principales') || tomaRaiz('primer'); toma(top[1]); }
  // 6b. sexo («niñas», «mujeres», «hombres») y oficina por su ciudad («oficina de Tapachula» → SRF Zona Sur (Tapachula))
  if (B.dims.sexo){ const sx = B.dims.sexo.vals, P = pre.t; if (/ ninas? /.test(P) && !/ ninos? /.test(P) && !/adolescent/.test(P) && sx.indexOf('Mujeres')>=0){ toma('ninas') || toma('nina'); filtro('sexo', sx.indexOf('Mujeres'), P.indexOf(' nina')); }
    [['mujer','Mujeres'],['femen','Mujeres'],['hombre','Hombres'],['mascul','Hombres'],['varon','Hombres']].forEach(([w,v]) => { const m = t.match(new RegExp(' ('+w+'[a-z]*) ')), i = sx.indexOf(v); if (m && i>=0 && toma(m[1])) filtro('sexo', i, m.index); }); }
  if (B.dims.of){ B.dims.of.vals.forEach((v,i) => { const par = (String(v).match(/\(([^)]+)\)/) || [])[1]; if (!par) return; const w = norm(par).trim(); const at = t.indexOf(' '+w+' '); if (w && at>=0 && toma(w)) filtro('of', i, at); });
    if (q.filtros.of) tomaRaiz('oficin'); }
  // 7. conceptos de otras bases: avisar, no ignorar
  const fuera = [['mujer','sexo'],['hombre','sexo'],['nina','sexo'],['edad','edad'],['aere','via'],['vuelo','via'],['terrestre','via'],['estacion','est'],['punto','p'],['nacionalidad','n'],['documento','doc']];
  fuera.forEach(([w,dim]) => { const m = t.match(new RegExp(' ('+w+'[a-z]*)')); if (m && !B.dims[dim] && !(ind.partes||[]).some(p => p.sin.some(sx => sx.startsWith(w)))){ toma(m[1]); avisos.push(cap(ind.nom)+': la base no trae '+{sexo:'sexo',edad:'edad',via:'vía',est:'estación',p:'punto',n:'nacionalidad',doc:'documento'}[dim]+'. La respuesta no está filtrada por «'+m[1]+'».'); } });
  if (!B.dims.n && /mexican/.test(t)) tomaTodo('mexican');
  let resto = t.split(' ').filter(w => w && !/^_+$/.test(w) && !VACIAS.has(w) && !/^\d+$/.test(w));
  if (resto.length){ const inv = {}; pre.fix.forEach(f => { inv[f[1]] = f[0]; }); pre.fix = pre.fix.filter(f => resto.indexOf(f[1])<0); resto = resto.map(w => inv[w] || w); }
  if (resto.length) avisos.unshift('No reconocí: «'+resto.join(' ')+'». La respuesta no lo toma en cuenta.');
  if (!cand.length) avisos.unshift('No reconocí qué quieres ver; se muestra '+ind.nom+'. Elígelo en «Qué».');
  limitar(q); q.avisos = avisos; q.entendi = usado; q.fix = pre.fix; return q;
}

/* ==== [5] HOJA (plantillas) ======================================= */
const VERDE = '#2F6657', ROJO = '#C4605A', OCRE = '#8F7F2E', SALVIA = '#778E88', ROSA = '#B66666', ARENA = '#BDB58D', VINO = '#7E302B';
const COLP = [VERDE, ROJO, OCRE, SALVIA, ROSA], COLV = [VERDE, ROJO, OCRE];
const miles = n => Math.round(n).toLocaleString('en-US'), esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s, min = s => /^O\.R\./.test(s) ? s : s.toLowerCase();
const deCien = (a, b) => b ? Math.round(a/b*100) : 0;
const minus = s => String(s).split(' ').map(w => /^[A-ZÁÉÍÓÚÑ.]{2,}$/.test(w) ? w : w.toLowerCase()).join(' ');
// NNA: cifras de 1 a 4 se publican como «menos de 5» para no identificar a nadie
const cifra = (v, nna) => nna && v>0 && v<5 ? 'menos de 5' : miles(v);

function nuevaQ(){ return { ind:IND[0].k, partes:[], desg:'', gran:'auto', filtros:{}, d0:INI, d1:FIN, cmp:false, top:10, fuente:'or', fmt:'h' }; }
// Ajusta la consulta a lo que existe: rango dentro de la base, partes y desglose válidos
function limitar(q){
  const ind = INDK[q.ind], B = BASES[ind.b];
  q.partes = q.partes.filter((k,i,a) => parteDe(ind, k) && a.indexOf(k)===i).slice(0,3);
  if (q.desg && q.desg!=='t' && !B.dims[q.desg]) q.desg = '';
  Object.keys(q.filtros).forEach(k => { if (!B.dims[k] || !q.filtros[k].length) delete q.filtros[k]; });
  if (q.d0<B.inicio) q.d0 = B.inicio; if (q.d1>finBase(B)) q.d1 = finBase(B); if (q.d1<q.d0) q.d1 = q.d0;
  if (!(q.ind==='resc' && q.partes.some(k => k==='pre' || k==='can'))) q.fuente = 'or';
}
const plantilla = q => q.fuente==='cmp' ? 'fuentes' : q.partes.length ? 'prop' : q.desg==='t' ? 'tiempo' : q.cmp && Object.values(q.filtros).some(v => v.length>=2) ? 'comp' : 'rank';
// Dimensiones de las listas: la elegida y una segunda útil
function dimsLista(q, base){ const B = BASES[INDK[q.ind].b], orden = (q.partes.length ? ['e','n'] : ['n','e']).concat(['p','est','mod','doc','via','cond','mot','sexo','edad','tipo','of','res']);
  const l = []; if (q.desg && q.desg!=='t') l.push(q.desg);
  orden.forEach(d => { if (B.dims[d] && l.indexOf(d)<0 && l.length<2 && !((q.filtros[d] || []).length===1) && (!base || porDim(base, d).length>=2)) l.push(d); }); return l; }
const filtrosTxt = q => { const B = BASES[INDK[q.ind].b]; return Object.keys(q.filtros).map(k => q.filtros[k].map(i => B.dims[k].vals[i]).join(q.cmp ? ' contra ' : ', ')); };

// Cálculo completo de una consulta (también lo usa la prueba)
function calcular(q){
  const ind = INDK[q.ind], B = BASES[ind.b], base = { ind:ind, filtros:q.filtros, d0:q.d0, d1:q.d1, rei:q.partes.some(k => parteDe(ind,k).rei) };
  const r = { q:q, ind:ind, B:B, tipo:plantilla(q), total:total(base), base:base, avisos:(q.avisos || []).slice() };
  if (base.rei) r.avisos.push('La reincidencia solo se registra en '+[...B.reiOR].map(e => B.dims.e.vals[e]).join(', ')+': el total se limita a esas O.R.');
  const n = difDias(q.d0, q.d1)+1, a0 = sumaDias(q.d0, -n), a1 = sumaDias(q.d0, -1);
  if (a0>=B.inicio){ r.antes = total(Object.assign({}, base, { d0:a0, d1:a1 })); r.antesTxt = rangoTxt(a0, a1); }
  r.partes = q.partes.map((k,j) => { const p = parteDe(ind,k); return { p:p, col:COLP[j], v:total(Object.assign({}, base, medParte(ind,p))) }; });
  r.listas = dimsLista(q, base).map(dim => { const tot = porDim(base, dim); return { dim:dim, nom:B.dims[dim].nom, filas:tot.map(([k,v]) => ({ k:k, nom:B.dims[dim].vals[k], v:v,
    partes:r.partes.map(pp => 0) })) }; });
  r.listas.forEach(L => { r.partes.forEach((pp,j) => { const x = porDim(Object.assign({}, base, medParte(ind, pp.p)), L.dim), m = new Map(x); L.filas.forEach(f => { f.partes[j] = m.get(f.k) || 0; }); }); });
  if (r.tipo==='rank' && !r.listas.length && r.total) r.tipo = 'tiempo';
  if (r.tipo==='tiempo'){ r.C = cubetas(q.d0, q.d1, q.desg==='t' ? q.gran : 'auto'); r.serie = serie(base, r.C); }
  if (r.tipo==='comp'){ const dim = Object.keys(q.filtros).find(k => q.filtros[k].length>=2), otra = dimsLista(Object.assign({}, q, { desg:'' }), base).find(d => d!==dim);
    r.cdim = dim; r.cols = q.filtros[dim].map((v,j) => { const f = Object.assign({}, q.filtros, { [dim]:[v] }), o = Object.assign({}, base, { filtros:f });
      return { nom:B.dims[dim].vals[v], col:COLV[j], v:total(o), serie:serie(o, r.Cc || (r.Cc = cubetas(q.d0, q.d1, 'auto'))), antes:r.antes!=null ? total(Object.assign({}, o, { d0:a0, d1:a1 })) : null, top: otra ? porDim(o, otra).slice(0,3).map(([k,x]) => [B.dims[otra].vals[k], x]) : [], otra:otra ? B.dims[otra].nom : '' }; }); }
  if (r.tipo==='fuentes') fuentes(r);
  r.nomF = ind.nom+(fraseFiltros(q, r.cdim) ? ' '+fraseFiltros(q, r.cdim) : '');
  r.hallazgo = hallazgo(r);
  return r;
}
// Rescatados (O.R.) contra presentados del sistema y canalizados de SIRENNA, por O.R. y nacionalidad
function fuentes(r){
  const q = r.q, fl = {}; ['e','n'].forEach(k => { if (q.filtros[k]) fl[k] = q.filtros[k].map(i => r.B.dims[k].vals[i]); });
  if (Object.keys(q.filtros).some(k => k!=='e' && k!=='n')) r.avisos.push('En la comparación con el sistema solo se pueden usar filtros de O.R. y nacionalidad.');
  const otro = (b, nomI) => { const B = BASES[b], f = {}; Object.keys(fl).forEach(k => { f[k] = fl[k].map(v => B.dims[k].vals.indexOf(v)).filter(i => i>=0); }); return { ind:{ b:b, nom:nomI }, filtros:f, d0:q.d0, d1:q.d1 }; };
  const oPre = otro('pre', 'presentados'), oNna = otro('nna'), oAdu = otro('adu');
  r.sis = { pre:total(oPre), nna:total(oNna), adu:total(oAdu) };
  r.v = { pre:total(Object.assign({}, r.base, { med:'pre' })), can:total(Object.assign({}, r.base, { med:'can' })) };
  const idx = (dim, B2, o2) => { const a = new Map(porDim(Object.assign({}, r.base, { med:'pre' }), dim).map(([k,v]) => [r.B.dims[dim].vals[k], v]));
    const b = new Map(porDim(o2, dim).map(([k,v]) => [BASES[B2].dims[dim].vals[k], v]));
    return [...a.entries()].sort((x,y) => y[1]-x[1]).slice(0,5).map(([nom,v]) => ({ nom:nom, or:v, sis:b.get(nom) || 0 })); };
  r.fl = [{ nom:'Por O.R.', filas:idx('e','pre',oPre) }, { nom:'Por nacionalidad', filas:idx('n','pre',oPre) }];
}
// Hallazgo automático: solo si hay algo notable; nunca causas
function hallazgo(r){
  const L = r.listas[0], T = r.total; if (!T) return '';
  if (r.tipo==='fuentes'){ const f = r.fl[0].filas, bajos = f.filter(x => x.or>=1000 && deCien(x.sis,x.or)<20); if (!bajos.length) return '';
    const a = bajos.reduce((s,x) => s+x.or, 0), b = bajos.reduce((s,x) => s+x.sis, 0);
    return '<b>'+bajos.map(x => x.nom).join(bajos.length===2 ? ' y ' : ', ').replace(/, ([^,]*)$/, ' y $1')+' '+(bajos.length>1 ? 'reportan' : 'reporta')+' '+miles(a)+' presentados; el sistema registra '+miles(b)+'.</b>'; }
  if (r.tipo==='tiempo'){ const s = r.serie, C = r.C, comp = s.map((v,k) => [v,k]).filter(x => !C.l[x[1]].inc); if (comp.length<2) return '';
    const mx = comp.reduce((a,b) => b[0]>a[0] ? b : a), u = comp[comp.length-1], p = comp[0], dl = p[0] ? (u[0]/p[0]-1)*100 : 0, nc = c => nomCub(C, c);
    return '<b>El '+(C.g==='m' ? 'mes' : C.g==='s' ? 'periodo' : 'día')+' más alto fue '+nc(mx[1])+', con '+cifra(mx[0], r.ind.nna)+'.</b>'+(Math.abs(dl)>=15 ? ' Del primero al último completo '+(dl>0 ? 'subió' : 'bajó')+' '+Math.abs(dl).toFixed(0)+'%.' : ''); }
  if (r.tipo==='comp'){ const c = r.cols.slice().sort((a,b) => b.v-a.v); if (c.length<2 || !c[1].v) return ''; const x = c[0].v/c[1].v;
    return x>=1.15 ? '<b>'+cap(r.ind.art)+' '+r.ind.nom+' de '+esc(c[0].nom)+' son '+(x>=2 ? x.toFixed(1)+' veces '+r.ind.art+' de ' : Math.round((x-1)*100)+'% más que '+r.ind.art+' de ')+esc(c[1].nom)+'.</b>' : '<b>'+esc(c[0].nom)+' y '+esc(c[1].nom)+' tienen cifras parecidas.</b>'; }
  if (!L || L.filas.length<2) return '';
  const f = L.filas, s1 = f[0].v/T, s2 = (f[0].v+f[1].v)/T, nom = x => esc(x.nom); let h = '';
  if (s1>=0.4) h = '<b>'+nom(f[0])+' concentra '+deCien(f[0].v,T)+' de cada 100 '+esc(r.nomF)+'.</b>';
  else if (s2>=0.6) h = '<b>'+nom(f[0])+' y '+nom(f[1])+' concentran '+deCien(f[0].v+f[1].v,T)+' de cada 100 '+esc(r.nomF)+'.</b>';
  if (r.tipo==='prop' && r.partes.length){ const pp = r.partes[0], g = pp.v/T, dif = f.filter(x => x.v>=T*0.02 && x.v>=30).map(x => [x, x.partes[0]/x.v]).filter(x => Math.abs(x[1]-g)>=0.15).sort((a,b) => Math.abs(b[1]-g)-Math.abs(a[1]-g)).slice(0,2);
    if (dif.length){ const x = dif[0]; h += ' En '+nom(x[0])+', '+Math.round(x[1]*100)+' de cada 100 '+pp.p.q+'; en general, '+Math.round(g*100)+'.'; } }
  return h;
}
const nomCub = (C, k) => { const c = C.l[k], f = fecha0(c.a); return C.g==='m' ? MES[f.getMonth()]+' '+f.getFullYear() : C.g==='s' ? 'la semana del '+f.getDate()+' '+MESC[f.getMonth()] : f.getDate()+' '+MESC[f.getMonth()]; };

// Frase de los filtros para títulos y hallazgos: «de Colombia en Chiapas · vía aérea»
const CONECTOR = { n:'de', e:'en', p:'en', est:'en', of:'en' };
function fraseFiltros(q, quitar){
  const B = BASES[INDK[q.ind].b], l = [];
  const ORD = ['n','e','p','est','of'], ks = Object.keys(q.filtros).sort((a,b) => (ORD.indexOf(a)<0 ? 9 : ORD.indexOf(a))-(ORD.indexOf(b)<0 ? 9 : ORD.indexOf(b)));
  ks.forEach(k => { if (k===quitar) return; const v = q.filtros[k].map(i => B.dims[k].vals[i]), y = v.length>1 ? v.slice(0,-1).join(', ')+' y '+v[v.length-1] : v[0];
    l.push((CONECTOR[k] ? CONECTOR[k]+' ' : '· ')+y); });
  return l.join(' ').replace(/^· /, '· ');
}
function titulo(r){
  const q = r.q, ind = r.ind, L = r.listas[0], f = fraseFiltros(q, r.tipo==='comp' ? r.cdim : null), sf = f ? ' '+f : '';
  if (r.tipo==='prop' || r.tipo==='fuentes'){ const ps = r.partes.map(x => x.p.q); return 'De '+ind.art+' '+ind.nom+sf+', ¿'+ind.cu+' '+ps.join(' y ¿'+ind.cu+' ').replace(/ y ¿/g,' y ')+'?'; }
  if (r.tipo==='tiempo') return cap(ind.nom)+sf+(sf ? ', por ' : ' por ')+{d:'día',s:'semana',m:'mes'}[r.C.g];
  if (r.tipo==='comp') return cap(ind.nom)+': '+r.cols.map(c => c.nom).join(' contra ')+(f ? ' ('+f.replace(/^· /,'')+')' : '');
  return cap(ind.nom)+sf+(L ? (sf ? ', por ' : ' por ')+min(L.nom) : '');
}
const mismoGrupo = r => r.partes.length>0 && r.partes.every(x => x.p.g===r.partes[0].p.g);
function leyenda(r){
  const l = [];
  if (r.tipo==='fuentes') l.push('Rescatados y destino según el <b>reporte de las O.R.</b>; presentados según el <b>sistema DGCVM</b> y canalizados según <b>SIRENNA</b>. Son registros distintos: la comparación muestra cuánto coinciden, no qué pasó con cada persona.');
  else if (r.tipo==='prop' && r.ind.k==='resc') l.push('Rescatados y su destino vienen del <b>mismo reporte de las O.R.</b>: se leen como «de los rescatados».');
  else if (r.ind.nota) l.push(r.ind.nota);
  if (r.tipo==='prop' && !mismoGrupo(r)) l.push('Las partes se traslapan: no suman el total.');
  if (r.ind.nna) l.push('Las cifras de NNA de 1 a 4 se publican como «menos de 5».');
  return l.join(' ');
}

/* ==== [5b] GRÁFICAS (mismo formato que el tablero) ================= */
// Ejes, cuadrícula de fondo, tipografía y tooltip iguales a los de Control migratorio y Regulación migratoria
const EJE = { axisLine:{ lineStyle:{ color:'#C9C4B5' } }, axisTick:{ show:false }, axisLabel:{ color:'#5C5952', fontSize:11 }, splitLine:{ show:true, lineStyle:{ color:'#EEEBE2' } } };
const BASEOP = anim => ({ textStyle:{ fontFamily:'Barlow, sans-serif', color:'#2B2926' }, animation:anim, animationDuration:600,
  tooltip:{ backgroundColor:'#2B2926', borderWidth:0, textStyle:{ color:'#F4F2EA', fontSize:12 }, extraCssText:'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)' } });
const eje = o => Object.assign({}, EJE, o, { axisLabel:Object.assign({}, EJE.axisLabel, o && o.axisLabel), splitLine:Object.assign({}, EJE.splitLine, o && o.splitLine) });
const partir = (t, n) => String(t).split(' ').reduce((a,w) => { const u = a[a.length-1]; if (u && (u+' '+w).length<=n) a[a.length-1] = u+' '+w; else a.push(w); return a; }, []).join('\n');
const corto = n => n>=1e6 ? (n/1e6).toFixed(2)+' M' : n>=1e4 ? (n/1e3).toFixed(1)+' k' : miles(n);
const etiq = (v, nna) => nna && v>0 && v<5 ? '<5' : corto(v);
// Barras verticales de mayor a menor, con el valor encima (como «Totales»)
function opBarrasV(l, nna, col){ return { grid:{ left:46, right:10, top:24, bottom:l.some(x => x[0].length>11) ? 44 : 30 }, tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:p => '<b>'+esc(l[p[0].dataIndex][0])+'</b><br>'+cifra(p[0].value, nna) },
  xAxis:eje({ type:'category', data:l.map(x => x[0]), axisLabel:{ interval:0, fontSize:10.5, color:'#2B2926', lineHeight:12, formatter:v => partir(v, 11) } }),
  yAxis:eje({ type:'value', axisLabel:{ formatter:v => corto(v) } }),
  series:[{ type:'bar', barMaxWidth:34, data:l.map(x => x[1]), itemStyle:{ color:col || VERDE, borderRadius:[3,3,0,0] }, label:{ show:true, position:'top', fontSize:10.5, color:'#2B2926', formatter:p => etiq(p.value, nna) } }] }; }
// Barras horizontales de mayor a menor (listas cortas y celular)
function opBarrasH(l, nna, col, T){ return { grid:{ left:8, right:T ? 130 : 54, top:6, bottom:6, containLabel:true }, tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:p => '<b>'+esc(l[p[0].dataIndex][0])+'</b><br>'+cifra(p[0].value, nna) },
  xAxis:eje({ type:'value', axisLabel:{ show:false } }), yAxis:eje({ type:'category', inverse:true, data:l.map(x => x[0]), splitLine:{ show:false }, axisLabel:{ color:'#2B2926', fontSize:11, formatter:v => v.length>22 ? v.slice(0,21)+'…' : v } }),
  series:[{ type:'bar', barMaxWidth:18, data:l.map(x => x[1]), itemStyle:{ color:col || VERDE, borderRadius:[0,3,3,0] }, label:{ show:true, position:'right', fontSize:10.5, color:'#2B2926', formatter:p => etiq(p.value, nna)+(T && T>=30 && !(nna && p.value<5) ? '  ·  '+deCien(p.value, T)+' de cada 100' : '') } }] }; }
// De cada 100: barras al 100% con la parte (o partes) y el resto; si las partes se traslapan, una barra por parte
function opCien(r, filas){
  const excl = mismoGrupo(r), nna = r.ind.nna, nom = filas.map(f => f.nom);
  const series = r.partes.map((pp,j) => ({ name:pp.p.nom, type:'bar', stack:excl ? 'a' : undefined, barMaxWidth:excl ? 18 : 10, itemStyle:{ color:pp.col }, data:filas.map(f => f.v>=30 ? +(f.partes[j]/f.v*100).toFixed(1) : 0),
    label:{ show:true, position:excl ? 'insideLeft' : 'right', color:excl ? '#fff' : '#2B2926', fontSize:10, fontWeight:600, formatter:p => p.value>=6 || !excl ? Math.round(p.value) : '' } }));
  if (excl) series.push({ name:'Resto', type:'bar', stack:'a', barMaxWidth:18, itemStyle:{ color:'#EFECE2' }, data:filas.map(f => f.v>=30 ? +(100 - r.partes.reduce((s,pp,j) => s+f.partes[j]/f.v*100, 0)).toFixed(1) : 100),
    label:{ show:true, position:'right', color:'#5C5952', fontSize:10, formatter:p => cifra(filas[p.dataIndex].v, nna) }, tooltip:{ show:false } });
  return { grid:{ left:8, right:excl ? 62 : 26, top:r.partes.length>1 ? 24 : 6, bottom:6, containLabel:true }, legend:r.partes.length>1 ? { top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{ fontSize:11 }, data:r.partes.map(x => x.p.nom) } : { show:false },
    tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:ps => { const f = filas[ps[0].dataIndex]; return '<b>'+esc(f.nom)+'</b> · '+cifra(f.v, nna)+'<br>'+r.partes.map((pp,j) => pp.p.nom+': <b>'+cifra(f.partes[j], nna)+'</b>'+(f.v>=30 ? ' ('+deCien(f.partes[j], f.v)+' de cada 100)' : '')).join('<br>'); } },
    xAxis:eje({ type:'value', max:excl ? 100 : undefined, axisLabel:{ formatter:'{value}' } }), yAxis:eje({ type:'category', inverse:true, data:nom, splitLine:{ show:false }, axisLabel:{ color:'#2B2926', fontSize:11 } }), series:series }; }
// Línea en el tiempo con rango habitual (promedio ± desviación de los periodos completos)
function opLinea(C, series, nna, banda){
  const lab = C.l.map(c => { const f = fecha0(c.a); return C.g==='m' ? MESC[f.getMonth()]+' '+String(f.getFullYear()).slice(2) : f.getDate()+' '+MESC[f.getMonth()]; });
  const out = series.map(s => ({ name:s.nom, type:'line', smooth:.3, data:s.v.map((v,k) => C.l[k].inc ? { value:v, symbol:'emptyCircle', symbolSize:8 } : v), symbol:'circle', symbolSize:C.g==='d' ? 3 : 7, lineStyle:{ width:2.6, color:s.col }, color:s.col,
    areaStyle:series.length===1 ? { color:'rgba(47,102,87,.10)' } : undefined }));
  if (banda && series.length===1){ const b = series[0].v.filter((v,k) => !C.l[k].inc), mu = b.reduce((a,x)=>a+x,0)/Math.max(1,b.length), sd = Math.sqrt(b.reduce((a,x)=>a+(x-mu)*(x-mu),0)/Math.max(1,b.length));
    out.push({ name:'banda-a', type:'line', data:C.l.map(() => Math.max(0, Math.round(mu-sd))), stack:'b', lineStyle:{ opacity:0 }, symbol:'none', silent:true, tooltip:{ show:false } },
             { name:'banda-b', type:'line', data:C.l.map(() => Math.round(2*sd)), stack:'b', lineStyle:{ width:1, type:'dashed', color:'rgba(47,102,87,.35)' }, symbol:'none', silent:true, areaStyle:{ color:'rgba(47,102,87,.08)' }, tooltip:{ show:false } }); }
  return { grid:{ left:48, right:16, top:series.length>1 ? 30 : 16, bottom:28 }, legend:series.length>1 ? { top:0, right:0, icon:'roundRect', itemWidth:14, itemHeight:4, textStyle:{ fontSize:11 }, data:series.map(s => s.nom) } : { show:false },
    tooltip:{ trigger:'axis', formatter:ps => '<b>'+nomCub(C, ps[0].dataIndex)+'</b><br>'+ps.filter(p => p.seriesName.indexOf('banda')<0).map(p => p.marker+esc(p.seriesName)+': <b>'+cifra(typeof p.value==='object' ? p.value.value : p.value, nna)+'</b>').join('<br>') },
    xAxis:eje({ type:'category', data:lab, boundaryGap:false, axisLabel:{ interval:'auto', hideOverlap:true } }), yAxis:eje({ type:'value', axisLabel:{ formatter:v => corto(v) } }), series:out }; }
// Fuentes: cuántos registra el sistema por cada 100 que reporta la O.R.
function opIndice(filas){ return { grid:{ left:8, right:40, top:6, bottom:6, containLabel:true }, tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' }, formatter:p => { const f = filas[p[0].dataIndex]; return '<b>'+esc(f.nom)+'</b><br>Reporte O.R.: '+miles(f.or)+'<br>Sistema: '+miles(f.sis); } },
  xAxis:eje({ type:'value', axisLabel:{ show:false } }), yAxis:eje({ type:'category', inverse:true, data:filas.map(f => f.nom), splitLine:{ show:false }, axisLabel:{ color:'#2B2926', fontSize:11 } }),
  series:[{ type:'bar', barMaxWidth:18, data:filas.map(f => { const k = deCien(f.sis, f.or); return { value:k, itemStyle:{ color:k<20 ? ROJO : SALVIA, borderRadius:[0,3,3,0] } }; }), label:{ show:true, position:'right', fontSize:10.5, fontWeight:600, color:'#2B2926', formatter:p => p.value },
    markLine:{ silent:true, symbol:'none', lineStyle:{ color:'#2B2926', type:'dashed', width:1 }, label:{ formatter:'100', color:'#5C5952', fontSize:10 }, data:[{ xAxis:100 }] } }] }; }

/* ==== [5c] HOJA ==================================================== */
// Tarjeta con el formato de los procesos
const tarjeta = (nom, sub, val, d, col, on) => '<div class="cq-kc'+(on ? ' on' : '')+'" style="--c:'+col+'"><span class="n">'+esc(nom)+(sub ? '<small>'+esc(sub)+'</small>' : '')+'</span><span class="v'+(String(val).length>9 ? ' chica' : '')+'">'+val+'</span><span class="d">'+(d || '')+'</span></div>';
const tarjetaCh = (id, tit, q) => '<div class="cq-card"><h3>'+esc(tit)+'</h3><span class="q">'+q+'</span><div class="cq-ch" data-ch="'+id+'"></div></div>';
// Dimensión chica para las tarjetas de un ranking (pocas categorías: condición, vía, modalidad, resultado…)
function dimChica(r){ const B = r.B; for (const d of ['cond','mod','via','res','sexo']){ if (B.dims[d] && !(r.q.filtros[d] || []).length && B.dims[d].vals.length<=4){ const l = porDim(r.base, d); if (l.length>=2) return { dim:d, l:l }; } } return null; }
function hoja(r, fmt, angosta){
  const q = r.q, T = r.total, nna = r.ind.nna, ch = [], ahora = new Date(), mk = (op) => { ch.push(op); return 'c'+(ch.length-1); };
  const fte = r.tipo==='fuentes' ? 'DGCOR, DGCVM y SIRENNA' : r.B.fuente+(r.B.fuente==='DGCOR' ? ', reporte de las O.R.' : '');
  const L1 = r.listas[0], L2 = r.listas[1], nL = fmt==='v' ? 6 : 10, top = (L, n) => L ? L.filas.slice(0, n).map(f => [f.nom, f.v]) : [];
  let kpis = '', eti = '', cuerpo = '', una = false;
  const PLU = { 'O.R.':'O.R.', 'Nacionalidad':'nacionalidades', 'Punto de internación':'puntos', 'Punto de repatriación':'puntos', 'Estación':'estaciones', 'Documento':'documentos', 'Estado':'estados', 'Oficina':'oficinas', 'Tipo de trámite':'tipos de trámite' };
  const tot = tarjeta(cap(r.ind.nom), r.B.fuente, cifra(T, nna), r.antes!=null && r.antes>=30 ? (T>=r.antes ? '▲ ' : '▼ ')+Math.abs((T/r.antes-1)*100).toFixed(1)+'% contra el periodo anterior' : (L1 && PLU[L1.nom] ? 'en '+L1.filas.length+' '+PLU[L1.nom] : ''), '#2B2926', true);
  // tendencia chica por semana para el lado de la hoja
  function semanal(){ const C = cubetas(q.d0, q.d1, 'auto'); if (C.l.length<3) return ''; return tarjetaCh(mk(opLinea(C, [{ nom:cap(r.ind.nom), v:serie(r.base, C), col:VERDE }], nna, true)), 'En el tiempo', 'por '+{d:'día',s:'semana',m:'mes'}[C.g]+' · franja: rango habitual'); }
  if (!T){ cuerpo = '<div class="cq-vacio">No hay registros con esta combinación en el periodo. Quita un filtro o amplía las fechas.</div>'; una = true; }
  else if (r.tipo==='prop'){
    eti = cap(r.ind.nom)+(fraseFiltros(q) ? ' '+fraseFiltros(q) : '');
    kpis = tot+r.partes.map(x => tarjeta(x.p.nom, '', cifra(x.v, nna), T>=30 ? '<b>'+deCien(x.v,T)+'</b> de cada 100' : 'de '+cifra(T, nna), x.col)).join('');
    const nP = fmt==='v' ? 5 : 6;
    cuerpo = (L1 ? tarjetaCh(mk(opCien(r, L1.filas.slice(0,nP))), 'De cada 100, por '+min(L1.nom), r.partes.map(x => minus(x.p.nom)).join(' y ')+' · las '+Math.min(nP, L1.filas.length)+' con más '+r.ind.nom) : '')+
             (L2 ? tarjetaCh(mk(opCien(r, L2.filas.slice(0,nP))), 'De cada 100, por '+min(L2.nom), r.partes.map(x => minus(x.p.nom)).join(' y ')+' · las '+Math.min(nP, L2.filas.length)+' con más '+r.ind.nom) : '');
    una = !L2;
  }
  else if (r.tipo==='tiempo'){
    const s = r.serie, C = r.C, n = s.length, prom = s.reduce((a,b) => a+b, 0)/Math.max(1,n), mk2 = s.indexOf(Math.max(...s)), u = { d:'día', s:'semana', m:'mes' }[C.g];
    eti = cap(r.ind.nom)+(fraseFiltros(q) ? ' '+fraseFiltros(q) : '');
    kpis = tot+tarjeta('Promedio por '+u, '', cifra(prom, nna), n+' '+(u==='mes' ? 'meses' : u+'s'), SALVIA)+tarjeta('Más alto', '', cifra(s[mk2], nna), nomCub(C, mk2), OCRE);
    cuerpo = tarjetaCh(mk(opLinea(C, [{ nom:cap(r.ind.nom), v:s, col:VERDE }], nna, true)), cap(r.ind.nom)+' por '+u, 'franja: rango habitual · punto hueco: periodo incompleto')+
             (L1 ? tarjetaCh(mk(opBarrasH(top(L1, 5), nna)), 'Por '+min(L1.nom), 'las 5 principales del periodo') : '');
    una = !L1;
  }
  else if (r.tipo==='comp'){
    eti = 'Comparación'+(fraseFiltros(q, r.cdim) ? ' '+fraseFiltros(q, r.cdim) : '');
    const S = r.cols.reduce((s,c) => s+c.v, 0) || 1;
    kpis = r.cols.map((c,j) => tarjeta(c.nom, '', cifra(c.v, nna), '<b>'+deCien(c.v, S)+'</b> de cada 100 entre los comparados', c.col, false)).join('');
    const otra = r.cols[0].otra, cats = [...new Set(r.cols.flatMap(c => c.top.map(t => t[0])))].slice(0,5);
    const opG = cats.length ? { grid:{ left:8, right:40, top:24, bottom:6, containLabel:true }, legend:{ top:0, left:0, icon:'roundRect', itemWidth:12, itemHeight:8, textStyle:{ fontSize:11 }, data:r.cols.map(c => c.nom) },
      tooltip:{ trigger:'axis', axisPointer:{ type:'shadow' } }, xAxis:eje({ type:'value', axisLabel:{ show:false } }), yAxis:eje({ type:'category', inverse:true, data:cats, splitLine:{ show:false }, axisLabel:{ color:'#2B2926', fontSize:11 } }),
      series:r.cols.map(c => { const m = new Map(c.top); return { name:c.nom, type:'bar', barMaxWidth:10, itemStyle:{ color:c.col }, data:cats.map(k => m.get(k) || 0), label:{ show:true, position:'right', fontSize:9.5, formatter:p => p.value ? etiq(p.value, nna) : '' } }; }) } : null;
    cuerpo = (r.Cc.l.length>1 ? tarjetaCh(mk(opLinea(r.Cc, r.cols.map(c => ({ nom:c.nom, v:c.serie, col:c.col })), nna, false)), 'Por '+{d:'día',s:'semana',m:'mes'}[r.Cc.g], 'cada línea es uno de los comparados') : '')+
             (opG ? tarjetaCh(mk(opG), otra+' principal', 'de cada uno de los comparados') : '');
  }
  else if (r.tipo==='fuentes'){
    eti = 'Rescatados'+(fraseFiltros(q) ? ' '+fraseFiltros(q) : '')+' · reporte de las O.R. comparado con el sistema';
    const sir = r.sis.nna+r.sis.adu;
    kpis = tot+tarjeta('Presentados', 'O.R. → sistema DGCVM', miles(r.v.pre)+' → '+miles(r.sis.pre), 'el sistema registra <b>'+deCien(r.sis.pre, r.v.pre)+'</b> por cada 100', VERDE)+
                tarjeta('Canalizados', 'O.R. → SIRENNA', miles(r.v.can)+' → '+miles(sir), 'SIRENNA registra <b>'+deCien(sir, r.v.can)+'</b> por cada 100', ROJO);
    cuerpo = tarjetaCh(mk(opIndice(r.fl[0].filas.slice(0,6))), 'Presentados por O.R.', 'cuántos registra el sistema por cada 100 que reporta la O.R. · rojo: menos de 20')+
             tarjetaCh(mk(opIndice(r.fl[1].filas.slice(0,6))), 'Presentados por nacionalidad', 'cuántos registra el sistema por cada 100 que reporta la O.R.');
  }
  else {   // ranking
    eti = cap(r.ind.nom)+(fraseFiltros(q) ? ' '+fraseFiltros(q) : '');
    const ch2 = dimChica(r), Td = ch2 ? ch2.l.reduce((s,x) => s+x[1], 0) : 0, pg = !ch2 && r.ind.partes ? r.ind.partes.filter(p => p.g===1).slice(0,3) : [];
    kpis = tot+(ch2 ? ch2.l.slice(0,3).map(([k,v],j) => tarjeta(r.B.dims[ch2.dim].vals[k], '', cifra(v, nna), nna && v>0 && v<5 ? 'cifra protegida' : '<b>'+deCien(v, Td)+'</b> de cada 100', [SALVIA, ROJO, OCRE][j])).join('')
      : pg.length ? pg.map((p,j) => { const v = total(Object.assign({}, r.base, medParte(r.ind, p))); return tarjeta(p.nom, '', cifra(v, nna), T>=30 ? '<b>'+deCien(v, T)+'</b> de cada 100' : '', [VERDE, ROJO, OCRE][j]); }).join('')
      : [L1, L2].filter(L => L && L.filas.length>=2).map((L,j) => tarjeta(L.filas[0].nom, 'principal '+(PLU[L.nom] ? 'entre '+L.filas.length+' '+PLU[L.nom] : 'por '+min(L.nom)), cifra(L.filas[0].v, nna), T>=30 ? '<b>'+deCien(L.filas[0].v, T)+'</b> de cada 100' : '', [VERDE, OCRE][j])).join('')+
        (() => { const C = cubetas(q.d0, q.d1, 'auto'); if (C.l.length<3) return ''; const s = serie(r.base, C), c = C.l.filter(x => !x.inc).length || s.length, u = { d:'día', s:'semana', m:'mes' }[C.g];
          return tarjeta('Promedio por '+u, '', cifra(s.filter((v,k) => !C.l[k].inc).reduce((a,b) => a+b, 0)/c, nna), c+' '+(u==='mes' ? 'meses' : u+'s')+' completos', SALVIA); })());
    const domina = L1 && L1.filas.length>=2 && L1.filas[0].v > 3*L1.filas[1].v;
    const vert = !angosta && fmt!=='v' && !domina && L1 && L1.filas.length>=3;
    cuerpo = (L1 ? tarjetaCh(mk(vert ? opBarrasV(top(L1, nL), nna) : opBarrasH(top(L1, fmt==='v' ? 6 : nL), nna, null, T)), 'Totales por '+min(L1.nom), '<b>'+cifra(T, nna)+'</b> '+esc(r.ind.nom)+' · '+(L1.filas.length>nL ? 'las '+nL+' principales de '+L1.filas.length : L1.filas.length+' en total')) : '')+
             (L2 && !(ch2 && ch2.dim===L2.dim) ? tarjetaCh(mk(opBarrasH(top(L2, 5), nna, OCRE, T)), 'Por '+min(L2.nom), 'las 5 principales') : semanal());
    una = false;
  }
  const html = '<article class="cq-hoja f'+fmt+' t-'+r.tipo+(una ? ' una' : '')+'">'+
    '<header class="cq-top"><div><div class="cq-ceja">IA-NAMI · '+esc(r.ind.proc)+'</div><h2 class="cq-tit">'+esc(titulo(r))+'</h2></div><div class="cq-meta"><b>'+rangoTxt(q.d0, q.d1)+'</b>'+esc(fte)+'</div></header>'+
    (kpis ? '<div class="cq-kpis"><div class="cq-eti">'+esc(eti)+'</div><div class="cq-kr">'+kpis+'</div></div>' : '')+
    (r.hallazgo ? '<div class="cq-hall">'+r.hallazgo+'</div>' : '')+
    '<div class="cq-cuerpo">'+cuerpo+'</div>'+
    '<footer class="cq-pie"><span>'+leyenda(r)+'</span><span class="fte">Fuente: <b>'+esc(fte)+'</b><br>Datos al '+fechaTxt(finBase(r.B))+' · generado '+fechaTxt(iso(ahora))+' '+String(ahora.getHours()).padStart(2,'0')+':'+String(ahora.getMinutes()).padStart(2,'0')+'</span></footer></article>';
  return { html:html, ch:ch };
}
// Dibuja las gráficas de una hoja ya insertada
function dibujar(cont, ops, anim){
  const l = []; cont.querySelectorAll('[data-ch]').forEach(el => { const op = ops[+el.dataset.ch.slice(1)]; if (!op) return; const c = echarts.init(el); c.setOption(Object.assign(BASEOP(anim), op)); l.push(c); });
  return l;
}

/* ==== [6] VENTANA ================================================== */
const $ = id => document.getElementById(id);
let Q = null, R = null, abierto = false, GR = [], menuDe = null;
const EJ = ['de los rescatados cuántos fueron canalizados', 'NNA de Colombia por O.R.', 'repatriados por punto en noviembre', 'internaciones de Venezuela contra Colombia'];
function montar(){
  if ($('cq')) return;
  const m = document.createElement('div'); m.id = 'cq'; m.className = 'cq'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','cq-t'); m.hidden = true;
  m.innerHTML = '<div class="cq-caja" id="cq-caja"><div class="cq-cab"><h2 id="cq-t">Pregunta a INAMI</h2><button type="button" class="cq-x" data-cqx aria-label="Cerrar">×</button></div>'+
    '<form class="cq-txt" id="cq-f" autocomplete="off"><input id="cq-q" type="search" placeholder="¿Qué quieres saber? Ej.: NNA de Colombia por O.R." aria-label="Escribe tu pregunta"><button type="submit">Consultar</button><div class="cq-sug" id="cq-sug" hidden></div></form>'+
    '<div id="cq-inicio"><div class="cq-arma"><span>o arma tu consulta:</span><button type="button" class="cq-pz vacia" data-pz="ind">¿Qué quieres ver? ▾</button></div>'+
      '<div class="cq-ej"><span>Prueba:</span>'+EJ.map(e => '<button type="button" data-cqej="'+esc(e)+'">'+esc(e)+'</button>').join('')+'</div></div>'+
    '<div id="cq-res" hidden><div class="cq-frase" id="cq-frase"></div><div id="cq-av"></div>'+
      '<div class="cq-bar"><div class="cq-nav"><button type="button" data-cqdes id="cq-des" title="Regresa al paso anterior">↶ Deshacer</button><button type="button" data-cqnue title="Borra la consulta y empieza de nuevo">Nueva pregunta</button></div><div class="cq-pil" role="group" aria-label="Formato"><button type="button" data-cqfmt="h">Horizontal</button><button type="button" data-cqfmt="v">Vertical</button></div>'+
      '<div class="cq-acc"><button type="button" class="pri" data-cqacc="pdf">PDF</button><button type="button" data-cqacc="img">Imagen</button><button type="button" data-cqacc="wa" title="Por WhatsApp: en el celular se adjunta sola; en computadora se descarga y se abre WhatsApp Web">Compartir</button><button type="button" data-cqacc="ir" id="cq-ir">Ver en el tablero</button></div></div>'+
      '<span class="cq-nt" id="cq-nt"></span><span class="cq-msg" id="cq-msg"></span><div class="cq-hw" id="cq-hw"></div></div>'+
    '<div class="cq-menu" id="cq-menu" hidden></div></div><div class="cq-render" id="cq-render" aria-hidden="true"></div>';
  document.body.appendChild(m);
  m.addEventListener('click', clic);
  $('cq-f').addEventListener('submit', e => { e.preventDefault(); const t = $('cq-q').value.trim(); $('cq-sug').hidden = true; if (!t) return; consultar(entender(t)); $('cq-q').value = ''; });
  $('cq-q').addEventListener('input', sugerir); $('cq-q').addEventListener('keydown', teclaSug); $('cq-q').addEventListener('blur', () => setTimeout(() => { $('cq-sug').hidden = true; }, 160));
  document.addEventListener('keydown', e => { if (e.key==='Escape' && abierto){ if (!$('cq-menu').hidden) cerrarMenu(); else cerrar(); } });
  new ResizeObserver(() => GR.forEach(c => c.resize())).observe($('cq-hw'));
}
function abrir(){ montar(); $('cq').hidden = false; document.body.classList.add('modal'); abierto = true; setTimeout(() => $('cq-q').focus(), 30); }
function cerrar(){ $('cq').hidden = true; document.body.classList.remove('modal'); abierto = false; cerrarMenu();
  // al cerrar se limpia todo: la próxima vez abre en blanco
  limpiar(); }
// Regresa la ventana al inicio (caja vacía) sin cerrarla
function limpiar(){ cerrarMenu(); GR.forEach(c => c.dispose()); GR = []; Q = null; R = null; HIST = []; $('cq-hw').innerHTML = ''; $('cq-av').innerHTML = ''; $('cq-q').value = ''; $('cq-res').hidden = true; $('cq-inicio').hidden = false; $('cq-caja').classList.remove('con'); }
// Deshacer: cada consulta pintada se guarda; regresar quita la actual y pinta la anterior (sin anterior, vuelve al inicio)
let HIST = [], deshaciendo = false;
function deshacer(){ HIST.pop(); const prev = HIST[HIST.length-1]; if (!prev){ limpiar(); $('cq-q').focus(); return; } deshaciendo = true; Q = JSON.parse(prev); pintar(); deshaciendo = false; }
function consultar(q){ const fmt = Q ? Q.fmt : 'h'; Q = q; Q.fmt = fmt; limitar(Q); pintar(); }
function pintar(){
  R = calcular(Q); if (!deshaciendo){ const k = JSON.stringify(Q); if (HIST[HIST.length-1]!==k) HIST.push(k); if (HIST.length>30) HIST.shift(); } $('cq-inicio').hidden = true; $('cq-res').hidden = false; $('cq-caja').classList.add('con');
  pintarFrase();
  const fix = (Q.fix || []).map(x => 'Entendí «'+x[0]+'» como «'+x[1]+'».'), av = fix.concat(R.avisos);
  $('cq-av').innerHTML = av.length ? '<div class="cq-avisos">'+av.map(a => '<div>'+esc(a)+'</div>').join('')+'</div>' : '';
  document.querySelectorAll('[data-cqfmt]').forEach(b => b.classList.toggle('on', b.dataset.cqfmt===Q.fmt));
  $('cq-ir').textContent = 'Profundizar en el tablero ›'; $('cq-ir').title = 'Abre '+R.ind.proc+' con esta consulta'; $('cq-nt').textContent = notaTablero();
  const hw = $('cq-hw'); hw.className = 'cq-hw'+(Q.fmt==='v' ? ' vert' : ''); GR.forEach(c => c.dispose());
  const h = hoja(R, Q.fmt, hw.clientWidth>0 && hw.clientWidth<600); hw.innerHTML = h.html; GR = dibujar(hw, h.ch, true); $('cq-msg').textContent = '';
}
// La consulta como frase de piezas: cada pieza abre un menú con solo lo que existe
const SLOT = ['n','e','p','est','of','doc','tt'];
const TODO = { n:'todas las nacionalidades', e:'todas las O.R.', p:'todos los puntos', est:'todas las estaciones', of:'todas las oficinas', doc:'todos los documentos', tt:'todos los trámites', mod:'toda modalidad', via:'todas las vías', sexo:'ambos sexos', edad:'todas las edades', cond:'toda condición', mot:'todo motivo' };
function pintarFrase(){
  const ind = INDK[Q.ind], B = BASES[ind.b], pz = (k, txt, cl, x) => '<button type="button" class="cq-pz '+(cl || '')+'" data-pz="'+k+'">'+txt+(x ? '' : ' <small>▾</small>')+'</button>';
  let h = pz('ind', esc(cap(ind.nom)), 'ind');
  if (ind.partes && ind.partes.length){ if (Q.partes.length){ h += '<span class="cq-cj">¿'+ind.cu+'</span>'+Q.partes.map(k => '<button type="button" class="cq-pz parte" data-cqquitap="'+k+'" title="Quitar">'+esc(minus(parteDe(ind,k).nom))+' <small>×</small></button>').join('<span class="cq-cj">y</span>')+'<span class="cq-cj">?</span>'+(Q.partes.length<3 ? pz('parte', '+', 'mas', true) : ''); }
    else h += pz('parte', '+ ¿'+ind.cu+'…?', 'mas', true); }
  // cada filtro posible es una casilla visible («de todas las nacionalidades ▾»); los demás van en «+ más filtros»
  const vivos = Object.keys(B.dims).filter(d => (Q.filtros[d] || []).length || (R.base && porDim(R.base, d).length>=2)), prin = vivos.filter(d => SLOT.indexOf(d)>=0).sort((a,b) => SLOT.indexOf(a)-SLOT.indexOf(b)).slice(0,3);
  vivos.filter(d => prin.indexOf(d)<0 && (Q.filtros[d] || []).length).forEach(d => prin.push(d));
  prin.forEach(k => { const f = Q.filtros[k] || []; h += '<span class="cq-cj">'+(CONECTOR[k] || 'con')+'</span>';
    h += f.length ? f.map(i => '<button type="button" class="cq-pz fil" data-cqquita="'+k+':'+i+'" title="Quitar">'+esc(B.dims[k].vals[i])+' <small>×</small></button>').join('')+(f.length<3 ? pz('fil:'+k, '+', 'mas', true) : '')
      : pz('fil:'+k, esc(TODO[k] || 'cualquier '+min(B.dims[k].nom)), 'todo'); });
  if (vivos.some(d => prin.indexOf(d)<0)) h += pz('fil', '+ más filtros', 'mas', true);
  const dsc = Q.desg==='t' ? { auto:'tiempo', d:'día', s:'semana', m:'mes' }[Q.gran] : Q.desg ? min(B.dims[Q.desg].nom) : (R.listas[0] ? min(R.listas[0].nom) : 'sin desglose');
  h += '<span class="cq-cj">por</span>'+pz('desg', esc(dsc))+'<span class="cq-cj">·</span>'+pz('per', esc(rangoTxt(Q.d0, Q.d1)));
  if (Object.values(Q.filtros).some(v => v.length>=2)) h += '<button type="button" class="cq-pz'+(Q.cmp ? ' on' : '')+'" data-cqcmp>'+(Q.cmp ? '✓ ' : '')+'lado a lado</button>';
  if (Q.ind==='resc' && Q.partes.some(k => k==='pre' || k==='can')) h += pz('fte', Q.fuente==='cmp' ? 'comparado con el sistema' : 'según el reporte de las O.R.');
  $('cq-frase').innerHTML = h;
}
function meses(B){ const l = []; let f = fecha0(B.inicio); f = new Date(f.getFullYear(), f.getMonth(), 1); const fin = fecha0(finBase(B)); while (f<=fin){ l.push(new Date(f)); f.setMonth(f.getMonth()+1); } return l; }
function abrirMenu(k, btn){
  const m = $('cq-menu'), caja = $('cq-caja'), ind = Q ? INDK[Q.ind] : null, B = ind ? BASES[ind.b] : null, op = (v, t, on, sub) => '<button type="button" data-op="'+esc(v)+'" class="'+(on ? 'on' : '')+'"><span>'+esc(t)+'</span>'+(sub ? '<small>'+esc(sub)+'</small>' : on ? '<small>✓</small>' : '')+'</button>';
  let h = '';
  if (k==='ind') h = IND.map(x => op(x.k, cap(x.nom), Q && Q.ind===x.k, x.proc.split(' · ')[0])).join('');
  else if (k==='parte') h = ind.partes.filter(p => Q.partes.indexOf(p.k)<0).map(p => op(p.k, p.nom)).join('');
  else if (k==='desg') h = op('', 'Automático', !Q.desg)+Object.keys(B.dims).map(d => op(d, B.dims[d].nom, Q.desg===d)).join('')+'<div class="cq-sep">En el tiempo</div>'+[['t:s','Por semana'],['t:m','Por mes'],['t:d','Por día']].map(x => op(x[0], x[1], Q.desg==='t' && 't:'+Q.gran===x[0])).join('');
  else if (k==='per') h = op('todo', 'Todo el periodo', Q.d0===B.inicio && Q.d1===finBase(B), rangoTxt(B.inicio, finBase(B)))+meses(B).map(f => op(iso(f), cap(MES[f.getMonth()])+' '+f.getFullYear(), Q.d0===iso(f))).join('')+
    '<div class="cq-sep">Personalizado</div><div class="cq-fech"><input type="date" id="cq-d0" value="'+Q.d0+'" min="'+B.inicio+'" max="'+finBase(B)+'"><input type="date" id="cq-d1" value="'+Q.d1+'" min="'+B.inicio+'" max="'+finBase(B)+'"><button type="button" data-op="pers">Aplicar</button></div>';
  else if (k==='fte') h = op('or', 'Según el reporte de las O.R.', Q.fuente==='or')+op('cmp', 'Comparado con el sistema', Q.fuente==='cmp', 'DGCVM y SIRENNA');
  else if (k.startsWith('fil')){ const d = k.split(':')[1], ds = d ? [d] : Object.keys(B.dims).filter(x => SLOT.indexOf(x)<0 || !(x in TODO));
    h = (d ? '' : '<div class="cq-sep">Esta base también trae: '+esc(Object.keys(B.dims).filter(x => porDim(R.base, x).length>=2 || (Q.filtros[x] || []).length).map(x => min(B.dims[x].nom)).join(', '))+'</div>')+
      '<input id="cq-fb" type="search" placeholder="Busca '+esc(d ? min(B.dims[d].nom) : ds.map(x => min(B.dims[x].nom)).join(', '))+'…" aria-label="Buscar filtro"><div id="cq-fl"></div>'; m.dataset.dims = ds.join(','); }
  m.innerHTML = h; m.hidden = false; m.dataset.cqk = k; menuDe = btn;
  const a = btn.getBoundingClientRect(), c = caja.getBoundingClientRect(); m.style.top = (a.bottom - c.top + caja.scrollTop + 6)+'px'; m.style.left = Math.max(8, Math.min(a.left - c.left, c.width - 300))+'px';
  if (k.startsWith('fil')){ const inp = $('cq-fb'), ds = m.dataset.dims.split(','); inp.addEventListener('input', () => listaFiltros(inp.value, ds)); listaFiltros('', ds); setTimeout(() => inp.focus(), 0); }
}
function listaFiltros(t, ds){
  const B = BASES[INDK[Q.ind].b], n = norm(t), l = []; ds = ds && ds[0] ? ds : Object.keys(B.dims);
  ds.forEach(d => B.dims[d].vals.forEach((v,i) => { if (!v || (Q.filtros[d] || []).includes(i)) return; const x = norm(v); if (!n || x.indexOf(n)>=0) l.push([d, i, v, x.startsWith(n) ? 0 : 1]); }));
  l.sort((a,b) => a[3]-b[3] || a[2].length-b[2].length);
  $('cq-fl').innerHTML = (n ? l.slice(0,10) : ds.flatMap(d => porDim(R.base, d).filter(([i]) => !(Q.filtros[d] || []).includes(i)).slice(0, ds.length===1 ? 8 : 3).map(([i,v]) => [d, i, B.dims[d].vals[i], v]))).map(x => '<button type="button" data-fil="'+x[0]+':'+x[1]+'"><span>'+esc(x[2])+'</span><small>'+(x[3]!=null && ds.length===1 ? cifra(x[3], INDK[Q.ind].nna) : esc(B.dims[x[0]].nom))+'</small></button>').join('') || '<span class="cq-nada">No existe en esta base</span>';
}
function cerrarMenu(){ const m = $('cq-menu'); if (m) m.hidden = true; menuDe = null; }
function elegir(k, v){
  const ind = INDK[Q.ind], B = BASES[ind.b];
  if (k==='ind'){ const f = Q.filtros, prev = B, B2 = BASES[INDK[v].b]; Q.ind = v; Q.partes = []; Q.fuente = 'or'; Q.filtros = {};
    Object.keys(f).forEach(d => { if (B2.dims[d] && prev.dims[d]){ const l = f[d].map(i => B2.dims[d].vals.indexOf(prev.dims[d].vals[i])).filter(i => i>=0); if (l.length) Q.filtros[d] = l; } }); if (Q.desg && Q.desg!=='t' && !B2.dims[Q.desg]) Q.desg = ''; }
  else if (k==='parte'){ if (Q.partes.length<3) Q.partes.push(v); }
  else if (k==='desg'){ if (v.startsWith('t:')){ Q.desg = 't'; Q.gran = v.slice(2); } else Q.desg = v; }
  else if (k==='per'){ if (v==='todo'){ Q.d0 = B.inicio; Q.d1 = finBase(B); } else if (v==='pers'){ const a = $('cq-d0').value, b = $('cq-d1').value; if (a && b){ Q.d0 = a<b ? a : b; Q.d1 = a<b ? b : a; } } else { Q.d0 = v; Q.d1 = iso(new Date(fecha0(v).getFullYear(), fecha0(v).getMonth()+1, 0)); } }
  else if (k==='fte') Q.fuente = v;
  Q.avisos = []; Q.fix = []; cerrarMenu(); limitar(Q); pintar();
}
// Sugerencias mientras se escribe: completan la última palabra con lo que existe en las bases
let SUG = [], sAct = 0;
function sugerir(){
  const v = $('cq-q').value, i = v.lastIndexOf(' '), w = norm(v.slice(i+1)), box = $('cq-sug');
  if (w.length<2){ box.hidden = true; return; }
  const c = [], ya = new Set(), mete = (txt, tipo) => { const k = norm(txt); if (ya.has(k)) return; ya.add(k); c.push([txt, tipo, k]); };
  IND.forEach(x => mete(x.nom, 'qué ver')); IND.forEach(x => (x.partes || []).forEach(p => mete(minus(p.nom), 'parte de '+x.nom)));
  ['nacionalidad','O.R.','punto','estación','mes','semana'].forEach(d => mete('por '+d, 'desglose'));
  MES.forEach(m => mete(m, 'periodo'));
  Object.values(BASES).forEach(B => Object.keys(B.dims).forEach(d => { if (['n','e','p','est','doc','cond','mod','via'].indexOf(d)>=0) B.dims[d].vals.forEach(x => mete(x, B.dims[d].nom.toLowerCase())); }));
  Object.keys(GENT).forEach(g => mete(GENT[g], 'nacionalidad'));
  let l = c.filter(x => x[2].startsWith(w) || x[2].split(' ').some(p => p.startsWith(w))).sort((a,b) => (a[2].startsWith(w) ? 0 : 1)-(b[2].startsWith(w) ? 0 : 1) || a[0].length-b[0].length).slice(0,7);
  if (!l.length && w.length>=4) l = c.filter(x => x[2].split(' ').some(p => distancia(w, p.slice(0, w.length), 1)<=1)).slice(0,5);
  SUG = l; sAct = 0; if (!l.length){ box.hidden = true; return; }
  box.innerHTML = l.map((x,j) => '<button type="button" data-sug="'+j+'" class="'+(j===0 ? 'act' : '')+'"><span>'+esc(x[0])+'</span><small>'+esc(x[1])+'</small></button>').join(''); box.hidden = false;
}
function usarSug(j){ const x = SUG[j]; if (!x) return; const inp = $('cq-q'), v = inp.value, i = v.lastIndexOf(' '); inp.value = v.slice(0, i+1)+x[0].toLowerCase()+' '; $('cq-sug').hidden = true; inp.focus(); }
function teclaSug(e){ const box = $('cq-sug'); if (box.hidden || !SUG.length) return;
  if (e.key==='ArrowDown' || e.key==='ArrowUp'){ sAct = (sAct+(e.key==='ArrowDown' ? 1 : -1)+SUG.length)%SUG.length; box.querySelectorAll('[data-sug]').forEach((b,j) => b.classList.toggle('act', j===sAct)); e.preventDefault(); }
  else if (e.key==='Tab' || e.key==='Enter'){ const w = norm($('cq-q').value.split(' ').pop()); if (e.key==='Enter' && (w.length<2 || SUG[sAct][2]===w)){ box.hidden = true; return; } e.preventDefault(); usarSug(sAct); }
  else if (e.key==='Escape') box.hidden = true; }
function clic(e){
  const T = s => e.target.closest(s); let b;
  if (e.target.id==='cq' || T('[data-cqx]')){ cerrar(); return; }
  if ((b = T('[data-sug]'))){ usarSug(+b.dataset.sug); return; }
  if ((b = T('#cq-menu [data-op]'))){ elegir($('cq-menu').dataset.cqk, b.dataset.op); return; }
  if ((b = T('#cq-menu [data-fil]'))){ const [d,i] = b.dataset.fil.split(':'); Q.filtros[d] = Q.filtros[d] || []; if (Q.filtros[d].length>=3) Q.filtros[d].shift(); Q.filtros[d].push(+i); Q.avisos = []; Q.fix = []; cerrarMenu(); pintar(); return; }
  if (T('#cq-menu')) return;
  if ((b = T('[data-pz]'))){ if (b.dataset.pz==='ind' && !Q){ Q = nuevaQ(); Q.fmt = 'h'; } if (menuDe===b){ cerrarMenu(); return; } abrirMenu(b.dataset.pz, b); return; }
  cerrarMenu();
  if ((b = T('[data-cqej]'))){ consultar(entender(b.dataset.cqej)); return; }
  if ((b = T('[data-cqquita]'))){ const [k,i] = b.dataset.cqquita.split(':'); Q.filtros[k] = Q.filtros[k].filter(x => x!==+i); if (!Q.filtros[k].length) delete Q.filtros[k]; Q.avisos = []; Q.fix = []; pintar(); return; }
  if ((b = T('[data-cqquitap]'))){ Q.partes = Q.partes.filter(k => k!==b.dataset.cqquitap); Q.avisos = []; Q.fix = []; limitar(Q); pintar(); return; }
  if (T('[data-cqcmp]')){ Q.cmp = !Q.cmp; pintar(); return; }
  if ((b = T('[data-cqfmt]'))){ Q.fmt = b.dataset.cqfmt; pintar(); return; }
  if ((b = T('[data-cqacc]'))) accion(b.dataset.cqacc);
  if (T('[data-cqdes]')){ deshacer(); return; }
  if (T('[data-cqnue]')){ limpiar(); $('cq-q').focus(); return; }
}

/* ==== [7] DESCARGAS =============================================== */
const LIBS = ['lib/html2canvas.min.js', 'lib/jspdf.umd.min.js'];   // incluidas en el sitio (versiones 1.4.1 y 2.5.1)
// Carga una librería del sitio; si no está, la toma de la red como respaldo
const RESPALDO = { 'lib/html2canvas.min.js':'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'lib/jspdf.umd.min.js':'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' };
const cargar = u => new Promise((ok, mal) => { if (document.querySelector('script[src="'+u+'"]')) return ok(); const s = document.createElement('script'); s.src = u; s.onload = ok;
  s.onerror = () => { s.remove(); if (!RESPALDO[u]) return mal(); const r = document.createElement('script'); r.src = RESPALDO[u]; r.onload = ok; r.onerror = mal; document.head.appendChild(r); }; document.head.appendChild(s); });
const nombreArch = () => { let t = norm(titulo(R)); if (t.length>56) t = t.slice(0, t.lastIndexOf(' ', 56)); return 'IA-NAMI_'+t.replace(/ /g,'_')+'_'+Q.d0.slice(0,7); };
// La imagen se dibuja aparte, a tamaño fijo, para que salga igual desde cualquier pantalla
async function lienzo(){
  await Promise.all(LIBS.map(cargar)); const fmt = Q.fmt, w = fmt==='v' ? 720 : 1600, h = fmt==='v' ? 1280 : 900, z = $('cq-render');
  const H = hoja(R, fmt, false); z.innerHTML = '<div class="cq-hw fijo'+(fmt==='v' ? ' vert' : '')+'" style="width:'+w+'px">'+H.html+'</div>';
  const el = z.querySelector('.cq-hoja'); el.style.width = w+'px'; el.style.height = h+'px'; const cs = dibujar(z, H.ch, false);
  await new Promise(ok => setTimeout(ok, 60));
  try { return await window.html2canvas(el, { scale:fmt==='v' ? 2.25 : 1.5, backgroundColor:'#FCFBF7', useCORS:true }); } finally { cs.forEach(c => c.dispose()); z.innerHTML = ''; }
}
const msg = t => { const m = $('cq-msg'); if (m) m.textContent = t; };
function bajar(href, nombre){ const a = document.createElement('a'); a.href = href; a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 300); }
async function accion(k){
  if (k==='ir'){ irTablero(); return; }
  msg('Generando…');
  try {
    const c = await lienzo(), nombre = nombreArch();
    if (k==='pdf'){ const { jsPDF } = window.jspdf, o = c.width>c.height ? 'landscape' : 'portrait', pdf = new jsPDF({ orientation:o, unit:'px', format:[c.width/1.5, c.height/1.5], hotfixes:['px_scaling'] });
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, c.width/1.5, c.height/1.5); pdf.save(nombre+'.pdf'); msg('PDF descargado.'); return; }
    const blob = await new Promise(ok => c.toBlob(ok, 'image/png')), file = new File([blob], nombre+'.png', { type:'image/png' });
    // Compartir: en el celular abre el menú del teléfono con la imagen; en computadora la descarga y abre WhatsApp Web
    if (k==='wa' && navigator.canShare && navigator.canShare({ files:[file] })){ try { await navigator.share({ files:[file], title:titulo(R) }); msg('Listo.'); return; } catch(err){ if (err && err.name==='AbortError'){ msg(''); return; } } }
    const u = URL.createObjectURL(blob); bajar(u, nombre+'.png'); setTimeout(() => URL.revokeObjectURL(u), 2000);
    if (k==='wa'){ window.open('https://wa.me/?text='+encodeURIComponent(titulo(R)+' — te comparto la imagen (adjúntala desde tus descargas).'), '_blank', 'noopener'); msg('Imagen descargada; adjúntala en el chat de WhatsApp que se abrió.'); return; }
    msg('Imagen descargada.');
  } catch(err){ msg('No se pudo generar el archivo. Revisa tu conexión e inténtalo de nuevo.'); }
}
// Qué filtros de la consulta recibe cada vista del tablero (dimensión: cuántos valores acepta)
const ACEPTA = { control:{ n:3, e:3, p:1, via:1 }, regulacion:{ n:3, e:3, doc:1, of:1 }, proteccion:{ e:3, p:1, mod:1 } };
function noPasan(){ const a = ACEPTA[R.ind.ir.d] || {}, B = R.B, l = [];
  Object.keys(Q.filtros).forEach(d => { const v = Q.filtros[d] || []; if (!v.length) return; const n = a[d] || 0; if (v.length>n) l.push(n ? v.slice(n).map(i => B.dims[d].vals[i]).join(', ')+' (la vista filtra '+(n===1 ? 'un solo valor' : 'hasta '+n)+' de '+min(B.dims[d].nom)+')' : min(B.dims[d].nom)+': '+v.map(i => B.dims[d].vals[i]).join(', ')); });
  return l; }
function notaTablero(){ const l = noPasan(), cruce = R.tipo==='fuentes';
  return (cruce ? 'La comparación con el sistema se abrirá completa en Analizar; por ahora te lleva a Rescates. ' : '')+(l.length ? 'En el tablero no se aplica: '+l.join('; ')+'.' : ''); }
function irTablero(){
  const ind = R.ind, B = R.B, f = Q.filtros, nom = d => (f[d] || []).map(i => B.dims[d].vals[i]);
  const p = Object.assign({}, ind.ir, { d0:Q.d0, d1:Q.d1, nats:nom('n'), ests:nom('e'), ptos:nom('p') });
  if (Q.ind==='rep'){ if (f.mod && f.mod.length===1) p.mod = f.mod[0]; const em = { ad:'ad', me:'me', ah:'ah', am:'am', ac:'ac', na:'na' }[Q.partes[0]]; if (em) p.em = em; }
  if (Q.ind==='ing'){ const v = { aer:0, ter:1, mar:2 }[Q.partes[0]]; p.via = f.via && f.via.length===1 ? f.via[0] : v!=null ? v : null; }
  if (Q.ind==='tram' && f.doc && f.doc.length===1) p.doc = f.doc[0];
  if (Q.ind==='tram' && f.of && f.of.length===1) p.ofi = f.of[0];
  if (Q.ind==='resc'){ const em = { pre:'opre', can:'ocan', pv:'pv', rei:'rei' }[Q.partes[0]]; if (em) p.em = em; }
  if (window.IANAMI_NAV){ cerrar(); window.IANAMI_NAV.ir(p.d, p); }
}

window.IANAMI_CONSULTA = { abrir:abrir, cerrar:cerrar, _prueba:{ entender:entender, calcular:calcular, nuevaQ:nuevaQ, limitar:limitar, titulo:titulo, IND:IND, BASES:BASES, suma:suma } };
})();
