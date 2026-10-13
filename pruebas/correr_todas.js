// Corre todas las pruebas y resume. Cada prueba imprime «errores []» si no hubo fallas de JavaScript.
const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
fs.mkdirSync(path.join(__dirname,'capturas'), { recursive:true });
const l = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f!=='correr_todas.js'); let mal = 0;
for (const f of l){ process.stdout.write(f.padEnd(40)); try { const o = execFileSync('node', [path.join(__dirname,f)], { encoding:'utf8', timeout:600000 });
  const ok = /errores \[\]/.test(o) && !/MAL [1-9]|con problemas [1-9]/.test(o); if (!ok) mal++; console.log(ok ? 'bien' : 'REVISAR\n'+o.split('\n').slice(-6).join('\n')); }
  catch(e){ mal++; console.log('FALLÓ\n'+String(e.stdout||e.message).split('\n').slice(-6).join('\n')); } }
console.log(mal ? mal+' pruebas por revisar' : 'Todas las pruebas pasaron');
