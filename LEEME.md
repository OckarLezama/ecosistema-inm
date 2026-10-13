# IA-NAMI · Inteligencia migratoria

Página principal (Pulso) y convertidor de bases.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Estructura de la página |
| `css/estilos.css` | Estilos |
| `js/app.js` | Lógica de la página |
| `js/geo.js` | Mapa base (países, estados de México y de EE. UU.) |
| `js/temporadas.js` | Vacaciones del calendario SEP desde 2018, para marcar temporadas y comparar. Se edita a mano |
| `js/contexto.js` | Eventos por país desde 2018: qué pasó, efecto migratorio y fuente. Se edita a mano |
| `datos/datos.js` | Resumen de las bases. **Se genera, no se edita a mano** |
| `datos/reporte.txt` | Revisión de la última conversión |
| `robot/convertir.py` | Convierte las bases de `DATA` en `datos/` |
| `robot/regulacion.py` | Genera `datos/regulacion.js` (tabla diaria de trámites para la vista de Regulación) |
| `js/regulacion.js` | Vista Procesos › Regulación migratoria (DGRAM) |
| `robot/control.py` | Genera `datos/control.js` (internaciones, segunda revisión, presentados, retornos, canalizados, rescates y recibidos) |
| `js/control.js` | Vista Procesos › Control migratorio (DGCVM y DGCOR) |
| `robot/proteccion.py` | Genera `datos/proteccion.js` (mexicanos repatriados de EE. UU.) y revisa que las sumas cuadren |
| `robot/vocabulario.py` | Genera `datos/vocabulario.js`: nombres, abreviaturas, gentilicios y sinónimos que usa Pregunta a INAMI para entender la búsqueda y corregir errores de escritura. Se edita en `catalogos.py`, sección [8] |
| `js/proteccion.js` | Vista Procesos › Protección al migrante (DGPMV) |
| `js/consulta.js` | Ventana Pregunta a INAMI: combos, texto libre, hoja de una página (PDF, imagen y compartir por WhatsApp), deshacer y nueva pregunta y «Profundizar en el tablero» |
| `robot/catalogos.py` | Nacionalidades, estados y coordenadas de puntos |
| `DATA/` | Bases en xlsx, tal como las entrega cada área |

## Actualizar los datos

1. Subir o reemplazar los xlsx en `DATA/`. El nombre del archivo es libre: cada base se reconoce por sus columnas.
2. Desde la raíz del repositorio:

   ```
   pip install -r robot/requisitos.txt
   python robot/convertir.py
   python robot/regulacion.py
   python robot/control.py
   python robot/proteccion.py
   python robot/vocabulario.py --destino datos
   ```

3. Revisar `datos/reporte.txt` y las notas de calidad que imprime `control.py`, y subir todo lo de `datos/`.

El periodo de la página se toma de las fechas que traen las bases.

## Ver la página

Abrir `index.html` en el navegador, o publicar con GitHub Pages (rama `main`, carpeta raíz).

## Procesos

El menú «Procesos» agrupa las vistas por lo que hace el INM, no por dirección:

- **Control migratorio** · DGCVM y DGCOR (internaciones, segunda revisión, presentados, retornos, canalizados, rescates y recibidos)
- **Regulación migratoria** · DGRAM (trámites, documentos vigentes, actas)
- **Protección al migrante** · DGPMV (repatriados; vuelos comerciales y Guatemala-Honduras se activan cuando el área envíe los archivos corregidos)

## Pantalla completa del Pulso

- El botón ⛶ de la barra del mapa abre el mapa a toda la pantalla con lo principal encima: «Estás viendo», la cifra grande, cuatro datos, la frase de un vistazo, la gráfica de barras y la barra de tiempo. Esc o ✕ regresan al Pulso tal como estaba.
- Usa el mismo motor del Pulso (periodo, filtro y día del cursor): el mapa, las cifras y la reproducción siempre coinciden. Al reproducir, la intensidad de los estados y las cifras avanzan día por día.
- Buscador de país o estado (O.R.), región, indicador y periodo: Sheinbaum, Trump (se activa cuando las bases lleguen a 2025) y Comparar (dos periodos, por día; el mapa muestra el segundo).
- «Ingresos de extranjeros» descuenta a los mexicanos (en el Pulso, Ingresos los incluye).
- Se ajusta a cualquier pantalla: todo se mide contra el rectángulo 16:9 que cabe (ancho y alto a la vez). En pantallas angostas, verticales o de menos de 560 px de alto pasa a una columna con desplazamiento. Probado de 390×844 a 3840×2160, con y sin pantalla táctil.
- El botón claro/oscuro solo está en pantalla completa; al salir, el Pulso regresa al tono que tenía.
- «Ver todo» (aquí y en el Pulso) detiene la reproducción y regresa al periodo completo. Un periodo largo se recorre en unos 30 segundos.

