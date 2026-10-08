/* ==================================================================
   IA-NAMI · PÁGINA PRINCIPAL (PULSO)
   ÍNDICE JS: [1] CONFIG Y CATÁLOGOS   [2] DATOS (cubo y consultas)
              [3] UTILIDADES           [4] ESTADO Y FILTRO
              [5] ANÁLISIS AUTOMÁTICO  [6] INDICADORES
              [7] MAPA (estados, círculos, puntos)
              [8] FLUJOS ANIMADOS Y TRANSICIÓN DE COLOR
              [9] BARRA DE TIEMPO Y REPRODUCCIÓN
              [10] COLUMNA DE ANÁLISIS Y FRANJA DE CAJAS
              [11] BUSCADOR, SECCIONES Y AVISOS   [12] ARRANQUE
   Los datos llegan de datos/datos.js, que genera robot/convertir.py a
   partir de las bases de la carpeta DATA. El periodo se toma de ahí.
   ================================================================== */
(function(){
'use strict';

/* ==== [1] CONFIG Y CATÁLOGOS ====================================== */
const D = window.IANAMI_DATOS, GEO = window.IANAMI_GEO, CEN = window.IANAMI_CEN;
const NN = D.nats.length, NS = D.ests.length;
let NW = D.ends.length, ND = D.dias, P0 = 0, P1 = D.dias;   // semanas y días del periodo elegido; P0-P1: su lugar en los datos completos
const OT = NN - 2, MX = NN - 1;                       // índices de "Otras" y "México"
// Series diarias por estado y por nacionalidad: llegan dispersas ([día, columna, valor]) y aquí se expanden
['ds','dn'].forEach(p => Object.keys(D[p]).forEach(k => { const L = p==='ds' ? NS : NN, a = new Float64Array(ND*L), c = D[p][k];
  for (let i=0;i<c.length;i+=3) a[c[i]*L + c[i+1]] = c[i+2]; D[p][k] = a; }));
// Copia de los datos completos: cada periodo se arma a partir de aquí (aplicarPeriodo)
const D0 = { dias:D.dias, ends:D.ends.slice(), daily:Object.assign({}, D.daily), ds:Object.assign({}, D.ds), dn:Object.assign({}, D.dn), wks:[] };
[D.puntos, D.repPuntos, D.emPuntos, D.cbp ? D.cbp.sectores : []].forEach(l => l.forEach(o => D0.wks.push({ obj:o, wk:o.wk.slice() })));
const EST = D.ests;
const ESTC = EST.map(e => e==='Ciudad de México'?'CDMX':e==='Estado de México'?'Edo. de México':e==='Baja California Sur'?'Baja California S.':e);
const ECLAVE = EST.map(e => 'MX_' + (e==='Estado de México' ? 'México' : e));   // clave del estado en el mapa
const MES12 = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const INICIO0 = new Date(D.inicio+'T00:00:00');       // primer día de las bases
let INICIO = INICIO0;                                  // primer día del periodo elegido; el calendario sale de aquí
const INDS = [
  {k:'ing',  n:'Ingresos',    g:'reg', nat:true,  donde:'Por dónde ingresan'},
  {k:'rech', n:'Rechazos',    g:'reg', nat:true,  donde:'Dónde son rechazados'},
  {k:'tram', n:'Trámites',    g:'reg', nat:true,  donde:'Dónde tramitan'},
  {k:'resc', n:'Rescatados',  g:'irr', nat:true,  donde:'Dónde son rescatados'},
  {k:'pres', n:'Presentados', g:'irr', nat:true,  donde:'Dónde son presentados'},
  {k:'can',  n:'Canalizados', g:'irr', nat:true,  donde:'Dónde son canalizados'},
  {k:'ret',  n:'Retornados',  g:'irr', nat:true,  donde:'Desde dónde retornan'},
  {k:'recib',n:'Recibidos',   g:'usa', nat:true,  donde:'Dónde son recibidos'},
  {k:'rep',  n:'Repatriados', g:'usa', nat:false, donde:'Dónde son repatriados'}
];
const IND = {}; INDS.forEach(m => IND[m.k] = m);
const GRUPOS = [['reg','Regular',3],['irr','Irregular',4],['usa','Desde EE. UU.',2]];
const ICONO = {
  ing:'M3 12h12M11 7l5 5-5 5M20 4v16', rech:'M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', tram:'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  resc:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM5.7 5.7l4.2 4.2M14.1 14.1l4.2 4.2M18.3 5.7l-4.2 4.2M9.900 14.100l-4.200 4.200',
  pres:'M4 21V9l8-5 8 5v12M9 21v-6h6v6', can:'M12 20s-7-4.300-7-9.400A4 4 0 0 1 12 8a4 4 0 0 1 7 2.600C19 15.700 12 20 12 20z',
  ret:'M21 12H9M13 7l-5 5 5 5M4 4v16', recib:'M12 4v10M8 10l4 4 4-4M5 19h14', rep:'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5'
};
// Secciones del menú (las que aún no existen muestran qué llevarán)
const SECCIONES = [['pulso','Pulso'],['dir','Direcciones'],['analizar','Analizar'],['prosp','Prospectiva'],['contexto','Contexto'],['bases','Bases']];
const DIRS = [
  {s:'DGCVM', n:'Control y Verificación Migratoria', ind:['ing','rech','pres','can','ret']},
  {s:'DGRAM', n:'Regulación y Archivo Migratorio',   ind:['tram'], docs:true},
  {s:'DGPMV', n:'Protección al Migrante',            ind:['rep']},
  {s:'DGCOR', n:'',                                  ind:['resc','recib']}
];
// Agrupaciones territoriales (vienen de Cinturones_Contencion.csv y Centro_Coordinador_Operaciones.csv)
const AGR = {
  c:{ n:'Cinturón', sin:'Sin cinturón', nombres:['Cinturón 1','Cinturón 2','Cinturón 3','Cinturón 4'],
      m:{'Chiapas':0,'Tabasco':0,'Oaxaca':1,'Veracruz':1,'Hidalgo':2,'Nuevo León':2,'Puebla':2,'San Luis Potosí':2,'Tamaulipas':2,'Tlaxcala':2,'Baja California':3,'Chihuahua':3,'Coahuila':3,'Sonora':3} },
  o:{ n:'CECO', sin:'Sin CECO', nombres:['CECO Suchiate','CECO Río Bravo'],
      m:{'Chiapas':0,'Tabasco':0,'Oaxaca':0,'Veracruz':0,'Quintana Roo':0,'Yucatán':0,'Puebla':0,'Estado de México':0,'Hidalgo':0,'Campeche':0,'Tlaxcala':0,'Chihuahua':1,'Baja California':1,'Nuevo León':1,'San Luis Potosí':1,'Coahuila':1,'Tamaulipas':1,'Sonora':1,'Sinaloa':1,'Durango':1} }
};
Object.keys(AGR).forEach(a => { AGR[a].de = EST.map(e => AGR[a].m[e]==null ? -1 : AGR[a].m[e]); });
const TODOS_GRUPO = {}; Object.keys(AGR).forEach(a => { TODOS_GRUPO[a] = []; AGR[a].de.forEach((q,s) => { if (q>=0) TODOS_GRUPO[a].push(s); }); });
const miembros = (a,q) => { const o = []; AGR[a].de.forEach((x,s) => { if (x===q) o.push(s); }); return o; };
// Contexto por país: catálogo verificado en js/contexto.js (qué pasó, efecto migratorio y fuente)
const CATS = {pol:['Política','#6B5B95'], eco:['Economía','#8F7F2E'], vio:['Violencia','#B4472F'], des:['Desastre','#3D7A8C'], mig:['Política migratoria','#2B2926']};
const CTX = window.IANAMI_CONTEXTO || {reg:[]};
const ORIGEN = {840:[-97,36.2], 124:[-100,54], 643:[38,56]};     // puntos de partida ajustados
const ANCLA_EU = [-99.3, 32.4];
// Íconos del mapa: punto de internación (marcador), repatriación (casa) y estación migratoria (edificio)
const GLIFO_PUNTO = {
  ing:'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  rep:'M3 10.5L12 3l9 7.5M5.5 9v11h13V9M10 20v-5h4v5',
  em: 'M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M3 21h18M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1'
};
function svgPunto(tipo, color, fondo){ return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.5" fill="'+fondo+'" stroke="'+color+'" stroke-width="1.8"/>'+
  '<g transform="translate(8.8 8.8) scale(.6)" fill="none" stroke="'+color+'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="'+GLIFO_PUNTO[tipo]+'"/></g></svg>'; }
const ICONO_PUNTO = (tipo, color, fondo) => 'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgPunto(tipo, color, fondo));
const NOMBRE_PUNTO = {ing:'Puntos de internación', rep:'Puntos de repatriación', em:'Estaciones migratorias'};
const CAJA = [[-125,35.5],[-62,2.5]];                   // encuadre inicial: México, Centroamérica, Caribe y norte de Sudamérica
const ESCALA_LAT = 0.92;                                // corrección de proporción a la latitud de México
// Mapa del mundo con América al centro: Asia y Oceanía a la izquierda, Europa y África a la derecha.
// Todo lo que está al este del meridiano CORTE se dibuja también 360° a la izquierda.
const CORTE = 62;
const CAJA_MUNDO = [[CORTE-358,80],[CORTE-2,-56]];      // el mundo completo, sin la Antártida
const VISTA_MX = {c:[-93.5,19], z:1};                    // z = 1 es el encuadre de México; los demás zooms se miden contra él
const REGIONES = { NA:['Norteamérica',[-100,45]], CA:['Centroamérica y Caribe',[-80,15]], SA:['Sudamérica',[-60,-18]],
                   EU:['Europa',[15,50]], AF:['África',[18,2]], AS:['Asia',[95-360,30]], OC:['Oceanía',[140-360,-25]] };
const VEL = 5;                                         // días por segundo al reproducir
// Colores del mapa por tema (independientes del tema de la página)
const TACTIL = matchMedia('(hover: none)').matches;   // pantallas táctiles: el primer toque muestra la tarjeta
const TM = {
  oscuro:{ mar:'#22201D', tierra:'#34312D', linea:'#4B4741', eu:'#3A3733', euL:'#5A554E', mx:'#47433D', mxL:'#9A958A', tinta:'#F1EEE4', halo:'#22201D',
           reg:'#62B8A0', irr:'#E8827A', usa:'#DCC66C', arena:'#D8CDA0', relleno:'#8C7F4B', region:'#45402F', neu:['#4A463F','#5E5950','#746E62','#8B8475'],
           r_reg:['#2F4741','#3F6B60','#4F8F7F','#62B8A0','#A4E6D3'], r_irr:['#4A3A38','#7A4C48','#A85F59','#D6756D','#FFB0A8'], r_usa:['#4A4530','#7A6F3A','#A89845','#DCC66C','#F7E7A4'] },
  claro:{  mar:'#E4E1D5', tierra:'#F7F5EE', linea:'#CFCBBB', eu:'#F1EEE4', euL:'#B9B4A6', mx:'#FBFAF6', mxL:'#8A8579', tinta:'#2B2926', halo:'#F7F5EE',
           reg:'#2F6657', irr:'#C4605A', usa:'#8F7F2E', arena:'#A1925A', relleno:'#D9CB93', region:'#EFE8CC', neu:['#EEE9D6','#DDD5B8','#CABF98','#B3A77A'],
           r_reg:['#E3ECE8','#AFC9C1','#7AA598','#2F6657','#17382F'], r_irr:['#F6E6E3','#E5B9B3','#D38E86','#C4605A','#7E302B'], r_usa:['#F1EBD0','#DDD09A','#C2B15E','#8F7F2E','#55490F'] }
};

/* ==== [2] DATOS (cubo y consultas) ================================= */
// Cubo denso por indicador [semana][estado][nacionalidad] y sus dos resúmenes
// Cubo semanal de todas las fechas (…0); CUBO, WS y WN son la vista del periodo elegido
const CUBO0 = {}, WS0 = {}, WN0 = {}, CUBO = {}, WS = {}, WN = {};
INDS.forEach(m => { const a = new Float32Array(NW*NS*NN), ws = new Float64Array(NW*NS), wn = new Float64Array(NW*NN), c = D.cube[m.k];
  for (let i=0;i<c.length;i+=4){ a[(c[i]*NS + c[i+1])*NN + c[i+2]] += c[i+3]; ws[c[i]*NS+c[i+1]] += c[i+3]; wn[c[i]*NN+c[i+2]] += c[i+3]; }
  CUBO0[m.k] = a; WS0[m.k] = ws; WN0[m.k] = wn; });
const NCAT = {ing_via:3, rech_det:2, tram_se:16, tram_res:3, tram_tipo:(D.tramTipos||[]).length, resc_rei:2, resc_des:3, pres_est:D.estaciones.length, can_nna:12, can_ad:2, ret_tipo:2, recib_edad:2, rep_comp:8};
const COMP = {};                                  // desgloses del periodo (llegan por mes: [mes, estado, nacionalidad, categoría, valor])
// Parte de un mes de las bases que cae dentro del periodo elegido (0 a 1)
function fraccionMes(m){
  const a = new Date(INICIO0.getFullYear(), INICIO0.getMonth()+m, 1), b = new Date(INICIO0.getFullYear(), INICIO0.getMonth()+m+1, 1);
  const s = Math.max(0, Math.round((a-INICIO0)/864e5)), e = Math.min(D0.dias, Math.round((b-INICIO0)/864e5)), o = Math.min(e,P1) - Math.max(s,P0);
  return e>s && o>0 ? o/(e-s) : 0;
}
// Arma todas las series para el periodo [p0, p1) de los datos completos. Las semanas que el periodo corta se prorratean.
function aplicarPeriodo(p0, p1){
  P0 = p0; P1 = p1; ND = p1-p0; INICIO = new Date(INICIO0.getFullYear(), INICIO0.getMonth(), INICIO0.getDate()+p0);
  const sem = [], E0 = D0.ends;
  for (let w=0; w<E0.length; w++){ const a = w ? E0[w-1] : 0, b = E0[w], x = Math.max(a,p0), y = Math.min(b,p1); if (y>x) sem.push([w, (y-x)/(b-a), y-p0]); }
  NW = sem.length; D.ends = sem.map(x => x[2]);
  INDS.forEach(m => { const A = CUBO0[m.k], B = WS0[m.k], C = WN0[m.k], a = new Float32Array(NW*NS*NN), ws = new Float64Array(NW*NS), wn = new Float64Array(NW*NN), L = NS*NN;
    sem.forEach((x,j) => { const w = x[0], f = x[1];
      for (let i=0;i<L;i++) a[j*L+i] = A[w*L+i]*f;
      for (let i=0;i<NS;i++) ws[j*NS+i] = B[w*NS+i]*f;
      for (let i=0;i<NN;i++) wn[j*NN+i] = C[w*NN+i]*f; });
    CUBO[m.k] = a; WS[m.k] = ws; WN[m.k] = wn;
    D.daily[m.k] = D0.daily[m.k].slice(p0,p1); D.ds[m.k] = D0.ds[m.k].subarray(p0*NS, p1*NS); D.dn[m.k] = D0.dn[m.k].subarray(p0*NN, p1*NN); });
  D0.wks.forEach(o => { o.obj.wk = sem.map(x => o.wk[x[0]]*x[1]); });
  Object.keys(NCAT).forEach(k => { const nc = NCAT[k], a = new Float64Array(NS*NN*nc), c = D.comp[k];
    for (let i=0;i<c.length;i+=5){ const f = fraccionMes(c[i]); if (f) a[(c[i+1]*NN + c[i+2])*nc + c[i+3]] += c[i+4]*f; } COMP[k] = a; });
  calendario();
}
const TODOS = EST.map((e,i)=>i);

// ss = lista de estados (o null = todos); n = nacionalidad (o null = todas)
function sumaSem(k, w0, w1, ss, n){
  if (Array.isArray(n)){ let t = 0; for (let i=0;i<n.length;i++) t += sumaSem(k,w0,w1,ss,n[i]); return t; }
  let t = 0;
  if (n==null){ const a = WS[k], l = ss || TODOS; for (let w=w0;w<=w1;w++) for (let j=0;j<l.length;j++) t += a[w*NS+l[j]]; return t; }
  if (!ss){ const a = WN[k]; for (let w=w0;w<=w1;w++) t += a[w*NN+n]; return t; }
  const a = CUBO[k]; for (let w=w0;w<=w1;w++) for (let j=0;j<ss.length;j++) t += a[(w*NS+ss[j])*NN+n];
  return t;
}
function semanal(k, ss, n){ const o = []; for (let w=0;w<NW;w++) o.push(sumaSem(k,w,w,ss,n)); return o; }
function diario(k, F){                         // serie diaria con el filtro activo (lleva k y F para comparar con el año anterior)
  const o = new Array(ND).fill(0), n = 'nd' in F ? F.nd : F.n; o.k = k; o.F = F;
  if (F.ss && n!=null){                          // estado × nacionalidad solo existe por semana: se reparte en sus días
    for (let w=0;w<NW;w++){ const i0 = w ? D.ends[w-1] : 0, i1 = D.ends[w], v = sumaSem(k,w,w,F.ss,n)/(i1-i0); for (let d=i0;d<i1;d++) o[d] = v; }
    return o; }
  if (Array.isArray(n)){ const a = D.dn[k]; for (let d=0;d<ND;d++) for (let j=0;j<n.length;j++) o[d] += a[d*NN+n[j]]; return o; }
  if (F.ss){ const a = D.ds[k]; for (let d=0;d<ND;d++) for (let j=0;j<F.ss.length;j++) o[d] += a[d*NS+F.ss[j]]; return o; }
  if (n!=null){ const a = D.dn[k]; for (let d=0;d<ND;d++) o[d] = a[d*NN+n]; return o; }
  const t = D.daily[k].slice(); t.k = k; t.F = F; return t;
}
function comp(k, ss, n){
  if (Array.isArray(n)){ const o = new Array(NCAT[k]).fill(0); n.forEach(x => comp(k,ss,x).forEach((v,i) => o[i] += v)); return o; }
  const nc = NCAT[k], a = COMP[k], o = new Array(nc).fill(0), l = ss || TODOS, n0 = n==null?0:n, n1 = n==null?NN-1:n;
  for (let j=0;j<l.length;j++) for (let ni=n0; ni<=n1; ni++){ const b = (l[j]*NN+ni)*nc; for (let c=0;c<nc;c++) o[c] += a[b+c]; }
  return o; }
// Posición del cursor en semanas y valores "al momento" (ritmo semanal interpolado) y acumulados
function ritmo(k, ss, n){
  if (alFinal()) return sumaSem(k,0,NW-1,ss,n);
  const u = Math.max(0, Math.min(NW-1, (S.dia-3.5)/7)), i = Math.floor(u), f = u-i, a = sumaSem(k,i,i,ss,n), b = i<NW-1 ? sumaSem(k,i+1,i+1,ss,n) : a;
  return a + (b-a)*f;
}
function acum(k, ss, n){
  if (Array.isArray(n)){ let t = 0; for (let i=0;i<n.length;i++) t += acum(k,ss,n[i]); return t; }
  let t = 0;
  if (n==null){ if (!ss) return suma(D.daily[k],0,S.dia); const a = D.ds[k]; for (let d=0;d<S.dia;d++) for (let j=0;j<ss.length;j++) t += a[d*NS+ss[j]]; return t; }
  if (!ss){ const a = D.dn[k]; for (let d=0;d<S.dia;d++) t += a[d*NN+n]; return t; }
  // estado × nacionalidad solo existe por semana: se reparte dentro de la semana
  for (let w=0;w<NW;w++){ const ini = w?D.ends[w-1]:0, fin = D.ends[w];
    if (S.dia>=fin) t += sumaSem(k,w,w,ss,n); else { if (S.dia>ini) t += sumaSem(k,w,w,ss,n)*(S.dia-ini)/(fin-ini); break; } }
  return t;
}
function topNats(fn, cuantas){ const o = []; for (let n=0;n<OT;n++){ const v = fn(n); if (v>0) o.push([n,v]); } return o.sort((a,b)=>b[1]-a[1]).slice(0,cuantas); }
function topEsts(fn, cuantos){ const o = []; for (let s=0;s<NS;s++){ const v = fn(s); if (v>0) o.push([s,v]); } return o.sort((a,b)=>b[1]-a[1]).slice(0,cuantos); }
function xyNat(n){ const iso = D.nats[n][1], c = ORIGEN[iso] || CEN['P_'+String(iso).padStart(3,'0')];
  return !c ? null : c[0] > CORTE ? [c[0]-360, c[1]] : c; }
const enRegion = n => !S.region || D.nats[n][2]===S.region;
const LISTA_REG = {}; Object.keys(REGIONES).forEach(r => { LISTA_REG[r] = []; for (let n=0;n<OT;n++) if (D.nats[n][2]===r) LISTA_REG[r].push(n); });
function xyEst(s){ return CEN[ECLAVE[s]]; }
function xyGrupo(ss){ let x = 0, y = 0; ss.forEach(s => { const c = xyEst(s); x += c[0]; y += c[1]; }); return [x/ss.length, y/ss.length]; }

/* ==== [3] UTILIDADES ============================================== */
const $ = id => document.getElementById(id);
const suma = (a,i,j) => { let t=0; for (let x=Math.max(0,i);x<j;x++) t+=a[x]; return t; };
const miles = n => Math.round(n).toLocaleString('en-US');
const corto = n => n>=1e6 ? (n/1e6).toFixed(2)+' M' : miles(n);
const pct = (a,b) => b ? Math.round(a/b*100) : 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sinAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const diaDe = i => new Date(INICIO.getFullYear(), INICIO.getMonth(), INICIO.getDate()+i);
const indiceDe = iso => Math.round((new Date(iso+'T00:00:00') - INICIO)/864e5);
let VARIOS_ANIOS = false, MESES_INI = [];
function fechaDia(i){ const f = diaDe(i); return f.getDate()+' '+MES12[f.getMonth()]+(VARIOS_ANIOS ? ' '+String(f.getFullYear()).slice(2) : ''); }
function fechaLarga(i){ const f = diaDe(i); return f.getDate()+' '+MES12[f.getMonth()]+' '+f.getFullYear(); }
function fechaISO(iso){ const f = new Date(iso+'T00:00:00'); return f.getDate()+' '+MES12[f.getMonth()]+' '+f.getFullYear(); }
function calendario(){                          // etiquetas de meses de la barra de tiempo
  VARIOS_ANIOS = diaDe(0).getFullYear() !== diaDe(ND-1).getFullYear(); MESES_INI = [];
  for (let i=0;i<ND;i++){ const f = diaDe(i); if (!i || f.getDate()===1) MESES_INI.push([i, MES12[f.getMonth()]+((!i || !f.getMonth()) ? ' '+f.getFullYear() : '')]); }
}
const idxBase = iso => Math.round((new Date(iso+'T00:00:00') - INICIO0)/864e5);   // día dentro de las bases completas
const fechaBase = i => new Date(INICIO0.getFullYear(), INICIO0.getMonth(), INICIO0.getDate()+i);
const isoDe = f => f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');
// Rango del periodo elegido dentro de las bases: [inicio, fin) o null si no hay datos
function rangoPeriodo(per){
  per = per || S.per; let a = 0, b = D0.dias;
  if (per==='shein') a = idxBase('2024-10-01');
  else if (per==='trump') a = idxBase('2025-01-20');
  else if (per==='anio'){ const y = S.anio, m = S.mes; a = idxBase(isoDe(new Date(y, m ? m-1 : 0, 1))); b = idxBase(isoDe(new Date(m ? y : y+1, m ? m : 0, 1))); }
  else if (per==='pers'){ a = idxBase(S.desde); b = idxBase(S.hasta)+1; }
  a = Math.max(0, a); b = Math.min(D0.dias, b); return b>a ? [a,b] : null;
}
function cambiarPeriodo(){
  const r = rangoPeriodo(); if (!r) return;
  if (S.play) S.play = false;
  aplicarPeriodo(r[0], r[1]); S.dia = ND; S.t = ND; validarCmp();
  $('tgraf').setAttribute('aria-valuemax', ND); pintarTodo();
}
const mesAnio = f => MES12[+f.slice(5,7)-1]+' '+f.slice(0,4);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const colG = g => cssv(g==='reg'?'--reg':g==='irr'?'--irr':'--usa');
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hex = c => [parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16)];
function chispa(a, w, h, color, punto){        // mini-línea de tendencia
  const lo = Math.min.apply(null,a), hi = Math.max.apply(null,a), n = a.length;
  const X = i => 3 + i*(w-6)/(n-1), Y = v => hi>lo ? h-3-(v-lo)/(hi-lo)*(h-6) : h/2;
  const p = a.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
  const i = punto==null ? n-1 : punto;
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><polyline points="'+p+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+X(i).toFixed(1)+'" cy="'+Y(a[i]).toFixed(1)+'" r="2.8" fill="'+color+'"/></svg>';
}
function mezclaRGB(rampa, t){                  // color intermedio de una rampa, como [r,g,b]
  t = Math.max(0, Math.min(1, t)); const x = t*(rampa.length-1), i = Math.min(rampa.length-2, Math.floor(x)), f = x-i, a = hex(rampa[i]), b = hex(rampa[i+1]);
  return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f];
}
function tri(arriba, color){ return '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="'+(arriba?'M6 2l5 8H1z':'M6 10L1 2h10z')+'" fill="'+color+'"/></svg>'; }

