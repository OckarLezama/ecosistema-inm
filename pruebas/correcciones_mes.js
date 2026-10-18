// Prueba automática de IA-NAMI. Ejecutar desde la carpeta pruebas: node correcciones_mes.js
// Cargas de las bases: gana la entrega más reciente, cada archivo manda en todo su rango, una «CORRECCION 2026-09»
// corrige el mes completo y la bitácora anota qué cambió. Corre robot/prueba_correcciones.py (Python) con datos simulados.
const { spawnSync } = require('child_process'); const path = require('path');
const py = process.env.PYTHON || (process.platform==='win32' ? 'python' : 'python3');
const r = spawnSync(py, [path.join(__dirname, '..', 'robot', 'prueba_correcciones.py')], { encoding:'utf8' });
process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
const mal = r.status!==0 ? (r.stdout.match(/MAL/g) || [1]).length : 0;
console.log(mal ? 'correcciones_mes: MAL '+mal : 'correcciones_mes: todo bien'); console.log('errores '+(r.error ? JSON.stringify([String(r.error)]) : '[]'));
process.exit(mal ? 1 : 0);