## Pregunta a INAMI

- La consulta se arma con **Qué, Desglosar por, Periodo y Filtros**; cada combo solo ofrece lo que existe en la base del indicador. Los valores (nacionalidades, O.R., puntos, documentos…) se leen de los datos, así que una base nueva o un valor nuevo aparecen solos.
- El **texto libre** llena esos combos y avisa lo que no reconoció o lo que la base no trae (por ejemplo, sexo en rescatados).
- La respuesta es una **hoja de una página** con cinco plantillas según la consulta: proporción («de X, ¿cuántos Y?»), ranking, tiempo, comparación (2 o 3 valores) y fuentes (rescatados de la O.R. contra sistema DGCVM y SIRENNA).
- Se descarga en **PDF** o como **imagen** (horizontal 2400×1350 o vertical 9:16 de 1620×2880, el formato de estado de WhatsApp). En el celular la imagen se comparte con el menú del teléfono.
- **Ver en el tablero** abre el proceso que corresponde con los mismos filtros.
- Cifras de NNA de 1 a 4 se publican como «menos de 5».
- Los indicadores, partes y sinónimos están en la sección [2] de `js/consulta.js`.

## Reglas de los datos

- **% de rechazo:** rechazos ÷ (extranjeros que llegan por aire o tierra + rechazos). Sin mexicanos ni vía marítima (tripulación de cruceros). Es la misma cifra en Pulso y en Control migratorio.
- **Rescates y recibidos:** vienen del reporte de las O.R. (DGCOR); presentados y canalizados, del sistema (DGCVM). Son fuentes distintas y no se suman.

- **Documentos vigentes:** la fecha de corte es el día en que se subió el archivo al repositorio.
- **Días pendientes:** si una base llega a una fecha anterior que las demás, los días que le faltan se marcan como pendientes en la barra de tiempo y no entran en las comparaciones.
- **Semanas:** el cruce estado × nacionalidad se guarda en bloques de hasta 7 días que nunca cruzan un cambio de mes ni el 1 oct 2024 o el 20 ene 2025; por eso las consultas por mes, año y periodo salen exactas.
- **Caravanas:** columnas NO., NOMBRE, INICIO, LUGAR DE SALIDA, LUGAR DE DISOLUCIÓN (opcional) y PERSONAS (estimadas). Si llega un lugar nuevo, el reporte lo avisa y se agrega en `LUGARES` de `robot/catalogos.py`.

## Pendientes

- Vigentes: pedir al área un archivo estado × país × tipo de documento para el cruce de tres (hoy los archivos cruzan de dos en dos).
- Vigentes: que el robot guarde cada corte semanal para medir la variación del stock.
- Validación: confirmar si el archivo semanal trae solo solicitudes nuevas o el acumulado con resultados actualizados.
- Trámites: confirmar con el área el cierre de oficinas del 20 al 31 de diciembre y la clasificación «personas nuevas».
- Control: solo Chiapas registra reincidentes; confirmar con el área si las demás O.R. no los capturan.
- Control: presentados según las O.R. (≈397 mil) contra el sistema (≈50 mil); Tabasco reporta 2% y Coahuila y Chihuahua 0 en el sistema.
- Control: confirmar si «canalizados al DIF» del reporte de rescates incluye adultos, y la definición de «abandono de PAM».
- Control: aeropuertos registrados como vía terrestre y casos de segunda revisión con nacionalidad mexicana (los avisa `control.py`).
- Comparación con el mismo periodo del año anterior: se activa sola cuando haya datos de ese año.

- Mapa de calor: se quitó de Pulso; queda para otra sección.
- Mover los xlsx de `DATA/` a un repositorio privado.
- Protección: DGPMV COMERCIALES trae fechas en 2027 y 2024, meses cambiados y fechas como texto; se pidió al área corregirlo. Cada archivo de DGPMV tendrá su propio periodo y fecha de corte.
- Protección: confirmar qué significa «PAÍS» en DGPMV GUATEMALA-HONDURAS y si de verdad no hay menores.
- Protección: pedir el número de vuelos PRIM por día (hoy solo se cuentan días con llegada).