/* ==== [4] ESTADO Y FILTRO ========================================= */
const S = { vista:'pulso', ind:null, sel:null, dia:ND, t:ND, play:false, tema:'claro', flujos:true, circulos:true, puntos:false, cbp:false, car:false, carSel:null, modoVista:'mundo', centro:null, region:null, agr:'e', cmp:30, per:'shein', anio:fechaBase(D.dias-1).getFullYear(), mes:0, desde:D.inicio, hasta:D.corte, cruce:{ing:0, resc:0, pres:0}, topModo:'resc', kpiModo:'tarjetas', zoom:1, estreno:true };
let E = 1;                                      // escala para pantallas muy grandes
// Filtro que produce la selección: una lista de estados (estado, cinturón o CECO) o una nacionalidad
// ss: estados; n: una nacionalidad; r: nacionalidades de la región elegida; nd: lo que usan los cálculos (n o r)
function filtro(){
  const s = S.sel, r = S.region && !(s && s.t==='n') ? LISTA_REG[S.region] : null;
  const F = {ss:null, n:null, r:r};
  if (s && s.t==='e') F.ss = [s.i];
  else if (s && s.t==='g') F.ss = miembros(s.a, s.q);
  else if (s && s.t==='n') F.n = s.i;
  else if (!s && S.agr!=='e'){ F.ss = TODOS_GRUPO[S.agr]; F.todo = true; }   // Cinturón o CECO: todos sus estados
  F.nd = F.n!=null ? F.n : r;
  return F;
}
const nombreRegion = () => S.region ? REGIONES[S.region][0] : '';
function nombreFiltro(){ return [S.sel ? nombreSel() : S.agr==='c' ? 'Cinturones de contención' : S.agr==='o' ? 'Todos los CECO' : '', S.sel && S.sel.t==='n' ? '' : nombreRegion()].filter(Boolean).join(' · '); }
const alFinal = () => S.dia>=ND && !S.play;
const semDe = d => { for (let w=0;w<NW;w++) if (d<=D.ends[w]) return w; return NW-1; };
const listaPuntos = tp => tp==='ing'?D.puntos:tp==='rep'?D.repPuntos:D.emPuntos;
function nombreSel(){ const s = S.sel; if (!s) return ''; return s.t==='n'?D.nats[s.i][0]:s.t==='e'?EST[s.i]:s.t==='g'?AGR[s.a].nombres[s.q]:listaPuntos(s.tipo)[s.i].n; }
let chart = null, AVISOS = [];

function fijarInd(k){ S.ind = (S.ind===k ? null : k); pintarTodo(); if (S.ind) acercarSiMundo(); }   // segundo clic lo apaga
function fijarSel(sel, volar){ S.sel = sel; if (S.ind==='rep' && sel && sel.t==='n') S.ind = null;
  if (sel && sel.t==='p' && !S.ind) S.ind = sel.tipo==='rep'?'rep':sel.tipo==='em'?'pres':'ing';
  pintarTodo(); if (volar && sel) volarA(sel); }

/* ==== [5] ANÁLISIS AUTOMÁTICO ===================================== */
// Compara los últimos N días con datos contra los N anteriores (N = 7 o 30) con el filtro activo.
// Variación: últimos N días contra los N anteriores, o el periodo contra el mismo periodo del año anterior ('aa')
const cmpN = () => S.cmp==='aa' ? 30 : S.cmp;               // ventana para los avisos
const etiquetaN = n => n===90 ? '3 meses' : n+' días';
function textoCmp(){ return S.cmp==='aa' ? 'el periodo contra el mismo periodo del año anterior' : 'últimos '+etiquetaN(S.cmp)+' contra '+(S.cmp===90 ? 'los 3 meses' : 'los '+S.cmp+' días')+' anteriores'; }
function variacion(d){
  const U = d.k ? finDatos(d.k) : ND;            // los días pendientes no entran a la comparación
  if (S.cmp==='aa'){ const q0 = idxBase(isoDe(new Date(INICIO.getFullYear()-1, INICIO.getMonth(), INICIO.getDate()))), b = q0>=0 && d.k ? sumaCompleta(d.k, d.F, q0, q0+U) : null, a = suma(d,0,U);
    return {a:a, b:b||0, dl: b ? (a/b-1)*100 : 0, ok: b!=null && b>=30}; }
  const N = S.cmp, a = suma(d,U-N,U), b = suma(d,U-2*N,U-N);
  return {a:a, b:b, dl: b ? (a/b-1)*100 : 0, ok: 2*N<=U && b >= (N>=30?30:10)};
}
// Suma en cualquier tramo de las bases completas (para comparar con el año anterior)
function sumaCompleta(k, F, q0, q1){
  const n = F && 'nd' in F ? F.nd : F ? F.n : null; let t = 0;
  if (F && F.ss && n!=null) return null;
  for (let d=Math.max(0,q0); d<Math.min(D0.dias,q1); d++){
    if (F && F.ss) for (let j=0;j<F.ss.length;j++) t += D0.ds[k][d*NS+F.ss[j]];
    else if (Array.isArray(n)) for (let j=0;j<n.length;j++) t += D0.dn[k][d*NN+n[j]];
    else if (n!=null) t += D0.dn[k][d*NN+n]; else t += D0.daily[k][d];
  }
  return t;
}
function cmpDisponible(o){ return o==='aa' ? idxBase(isoDe(new Date(INICIO.getFullYear()-1, INICIO.getMonth(), INICIO.getDate()))) >= 0 : 2*o<=ND; }
function validarCmp(){ if (!cmpDisponible(S.cmp)) S.cmp = [30,7].find(cmpDisponible) || 7; }
function analizar(F){
  const out = [], N = cmpN(), umbral = N>=30 ? 15 : 25;
  INDS.forEach(m => {
    if (F.nd!=null && !m.nat) return;
    const d = diario(m.k, F), v = variacion(d);
    if (v.ok && Math.abs(v.dl)>=umbral) out.push({t:'cambio', k:m.k, dl:v.dl, a:v.a, b:v.b, imp:Math.abs(v.a-v.b)});
    const base = d.slice(Math.max(0,ND-70), ND-14).sort((x,y)=>x-y), mitad = base.length>>1, med = base[mitad] || 0;   // lo habitual: 8 semanas previas
    const des = base.map(x=>Math.abs(x-med)).sort((x,y)=>x-y)[mitad]*1.4826 || 1;
    let mejor = null;
    // los picos solo se buscan con 4 semanas o más de referencia
    if (ND-14 >= 28) for (let i=ND-Math.min(N,14);i<ND;i++){ const z = (d[i]-med)/des; if (d[i]>=25 && z>=4 && (!mejor || z>mejor.z)) mejor = {i:i, z:z, v:d[i], med:med}; }
    if (mejor) out.push({t:'pico', k:m.k, i:mejor.i, v:mejor.v, med:mejor.med, imp:mejor.v-mejor.med});
  });
  const u = NW-1, diasSem = (a,b) => D.ends[b] - (a>0 ? D.ends[a-1] : 0);
  const ws = Math.max(1, Math.round(N/7)), w = [u-ws+1, u, u-2*ws+1, u-ws];   // semanas que cubren cada ventana
  w.push(diasSem(w[0],w[1]), diasSem(w[2],w[3]));
  if (F.n==null && w[2]>=0){
    [['resc',300],['ing',4000],['rech',150]].forEach(par => { const k = par[0]; let mejor = null;
      for (let n=0;n<OT;n++){ if (F.r && D.nats[n][2]!==S.region) continue; const a = sumaSem(k,w[0],w[1],F.ss,n)/w[4], b = sumaSem(k,w[2],w[3],F.ss,n)/w[5];
        if (b*28>=par[1]){ const dl = (a/b-1)*100; if (Math.abs(dl)>=25 && (!mejor || Math.abs(dl)>Math.abs(mejor.dl))) mejor = {n:n, dl:dl, a:a, b:b}; } }
      if (mejor) out.push({t:'nac', k:k, n:mejor.n, dl:mejor.dl, a:mejor.a, b:mejor.b, imp:Math.abs(mejor.a-mejor.b)*N});
    });
    const tr = topNats(n => !F.r || D.nats[n][2]===S.region ? sumaSem('rech',0,NW-1,F.ss,n) : 0, 1)[0], tot = sumaSem('rech',0,NW-1,F.ss,F.r);
    if (tr && tot>=200 && tr[1]/tot>=0.4) out.push({t:'conc', k:'rech', n:tr[0], a:tr[1], b:tot, imp:tr[1]/4});
  }
  if (!F.ss && F.nd==null){                     // estados que más se movieron (antes eran los puntos que parpadeaban)
    const o = [];
    INDS.forEach(m => { const a = D.ds[m.k], U = finDatos(m.k);
      for (let s=0;s<NS;s++){ let x = 0, y = 0;
        for (let d=U-N;d<U;d++) x += a[d*NS+s]; for (let d=U-2*N;d<U-N;d++) y += a[d*NS+s];
        if (2*N<=U && y>=(N>=30?80:25)){ const dl = (x/y-1)*100; if (Math.abs(dl)>=40) o.push({t:'est', k:m.k, s:s, dl:dl, a:x, b:y, imp:Math.abs(x-y)}); } } });
    o.sort((x,y)=>y.imp-x.imp); const vistos = {}; let c = 0;
    o.forEach(r => { if (!vistos[r.s] && c<3){ vistos[r.s] = 1; c++; out.push(r); } });
  }
  // caravanas que salieron en la ventana de comparación: van primero
  if (F.n==null && !F.ss) carPeriodo().filter(c => c.i>=ND-N && c.i<ND).forEach(c => out.push({t:'car', c:c.j, imp:Infinity}));
  return out.sort((x,y)=>y.imp-x.imp);
}
// Cada aviso se redacta como hallazgo: qué cambió, cuánto y contra qué
function cuanto(a, b){ const r = a/Math.max(b,1e-9);
  return r>=2 ? 'se multiplicaron por '+r.toFixed(1) : r>=1 ? 'subieron '+((r-1)*100).toFixed(0)+'%' : 'bajaron '+((1-r)*100).toFixed(0)+'%'; }
function textoAviso(a){
  const N = a.k ? IND[a.k].n : '', prev = S.cmp==='aa' ? 'el año anterior' : 'los '+etiquetaN(cmpN())+' previos';
  if (a.t==='cambio') return '<b>'+N+'</b> '+cuanto(a.a,a.b)+': '+corto(a.a)+' frente a '+corto(a.b)+' en '+prev+'.';
  if (a.t==='pico')   return '<b>'+N+'</b>: pico de '+miles(a.v)+' el '+fechaDia(a.i)+', cuando lo habitual es '+miles(a.med)+' al día.';
  if (a.t==='nac')    return '<b>'+esc(D.nats[a.n][0])+'</b>: '+N.toLowerCase()+' por día '+cuanto(a.a,a.b)+' ('+miles(a.b)+' → '+miles(a.a)+').';
  if (a.t==='est')    return '<b>'+esc(EST[a.s])+'</b>: '+N.toLowerCase()+' '+cuanto(a.a,a.b)+' ('+miles(a.b)+' → '+miles(a.a)+').';
  if (a.t==='car'){ const c = D.caravanas[a.c];
    return '<b>'+esc(nombreCar(c))+'</b>: salió el '+fechaISO(c.f).replace(/ \d{4}$/,'')+' de '+esc(lugarCorto(c.s))+' con unas '+miles(c.p)+' personas'+(c.d ? '; se disolvió en '+esc(lugarCorto(c.d)) : '')+'.'; }
  return '<b>'+esc(D.nats[a.n][0])+'</b> concentra '+pct(a.a,a.b)+'% de los <b>rechazos</b>.';
}
function filaAviso(a, i){
  const c = colG(a.t==='car' ? 'irr' : IND[a.k].g); let ic, ci;
  if (a.t==='car'){ ic = '<svg width="12" height="12" viewBox="0 0 16 16">'+GLIFO_CAR+'</svg>'; ci = '≈'+corto(D.caravanas[a.c].p); }
  else if (a.t==='conc'){ const p = pct(a.a,a.b); ic = '<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="'+c+'" stroke-width="3" stroke-dasharray="'+(p*0.283).toFixed(1)+' 28.3" transform="rotate(-90 6 6)"/></svg>'; ci = p+'%'; }
  else if (a.t==='pico'){ ic = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 10l3-3 2 2 5-7" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; ci = '×'+(a.v/Math.max(a.med,1)).toFixed(1); }
  else { ic = tri(a.dl>=0, c); ci = Math.abs(a.dl).toFixed(0)+'%'; }
  return '<button class="av" data-av="'+i+'"><span class="ic">'+ic+'</span><span class="ci">'+ci+'</span><span class="tx">'+textoAviso(a)+'</span></button>';
}
function abrirAviso(i){ const a = AVISOS[i]; if (!a) return;
  if (a.t==='car'){ verCaravana(a.c); return; }
  S.ind = a.k;
  if (a.n!=null) fijarSel({t:'n', i:a.n}, true); else if (a.s!=null) fijarSel({t:'e', i:a.s}, true); else { pintarTodo(); acercarSiMundo(); } }

/* ==== [6] INDICADORES ============================================= */
function pintarKpis(){
  const F = filtro(), conAviso = {}; AVISOS.slice(0,5).forEach(a => conAviso[a.k] = 1);
  const semAct = semDe(S.dia);
  $('kpis').dataset.modo = S.kpiModo;
  $('kpis').innerHTML = GRUPOS.map(g => {
    return '<div class="kg g-'+g[0]+'" style="flex:'+g[2]+' 1 0"><div class="eti">'+g[1]+'</div><div>'+INDS.filter(m=>m.g===g[0]).map(m => {
      const ic = '<span class="kc-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+ICONO[m.k]+'"/></svg></span>';
      if (F.nd!=null && !m.nat) return '<button class="kc" disabled><span class="kc-top">'+ic+'<span class="kc-n">'+m.n+'</span></span><span class="kc-v num">—</span><span class="kc-pie"><span class="kc-d">solo mexicanos</span></span></button>';
      const d = diario(m.k,F), v = suma(d,0,S.dia), va = variacion(d), fuerte = va.ok && Math.abs(va.dl)>=20;
      const sem = D.ends.map((e,i)=>suma(d, i?D.ends[i-1]:0, e)), mx = Math.max.apply(null,sem) || 1;
      const delta = S.dia<ND ? '<span class="kc-d">al '+fechaDia(S.dia-1)+'</span>' : (va.ok ? '<span class="kc-d'+(fuerte?' f':'')+'">'+(va.dl>=0?'▲ ':'▼ ')+Math.abs(va.dl).toFixed(1)+'%</span>' : '<span class="kc-d">sin comparación</span>');
      const on = S.ind===m.k;
      return '<button class="kc'+(on?' on':'')+'" data-k="'+m.k+'" aria-pressed="'+on+'" title="Clic para verlo en el mapa; otro clic lo quita">'+
        '<span class="kc-top">'+ic+(FUENTE[m.k] ? '<span class="kc-nf">' : '')+'<span class="kc-n">'+m.n+(conAviso[m.k]?'<u title="Tiene un aviso de cambio"></u>':'')+'</span>'+(FUENTE[m.k] ? '<span class="kc-f">'+FUENTE[m.k][0]+'</span></span>' : '')+'</span>'+
        '<span class="kc-v num" data-v="'+v+'">'+corto(v)+'</span>'+
        '<span class="kc-pie">'+delta+'<span class="kc-b" aria-hidden="true">'+sem.map((x,i)=>'<i class="'+(i===semAct?'h':i<semAct?'p':'')+'" style="height:'+Math.max(8,x/mx*100).toFixed(0)+'%"></i>').join('')+'</span></span></button>';
    }).join('')+'</div></div>';
  }).join('')+'<button class="plegar" id="plegar" aria-label="'+(S.kpiModo==='tarjetas'?'Compactar indicadores':'Mostrar tarjetas')+'" title="'+(S.kpiModo==='tarjetas'?'Compactar indicadores':'Mostrar tarjetas')+'"><svg width="12" height="12" viewBox="0 0 12 12"><path d="'+(S.kpiModo==='tarjetas'?'M2 8l4-4 4 4':'M2 4l4 4 4-4')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  if (S.estreno){ S.estreno = false; if (!reducido()) contar(); }
}
const DEF_IND = {
  ing:'Entradas al país por puntos de internación aéreos, terrestres y marítimos (personas extranjeras y mexicanas).',
  rech:'Personas a las que, en segunda revisión, se les negó la internación al país.',
  tram:'Documentos migratorios resueltos en oficinas del INM (residencias, visas, regularizaciones y otros).',
  resc:'Personas extranjeras en situación irregular rescatadas, según el reporte de las oficinas de representación.',
  pres:'Personas presentadas ante una estación o estancia migratoria.',
  can:'Niñas, niños y adolescentes, y sus acompañantes, canalizados a la protección del DIF.',
  ret:'Personas extranjeras retornadas a su país, por deportación o retorno asistido.',
  recib:'Personas extranjeras recibidas en México desde EE. UU.',
  rep:'Personas mexicanas repatriadas desde EE. UU.'
};
const BASE_IND = {ing:'ing', rech:'seg', tram:'tram', resc:'resc', pres:'pres', can:'can_nna', ret:'ret', recib:'recib', rep:'rep'};
const FUENTE = {resc:['eventos · O.R.','O.R.'], pres:['Sistema','Sistema']};     // [en la tarjeta, en el detalle]
// Último día con datos de cada indicador dentro del periodo: los días posteriores están pendientes, no son cero
function finDatos(k){
  const bs = (k==='can' ? ['can_nna','can_ad'] : [BASE_IND[k]]).map(c => D.bases.find(x => x.k===c)).filter(b => b && b.hasta);
  if (!bs.length) return ND;
  return Math.max(0, Math.min(ND, Math.min.apply(null, bs.map(b => idxBase(b.hasta)+1)) - P0));
}
function tipKpi(el){
  const k = el.dataset.k, m = IND[k], F = filtro(), va = variacion(diario(k,F)), b = D.bases.find(x => x.k===BASE_IND[k]) || {};
  const tot = acum(k,F.ss,m.nat ? F.nd : null) || 1, tn = m.nat && F.n==null ? topNats(n => enRegion(n) ? acum(k,F.ss,n) : 0, 3) : [];
  return '<b>'+m.n+(nombreFiltro() ? ' · '+esc(nombreFiltro()) : '')+'</b><span>'+DEF_IND[k]+'</span>'+
    (va.ok ? '<span>'+(S.cmp==='aa' ? 'Este periodo' : 'Últimos '+etiquetaN(S.cmp))+': <b>'+corto(va.a)+'</b> · '+(S.cmp==='aa' ? 'año anterior' : 'anteriores')+': '+corto(va.b)+' ('+(va.dl>=0?'▲ ':'▼ ')+Math.abs(va.dl).toFixed(1)+'%)</span>' : '')+
    (k==='resc' ? (r => '<span>Eventos: <b>'+miles(r[0]+r[1])+'</b> · personas (1ra vez): <b>'+miles(r[0])+'</b> · reincidentes: '+miles(r[1])+'</span>')(comp('resc_rei',F.ss,F.nd)) : '')+
    (tn.length ? '<span>Principales: '+tn.map(r => esc(D.nats[r[0]][0])+' '+pct(r[1],tot)+'%').join(' · ')+'</span>' : '')+
    (finDatos(k)<ND ? '<span>Días pendientes: la base llega al '+fechaLarga(finDatos(k)-1)+'; la comparación se hace hasta ese día.</span>' : '')+
    '<small>'+(FUENTE[k] ? 'Fuente: '+FUENTE[k][1]+' · ' : '')+'Base: '+esc(b.archivo || '')+(b.hasta ? ' · datos al '+fechaISO(b.hasta) : '')+(TACTIL ? '' : ' · clic para verlo en el mapa')+'</small>';
}
let tipEspera = 0;
function mostrarTip(el, tocar){                  // en pantallas táctiles aparece al tocar y se va sola
  const t = $('kpi-tip'); clearTimeout(tipEspera); if (!el || (TACTIL && !tocar)){ t.hidden = true; return; }
  if (tocar) tipEspera = setTimeout(() => { t.hidden = true; }, 4500);
  t.innerHTML = tipKpi(el); t.hidden = false;
  const r = el.getBoundingClientRect(), w = t.offsetWidth;
  t.style.left = Math.max(8, Math.min(r.left, window.innerWidth-w-8))+'px'; t.style.top = (r.bottom+8)+'px';
}
function contar(){                              // las cifras suben una vez al abrir
  const els = Array.prototype.slice.call(document.querySelectorAll('.kc-v[data-v]')), t0 = performance.now(), dur = 900;
  const paso = t => { const e = Math.min(1,(t-t0)/dur), f = 1-Math.pow(1-e,3);
    els.forEach(el => { if (el.isConnected) el.textContent = corto(+el.dataset.v*f); }); if (e<1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}

/* ==== [7] MAPA (estados, círculos, puntos) ========================= */
const COL = { act:{}, meta:{}, sucio:true };     // color actual y color meta de cada estado, para la transición suave
function regiones(){
  const t = TM[S.tema], F = filtro(), rgb = c => 'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')';
  const eu = S.cbp && D.cbp ? D.cbp.estados : {}, euMax = Math.max.apply(null, Object.values(eu).concat(1));
  return GEO.features.filter(f => f.properties.t==='m' || f.properties.t==='u').map(f => { const k = f.properties.key, mx = f.properties.t==='m';
    const s = mx ? ECLAVE.indexOf(k) : -1, sel = mx && F.ss && !F.todo && F.ss.indexOf(s)>=0, c = COL.act[k], enc = mx ? 0 : eu[k.slice(3)];
    const area = c ? rgb(c) : enc ? rgb(mezclaRGB(t.r_usa, 0.1+0.45*enc/euMax)) : (mx?t.mx:t.eu);
    return { name:k, itemStyle:{ areaColor:area, borderColor: sel?t.tinta:(mx?t.mxL:t.euL), borderWidth: (sel?2:(mx?0.8:0.5))*E },
             emphasis:{ itemStyle:{ areaColor:area, borderColor:t.tinta, borderWidth:(mx?2:0.8)*E } } }; })
    .concat(paisesResaltados(t, F));
}
// País elegido (relleno y contorno) y países de la región elegida (relleno tenue); también su copia a la izquierda
function paisesResaltados(t, F){
  const o = [], pais = (n, st) => { const k = 'P_'+String(D.nats[n][1]).padStart(3,'0'); [k, 'W_'+k].forEach(x => o.push({ name:x, itemStyle:st, emphasis:{ itemStyle:st } })); };
  if (F.r) F.r.forEach(n => pais(n, { areaColor:t.region }));
  if (F.n!=null) pais(F.n, { areaColor:t.relleno, borderColor:t.tinta, borderWidth:1.6*E });
  return o;
}
function opcionBase(){
  const t = TM[S.tema], et = { color:t.tinta, fontFamily:'Barlow, sans-serif', textBorderColor:t.halo, textBorderWidth:2.5*E };
  return {
    backgroundColor:'transparent', animationDurationUpdate:420, animationEasingUpdate:'cubicOut',
    tooltip:{ trigger:'item', confine:true, position:junto, backgroundColor: S.tema==='oscuro'?'#F7F5EE':'#2B2926', borderWidth:0, padding:[9*E,11*E],
              textStyle:{ color: S.tema==='oscuro'?'#2B2926':'#F4F2EA', fontSize:12 }, extraCssText:'box-shadow:0 8px 24px rgba(0,0,0,.35);border-radius:'+(9*E)+'px;', formatter: tarjeta },
    geo:{ map:'ianami', nameProperty:'key', roam:true, boundingCoords:CAJA_MUNDO, center:S.centro || VISTA_MX.c, zoom:S.zoom*KMX(), scaleLimit:{min:0.6, max:40*KMX()}, layoutCenter:['50%','50%'], layoutSize:encuadre(), aspectScale:ESCALA_LAT,
          itemStyle:{ areaColor:t.tierra, borderColor:t.linea, borderWidth:0.5*E },
          emphasis:{ label:{show:false}, itemStyle:{ areaColor:t.tierra, borderColor:t.linea, borderWidth:0.8*E } },
          select:{ disabled:true }, label:{show:false}, tooltip:{ show:true, formatter:tarjeta }, regions:regiones() },
    series:[
      { id:'bub', type:'scatter', coordinateSystem:'geo', data:[],
        label:Object.assign({ show:true, position:'right', distance:6*E, formatter:p=>p.data.et||'', fontSize:11.5*E, fontWeight:600 }, et),
        labelLayout:{hideOverlap:true}, emphasis:{scale:1.12} },
      { id:'pts', type:'scatter', coordinateSystem:'geo', data:[],
        label:Object.assign({ show:false, position:'right', distance:5*E, formatter:p=>p.data.et, fontSize:11*E }, et), labelLayout:{hideOverlap:true} },
      { id:'cbp', type:'effectScatter', coordinateSystem:'geo', data:[], symbol:'circle', showEffectOn:'render', rippleEffect:{ brushType:'stroke', scale:2.2, period:4, number:2 },
        label:Object.assign({ show:false, position:'top', distance:4*E, formatter:p=>p.data.et, fontSize:11*E, fontWeight:600 }, et), labelLayout:{hideOverlap:true} },
      { id:'grp', type:'scatter', coordinateSystem:'geo', data:[], symbolSize:1, silent:true, itemStyle:{opacity:0},
        label:Object.assign({ show:true, position:'inside', formatter:p=>p.data.et, fontSize:13*E, fontWeight:600 }, et, {fontFamily:'Barlow Condensed, Barlow, sans-serif'}) },
      { id:'lat', type:'effectScatter', coordinateSystem:'geo', data:[], showEffectOn:'render',          // latido: dónde están, sin flujo
        rippleEffect:{ brushType:'stroke', scale:2.6, period:3.6, number:2 },
        label:Object.assign({ show:true, position:'right', distance:6*E, formatter:p=>p.data.et||'', fontSize:11.5*E, fontWeight:600 }, et), labelLayout:{hideOverlap:true} },
      { id:'car', type:'effectScatter', coordinateSystem:'geo', data:[], showEffectOn:'render', zlevel:1,     // caravanas: salida que late
        rippleEffect:{ brushType:'fill', scale:3.2, period:2.6, number:3 },
        label:Object.assign({ show:true, position:'left', distance:7*E, formatter:p=>p.data.et||'', fontSize:11.5*E, fontWeight:600 }, et), labelLayout:{hideOverlap:true} }
    ]
  };
}
// El mapa nunca se deforma: conserva su proporción y el encuadre inicial cabe completo;
// si el contenedor es más ancho o más alto, simplemente se ve más mapa alrededor.
function encuadre(){
  const lz = $('lz'), proporcion = ancho(CAJA_MUNDO) / alto(CAJA_MUNDO) * ESCALA_LAT;
  return Math.round(Math.min(lz.clientWidth, lz.clientHeight*proporcion));
}
const ancho = c => c[1][0]-c[0][0], alto = c => c[0][1]-c[1][1];
const pxGrado = (gLon, gLat) => { const lz = $('lz'); return Math.min(lz.clientWidth/(gLon*ESCALA_LAT), lz.clientHeight/gLat); };
// Zoom del mapa que equivale al encuadre de México (el mapa base es el mundo)
function KMX(){ return pxGrado(ancho(CAJA), alto(CAJA)) / pxGrado(ancho(CAJA_MUNDO), alto(CAJA_MUNDO)); }
// Zoom (medido contra México) para que quepa una región de tantos grados
function zoomPara(gLon, gLat){ return pxGrado(gLon, gLat) / pxGrado(ancho(CAJA), alto(CAJA)); }
function vistaMundo(){ const m = CAJA_MUNDO; return { c:[(m[0][0]+m[1][0])/2, (m[0][1]+m[1][1])/2], z:zoomPara(ancho(m), alto(m)) }; }
function reencuadrar(){ chart.resize(); chart.setOption({geo:{layoutSize:encuadre(), scaleLimit:{min:0.6, max:40*KMX()}}});
  if (S.modoVista==='mundo'){ const v = vistaMundo(); chart.setOption({geo:{center:v.c, zoom:v.z*KMX()}}); S.zoom = v.z; } }
// Vuelo que deja a la vista un punto lejano y a México
function volarConMexico(xy){ S.modoVista = 'libre';
  const z = zoomPara(Math.abs(xy[0]+102)+60, Math.abs(xy[1]-23)+40);
  volar([(xy[0]-102)/2, (xy[1]+23)/2], Math.max(vistaMundo().z, Math.min(1, z))); }
// Al elegir un indicador desde la vista del mundo, el mapa se acerca a México: ahí está el detalle por estado
function acercarSiMundo(){ if (S.modoVista==='mundo'){ S.modoVista = 'mx'; volar(VISTA_MX.c, VISTA_MX.z); } }
// La tarjeta aparece junto al cursor y nunca se sale del mapa
function junto(pt, params, dom, rect, size){
  const w = size.contentSize[0], h = size.contentSize[1], W = size.viewSize[0], H = size.viewSize[1], m = 8*E, sep = 16*E;
  let x = pt[0]+sep, y = pt[1]+sep;
  if (x+w > W-m) x = pt[0]-w-sep;
  if (y+h > H-m) y = pt[1]-h-sep;
  return [Math.max(m, Math.min(x, W-w-m)), Math.max(m, Math.min(y, H-h-m))];
}
function capaPuntos(kc){                        // qué puntos corresponden al indicador
  if (kc==='rep') return {lista:D.repPuntos, tipo:'rep', siempre:true};
  if (kc==='pres') return {lista:D.emPuntos, tipo:'em', siempre:true};
  if (kc==null || kc==='ing' || kc==='rech') return {lista:D.puntos, tipo:'ing', siempre:false};
  return null;
}
function pintarMapa(){
  const t = TM[S.tema], F = filtro(), fin = alFinal(), kc = S.ind;
  const g = kc ? IND[kc].g : 'irr', col = t[g], rampa = t['r_'+g], nF = kc && IND[kc].nat ? F.nd : null, ag = S.agr!=='e' ? AGR[S.agr] : null;
  const meta = {}, grp = []; let maxE = 0;
  // -- Estados (o cinturones / CECO) coloreados; la escala es fija para que la reproducción sea comparable
  if (kc){
    if (ag){ const tot = ag.nombres.map((x,q) => ritmo(kc, miembros(S.agr,q), nF));
      ag.nombres.forEach((x,q) => { const ss = miembros(S.agr,q); maxE = Math.max(maxE, fin ? sumaSem(kc,0,NW-1,ss,nF) : Math.max.apply(null, semanal(kc,ss,nF))); });
      for (let s=0;s<NS;s++){ const q = ag.de[s]; if (q>=0 && tot[q]>0) meta[ECLAVE[s]] = mezclaRGB(rampa, 0.12+0.88*Math.sqrt(tot[q]/Math.max(maxE,1))); }
      ag.nombres.forEach((nom,q) => grp.push({ value:xyGrupo(miembros(S.agr,q)), et:nom+' · '+corto(fin?tot[q]:acum(kc,miembros(S.agr,q),nF)) }));
    } else {
      for (let s=0;s<NS;s++) maxE = Math.max(maxE, fin ? sumaSem(kc,0,NW-1,[s],nF) : Math.max.apply(null, semanal(kc,[s],nF)));
      for (let s=0;s<NS;s++){ const v = ritmo(kc,[s],nF); if (v>0) meta[ECLAVE[s]] = mezclaRGB(rampa, 0.08+0.92*Math.sqrt(v/Math.max(maxE,1))); }
    }
  } else if (ag){                                // sin indicador: se pinta a qué cinturón o CECO pertenece cada estado
    const cs = S.agr==='c' ? t.neu : [t.r_reg[1], t.r_usa[1]];
    for (let s=0;s<NS;s++){ const q = ag.de[s]; if (q>=0) meta[ECLAVE[s]] = hex(cs[q]); }
    ag.nombres.forEach((nom,q) => grp.push({ value:xyGrupo(miembros(S.agr,q)), et:nom }));
  }
  if (!kc && F.ss && !F.todo) F.ss.forEach(s => { meta[ECLAVE[s]] = hex(t.relleno); });   // estado o grupo elegido: se rellena
  COL.meta = meta; COL.sucio = true;
  // -- Círculos por nacionalidad y flujos de origen a destino
  const bub = [], lat = [], fl = [], fz = Math.max(0.62, Math.min(1, 0.55+0.45*S.zoom));     // círculos algo menores al alejarse
  const burbuja = (n, v, mx, c, et, fijo, late) => { const xy = xyNat(n); if (!xy) return;
    // sin flujos, los círculos laten
    (late || !S.flujos ? lat : bub).push({ value:[xy[0],xy[1],v], nat:n, et:et, symbolSize: (fijo || (7 + 30*Math.sqrt(Math.min(1, v/Math.max(mx,1)))))*E*fz,
               itemStyle:{ color:c, opacity:.72, borderColor:(F.n===n?t.tinta:t.halo), borderWidth:(F.n===n?2.5:1)*E } }); };
  const flujo = (id, a, b, v, mx, c) => { if (a && b) fl.push({ id:id, a:a, b:b, c:c, w: 1 + 3.4*Math.sqrt(Math.min(1, v/Math.max(mx,1))) }); };
  const destinoDe = (k, n) => { if (F.ss && !F.todo) return [xyGrupo(F.ss), 'F']; const r = topEsts(s => !F.ss || F.ss.indexOf(s)>=0 ? sumaSem(k,0,NW-1,[s],n) : 0, 1)[0]; return r ? [xyEst(r[0]), r[0]] : [null,null]; };
  // Puntos de internación principales de una nacionalidad (ingresos y rechazos), dentro del filtro de estados
  const puntoDe = (k, n) => { const l = k==='ing' ? D.ingPunto : k==='rech' ? D.rechPunto : null; if (!l || !l[n]) return null;
    const r = l[n].map(x => [D.puntos[x[0]], x[1]]).filter(x => !F.ss || F.ss.indexOf(x[0].s)>=0); return r.length ? r : null; };
  const salida = k => k==='ret' || k==='rech';             // rechazos y retornados salen de México hacia el país
  const nR = S.region ? 10 : 0;                              // con una región elegida se muestran más nacionalidades
  const pares = kc ? [[kc, (kc==='ing' || kc==='resc') ? 10 : (nR||8), true]] : [['ing', 10, false], ['resc', 10, true]];     // sin indicador: panorama regular + irregular
  pares.forEach(par => { const k = par[0], c = k==='rech' ? t.arena : t[IND[k].g], latido = k==='tram';   // trámites: sin flujo, solo latido
    if (k==='rep'){ const l = D.repPuntos.map(p=>[p, suma(p.wk,0,NW)]).sort((x,y)=>y[1]-x[1]).slice(0,7), mx = l[0][1];
      l.forEach((r,i) => flujo('rep'+i, ANCLA_EU, [r[0].x,r[0].y], r[1], mx, c)); return; }
    if (k==='recib'){ const l = topEsts(s => ritmo(k,[s],F.nd), 5), mx = l.length?l[0][1]:1; l.forEach(r => flujo('recib'+r[0], ANCLA_EU, xyEst(r[0]), r[1], mx, c));
      if (kc){ const ln = F.n!=null ? [[F.n, ritmo(k,F.ss,F.n)]] : topNats(n => enRegion(n) ? ritmo(k,F.ss,n) : 0, 10), mb = ln.length ? (fin?ln[0][1]:Math.max.apply(null,semanal(k,F.ss,ln[0][0]))) : 1; ln.forEach((r,i) => burbuja(r[0], r[1], mb, c, i<5?D.nats[r[0]][0]+' · '+corto(fin?r[1]:acum(k,F.ss,r[0])):'', 0, r[0]===F.n)); }
      return; }
    if (F.n!=null){                               // una nacionalidad: hacia sus principales estados
      const l = topEsts(s => ritmo(k,[s],F.n), 3), mx = l.length?l[0][1]:1;
      const pp = puntoDe(k, F.n);
      if (!latido && pp) pp.forEach((x,j) => { const a = xyNat(F.n), b = [x[0].x, x[0].y]; if (salida(k)) flujo(k+'p'+j, b, a, x[1], pp[0][1], c); else flujo(k+'p'+j, a, b, x[1], pp[0][1], c); });
      else if (!latido) l.forEach(r => { const a = xyNat(F.n), b = xyEst(r[0]); if (salida(k)) flujo(k+'n'+r[0], b, a, r[1], mx, c); else flujo(k+'n'+r[0], a, b, r[1], mx, c); });
      if (par[2]) burbuja(F.n, ritmo(k,null,F.n), 1, c, D.nats[F.n][0]+' · '+corto(fin?sumaSem(k,0,NW-1,null,F.n):acum(k,null,F.n)), 22, true);
      return; }
    const l = topNats(n => enRegion(n) ? ritmo(k,F.ss,n) : 0, par[1]), mx = l.length?l[0][1]:1;
    const mb = l.length ? (fin ? l[0][1] : Math.max.apply(null, semanal(k,F.ss,l[0][0]))) : 1;
    l.forEach((r,i) => { const a = xyNat(r[0]);
      if (!latido){ const pp = puntoDe(k, r[0]);
        if (pp){ const tp = pp.reduce((x,y) => x+y[1], 0);         // se reparte entre sus principales puntos de internación
          pp.forEach((x,j) => { const b = [x[0].x, x[0].y], v = r[1]*x[1]/tp; if (salida(k)) flujo(k+r[0]+'p'+j, b, a, v, mx, c); else flujo(k+r[0]+'p'+j, a, b, v, mx, c); }); }
        else { const d = destinoDe(k, r[0]); if (!d[0]) return; if (salida(k)) flujo(k+r[0], d[0], a, r[1], mx, c); else flujo(k+r[0], a, d[0], r[1], mx, c); } }
      if (par[2]) burbuja(r[0], r[1], mb, c, (i<5 || !S.flujos) ? D.nats[r[0]][0]+' · '+corto(fin?r[1]:acum(k,F.ss,r[0])) : '', 0, latido);
      else if (!bub.concat(lat).some(x=>x.nat===r[0])) burbuja(r[0], r[1], mb, c, D.nats[r[0]][0]+' · '+corto(fin?r[1]:acum(k,F.ss,r[0])), 0); });
  });
  if (F.n!=null && !bub.concat(lat).some(x => x.nat===F.n)) burbuja(F.n, 1, 1, t.tinta, D.nats[F.n][0], 18, true);   // el país elegido siempre se ve
  if (!S.circulos) [bub, lat].forEach(a => { for (let i=a.length-1;i>=0;i--) if (a[i].nat!==F.n) a.splice(i,1); });   // círculos ocultos (menos el país elegido)
  if (!S.flujos && !S.car) ponerFlujos([]);
  // -- Puntos de ingreso, repatriación y estaciones
  const cp = capaPuntos(kc), pts = []; let maxP = 1;
  if (cp){ cp.lista.forEach(p => maxP = Math.max(maxP, suma(p.wk,0,NW)));
    const selP = S.sel && S.sel.t==='p' && S.sel.tipo===cp.tipo;
    const ver = S.puntos || (kc && cp.siempre) || (kc && S.zoom>=1.9) || selP;
    cp.lista.forEach((p,i) => { const v = suma(p.wk,0,semDe(S.dia)+1); if (v<=0) return;
      if (ver) pts.push({ value:[p.x,p.y,v], pt:i, pTipo:cp.tipo, et:p.n,
        symbol: ICONO_PUNTO(cp.tipo, t[cp.tipo==='ing'?'reg':cp.tipo==='rep'?'usa':'irr'], S.tema==='oscuro' ? '#2B2926' : '#FFFFFF'),
        symbolSize: (15 + 11*Math.sqrt(v/maxP))*E,
        label:{ show: S.zoom>=3.4 || (cp.siempre && S.zoom>=1.5) || (selP && S.sel.i===i) },
        itemStyle:{ color:t[cp.tipo==='ing'?'reg':cp.tipo==='rep'?'usa':'irr'], opacity:.95, borderWidth:0 } }); });
  }
  // -- Encuentros de la CBP por sector, del lado de EE. UU.
  const enc = [];
  if (S.cbp && D.cbp){ const mxc = Math.max.apply(null, D.cbp.sectores.map(P => P.tot).concat(1));
    D.cbp.sectores.forEach((P,i) => { const v = fin ? P.tot : suma(P.wk,0,semDe(S.dia)+1); if (v<=0) return;
      enc.push({ value:[P.x,P.y,v], cb:i, et:P.n+' · '+corto(v), symbolSize:(8 + 20*Math.sqrt(v/mxc))*E, label:{ show:S.zoom>=0.75 },
                 itemStyle:{ color:t.usa, opacity:.9, borderColor:t.tinta, borderWidth:1.4*E } }); }); }
  // -- Caravanas: dónde salieron y, si se sabe, dónde se disolvieron
  const car = [], rutas = [];
  if (S.car){ const l = carPeriodo().filter(c => c.i<S.dia), mxp = Math.max.apply(null, l.map(c => c.p).concat(1)), orig = {};
    l.forEach(c => { const C = D.caravanas[c.j]; if (!C.sx) return; const q = C.sx.join(','); (orig[q] = orig[q] || {xy:C.sx, l:[]}).l.push(c.j);
      if (C.dx) rutas.push({ id:'car'+c.j, a:C.sx, b:C.dx, ruta:rutaCaravana(c.j).p, c:t.irr, w:1 + 2.6*Math.sqrt(C.p/mxp), car:C.p, sel:S.carSel===c.j }); });
    Object.keys(orig).forEach(q => { const o = orig[q], p = o.l.reduce((x,j) => x+D.caravanas[j].p, 0);
      car.push({ value:o.xy.concat(p), cars:o.l, et:lugarCorto(D.caravanas[o.l[0]].s)+' · '+o.l.length+(o.l.length===1?' caravana':' caravanas'),
                 symbolSize:(11 + 9*Math.sqrt(o.l.length/Math.max(1,l.length)))*E, itemStyle:{ color:t.irr, opacity:.95, borderColor:t.halo, borderWidth:1.6*E } }); });
    rutas.forEach(r => { const j = +r.id.slice(3);
      car.push({ value:r.b.concat(D.caravanas[j].p), fin:j, et:'', symbol:'circle', symbolSize:(r.sel?10:7)*E, label:{show:false}, showEffectOn:'emphasis',
                 itemStyle:{ color:t.halo, borderColor:t.irr, borderWidth:2*E } }); }); }
  if (S.flujos || S.car) ponerFlujos((S.flujos ? fl : []).concat(rutas));
  chart.setOption({ series:[ {id:'bub', data:bub}, {id:'pts', data:pts}, {id:'cbp', data:enc}, {id:'grp', data:grp}, {id:'lat', data:lat}, {id:'car', data:car} ] });
  // -- Rótulo acoplado: título, cifra, leyenda y selector "Ver por"
  const quien = (S.sel && S.sel.t!=='p' ? (S.sel.t==='n'?' de ':' en ')+nombreSel() : '')+(F.todo ? ' en '+(S.agr==='c' ? 'cinturones' : 'los CECO') : '')+(F.r ? ' · '+nombreRegion() : '');
  let h;
  if (kc){ const tot = acum(kc,F.ss,nF);
    h = '<b>'+esc(IND[kc].n+quien)+'</b><span>'+(fin ? 'Periodo completo' : 'Ritmo semanal al '+fechaDia(S.dia-1))+'</span>'+
        '<div class="gr"><span class="num">'+corto(tot)+'</span>'+chispa(semanal(kc,F.ss,nF),88,26,col,semDe(S.dia))+'</div>'+
        '<div class="rampa"><span>menos</span><i style="background:linear-gradient(90deg,'+rampa.join(',')+')"></i><span>'+corto(maxE)+'</span></div>'; }
  else h = '<b>Panorama'+esc(quien)+'</b><span>De dónde llegan'+(fin?'':' · al '+fechaDia(S.dia-1))+'. Elige un indicador para colorear los estados.</span>'+
           '<span class="lin"><i style="background:'+t.reg+'"></i>Ingresos (regular)</span><span class="lin"><i style="background:'+t.irr+'"></i>Rescatados (irregular)</span>'+
           '<span class="nota">Línea: del país al lugar de registro · círculo: tamaño según el total</span>';
  if (pts.length){ const cP = t[cp.tipo==='ing'?'reg':cp.tipo==='rep'?'usa':'irr'];
    h += '<span class="lin"><span style="display:inline-flex;width:14px;height:14px">'+svgPunto(cp.tipo, cP, '#FFFFFF')+'</span>'+NOMBRE_PUNTO[cp.tipo]+'</span>'; }
  if (S.car){ const l = carPeriodo();
    h += '<span class="lin"><span style="display:inline-flex;width:14px;height:14px;color:'+t.irr+'"><svg width="14" height="14" viewBox="0 0 16 16">'+GLIFO_CAR+'</svg></span>'+
         (l.length ? 'Caravanas · '+l.length+' · ≈'+corto(l.reduce((x,c) => x+c.p, 0))+' personas' : 'Sin caravanas en el periodo')+'</span>'; }
  if (S.cbp && D.cbp) h += '<span class="lin"><i style="background:'+t.usa+';width:9px;height:9px;border-radius:50%"></i>Encuentros CBP · '+corto(enc.reduce((x,y)=>x+y.value[2],0))+'</span>';
  const vp = S.agr!=='e' ? S.agr : S.modoVista==='mundo' ? 'm' : S.modoVista==='mx' ? 'e' : '';   // si el usuario movió el mapa, ninguno de los dos
  h += '<div class="verpor" role="group" aria-label="Vista del mapa">'+[['m','Mundo'],['e','Estado'],['c','Cinturón'],['o','CECO']].map(x=>'<button data-agr="'+x[0]+'" class="'+(vp===x[0]?'on':'')+'" aria-pressed="'+(vp===x[0])+'">'+x[1]+'</button>').join('')+'</div>';
  if (F.n==null) h += '<label class="origen">Origen <select id="region" aria-label="Región de origen"><option value="">todas las regiones</option>'+
    Object.keys(REGIONES).map(r => '<option value="'+r+'"'+(S.region===r?' selected':'')+'>'+REGIONES[r][0]+'</option>').join('')+'</select></label>';
  $('m-tit').innerHTML = h;
}
// Tarjetas al pasar el cursor. Muestran el perfil completo (todos los indicadores con su variación)
// para leer un país, un estado o un punto sin tener que hacer clic.
function variaTxt(d){ const va = variacion(d); return va.ok && Math.abs(va.dl)>=1 ? (va.dl>=0?'▲ ':'▼ ')+Math.abs(va.dl).toFixed(0)+'%' : ''; }
function notaPerfil(k, ss, n){                   // el dato que da contexto a cada indicador
  if (k==='rech'){ const re = sumaSem('rech',0,NW-1,ss,n), ing = sumaSem('ing',0,NW-1,ss,n); return re/(ing+re) >= 0.0005 ? (re/(ing+re)*100).toFixed(1)+'% de llegadas' : ''; }
  if (k==='resc'){ const r = comp('resc_rei',ss,n); return r[1] ? pct(r[1],r[0]+r[1])+'% reincidentes' : ''; }
  if (k==='can'){ const v = suma(comp('can_nna',ss,n),0,12); return v ? miles(v)+' NNA' : ''; }
  if (k==='ret'){ const v = comp('ret_tipo',ss,n); return v[1] ? pct(v[1],v[0]+v[1])+'% asistido' : ''; }
  if (k==='recib'){ const v = comp('recib_edad',ss,n); return v[1] ? pct(v[1],v[0]+v[1])+'% menores' : ''; }
  return '';
}
function perfil(ss, n, activo, tc, breve){
  const conDelta = !(ss && n!=null), out = [];    // estado × nacionalidad no existe por día: ahí no hay variación
  GRUPOS.forEach(g => {
    let filas = INDS.filter(m => m.g===g[0] && (n==null || m.nat)).map(m => { const v = acum(m.k, ss, n); if (!v) return '';
      const nota = breve ? '' : notaPerfil(m.k, ss, n);
      return '<div class="q'+(m.k===activo?' a':'')+'"><span>'+m.n+(nota?'<small>'+nota+'</small>':'')+'</span><b>'+corto(v)+'</b><em>'+(conDelta ? variaTxt(diario(m.k,{ss:ss,n:n})) : '')+'</em></div>'; }).join('');
    if (g[0]==='reg'){ const dv = Array.isArray(n) ? (ss ? 0 : n.reduce((t,x) => t+((D.docs.nat[x]||[])[0]||0), 0)) : n!=null ? (ss ? 0 : (D.docs.nat[n] || [])[0]) : (ss && ss.length===1 ? D.docs.est[ss[0]] : 0);
      if (dv) filas += '<div class="q"><span>Con documento vigente</span><b>'+corto(dv)+'</b><em></em></div>'; }
    if (filas) out.push((breve ? '' : '<div class="g"><i style="background:'+tc[g[0]]+'"></i>'+g[1]+'</div>')+filas); });
  return out.join('');
}
function soloKpi(k, ss, n, tc, sem, breve){      // tarjeta con un indicador elegido: solo ese dato
  const nota = notaPerfil(k, ss, n), d = (ss && n!=null) ? '' : variaTxt(diario(k,{ss:ss,n:n}));
  return '<span class="v">'+miles(acum(k, ss, n))+'</span>'+((nota || d) ? '<span class="s">'+[nota, d ? d+' '+(S.cmp==='aa' ? 'vs. año anterior' : 'en '+etiquetaN(S.cmp)) : ''].filter(Boolean).join(' · ')+'</span>' : '')+
         (breve ? '' : chispa(semanal(k,ss,n),232,30,k==='rech'?tc.arena:tc[IND[k].g],sem));
}
const accion = (txt, may) => { const a = (TACTIL ? 'toca otra vez para ' : 'clic para ')+txt; return may ? a[0].toUpperCase()+a.slice(1) : a; };
function tarjeta(p){
  const F = filtro(), kc = S.ind, fin = alFinal(), sem = semDe(S.dia), breve = $('lz').clientHeight < 430*E;
  const tc = TM[S.tema==='claro' ? 'oscuro' : 'claro'];              // la tarjeta va en el tono contrario al mapa
  const cuando = fin ? 'Periodo completo' : 'Acumulado al '+fechaDia(S.dia-1);
  const pie = txt => breve ? '' : '<span class="f">▲▼ '+textoCmp()+(txt ? ' · '+txt : '')+'</span>';
  const fila = (n,frac,tx,color) => '<div class="r"><span>'+n+'</span><span class="b"><i style="width:'+Math.max(2,Math.min(100,frac*100)).toFixed(0)+'%;background:'+color+'"></i></span><span class="x">'+tx+'</span></div>';
  const dato = (n,tx) => '<div class="r"><span>'+n+'</span><span></span><span class="x">'+tx+'</span></div>';
  if (p.seriesId==='bub' || p.seriesId==='lat'){ const n = p.data.nat, kn = kc && IND[kc].nat ? kc : null;
    return '<div class="tt"><b class="h">'+esc(D.nats[n][0])+'</b><span class="s">'+(kn ? IND[kn].n+' · ' : '')+cuando+(F.ss ? ' · en '+esc(nombreFiltro()) : '')+'</span>'+
      (kn ? soloKpi(kn, F.ss, n, tc, sem, breve) : perfil(F.ss, n, null, tc, breve))+pie(accion('abrir su ficha'))+'</div>'; }
  if (p.componentType==='geo'){
    if (p.name.indexOf('US_')===0 && S.cbp && D.cbp && D.cbp.estados[p.name.slice(3)])
      return '<div class="tt"><b class="h">'+esc(p.name.slice(3))+'</b><span class="s">Encuentros de la CBP · periodo completo</span><span class="v">'+miles(D.cbp.estados[p.name.slice(3)])+'</span><span class="f">'+pct(D.cbp.estados[p.name.slice(3)], D.cbp.total)+'% de los encuentros en la frontera</span></div>';
    if (p.name.indexOf('MX_')!==0) return '';
    const s = ECLAVE.indexOf(p.name); if (s<0) return '';
    const gru = ['c','o'].map(a => AGR[a].de[s]>=0 ? AGR[a].nombres[AGR[a].de[s]] : null).filter(Boolean).join(' · ');
    const nF = F.nd, top = kc && IND[kc].nat && F.n==null && !breve ? topNats(n => enRegion(n) ? acum(kc,[s],n) : 0, 3) : [], mx = top.length ? top[0][1] : 1;
    return '<div class="tt"><b class="h">'+esc(EST[s])+'</b><span class="s">'+(kc ? IND[kc].n+' · ' : '')+(gru || 'Sin cinturón ni CECO')+' · '+cuando+(F.n!=null ? ' · '+esc(D.nats[F.n][0]) : F.r ? ' · '+nombreRegion() : '')+'</span>'+
      (kc ? soloKpi(kc, [s], IND[kc].nat ? nF : null, tc, sem, breve) : perfil([s], nF, null, tc, breve))+
      (top.length ? '<div class="g">Principales nacionalidades · '+IND[kc].n.toLowerCase()+'</div>'+top.map(r => fila(esc(D.nats[r[0]][0]), r[1]/mx, corto(r[1]), tc[IND[kc].g])).join('') : '')+
      pie(accion('ver todos sus datos'))+'</div>'; }
  if (p.seriesId==='pts'){ const tp = p.data.pTipo, P = listaPuntos(tp)[p.data.pt], col = tc[tp==='ing'?'reg':tp==='rep'?'usa':'irr'];
    const nom = tp==='ing' ? ['Aéreo','Terrestre','Marítimo'][P.t]+' · ingresos' : tp==='rep' ? 'Punto de repatriación' : 'Presentados';
    const extra = tp==='ing' ? '<div class="g">Quién entra por aquí</div>'+P.top.slice(0,3).map(r => fila(esc(typeof r[0]==='number'?D.nats[r[0]][0]:r[0]), r[1]/P.top[0][1], corto(r[1]), col)).join('')+(P.seg?dato('Rechazos en segunda revisión', miles(P.rech)):'')
                : tp==='rep' ? dato('Menores', miles(P.men))+dato('No acompañados', miles(P.na)) : '';
    return '<div class="tt"><b class="h">'+esc(P.n)+'</b><span class="s">'+nom+' · ubicación aproximada</span><span class="v">'+miles(p.data.value[2])+'</span>'+chispa(P.wk,232,30,col,sem)+extra+'<span class="f">'+accion('abrir su ficha', true)+'</span></div>'; }
  if (p.seriesId==='car'){
    if (p.data.fin!=null) return tarjetaCaravana(D.caravanas[p.data.fin]);
    const l = p.data.cars.map(j => D.caravanas[j]);
    if (l.length===1) return tarjetaCaravana(l[0]);
    return '<div class="tt"><span class="s">'+esc($('rango').textContent)+'</span><b class="h">Caravanas desde '+esc(lugarCorto(l[0].s))+'</b>'+
      '<span class="v">'+l.length+' <small>caravanas · ≈'+miles(l.reduce((x,c)=>x+c.p,0))+' personas (estimadas)</small></span>'+
      '<div class="cv cab"><span>Día</span><span>Caravana</span><span>Personas</span></div>'+
      l.map(c => '<div class="cv"><span>'+fechaEv(c.f).replace(/ \d{4}$/,'')+'</span><span>'+esc(c.n)+'</span><b>≈'+miles(c.p)+'</b></div>').join('')+
      '<span class="f">Ubicación aproximada</span></div>'; }
  if (p.seriesId==='cbp'){ const P = D.cbp.sectores[p.data.cb], tot = P.tot || 1;
    return '<div class="tt"><b class="h">'+esc(P.n)+'</b><span class="s">Encuentros de la CBP · '+esc(P.eu)+(P.mx>=0 ? ', frente a '+esc(EST[P.mx]) : '')+'</span><span class="v">'+miles(p.data.value[2])+'</span>'+chispa(P.wk,232,30,tc.usa,sem)+
      '<div class="g">Quiénes</div>'+fila('Mexicanos', P.mex/tot, pct(P.mex,tot)+'%', tc.usa)+fila('Extranjeros', P.ext/tot, pct(P.ext,tot)+'%', tc.usa)+
      '<div class="g">Agencia</div>'+[['USBP',0],['OFO',1],['CBP ONE',2]].filter(x => P.ag[x[1]]).map(x => fila(x[0], P.ag[x[1]]/tot, pct(P.ag[x[1]],tot)+'%', tc.usa)).join('')+
      (breve || !P.top.length ? '' : '<div class="g">Principales nacionalidades extranjeras</div>'+P.top.slice(0,3).map(r => fila(esc(r[0]), r[1]/P.top[0][1], corto(r[1]), tc.usa)).join(''))+
      '<span class="f">'+cuando+' · fuente: CBP</span></div>'; }
  return '';
}
let vuelo = 0;
function volar(c, zr){                          // zr: zoom medido contra el encuadre de México
  const g = chart.getOption().geo[0], c0 = g.center, z0 = g.zoom, z = zr*KMX();
  cancelAnimationFrame(vuelo);
  if (reducido()){ chart.setOption({geo:{center:c, zoom:z}}); S.zoom = zr; pintarMapa(); return; }
  let i = 0; const N = 26;
  const paso = () => { i++; const x = i/N, e = x<.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
    chart.setOption({geo:{ center:[c0[0]+(c[0]-c0[0])*e, c0[1]+(c[1]-c0[1])*e], zoom: z0*Math.pow(z/z0,e) }});
    if (i<N) vuelo = requestAnimationFrame(paso); else { S.zoom = zr; pintarMapa(); } };
  paso();
}
function volarA(sel){
  S.modoVista = 'libre';
  if (sel.t==='e'){ volar(xyEst(sel.i), 2.2); return; }
  if (sel.t==='g'){ volar(xyGrupo(miembros(sel.a,sel.q)), 1.25); return; }
  if (sel.t==='p'){ const P = listaPuntos(sel.tipo)[sel.i]; volar([P.x,P.y], 5); return; }
  const xy = xyNat(sel.i); if (xy) volarConMexico(xy);
}
function herramienta(a){
  const g = chart.getOption().geo[0];
  if (a==='mas'){ S.modoVista = 'libre'; volar(g.center, Math.min(40, g.zoom/KMX()*1.7)); }
  else if (a==='menos'){ S.modoVista = 'libre'; volar(g.center, Math.max(vistaMundo().z*0.6, g.zoom/KMX()/1.7)); }
  else if (a==='mx'){ S.modoVista = 'mx'; volar(VISTA_MX.c, VISTA_MX.z); }
  else if (a==='mundo'){ const v = vistaMundo(); S.modoVista = 'mundo'; volar(v.c, v.z); }
  else if (a==='tema'){ S.tema = S.tema==='oscuro'?'claro':'oscuro'; $('mapa').dataset.m = S.tema; rehacerMapa(); }
  else { S[a] = !S[a]; const b = document.querySelector('#m-her [data-a="'+a+'"]'); b.classList.toggle('on', S[a]); b.setAttribute('aria-pressed', S[a]);
    if (a==='car'){ S.carSel = null; pintarTiempo(); }
    pintarMapa(); if (a==='cbp' && S.cbp) acercarSiMundo(); if (a==='car' && S.car) volarCaravanas(); }
}
function rehacerMapa(){ const g = chart.getOption().geo[0], z = g.zoom, c = g.center; COL.act = {}; chart.setOption(opcionBase(), true); chart.setOption({geo:{center:c, zoom:z}}); pintarTodo(); }

// Corredor carretero del sur (ubicación aproximada): las caravanas avanzan por tierra, no en línea recta.
// Tronco: frontera con Guatemala → Tapachula → costa de Chiapas → Istmo; luego, ramal a Oaxaca (190) o a la costa (200).
const TRONCO = [[-92.15,14.68],[-92.26,14.90],[-92.47,15.14],[-92.66,15.32],[-92.90,15.43],[-93.21,15.69],[-93.47,15.90],[-93.75,16.09],[-93.90,16.24],[-94.20,16.29],[-94.35,16.48],[-94.61,16.56],[-94.95,16.55],[-95.03,16.43],[-95.22,16.33]];
const CAMINOS = [ TRONCO.concat([[-95.44,16.44],[-95.70,16.50],[-95.95,16.55],[-96.30,16.78],[-96.72,17.06]]),
                  TRONCO.concat([[-95.20,16.20],[-95.38,16.13],[-95.75,15.97],[-96.13,15.78]]) ];
const RUTAS = {};
function rutaCaravana(j){
  if (RUTAS[j]) return RUTAS[j];
  const c = D.caravanas[j], a = c.sx, b = c.dx, d2 = (p,q) => (p[0]-q[0])*(p[0]-q[0]) + (p[1]-q[1])*(p[1]-q[1]);
  const cerca = (cam, p) => { let m = 0; cam.forEach((x,i) => { if (d2(x,p) < d2(cam[m],p)) m = i; }); return m; };
  let mejor = null;
  CAMINOS.forEach(cam => { const ia = cerca(cam,a), ib = cerca(cam,b), e = d2(cam[ia],a) + d2(cam[ib],b); if (!mejor || e<mejor.e) mejor = {cam:cam, ia:ia, ib:ib, e:e}; });
  let r = [a, b];
  if (mejor && mejor.e < 1.5){ const t = mejor.ia<=mejor.ib ? mejor.cam.slice(mejor.ia, mejor.ib+1) : mejor.cam.slice(mejor.ib, mejor.ia+1).reverse();
    r = [a].concat(t, [b]).filter((p,i,l) => i===0 || d2(p,l[i-1]) > 0.0004); }
  let largo = 0; for (let i=1;i<r.length;i++) largo += km(r[i-1], r[i]);
  return (RUTAS[j] = {p:r, km:largo});
}
// Caravanas: las del periodo elegido, con su día dentro del periodo
const GLIFO_CAR = '<g fill="currentColor"><circle cx="3.6" cy="4.6" r="1.6"/><circle cx="8" cy="4.6" r="1.6"/><circle cx="12.4" cy="4.6" r="1.6"/></g><g stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"><path d="M3.6 7.4v4.4M8 7.4v4.4M12.4 7.4v4.4M1.5 14h13"/></g>';
const carPeriodo = () => (D.caravanas || []).map((c,j) => ({ j:j, i:indiceDe(c.f), p:c.p })).filter(c => c.i>=0 && c.i<ND);
const nombreCar = c => /^caravana/i.test(c.n) ? c.n : /^sin nombre$/i.test(c.n) ? 'Caravana sin nombre' : 'Caravana «'+c.n+'»';
const lugarCorto = s => String(s).replace(/^Parque Bicentenario,\s*/i,'').split(',')[0];
function km(a, b){ const r = Math.PI/180, x = Math.sin((b[1]-a[1])*r/2), y = Math.sin((b[0]-a[0])*r/2);
  return 12742*Math.asin(Math.sqrt(x*x + Math.cos(a[1]*r)*Math.cos(b[1]*r)*y*y)); }
function tarjetaCaravana(c){
  const kv = (n,tx) => '<div class="kv"><span>'+n+'</span><b>'+tx+'</b></div>', j = D.caravanas.indexOf(c);
  return '<div class="tt"><span class="s">'+fechaISO(c.f)+'</span><b class="h">'+esc(nombreCar(c))+'</b><span class="v">≈'+miles(c.p)+' <small>personas (estimadas)</small></span>'+
    kv('Salida', esc(c.s))+kv('Disolución', c.d ? esc(c.d) : 'sin registro')+
    (c.sx && c.dx ? kv('Recorrido', '≈'+miles(rutaCaravana(j).km)+' km por carretera') : '')+'<span class="f">Ubicación aproximada</span></div>';
}
function cajaCaravanas(l){                      // zona que cubre las caravanas indicadas
  const xs = [], ys = []; l.forEach(c => [c.sx, c.dx].forEach(p => { if (p){ xs.push(p[0]); ys.push(p[1]); } }));
  if (!xs.length) return null;
  const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs), y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
  return { c:[(x0+x1)/2, (y0+y1)/2], z:Math.min(9, zoomPara(Math.max(4, (x1-x0)*1.9), Math.max(3, (y1-y0)*2.4))) };
}
function volarCaravanas(){
  const l = carPeriodo().map(c => D.caravanas[c.j]), v = cajaCaravanas(l); if (!v) return;
  S.modoVista = 'libre'; volar(v.c, v.z); mostrarSalida(1000);
}
function mostrarSalida(ms){                      // al llegar, se abre la tarjeta de la salida principal
  setTimeout(() => { const o = chart.getOption(), si = o.series.findIndex(x => x.id==='car'); if (si<0 || !o.series[si].data.length) return;
    let mejor = 0; o.series[si].data.forEach((d,i) => { if (d.cars && d.cars.length > (o.series[si].data[mejor].cars||[]).length) mejor = i; });
    chart.dispatchAction({ type:'showTip', seriesIndex:si, dataIndex:mejor }); }, ms);
}
function verCaravana(j){                         // desde "Lo que cambió": activa la capa y va a esa caravana
  const c = D.caravanas[j];
  if (!S.car){ S.car = true; const b = document.querySelector('#m-her [data-a="car"]'); b.classList.add('on'); b.setAttribute('aria-pressed', true); }
  S.carSel = j; S.dia = ND; pintarTodo();
  const v = cajaCaravanas([c]); if (v){ S.modoVista = 'libre'; volar(v.c, v.z); }
  setTimeout(() => { const o = chart.getOption(), si = o.series.findIndex(x => x.id==='car'); if (si<0) return;
    const di = o.series[si].data.findIndex(d => d.fin===j || (d.cars && d.cars.indexOf(j)>=0 && !c.dx));
    if (di>=0) chart.dispatchAction({ type:'showTip', seriesIndex:si, dataIndex:di }); }, 1000);
}

/* ==== [8] FLUJOS ANIMADOS Y TRANSICIÓN DE COLOR ==================== */
// Los flujos se dibujan en un lienzo propio, cuadro por cuadro, con la posición real del mapa:
// por eso siguen al mapa al moverlo y aparecen y desaparecen de forma gradual.
const FL = {};                                  // flujos vivos: id → {a,b,c, w, wm, al, alm}
function ponerFlujos(lista){
  Object.keys(FL).forEach(k => { FL[k].alm = 0; });
  lista.forEach(f => { const x = FL[f.id];
    if (x){ x.a = f.a; x.b = f.b; x.c = f.c; x.wm = f.w; x.alm = 1; x.car = f.car; x.sel = f.sel; x.ruta = f.ruta; } else FL[f.id] = { a:f.a, b:f.b, c:f.c, w:f.w, wm:f.w, al:0, alm:1, car:f.car, sel:f.sel, ruta:f.ruta, t0:performance.now() - Math.random()*4000 }; });
}
let ctxF = null, cuadro = 0;
function ajustarLienzo(){ const cv = $('flujo'), r = $('lz'), dpr = Math.min(window.devicePixelRatio||1, 2);
  cv.width = Math.round(r.clientWidth*dpr); cv.height = Math.round(r.clientHeight*dpr); ctxF = cv.getContext('2d'); ctxF.setTransform(dpr,0,0,dpr,0,0); }
function animar(ahora){
  requestAnimationFrame(animar);
  if (document.hidden || S.vista!=='pulso' || !chart || !ctxF) return;
  cuadro++;
  // -- transición de color de los estados
  if (COL.sucio && cuadro%2===0){
    const t = TM[S.tema], base = hex(t.mx); let mov = false;
    ECLAVE.forEach(k => { const m = COL.meta[k] || base; let a = COL.act[k]; if (!a){ a = COL.act[k] = base.slice(); }
      for (let j=0;j<3;j++){ const d = m[j]-a[j]; if (Math.abs(d)>0.6){ a[j] += d*0.22; mov = true; } else a[j] = m[j]; } });
    chart.setOption({ geo:{ regions:regiones() } }, {lazyUpdate:true, silent:true});
    if (!mov) COL.sucio = false;
  }
  // -- flujos
  const w = $('lz').clientWidth, h = $('lz').clientHeight, quieto = reducido();
  ctxF.clearRect(0,0,w,h);
  Object.keys(FL).forEach(id => { const f = FL[id];
    f.al += (f.alm-f.al)*0.07; f.w += (f.wm-f.w)*0.1;
    if (f.alm===0 && f.al<0.01){ delete FL[id]; return; }
    const pa = chart.convertToPixel('geo', f.a), pb = chart.convertToPixel('geo', f.b); if (!pa || !pb) return;
    const dx = pb[0]-pa[0], dy = pb[1]-pa[1], len = Math.hypot(dx,dy); if (len<6) return;
    let nx = -dy/len, ny = dx/len; if (ny>0){ nx = -nx; ny = -ny; }            // la curva siempre se arquea hacia arriba
    if (f.car){ caminata(f, pa, pb, dx, dy, len, nx, ny, ahora, quieto); return; }
    const cx = (pa[0]+pb[0])/2 + nx*len*0.2, cy = (pa[1]+pb[1])/2 + ny*len*0.2, gw = f.w*E;
    ctxF.lineCap = 'round'; ctxF.strokeStyle = f.c; ctxF.fillStyle = f.c;
    ctxF.globalAlpha = 0.20*f.al; ctxF.lineWidth = gw; ctxF.beginPath(); ctxF.moveTo(pa[0],pa[1]); ctxF.quadraticCurveTo(cx,cy,pb[0],pb[1]); ctxF.stroke();
    // partículas que viajan del origen al destino, a velocidad constante
    const n = Math.max(2, Math.min(14, Math.round(len/(70*E)))), fase = quieto ? 0.5 : (ahora*0.045*E/len) % (1/n);
    for (let i=0;i<n;i++){ const p = fase + i/n; if (p>1) continue; const q = 1-p;
      const x = q*q*pa[0] + 2*q*p*cx + p*p*pb[0], y = q*q*pa[1] + 2*q*p*cy + p*p*pb[1];
      ctxF.globalAlpha = f.al*Math.pow(Math.sin(Math.PI*p), 0.55)*0.95;
      ctxF.beginPath(); ctxF.arc(x, y, Math.max(1.5*E, gw*0.62), 0, 6.283); ctxF.fill(); }
    // punta discreta en el destino
    ctxF.globalAlpha = 0.5*f.al; ctxF.beginPath(); ctxF.arc(pb[0], pb[1], Math.max(2*E, gw*0.8), 0, 6.283); ctxF.fill();
  });
  ctxF.globalAlpha = 1;
}
// Caravana: el contingente avanza por la carretera como un grupo compacto que camina;
// lo ya recorrido queda marcado y lo que falta se ve punteado. Al llegar, se detiene un momento y vuelve a salir.
function caminata(f, pa, pb, dx, dy, len, nx, ny, ahora, quieto){
  const px = f.ruta.map(q => chart.convertToPixel('geo', q)); if (px.some(q => !q)) return;
  const ac = [0]; for (let i=1;i<px.length;i++) ac.push(ac[i-1] + Math.hypot(px[i][0]-px[i-1][0], px[i][1]-px[i-1][1]));
  const L = ac[ac.length-1]; if (L<8) return;
  const en = d => { d = Math.max(0, Math.min(L, d)); let i = 1; while (i<ac.length-1 && ac[i]<d) i++;
    const u = (d-ac[i-1])/Math.max(1e-6, ac[i]-ac[i-1]), x = px[i-1][0]+(px[i][0]-px[i-1][0])*u, y = px[i-1][1]+(px[i][1]-px[i-1][1])*u, l = Math.max(1e-6, ac[i]-ac[i-1]);
    return [x, y, -(px[i][1]-px[i-1][1])/l, (px[i][0]-px[i-1][0])/l]; };
  const vida = 11000, ciclo = quieto ? 1 : Math.min(1, ((ahora - f.t0) % vida) / (vida*0.82)), cab = L*ciclo;
  const trazo = (d0, d1) => { ctxF.beginPath(); let p = en(d0); ctxF.moveTo(p[0],p[1]); for (let i=1;i<ac.length;i++) if (ac[i]>d0 && ac[i]<d1) ctxF.lineTo(px[i][0],px[i][1]); p = en(d1); ctxF.lineTo(p[0],p[1]); ctxF.stroke(); };
  ctxF.strokeStyle = f.c; ctxF.fillStyle = f.c; ctxF.lineCap = 'round'; ctxF.lineJoin = 'round';
  ctxF.globalAlpha = 0.35*f.al; ctxF.lineWidth = 1.5*E; ctxF.setLineDash([2.5*E, 4*E]); trazo(cab, L); ctxF.setLineDash([]);
  ctxF.globalAlpha = (f.sel ? 0.8 : 0.55)*f.al; ctxF.lineWidth = (f.sel ? 3 : 2.2)*E; if (cab>1) trazo(0, cab);
  // el contingente: personas repartidas a lo largo y a lo ancho del camino, con un leve vaivén al caminar
  const gente = Math.max(8, Math.min(34, Math.round(f.car/45))), largo = Math.min(L*0.22, (14 + gente*0.9)*E);
  for (let i=0;i<gente;i++){ const r1 = Math.abs(Math.sin(i*12.9898)*43758.5) % 1, r2 = Math.abs(Math.sin(i*78.233)*12543.1) % 1;
    const d = cab - r1*largo; if (d<0) continue;
    const q = en(d), bam = quieto ? 0 : Math.sin(ahora*0.009 + i*1.7)*0.7*E, lado = (r2-0.5)*7*E*(0.6 + 0.4*Math.sin(r1*6)) + bam;
    ctxF.globalAlpha = f.al*(0.55 + 0.45*(1-r1));
    ctxF.beginPath(); ctxF.arc(q[0] + q[2]*lado, q[1] + q[3]*lado, (1.45 + 0.5*r2)*E, 0, 6.283); ctxF.fill(); }
}

/* ==== [9] BARRA DE TIEMPO Y REPRODUCCIÓN ========================== */
// Barras, promedio, cursor y meses comparten una sola escala X: siempre quedan alineados.
// El cursor avanza día por día (barra por barra) y entre días se desliza de forma continua.
let Wt = 300;
function pintarTiempo(){
  // Sin indicador: ingresos hacia arriba y rescatados hacia abajo (espejo), cada uno con su propia escala.
  // Con indicador: solo esa serie. Debajo, la tira de vacaciones; arriba, los eventos.
  const sv = $('tgraf'), W = Wt = Math.max(200, sv.clientWidth), H = 100, F = filtro(), t = TM[S.tema], pw = W/ND, dos = !S.ind;
  const serie = k => diario(k, IND[k].nat || F.nd==null ? F : {ss:F.ss, n:null, nd:null});
  const capas = dos ? [['ing',46,36,1],['resc',48,28,-1]] : [[S.ind,76,60,1]], TIRA = 84;
  let h = '<defs><pattern id="pend" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+t.tinta+'" stroke-opacity=".2" stroke-width="2"/></pattern></defs>';
  const cadaCuanto = Math.ceil(MESES_INI.length*46/W);                 // si hay muchos meses, se rotula uno de cada tantos
  MESES_INI.forEach((m,i) => { const x = (m[0]*pw).toFixed(1); h += '<line x1="'+x+'" y1="8" x2="'+x+'" y2="'+(TIRA+4)+'" stroke="'+t.tinta+'" stroke-opacity=".12"/>'+(i%cadaCuanto ? '' : '<text x="'+(m[0]*pw+4).toFixed(1)+'" y="'+(H-2)+'" font-size="11" fill="'+t.tinta+'" fill-opacity=".7" font-family="Barlow, sans-serif">'+m[1]+'</text>'); });
  const tot = {};
  capas.forEach(cp => { const k = cp[0], b = cp[1], al = cp[2], dir = cp[3], d = serie(k), mx = Math.max.apply(null,d) || 1, c = t[IND[k].g], U = finDatos(k);
    tot[k] = suma(d,0,S.dia);
    d.forEach((v,i) => { const bh = Math.max(0.6, v/mx*al); h += '<rect x="'+(i*pw+0.5).toFixed(1)+'" y="'+(dir>0 ? b-bh : b).toFixed(1)+'" width="'+Math.max(1,pw-1.5).toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1" fill="'+c+'" fill-opacity="'+(i<S.dia?0.7:0.2)+'"/>'; });
    const ma = []; for (let i=0;i<Math.min(S.dia,U);i++){ const a = Math.max(0,i-6); ma.push(((i+0.5)*pw).toFixed(1)+','+(b - dir*suma(d,a,i+1)/(i+1-a)/mx*al).toFixed(1)); }
    if (ma.length>1) h += '<polyline points="'+ma.join(' ')+'" fill="none" stroke="'+t.tinta+'" stroke-width="1.6" stroke-linejoin="round" stroke-opacity=".85"/>';
    if (U<ND) h += '<rect x="'+(U*pw).toFixed(1)+'" y="'+(dir>0 ? b-al : b)+'" width="'+((ND-U)*pw).toFixed(1)+'" height="'+al+'" fill="url(#pend)"><title>'+IND[k].n+' pendiente: la base llega al '+fechaLarga(U-1)+'</title></rect>';
  });
  if (dos) h += '<line x1="0" y1="47" x2="'+W+'" y2="47" stroke="'+t.tinta+'" stroke-opacity=".35"/>';
  temporadas().forEach(x => { const a = Math.max(0, indiceDe(x[0])), b = Math.min(ND, indiceDe(x[1])+1); if (b<=a) return;       // vacaciones SEP y fiestas
    h += '<rect x="'+(a*pw).toFixed(1)+'" y="'+TIRA+'" width="'+Math.max(2,(b-a)*pw).toFixed(1)+'" height="4" rx="2" fill="#BDB58D"><title>'+esc(x[2])+'</title></rect>'; });
  if (S.car){ const yb = dos ? 76.5 : 76.5; carPeriodo().forEach(c => { const C = D.caravanas[c.j], x = (c.i+0.5)*pw, a = 3.5 + 3*Math.sqrt(Math.min(1, C.p/2000));
    h += '<path d="M'+x.toFixed(1)+' '+yb+'l'+a.toFixed(1)+' 6.5h'+(-2*a).toFixed(1)+'z" fill="'+t.irr+'" stroke="'+t.halo+'" stroke-width="1"><title>'+fechaISO(C.f)+' · '+esc(nombreCar(C))+' · ≈'+miles(C.p)+' personas</title></path>'; }); }
  CTX.reg.concat(F.n!=null ? (CTX[D.nats[F.n][1]] || []) : []).filter(e => e.f.length===10 && indiceDe(e.f)>=0 && indiceDe(e.f)<ND).forEach(e => { const x = (indiceDe(e.f)+0.5)*pw;
    h += '<g><title>'+esc(e.que)+'</title><line x1="'+x.toFixed(1)+'" y1="5" x2="'+x.toFixed(1)+'" y2="'+TIRA+'" stroke="'+t.tinta+'" stroke-opacity=".6" stroke-dasharray="2 3"/><circle cx="'+x.toFixed(1)+'" cy="5" r="3.5" fill="'+CATS[e.c][1]+'" stroke="'+t.halo+'" stroke-width="1.5"/>'+
         (dos ? '' : '<text x="'+(x+7).toFixed(1)+'" y="9" font-size="10.5" fill="'+t.tinta+'" fill-opacity=".8" font-family="Barlow, sans-serif">'+esc(e.que.replace('presidencial ','').slice(0,40))+'</text>')+'</g>'; });
  h += '<g id="cursor"><line x1="0" y1="0" x2="0" y2="'+(TIRA+4)+'" stroke="'+t.tinta+'" stroke-width="2"/><circle cx="0" cy="'+(TIRA+2)+'" r="5.5" fill="'+t.tinta+'" stroke="'+t.mar+'" stroke-width="2"/></g>';
  sv.setAttribute('viewBox','0 0 '+W+' '+H); sv.innerHTML = h; moverCursor(S.play ? S.t : S.dia);
  sv.setAttribute('aria-valuenow', S.dia); sv.setAttribute('aria-valuetext','al '+fechaDia(S.dia-1));
  const cua = c => '<i class="t-c" style="background:'+c+'"></i>';
  $('t-tit').innerHTML = dos ? cua(t.reg)+'<b>Ingresos</b> '+corto(tot.ing)+' &nbsp; '+cua(t.irr)+'<b>Rescatados</b> '+corto(tot.resc)+' <span class="t-n">por día · cada serie con su escala</span>'
                             : cua(t[IND[S.ind].g])+'<b>'+IND[S.ind].n+'</b> '+corto(tot[S.ind])+' <span class="t-n">por día</span>';
  $('t-ley').innerHTML = '<span style="display:inline-block;width:14px;height:4px;border-radius:2px;background:#BDB58D;margin-right:4px;vertical-align:middle"></span>vacaciones SEP · <svg width="20" height="6" viewBox="0 0 20 6" style="vertical-align:middle"><line x1="0" y1="3" x2="20" y2="3" stroke="'+t.tinta+'" stroke-width="2"/></svg> promedio de 7 días';
  $('play').innerHTML = S.play ? '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>' : '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M4.5 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  $('play').setAttribute('aria-label', S.play ? 'Pausar' : 'Reproducir el periodo');
}
// Temporadas que tocan el periodo: vacaciones SEP (invierno, Semana Santa, verano), Navidad y Acción de Gracias (EE. UU.)
function temporadas(){
  const T = window.IANAMI_TEMPORADAS || {}, o = [], n = {invierno:'Vacaciones de invierno (SEP)', semana_santa:'Semana Santa (SEP)', verano:'Vacaciones de verano (SEP)'};
  Object.keys(n).forEach(k => (T[k] || []).forEach(x => { if (x.inicio) o.push([x.inicio, x.fin || x.inicio, n[k]+' · ciclo '+x.ciclo]); }));
  for (let y=INICIO.getFullYear(); y<=diaDe(ND-1).getFullYear(); y++){
    const nov = new Date(y,10,1), jueves = 1 + ((4 - nov.getDay() + 7) % 7) + 21;     // cuarto jueves de noviembre
    o.push([isoDe(new Date(y,10,jueves)), isoDe(new Date(y,10,jueves)), 'Acción de Gracias (EE. UU.)']);
  }
  return o;
}
function moverCursor(d){ const c = document.getElementById('cursor'); if (c) c.setAttribute('transform','translate('+Math.min(Wt-1, d*Wt/ND).toFixed(2)+',0)'); }
function fijarDia(d){ d = Math.max(1, Math.min(ND, Math.round(d))); if (d===S.dia) return; S.dia = d; S.t = d; pintarTodo(true); }
function diaDesdeX(ev){ const r = $('tgraf').getBoundingClientRect(); return (ev.clientX-r.left)/r.width*ND + 0.5; }
let ultimo = 0;
function reproducir(){
  if (S.play){ detener(); return; }
  S.play = true; if (S.dia>=ND){ S.dia = 1; } S.t = S.dia; ultimo = performance.now(); pintarTodo(true); requestAnimationFrame(cuadroPlay);
}
function cuadroPlay(ahora){
  if (!S.play) return;
  S.t = Math.min(ND, S.t + (ahora-ultimo)/1000*VEL); ultimo = ahora; moverCursor(S.t);
  const d = Math.floor(S.t); if (d!==S.dia){ S.dia = d; pintarTodo(true); }
  if (S.t>=ND){ detener(); return; }
  requestAnimationFrame(cuadroPlay);
}
function detener(){ S.play = false; S.t = S.dia; pintarTodo(true); }

/* ==== [10] COLUMNA DE ANÁLISIS Y FRANJA DE CAJAS =================== */
function pintarDocs(){
  const dv = D.docs, F = filtro(); let tot = dv.total, sub = 'en todo el país', hm = [dv.h, dv.m], barra = '';
  if (F.ss){ tot = F.ss.reduce((x,s)=>x+dv.est[s],0); sub = 'en '+nombreFiltro(); hm = null; }
  else if (F.n!=null){ const r = dv.nat[F.n]; tot = r ? r[0] : null; sub = 'de '+D.nats[F.n][0]; hm = r ? [r[1], r[2]] : null; }
  else if (F.r){ tot = 0; hm = [0,0]; F.r.forEach(x => { const r = dv.nat[x]; if (r){ tot += r[0]; hm[0] += r[1]; hm[1] += r[2]; } }); sub = 'de '+nombreRegion(); }
  if (!F.ss && F.nd==null){
    const cs = [cssv('--ink'), cssv('--usa'), cssv('--reg'), cssv('--ink3')], t = dv.tipos, otras = t.slice(3).reduce((x,y)=>x+y[1],0);
    const seg = [t[0], t[1], t[2], ['Otras',otras]];
    barra = '<div class="apil">'+seg.map((x,i)=>'<span style="width:'+(x[1]/dv.total*100).toFixed(1)+'%;background:'+cs[i]+'" title="'+x[0]+': '+miles(x[1])+'"></span>').join('')+'</div>'+
            '<div class="ley">'+seg.map((x,i)=>'<span><i style="background:'+cs[i]+'"></i>'+x[0]+' '+pct(x[1],dv.total)+'%</span>').join('')+'</div>';
  }
  $('docs').innerHTML = '<h2><span>Extranjeros con documento vigente</span></h2>'+
    '<div class="docs-f"><span class="num">'+(tot==null?'s/d':miles(tot))+'</span><span class="mini">'+esc(sub)+(hm?' · '+pct(hm[1],hm[0]+hm[1])+'% mujeres':'')+'</span></div>'+barra+
    '<span class="mini">Corte: '+fechaISO(dv.corte)+'</span>';
}
function pintarAnalisis(){
  const F = filtro(); AVISOS = analizar(F);
  const quien = nombreFiltro() || 'todo el país';
  $('analisis').innerHTML = '<h2><span>Lo que cambió</span></h2><span class="mini">'+esc(quien)+' · '+textoCmp()+'</span>'+
    (AVISOS.length ? '<div class="avisos-lista">'+AVISOS.map(filaAviso).join('')+'</div>' : '<span class="mini">Sin cambios relevantes con este filtro.</span>');
}
const barrasNat = (l, color) => { const mx = l.length?l[0][1]:1; return l.map(r => '<button class="barra" data-n="'+r[0]+'"><span>'+esc(D.nats[r[0]][0])+'</span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+color+'"></i></span><span class="x">'+corto(r[1])+'</span></button>').join(''); };
function htmlBreve(n){                          // datos clave de una nacionalidad
  const rr = comp('resc_rei',null,n), ts = comp('tram_se',null,n), H = suma(ts,0,8), M = suma(ts,8,16), nn = comp('can_nna',null,n), nna = suma(nn,0,12), na = nn.reduce((t,x,i)=>t+(i%3===1?x:0),0);
  const ing = sumaSem('ing',0,NW-1,null,n), re = sumaSem('rech',0,NW-1,null,n);
  return (rr[0]+rr[1] ? '<span class="mini"><b>'+pct(rr[1],rr[0]+rr[1])+' de cada 100</b> rescates son de reincidentes.</span>' : '')+
    (ing ? '<span class="mini"><b>'+(re/(ing+re)*100).toFixed(1)+'%</b> de quienes llegan son rechazados.</span>' : '')+
    (H+M ? '<span class="mini"><b>'+pct(M,H+M)+'%</b> de sus trámites son de mujeres.</span>' : '')+
    (nna ? '<span class="mini"><b>'+miles(nna)+'</b> niñas, niños y adolescentes canalizados; '+miles(na)+' no acompañados.</span>' : '');
}
function htmlTops(F, k){
  const l = topNats(n => enRegion(n) ? acum(k,F.ss,n) : 0, 10);
  return '<div class="caja"><h2><span>Principales nacionalidades · '+IND[k].n+'</span>'+(S.region ? '<small>'+REGIONES[S.region][0]+'</small>' : '')+'</h2>'+
    '<span class="mini">'+(S.dia<ND ? 'Acumulado al '+fechaDia(S.dia-1) : 'Periodo completo')+'</span>'+
    (barrasNat(l, colG(IND[k].g)) || '<span class="mini">Sin registros.</span>')+'</div>';
}
// Reparto en una barra continua, con cifra y porcentaje de cada parte
function reparto(tit, arr, grande){
  const tot = arr.reduce((x,y)=>x+y[1],0); if (!tot) return '';
  return '<div class="rep'+(grande?' g':'')+'"><span class="mini"><b>'+tit+'</b></span>'+(grande ? '<div class="rep-n">'+arr.map(r => '<span><b class="num">'+pct(r[1],tot)+'%</b>'+r[0]+' · '+miles(r[1])+'</span>').join('')+'</div>' : '')+
    '<div class="rep-b">'+arr.map(r => r[1] ? '<i style="flex:'+r[1]+';background:'+r[2]+'" title="'+r[0]+': '+miles(r[1])+'"></i>' : '').join('')+'</div>'+
    (grande ? '' : '<div class="ley">'+arr.map(r => '<span><i style="background:'+r[2]+'"></i>'+r[0]+' '+pct(r[1],tot)+'%</span>').join('')+'</div>')+'</div>';
}
// Principales nacionalidades con su reparto entre dos categorías (la categoría c en color)
function porNac(kc, c, palabra, s, n, col, col2){
  if (n!=null && !Array.isArray(n)) return '';
  const l = topNats(x => enRegion(x) ? comp(kc,s,x).reduce((a,b)=>a+b,0) : 0, 6).filter(r => r[1]>=30); if (!l.length) return '';   // con menos de 30 casos el % no dice nada
  return '<div><span class="mini"><b>Por nacionalidad</b> · % '+palabra+' · con 30 casos o más</span>'+l.map(r => { const v = comp(kc,s,r[0]), t = v[0]+v[1] || 1;
    return '<button class="fila nac" data-n="'+r[0]+'"><span>'+esc(D.nats[r[0]][0])+'</span><span class="b dos"><i style="width:'+(v[c]/t*100).toFixed(1)+'%;background:'+col+'"></i><i style="width:'+(v[1-c]/t*100).toFixed(1)+'%;background:'+col2+'"></i></span><span class="x">'+pct(v[c],t)+'%</span></button>'; }).join('')+'</div>';
}
const nomEst = i => String(D.estaciones[i]).replace(/^E[MP] /,'');
// Cuarta tarjeta: nacionalidades de una categoría (vía de ingreso, primera vez o reincidente, estación)
function cajaCruce(k, F){
  const c = colG(IND[k].g), q = S.cruce[k] || 0, cfg = {
    ing:{ kc:'ing_via', cats:['Aérea','Terrestre','Marítima'], tit:'Nacionalidades por vía de ingreso', de:'de sus ingresos' },
    resc:{ kc:'resc_rei', cats:['Primera vez','Reincidente'], tit:'Nacionalidades · primera vez o reincidente', de:'de sus rescates' },
    pres:{ kc:'pres_est', cats:D.estaciones.map((x,i)=>nomEst(i)), tit:'Nacionalidades por estación', de:'de sus presentados' } }[k];
  const tot = n => comp(cfg.kc,F.ss,n), l = topNats(n => enRegion(n) ? tot(n)[q] : 0, 10), mx = l.length ? l[0][1] : 1;
  let sel;
  if (k==='pres'){ const orden = comp('pres_est',F.ss,null).map((x,i)=>[i,x]).filter(r=>r[1]>0).sort((x,y)=>y[1]-x[1]);
    sel = '<select id="cruce-est" class="sel" aria-label="Estación">'+orden.map(r => '<option value="'+r[0]+'"'+(r[0]===q?' selected':'')+'>'+esc(nomEst(r[0]))+' · '+corto(r[1])+'</option>').join('')+'</select>'; }
  else sel = '<div class="pil chica">'+cfg.cats.map((x,i) => '<button data-cruce="'+k+':'+i+'" class="'+(i===q?'on':'')+'" aria-pressed="'+(i===q)+'">'+x+'</button>').join('')+'</div>';
  return '<div class="caja"><h2><span>'+cfg.tit+'</span></h2>'+sel+'<span class="mini">'+esc(cfg.cats[q])+' · periodo completo · el % es la parte '+cfg.de+'</span>'+
    (l.map(r => { const t = tot(r[0]).reduce((a,b)=>a+b,0);
      return '<button class="barra pc" data-n="'+r[0]+'"><span>'+esc(D.nats[r[0]][0])+' <small>'+pct(r[1],t)+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(r[1])+'</span></button>'; }).join('') || '<span class="mini">Sin registros.</span>')+'</div>';
}
// Rechazos: nacionalidades que sí se internaron tras la segunda revisión, con su tasa de rechazo
function cajaInternacion(F){
  const c = colG('reg'), l = topNats(n => enRegion(n) ? comp('rech_det',F.ss,n)[0] : 0, 10), mx = l.length ? l[0][1] : 1;
  return '<div class="caja"><h2><span>Principales nacionalidades · Internación</span></h2><span class="mini">Se internaron tras la segunda revisión · periodo completo · el % es su tasa de rechazo</span>'+
    (l.map(r => { const v = comp('rech_det',F.ss,r[0]);
      return '<button class="barra pc" data-n="'+r[0]+'"><span>'+esc(D.nats[r[0]][0])+' <small>'+pct(v[1],v[0]+v[1])+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(r[1])+'</span></button>'; }).join('') || '<span class="mini">Sin registros.</span>')+'</div>';
}
// Trámites: los 10 tipos más frecuentes
function cajaTramites(F){
  const v = comp('tram_tipo',F.ss,F.nd).map((x,i)=>[i,x]).filter(r => r[1]>0 && D.tramTipos[r[0]]!=='Otros').sort((x,y)=>y[1]-x[1]).slice(0,10), mx = v.length ? v[0][1] : 1, tot = comp('tram_tipo',F.ss,F.nd).reduce((a,b)=>a+b,0);
  return '<div class="caja"><h2><span>Principales trámites</span></h2><span class="mini">Periodo completo · el % es la parte del total</span>'+
    (v.map(r => '<div class="barra larga" title="'+esc(D.tramTipos[r[0]])+'"><span>'+esc(D.tramTipos[r[0]])+' <small>'+pct(r[1],tot)+'%</small></span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+colG('reg')+'"></i></span><span class="x">'+corto(r[1])+'</span></div>').join('') || '<span class="mini">Sin registros.</span>')+'</div>';
}
// Sexo y edad donde la base los trae; en las demás, su propio desglose.
function htmlComp(k, F){
  const c = colG(IND[k].g), c2 = cssv('--ink3'), s = F.ss, n = IND[k].nat ? F.nd : null;
  const fila = (nom,v,tot,color) => '<div class="fila"><span>'+nom+'</span><span class="b"><i style="width:'+(tot?v/tot*100:0).toFixed(1)+'%;background:'+(color||c)+'"></i></span><span class="x">'+(tot?pct(v,tot)+'%':'—')+'</span></div>';
  const grupo = (tit,arr) => { const tot = arr.reduce((x,y)=>x+y[1],0); return tot ? '<div><span class="mini"><b>'+tit+'</b></span>'+arr.map(r=>fila(r[0],r[1],tot,r[2])).join('')+'</div>' : ''; };
  // filas que se pueden elegir: llenan la tarjeta de nacionalidades de esa categoría
  const elegible = (tit, kk, arr) => { const tot = arr.reduce((x,y)=>x+y[1],0); if (!tot) return '';
    return '<div><span class="mini"><b>'+tit+'</b> · clic para ver sus nacionalidades</span>'+arr.map((r,i) => '<button class="fila elige'+(S.cruce[kk]===i?' on':'')+'" data-cruce="'+kk+':'+i+'"><span>'+r[0]+'</span><span class="b"><i style="width:'+(r[1]/tot*100).toFixed(1)+'%;background:'+(r[2]||c)+'"></i></span><span class="x">'+pct(r[1],tot)+'%</span></button>').join('')+'</div>'; };
  let h = '', sub = 'Esta base no trae sexo ni edad';
  if (k==='ing'){ const v = comp('ing_via',s,n);
    h = elegible('Vía de ingreso','ing',[['Aérea',v[0]],['Terrestre',v[1]],['Marítima',v[2]]]);
    if (n==null){ const mxv = sumaSem('ing',0,NW-1,s,MX), tot = sumaSem('ing',0,NW-1,s,null); h += grupo('Quién ingresa',[['Extranjeros',tot-mxv],['Mexicanos',mxv,c2]]); } }
  else if (k==='rech'){ const v = comp('rech_det',s,n), ing = sumaSem('ing',0,NW-1,s,n);
    h = grupo('Resultado de la segunda revisión',[['Rechazo',v[1]],['Internación',v[0],c2]]) + (ing ? '<div><span class="mini"><b>'+(v[1]/(ing+v[1])*100).toFixed(1)+'%</b> de las llegadas termina en rechazo ('+miles(v[1])+' de '+corto(ing+v[1])+').</span></div>' : ''); }
  else if (k==='tram'){ const v = comp('tram_se',s,n), r = comp('tram_res',s,n), ed = ['0–11','12–17','18–24','25–34','35–44','45–54','55–64','65+'];
    let mx = 1; v.forEach(x => mx = Math.max(mx,x)); const H = suma(v,0,8), M = suma(v,8,16); sub = 'Sexo y edad de quien tramita';
    h = '<div class="pir-w"><div class="pir-ley"><span><i style="background:'+c2+'"></i>Hombres <b>'+pct(H,H+M)+'%</b></span><span>Mujeres <b>'+pct(M,H+M)+'%</b><i style="background:'+c+'"></i></span></div>'+
        ed.map((e,i)=>'<div class="pir" title="'+e+' años · hombres '+miles(v[i])+' · mujeres '+miles(v[8+i])+'"><span class="l"><em>'+corto(v[i])+'</em><i style="width:'+(v[i]/mx*100).toFixed(0)+'%;background:'+c2+'"></i></span><span class="c">'+e+'</span><span class="d"><i style="width:'+(v[8+i]/mx*100).toFixed(0)+'%;background:'+c+'"></i><em>'+corto(v[8+i])+'</em></span></div>').reverse().join('')+'</div>'+
        reparto('Resolución',[['Positiva',r[0],c],['Negativa',r[1],c2],['Otra',r[2],cssv('--line')]]); }
  else if (k==='resc'){ const a = comp('resc_rei',s,n), d = comp('resc_des',s,n);
    h = elegible('Primera vez o reincidente','resc',[['Primera vez',a[0],c2],['Reincidente',a[1]]]) + grupo('Destino',[['Estación migr.',d[0]],['DIF',d[1]],['Sin destino',d[2],c2]]); }
  else if (k==='pres'){ const v = comp('pres_est',s,n).map((x,i)=>[i,x]).filter(r=>r[1]>0).sort((x,y)=>y[1]-x[1]).slice(0,10), mx = v.length ? v[0][1] : 1; sub = 'Estaciones con más presentados · clic para ver sus nacionalidades';
    return '<div class="caja"><h2><span>Composición · Presentados</span></h2><span class="mini">'+sub+' · periodo completo</span>'+
      (v.map(r => '<button class="barra'+(S.cruce.pres===r[0]?' on':'')+'" data-cruce="pres:'+r[0]+'"><span>'+esc(nomEst(r[0]))+'</span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(r[1])+'</span></button>').join('') || '<span class="mini">Sin registros con este filtro.</span>')+'</div>'; }
  else if (k==='can'){ const v = comp('can_nna',s,n), a = comp('can_ad',s,n), g2 = f => v.reduce((t,x,i)=>t+(f(i)?x:0),0); sub = 'Niñas, niños y adolescentes, y sus acompañantes';
    h = grupo('NNA por sexo',[['Niñas',g2(i=>i>=6)],['Niños',g2(i=>i<6),c2]]) + grupo('NNA por edad',[['0 a 11 años',g2(i=>Math.floor(i/3)%2===0)],['12 a 17 años',g2(i=>Math.floor(i/3)%2===1),c2]]) +
        grupo('Condición',[['Acompañado',g2(i=>i%3===0),c2],['No acompañado',g2(i=>i%3===1)],['Separado',g2(i=>i%3===2)]]) + grupo('Adultos acompañantes',[['Mujeres',a[1]],['Hombres',a[0],c2]]); }
  else if (k==='ret'){ const v = comp('ret_tipo',s,n);
    h = reparto('Tipo de retorno',[['Asistido',v[1],c],['Deportación',v[0],c2]], true) + porNac('ret_tipo', 1, 'asistido', s, n, c, c2); }
  else if (k==='recib'){ const v = comp('recib_edad',s,n); sub = 'Esta base trae adultos y menores, sin sexo';
    h = reparto('Edad',[['Menores',v[1],c],['Adultos',v[0],c2]], true) + porNac('recib_edad', 1, 'menores', s, n, c, c2); }
  else if (k==='rep'){ const v = comp('rep_comp',s,null); sub = 'Sexo y edad de los mexicanos repatriados';
    h = grupo('Adultos',[['Hombres',v[0],c2],['Mujeres',v[1]]]) + grupo('Menores',[['Niños',v[2],c2],['Niñas',v[3]]]) + grupo('Menores, con o sin compañía',[['Acompañados',v[4],c2],['Solos',v[5]]]) + grupo('Modalidad',[['Terrestre',v[6],c2],['Aérea',v[7]]]); }
  return '<div class="caja"><h2><span>Composición · '+(k==='rech' ? '2da revisión' : IND[k].n)+'</span></h2><span class="mini">'+sub+' · periodo completo</span><div class="cgrid">'+(h || '<span class="mini">Sin registros con este filtro.</span>')+'</div></div>';
}
function cajaLugares(k, F){                      // un indicador repartido por estado, cinturón o CECO
  const nF = IND[k].nat ? F.nd : null, c = colG(IND[k].g); let filas, tit;
  if (S.agr==='e' || (F.ss && !F.todo)){ const todos = topEsts(s => acum(k,[s],nF), NS), uno = F.ss && F.ss.length===1 ? F.ss[0] : -1;
    let lista = F.ss && F.ss.length>1 ? todos.filter(r => F.ss.indexOf(r[0])>=0).slice(0,10) : todos.slice(0,10);
    const lugar = todos.findIndex(r => r[0]===uno), mx = lista.length?lista[0][1]:1;
    if (lugar>=10) lista = lista.slice(0,9).concat([todos[lugar]]);
    tit = F.nd!=null ? IND[k].donde : IND[k].n+' por estado';
    filas = lista.map(r => '<button class="barra'+(r[0]===uno?' on':'')+'" data-e="'+r[0]+'"><span>'+(r[0]===uno?(lugar+1)+'.º ':'')+esc(ESTC[r[0]])+'</span><span class="b"><i style="width:'+(r[1]/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(r[1])+'</span></button>').join(''); }
  else { const ag = AGR[S.agr], tot = ag.nombres.map((x,q)=>acum(k,miembros(S.agr,q),nF)), sin = acum(k,null,nF)-tot.reduce((x,y)=>x+y,0);
    const mx = Math.max(sin, Math.max.apply(null,tot), 1); tit = (F.nd!=null ? IND[k].donde : IND[k].n)+' por '+ag.n.toLowerCase();
    filas = ag.nombres.map((nom,q) => '<button class="barra" data-g="'+S.agr+q+'"><span>'+nom+'</span><span class="b"><i style="width:'+(tot[q]/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(tot[q])+'</span></button>').join('')+
            '<div class="barra"><span>'+ag.sin+'</span><span class="b"><i style="width:'+(Math.max(sin,0)/mx*100).toFixed(1)+'%;background:'+cssv('--ink3')+'"></i></span><span class="x">'+corto(Math.max(sin,0))+'</span></div>'; }
  return '<div class="caja"><h2><span>'+esc(tit)+'</span></h2><span class="mini">'+(S.dia<ND?'Acumulado al '+fechaDia(S.dia-1):'Periodo completo')+(S.agr!=='e'&&(!F.ss||F.todo)?' · clic en un grupo para filtrar solo ese':'')+'</span>'+(filas || '<span class="mini">Sin registros.</span>')+'</div>';
}
function fechaEv(f){ const p = f.split('-'); return (p[2] ? (+p[2])+' ' : '')+MES12[+p[1]-1]+' '+p[0]; }
// Lo que se ve en nuestras cifras: 4 semanas después del evento contra las 4 anteriores (si cae dentro del periodo de las bases)
function cifraEvento(e, n){
  const i = indiceDe(e.f.length===7 ? e.f+'-01' : e.f); if (n==null || i<28 || i+28>ND) return '';
  const r = [['resc','rescatados'],['ing','ingresos']].map(x => { const d = diario(x[0],{ss:null,n:n}), a = suma(d,i-28,i), b = suma(d,i,i+28);
    return a>=20 ? x[1]+' '+(b>=a?'▲ ':'▼ ')+Math.abs((b/a-1)*100).toFixed(0)+'%' : ''; }).filter(Boolean);
  return r.length ? '<span class="cf">En nuestras cifras, 4 semanas después: '+r.join(' · ')+'</span>' : '';
}
function htmlEventos(lista, n){ return lista.map(e => '<div class="ev"><time>'+fechaEv(e.f)+'</time><i style="background:'+CATS[e.c][1]+'" title="'+CATS[e.c][0]+'"></i><div>'+
  '<b>'+esc(e.que)+'</b><span class="ef">→ '+esc(e.efecto)+(e.doc ? '' : ' <em>efecto inferido</em>')+'</span>'+cifraEvento(e, n)+
  (e.url ? '<a href="'+esc(e.url)+'" target="_blank" rel="noopener">'+esc(e.fuente)+' ↗</a>' : '')+'</div></div>').join(''); }
function pintarBajo(){
  const F = filtro(), s = S.sel, cajas = [];
  // 1) Todos los indicadores de la selección (país, estado, cinturón o CECO)
  if (s && s.t!=='p'){ const lista = INDS.filter(m => F.nd==null || m.nat);
    cajas.push('<div class="caja" data-propia="1"><h2><span>'+esc(nombreSel())+'</span><small>todos sus indicadores</small></h2><span class="mini">'+(s.t==='g' ? miembros(s.a,s.q).map(x=>ESTC[x]).join(', ') : s.t==='e' ? ['c','o'].map(a => AGR[a].de[s.i]>=0 ? AGR[a].nombres[AGR[a].de[s.i]] : AGR[a].sin).join(' · ') : 'Clic en un renglón para verlo en el mapa')+'</span>'+
      lista.map(m => { const sem = semanal(m.k,F.ss,F.nd); return '<button class="fk'+(S.ind===m.k?' on':'')+'" data-k="'+m.k+'"><span>'+m.n+'</span>'+chispa(sem,64,20,colG(m.g),semDe(S.dia))+'<span class="x">'+corto(acum(m.k,F.ss,F.nd))+'</span></button>'; }).join('')+
      (s.t==='n' ? '<hr class="sep">'+htmlBreve(s.i) : '')+'</div>'); }
  // 1b) Principales nacionalidades (cuando no hay una elegida)
  if (F.n==null){ if (!S.ind){ cajas.push(htmlTops(F,'ing')); cajas.push(htmlTops(F,'resc')); } else if (IND[S.ind].nat) cajas.push(htmlTops(F,S.ind)); }
  if (S.ind==='rech' && F.n==null) cajas.push(cajaInternacion(F));
  // 2) Punto elegido
  if (s && s.t==='p'){ const tp = s.tipo, P = listaPuntos(tp)[s.i], tot = suma(P.wk,0,NW), c = colG(tp==='ing'?'reg':tp==='rep'?'usa':'irr');
    let h = '<div class="caja" data-propia="1"><h2><span>'+esc(P.n)+'</span></h2><span class="mini">'+(tp==='ing' ? ['Punto aéreo','Punto terrestre','Punto marítimo'][P.t]+' · '+EST[P.s] : tp==='rep' ? 'Punto de repatriación · '+EST[P.s] : 'Estación o estancia migratoria')+' · ubicación aproximada</span>'+
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px"><span><span class="num" style="font-size:30px">'+miles(tot)+'</span><br><span class="mini">'+(tp==='ing'?'ingresos':tp==='rep'?'mexicanos repatriados':'presentados')+' en el periodo</span></span>'+chispa(P.wk,130,40,c,semDe(S.dia))+'</div>';
    if (tp==='ing'){ const mxv = P.top.length?P.top[0][1]:1;
      h += '<hr class="sep"><span class="mini"><b>Quién entra por aquí</b> · '+pct(P.mx,tot)+'% mexicanos</span>'+P.top.map(r => '<div class="barra"><span>'+esc(typeof r[0]==='number'?D.nats[r[0]][0]:r[0])+'</span><span class="b"><i style="width:'+(r[1]/mxv*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(r[1])+'</span></div>').join('')+
        (P.seg ? '<span class="mini"><b>Segunda revisión:</b> '+miles(P.seg)+' casos, '+miles(P.rech)+' rechazos ('+pct(P.rech,P.seg)+'%).</span>' : ''); }
    if (tp==='rep') h += '<hr class="sep"><span class="mini"><b>'+miles(P.men)+'</b> menores, '+miles(P.na)+' no acompañados · <b>'+pct(P.muj,tot)+'%</b> mujeres.</span>';
    cajas.push(h+'</div>'); }
  // 3) Lugares: con indicador, el suyo; sin indicador, el par regular e irregular
  if (S.ind) cajas.push(cajaLugares(S.ind, F)); else { cajas.push(cajaLugares('ing', F)); cajas.push(cajaLugares('resc', F)); }
  // 4) Composición del indicador, con su tarjeta complementaria
  if (S.ind==='tram') cajas.push(cajaTramites(F));
  if (S.ind) cajas.push(htmlComp(S.ind, F));
  if (F.n==null && (S.ind==='ing' || S.ind==='resc' || S.ind==='pres')) cajas.push(cajaCruce(S.ind, F));
  // 5) Contexto: aparece al elegir una nacionalidad
  if (F.n!=null){ const ctx = CTX[D.nats[F.n][1]] || [], reg = CTX.reg.slice(0,4);
    cajas.push('<div class="caja ancha"><h2><span>Contexto · '+esc(D.nats[F.n][0])+'</span><small>qué pasó y cómo se tradujo en migración</small></h2>'+
      '<div class="ctx-lista">'+(ctx.length ? htmlEventos(ctx, F.n) : '<span class="mini">Aún sin eventos propios en el catálogo.</span>')+
      '<hr class="sep"><span class="mini"><b>En la región</b></span>'+htmlEventos(reg, F.n)+'</div><span class="mini">'+(ctx.length+reg.length)+' eventos · desliza para ver más</span>'+
      '<div class="cats">'+Object.keys(CATS).map(k=>'<span><i style="background:'+CATS[k][1]+'"></i>'+CATS[k][0]+'</span>').join('')+'</div>'+
      '<span class="nota">Cada evento enlaza a su fuente. «Efecto inferido»: la fuente no mide el efecto migratorio. Coincidir en el tiempo no prueba la causa.</span></div>'); }
  $('bajo').innerHTML = cajas.join('');
  const cl = document.querySelector('.ctx-lista');       // el contexto muestra de inicio los primeros 4 eventos
  if (cl){ const ev = cl.querySelectorAll('.ev'); if (ev.length>4) cl.style.maxHeight = ev[4].offsetTop+'px'; }
}
function pintarCtl(){
  const x = '<svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const f0 = diaDe(0), f1 = diaDe(S.dia-1);
  $('rango').textContent = f0.getDate()+' '+MES12[f0.getMonth()]+(f0.getFullYear()!==f1.getFullYear() ? ' '+f0.getFullYear() : '')+' – '+fechaLarga(S.dia-1);
  $('rango-nota').textContent = S.dia>=ND ? ND+' días' : S.dia+' de '+ND+' días';
  $('cmp').innerHTML = [[7,'7 días'],[30,'30 días'],[90,'3 meses'],['aa','Año anterior']].map(o => { const ok = cmpDisponible(o[0]), on = S.cmp===o[0];
    return '<button data-cmp="'+o[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'"'+(ok ? '' : ' disabled')+' title="'+(o[0]==='aa' ? (ok ? 'El periodo contra el mismo periodo del año anterior' : 'Requiere datos del año anterior') : (ok ? 'Últimos '+o[1]+' contra los '+o[1]+' anteriores' : 'El periodo elegido es muy corto'))+'">'+o[1]+'</button>'; }).join('');
  // Periodos: Sheinbaum, Trump, Año (con mes) y Personalizado
  $('per').innerHTML = [['shein','Sheinbaum'],['trump','Trump'],['anio','Año'],['pers','Personalizado']].map(o => { const ok = !!rangoPeriodo(o[0]==='anio' || o[0]==='pers' ? 'shein' : o[0]) && (o[0]!=='trump' || idxBase('2025-01-20') < D0.dias), on = S.per===o[0];
    return '<button data-per="'+o[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'"'+(ok ? '' : ' disabled title="Sin datos para este periodo"')+'>'+o[1]+'</button>'; }).join('');
  let ex = '';
  if (S.per==='anio'){ const y0 = INICIO0.getFullYear(), y1 = fechaBase(D0.dias-1).getFullYear(), anios = []; for (let y=y0;y<=y1;y++) anios.push(y);
    ex = '<select id="per-anio" aria-label="Año">'+anios.map(y => '<option'+(y===S.anio?' selected':'')+'>'+y+'</option>').join('')+'</select>'+
         '<select id="per-mes" aria-label="Mes"><option value="0">Todo el año</option>'+MES12.map((m,i) => { const r = idxBase(isoDe(new Date(S.anio,i,1))) < D0.dias && idxBase(isoDe(new Date(S.anio,i+1,1))) > 0;
           return '<option value="'+(i+1)+'"'+(S.mes===i+1?' selected':'')+(r?'':' disabled')+'>'+m+'</option>'; }).join('')+'</select>'; }
  if (S.per==='pers') ex = '<input type="date" id="per-desde" min="'+D.inicio+'" max="'+D.corte+'" value="'+S.desde+'" aria-label="Desde"> – <input type="date" id="per-hasta" min="'+D.inicio+'" max="'+D.corte+'" value="'+S.hasta+'" aria-label="Hasta">';
  $('per-extra').innerHTML = ex;
  $('chips').innerHTML = (S.sel ? '<span class="chip">'+esc(nombreSel())+'<button data-cerrar aria-label="Quitar filtro">'+x+'</button></span>' : '')+
    (S.region ? '<span class="chip">'+esc(nombreRegion())+'<button data-cerrar-region aria-label="Quitar región">'+x+'</button></span>' : '');
}
function pintarTodo(soloTiempo){
  if (S.vista!=='pulso') return;
  pintarCtl(); if (!soloTiempo) pintarAnalisis(); if (!soloTiempo) pintarDocs(); pintarKpis(); pintarTiempo(); pintarMapa(); pintarBajo(); marcarFiltro();
}
// Con una nacionalidad, estado, grupo o punto elegido, cada tarjeta que cambió lleva una franja y el nombre
function marcarFiltro(){
  const nom = nombreFiltro();
  document.querySelectorAll('.rail .caja, #bajo .caja').forEach(c => {
    c.classList.toggle('filtro', !!nom);
    const h = c.querySelector('h2 > span'); if (!h) return;
    let t = h.querySelector('.tag');
    if (nom && !c.dataset.propia){ if (!t){ t = document.createElement('span'); t.className = 'tag'; h.appendChild(t); } t.textContent = nom; }
    else if (t) t.remove();
  });
}

/* ==== [11] BUSCADOR, SECCIONES Y AVISOS =========================== */
const INDICE = [];
D.nats.slice(0,OT).forEach((n,i) => INDICE.push({t:'Nacionalidad', n:n[0], sel:{t:'n',i:i}}));
EST.forEach((e,i) => INDICE.push({t:'Estado', n:e, sel:{t:'e',i:i}}));
['c','o'].forEach(a => AGR[a].nombres.forEach((nom,q) => INDICE.push({t:AGR[a].n, n:nom, sel:{t:'g',a:a,q:q}})));
D.puntos.forEach((p,i) => INDICE.push({t:'Punto de ingreso', n:p.n, sel:{t:'p',tipo:'ing',i:i}}));
D.repPuntos.forEach((p,i) => INDICE.push({t:'Repatriación', n:p.n, sel:{t:'p',tipo:'rep',i:i}}));
D.emPuntos.forEach((p,i) => INDICE.push({t:'Estación', n:p.n, sel:{t:'p',tipo:'em',i:i}}));
INDICE.forEach(x => x.q = sinAcento(x.n));
let hallados = [];
function buscar(){
  const q = sinAcento($('buscar').value.trim()), el = $('res');
  if (!q){ el.hidden = true; return; }
  hallados = INDICE.filter(x => x.q.indexOf(q)===0).concat(INDICE.filter(x => x.q.indexOf(q)>0)).slice(0,9);
  el.hidden = false;
  el.innerHTML = hallados.length ? hallados.map((x,i) => '<button data-r="'+i+'" class="'+(i?'':'act')+'"><span>'+esc(x.n)+'</span><small>'+x.t+'</small></button>').join('') : '<span class="mini" style="padding:6px 9px;display:block">Sin coincidencias</span>';
}
function elegir(i){ const x = hallados[i]; if (!x) return; $('buscar').value = ''; $('res').hidden = true;
  if (x.sel.t==='g') S.agr = x.sel.a; fijarSel(x.sel, true); }
function pintarNav(){ $('nav').innerHTML = SECCIONES.map(s => s[0]==='dir'
  ? '<button data-menu-dir aria-haspopup="true" aria-expanded="false" class="'+(S.vista==='dir'?'on':'')+'">Direcciones ▾</button>'
  : '<button data-vista="'+s[0]+'" class="'+(S.vista===s[0]?'on':'')+'"'+(S.vista===s[0]?' aria-current="page"':'')+'>'+s[1]+'</button>').join(''); }
function menuDir(abrir){
  const m = $('menu-dir'), b = document.querySelector('[data-menu-dir]'); if (!m || !b) return;
  m.hidden = !abrir; b.setAttribute('aria-expanded', abrir);
  if (abrir){ const r = b.getBoundingClientRect(), top = document.querySelector('.top').getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(r.left-top.left, top.width-m.offsetWidth-8))+'px'; m.style.top = (r.bottom-top.top+2)+'px';
    m.innerHTML = DIRS.map((d,i) => '<button data-dir="'+i+'" class="'+(S.vista==='dir' && (S.dir||0)===i ? 'on' : '')+'"><b>'+d.s+'</b><span>'+(d.n || 'Nombre por confirmar')+'</span></button>').join(''); }
}
// Tablero de una dirección: sus bases con total, variación, tendencia, nacionalidades y estados
function htmlDireccion(d){
  const F0 = {ss:null, n:null, nd:null}, fila = (nom, v, mx, c) => '<div class="barra"><span>'+esc(nom)+'</span><span class="b"><i style="width:'+(v/mx*100).toFixed(1)+'%;background:'+c+'"></i></span><span class="x">'+corto(v)+'</span></div>';
  const cajas = d.ind.map(k => { const m = IND[k], c = colG(m.g), dd = diario(k,F0), va = variacion(dd), tot = suma(dd,0,ND);
    const tn = m.nat ? topNats(n => sumaSem(k,0,NW-1,null,n), 5) : [], te = topEsts(s => sumaSem(k,0,NW-1,[s],null), 5);
    return '<div class="caja"><h2><span>'+m.n+'</span><small>'+(va.ok ? (va.dl>=0?'▲ ':'▼ ')+Math.abs(va.dl).toFixed(1)+'% '+(S.cmp==='aa' ? 'vs. año anterior' : 'en '+etiquetaN(S.cmp)) : '')+'</small></h2>'+
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px"><span class="num" style="font-size:30px">'+miles(tot)+'</span>'+chispa(semanal(k,null,null),140,40,c)+'</div>'+
      (tn.length ? '<span class="mini"><b>Principales nacionalidades</b></span>'+tn.map(r => fila(D.nats[r[0]][0], r[1], tn[0][1], c)).join('') : '')+
      '<span class="mini"><b>Principales estados</b></span>'+te.map(r => fila(ESTC[r[0]], r[1], te[0][1], c)).join('')+'</div>'; });
  if (d.docs) cajas.push('<div class="caja"><h2><span>Documentos vigentes</span><small>al último corte</small></h2><span class="num" style="font-size:30px">'+miles(D.docs.total)+'</span>'+
    '<span class="mini"><b>Por tipo</b></span>'+D.docs.tipos.slice(0,5).map(x => fila(x[0], x[1], D.docs.tipos[0][1], colG('reg'))).join('')+'</div>');
  return '<h1>'+d.s+(d.n ? ' · '+d.n : '')+'</h1><p>Bases de esta dirección, del '+fechaLarga(0)+' al '+fechaLarga(ND-1)+'. Variación: '+textoCmp()+'.</p><div class="rej">'+cajas.join('')+'</div>';
}
function irA(v){
  S.vista = v; pintarNav(); const pulso = v==='pulso'; $('vista-pulso').hidden = !pulso; $('vista-otra').hidden = pulso;
  if (pulso){ ajustarAlto(); reencuadrar(); ajustarLienzo(); pintarTodo(); return; }
  if (S.play) detener();
  const F0 = {ss:null, n:null}; let h = '';
  if (v==='dir') h = htmlDireccion(DIRS[S.dir || 0]);
  else if (v==='bases') h = '<h1>Bases</h1><p>Estado de cada base según la última conversión ('+esc(D.generado)+'). La carga con usuario y contraseña se agrega después.</p>'+
    '<div class="caja"><div class="tb-w"><table class="tb"><thead><tr><th>Base</th><th>Datos hasta</th><th>Cargada</th><th>Renglones</th><th>Días sin datos</th><th>Observaciones</th></tr></thead><tbody>'+
    D.bases.map(b => '<tr><td><b>'+esc(b.n)+'</b><br><span class="mini">'+esc(b.archivo)+'</span></td><td class="x">'+(b.hasta ? fechaISO(b.hasta) : '—')+'</td><td class="x">'+fechaISO(b.cargado)+'</td><td class="x">'+(b.filas!=null ? miles(b.filas) : '—')+'</td><td class="x">'+(b.faltan!=null ? b.faltan : '—')+'</td><td class="x">'+(b.avisos || '—')+'</td></tr>').join('')+
    '</tbody></table></div><span class="nota">El detalle de cada observación está en datos/reporte.txt.</span></div>';
  else { const T = {
      analizar:['Analizar','Cruces y comparaciones en un solo lugar.',['Cruzar dos bases por nacionalidad, estado o punto (por ejemplo, ingresos contra rechazos).','Comparar de 2 a 4 nacionalidades, estados, cinturones o CECO lado a lado, con base 100.','Calendario de calor por día y matriz nacionalidad × estado.']],
      prosp:['Prospectiva','Hacia dónde va cada flujo.',['Proyección a 4–8 semanas con su rango.','Fechas en que cambió el comportamiento.','Nacionalidades que se mueven igual y probabilidad de pasar a nivel alto.']],
      contexto:['Contexto','Lo que pasa fuera y explica lo de adentro.',['Línea de tiempo de eventos por país desde 2018, con fuente.','Caravanas: ubicación, tamaño y avance.','Encuentros de la CBP en EE. UU. y cruces por el Darién.','Índices por país: desarrollo humano, paz, fragilidad y riesgo.']] }[v];
    h = '<h1>'+T[0]+'</h1><p>'+T[1]+' Esta sección se construye después; esto es lo que llevará:</p><div class="rej"><div class="caja"><ul>'+T[2].map(x=>'<li>'+x+'</li>').join('')+'</ul></div></div>'; }
  $('vista-otra').innerHTML = h;
}
// El mapa ocupa el alto que queda de la pantalla, dejando asomar la franja de cajas.
function ajustarAlto(){
  const lz = $('lz');
  if (window.innerWidth<=980 || window.innerHeight<=520){ lz.style.removeProperty('--alto'); return; }
  const arriba = lz.getBoundingClientRect().top + window.scrollY, pie = document.querySelector('.tiempo').getBoundingClientRect().height;
  const libre = window.innerHeight - arriba - pie - 44*E, ancho = lz.clientWidth;
  lz.style.setProperty('--alto', Math.round(Math.max(300*E, Math.min(libre, ancho*0.66)))+'px');
}
function escala(){ const n = window.innerWidth>=2200 ? Math.min(4, window.innerWidth/1920) : 1; if (Math.abs(n-E)<0.02) return false; E = n; document.documentElement.style.setProperty('--e', E.toFixed(3)); return true; }

/* ==== [12] ARRANQUE =============================================== */
function iniciar(){
  escala();
  // Copia desplazada 360° de lo que queda al este del corte, para que Asia y Oceanía aparezcan a la izquierda
  const mover = g => JSON.parse(JSON.stringify(g), (k,v) => Array.isArray(v) && typeof v[0]==='number' && v.length===2 ? [v[0]-360, v[1]] : v);
  const lonMax = f => { let m = -999; JSON.stringify(f.geometry.coordinates).replace(/\[(-?[\d.]+),/g, (x,l) => { m = Math.max(m, +l); return x; }); return m; };
  const copias = GEO.features.filter(f => f.properties.t==='p' && lonMax(f) > CORTE).map(f => ({ type:'Feature', properties:{ key:'W_'+f.properties.key, t:'w' }, geometry:mover(f.geometry) }));
  echarts.registerMap('ianami', { type:'FeatureCollection', features:GEO.features.concat(copias) });
  chart = echarts.init($('lienzo'), null, {renderer:'canvas'});
  if (window.innerWidth<=620 && window.innerHeight>window.innerWidth){ S.modoVista = 'mx'; S.zoom = 1; S.centro = VISTA_MX.c; }   // teléfono vertical: arranca en México
  else { const v = vistaMundo(); S.zoom = v.z; S.centro = v.c; }        // la primera vista es el mundo completo
  chart.setOption(opcionBase());
  if (!D.cbp) $('b-cbp').hidden = true;
  if (!(D.caravanas || []).length) $('b-car').hidden = true;
  let tocado = null;
  chart.on('click', p => {
    const clave = (p.seriesId || '')+':'+(p.dataIndex!=null ? p.dataIndex : p.name);
    if (TACTIL && tocado!==clave){ tocado = clave; return; }       // primer toque: solo la tarjeta; segundo toque: selecciona
    tocado = null;
    if (p.seriesId==='bub' || p.seriesId==='lat') fijarSel({t:'n', i:p.data.nat}, false);
    else if (p.seriesId==='pts') fijarSel({t:'p', tipo:p.data.pTipo, i:p.data.pt}, false);
    else if (p.seriesId==='car'){ S.carSel = p.data.fin!=null ? p.data.fin : null; pintarMapa(); }
    else if (p.name && p.name.indexOf('MX_')===0){ const s = ECLAVE.indexOf(p.name); if (s<0) return;
      if (S.agr!=='e' && AGR[S.agr].de[s]>=0) fijarSel({t:'g', a:S.agr, q:AGR[S.agr].de[s]}, false); else fijarSel({t:'e', i:s}, false); }
  });
  let espera = 0;
  chart.on('georoam', () => { S.modoVista = 'libre'; clearTimeout(espera); espera = setTimeout(() => { const z = chart.getOption().geo[0].zoom/KMX(); if (Math.abs(z-S.zoom)/S.zoom > 0.04){ S.zoom = z; pintarMapa(); } }, 160); });
  new ResizeObserver(() => { const cambio = escala(); reencuadrar(); ajustarLienzo(); if (cambio) rehacerMapa(); else pintarTiempo(); }).observe($('lz'));
  window.addEventListener('resize', () => { if (escala()) rehacerMapa(); ajustarAlto(); pintarAnalisis(); });
  if (window.innerHeight<=520) S.kpiModo = 'compacto';        // teléfono acostado: indicadores compactos
  ajustarLienzo();

  $('m-her').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) herramienta(b.dataset.a); });
  $('play').addEventListener('click', reproducir);
  const tg = $('tgraf'); let arr = false, pend = 0;
  const arrastre = e => { const d = diaDesdeX(e); cancelAnimationFrame(pend); pend = requestAnimationFrame(() => fijarDia(d)); };
  tg.addEventListener('pointerdown', e => { arr = true; tg.setPointerCapture(e.pointerId); if (S.play){ S.play = false; } arrastre(e); });
  tg.addEventListener('pointermove', e => { if (arr) arrastre(e); });
  tg.addEventListener('pointerup', () => { arr = false; pintarTodo(); });
  tg.addEventListener('keydown', e => { if (e.key==='ArrowLeft'){ fijarDia(S.dia-1); e.preventDefault(); } if (e.key==='ArrowRight'){ fijarDia(S.dia+1); e.preventDefault(); } });
  document.addEventListener('click', e => {
    const T = q => e.target.closest(q);
    if (T('[data-menu-dir]')){ menuDir($('menu-dir').hidden); return; }
    const di = T('[data-dir]'); if (di){ S.dir = +di.dataset.dir; menuDir(false); irA('dir'); return; }
    if (!T('#menu-dir')) menuDir(false);
    const vi = T('[data-vista]'); if (vi){ irA(vi.dataset.vista); return; }
    const av = T('[data-av]'); if (av){ abrirAviso(+av.dataset.av); return; }
    if (T('[data-cerrar]')){ fijarSel(null); return; }
    if (T('[data-cerrar-region]')){ S.region = null; pintarTodo(); return; }
    if (T('#plegar')){ S.kpiModo = S.kpiModo==='tarjetas'?'compacto':'tarjetas'; pintarKpis(); ajustarAlto(); return; }
    const cm = T('[data-cmp]'); if (cm){ S.cmp = cm.dataset.cmp==='aa' ? 'aa' : +cm.dataset.cmp; pintarTodo(); return; }
    const pe = T('[data-per]'); if (pe){ S.per = pe.dataset.per; cambiarPeriodo(); return; }
    const k = T('[data-k]'); if (k){ const kk = k.dataset.k; fijarInd(kk); if (TACTIL) mostrarTip(document.querySelector('.kc[data-k="'+kk+'"]'), true); return; }
    const ag = T('[data-agr]'); if (ag){ const v = ag.dataset.agr;      // Mundo y Estado: datos generales; Cinturón y CECO: agrupan
      S.agr = v==='m' ? 'e' : v; if (S.sel && S.sel.t==='g' && (v==='m' || v==='e' || S.sel.a!==S.agr)) S.sel = null;
      if (v==='m') herramienta('mundo'); else if (v==='e') herramienta('mx'); else acercarSiMundo();
      pintarTodo(); return; }
    const gg = T('[data-g]'); if (gg){ fijarSel({t:'g', a:gg.dataset.g[0], q:+gg.dataset.g.slice(1)}, true); return; }
    const n = T('[data-n]'); if (n){ fijarSel({t:'n', i:+n.dataset.n}, true); return; }
    const es = T('[data-e]'); if (es){ fijarSel({t:'e', i:+es.dataset.e}, true); return; }
    const tp = T('[data-top]'); if (tp){ S.topModo = tp.dataset.top; pintarBajo(); marcarFiltro(); return; }
    const r = T('[data-r]'); if (r){ elegir(+r.dataset.r); return; }
    const cz = T('[data-cruce]'); if (cz){ const q = cz.dataset.cruce.split(':'); S.cruce[q[0]] = +q[1]; pintarBajo(); marcarFiltro(); return; }
    if (!T('.busca')) $('res').hidden = true;
  });
  document.addEventListener('change', e => {               // región de origen: filtra las nacionalidades del mapa
    const id = e.target.id;
    if (id==='per-anio'){ S.anio = +e.target.value; S.mes = 0; cambiarPeriodo(); return; }
    if (id==='per-mes'){ S.mes = +e.target.value; cambiarPeriodo(); return; }
    if (id==='per-desde' || id==='per-hasta'){ S[id.slice(4)] = e.target.value; if (S.desde>S.hasta){ const x = S.desde; S.desde = S.hasta; S.hasta = x; } cambiarPeriodo(); return; }
    if (id==='cruce-est'){ S.cruce.pres = +e.target.value; pintarBajo(); marcarFiltro(); return; }
    if (id!=='region') return;
    S.region = e.target.value || null; pintarTodo();
    if (S.region) volarConMexico(REGIONES[S.region][1]);
  });
  document.addEventListener('mouseover', e => { const k = e.target.closest('.kc[data-k]'); if (k) mostrarTip(k); });
  document.addEventListener('mouseout', e => { const k = e.target.closest('.kc[data-k]'); if (k && !k.contains(e.relatedTarget)) mostrarTip(null); });
  window.addEventListener('scroll', () => mostrarTip(null), {passive:true});
  if (TACTIL) document.addEventListener('touchstart', e => { if (!e.target.closest('.kc[data-k]')) mostrarTip(null); }, {passive:true});
  $('buscar').addEventListener('input', buscar);
  $('buscar').addEventListener('keydown', e => { if (e.key==='Enter'){ elegir(0); e.preventDefault(); } if (e.key==='Escape'){ $('res').hidden = true; } });
  { const r = rangoPeriodo(); aplicarPeriodo(r[0], r[1]); }       // periodo inicial: Sheinbaum
  $('corte').textContent = 'Datos al '+fechaISO(D.corte);
  $('tgraf').setAttribute('aria-valuemax', ND);
  pintarNav();
  pintarTodo();
  ajustarAlto();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAlto);
  requestAnimationFrame(animar);
}
if (window.echarts && D && GEO) iniciar();
else document.getElementById('lienzo').innerHTML = '<p style="padding:24px">No se pudo cargar el mapa.</p>';
})();
