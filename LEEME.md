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
| `lib/`, `fuentes/` | Librerías y tipografías incluidas en el sitio |
| `pruebas/` | Pruebas automáticas (Playwright) |
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
- Entra limpia, en «Panorama», con el encuadre de América y Europa: cuatro totales del mismo tamaño, cada uno con su reparto al 100 %: Ingresos (aérea, terrestre, marítima, sin mexicanos), Trámites (hombres, mujeres), Rescatados (dos barras: primera vez/reincidente y destino: estación migratoria/DIF/sin destino, del reporte de las O.R.) y Repatriados (adultos/NNA, más las personas por vía aérea PRIM y terrestre; no es el número de vuelos). Abajo a la derecha, «Lo que cambió» (solo cambios con volumen). La consulta del Pulso no se arrastra y regresa al salir. En Panorama los estados se pintan por rescates.
- Indicadores de la pantalla completa: Panorama, Ingresos, Trámites, Rescatados, Canalizados y Repatriados (los demás quedan en el Pulso), en un selector propio agrupado. Cada uno muestra su desglose del periodo y una gráfica con selector sutil Nacionalidad / O.R. (Repatriados: O.R. / Punto; Canalizados: sobre el total de NNA).
- La barra de tiempo con el play queda siempre a la vista, también en el modo columna (se probó con escalas de Windows de 125 %, 150 % y 175 % y tabletas Android).
- «Ver todo» (aquí y en el Pulso) detiene la reproducción y regresa al periodo completo. Un periodo largo se recorre en unos 30 segundos.

## Pantalla completa de los procesos

- Control migratorio y Regulación migratoria tienen su botón «Pantalla completa» junto al título. Usan la misma pieza que el Pulso (js/app.js, sección [13], objeto PERFILES): cada perfil define su panorama, sus indicadores, su frase y qué se compara. Protección al migrante se agrega cuando sus datos estén validados.
- Control: dos cadenas que no se mezclan. Regular (ingresos con su vía; rechazos con el resultado de la segunda revisión y la tasa de rechazo, sin mexicanos ni cruceros) e irregular (rescatados con condición y destino según el reporte de las O.R.; presentados según el sistema, por estación; canalizados NNA/adultos; retornados asistido/deportación). Ingresos por punto de internación descuenta a los mexicanos de cada punto.
- Regulación: lo que se tramitó en el periodo (documento que salió: tarjeta, constancia u oficio, o sin expedición; tipo y sexo) y lo que hay al corte (extranjeros con documento vigente, por tipo y sexo; no cambia con el periodo y lo dice). El mapa pinta los estados por trámites. Las oficinas como puntos requieren su catálogo de ubicaciones (pendiente).

## Librerías, tipografías y pruebas

- ECharts, html2canvas y jsPDF están en lib/ y las tipografías en fuentes/ (css/fuentes.css): el tablero no depende de internet. Si una librería faltara, se toma de la red como respaldo.
- pruebas/: pruebas automáticas (ver pruebas/LEEME.md). Correrlas antes de publicar cualquier cambio.

## Mapa del Pulso

- Al buscar o elegir un país, estado o región: se apagan líneas y círculos, la cámara vuela y al llegar las líneas salen del origen hacia su destino y los círculos crecen. Cada círculo tiene identidad fija por país, así no se desliza de un país a otro al reproducir.
- Al reproducir con un indicador, los estados se pintan con el promedio de los últimos 7 días (escala fija del periodo).
- La barra de tiempo nombra cada temporada (vacaciones de invierno, Semana Santa, vacaciones de verano; Acción de Gracias de EE. UU. aparte).
- Países: al pasar el cursor se iluminan y muestran sus datos del periodo; con un clic (en pantalla táctil, dos toques) filtran por esa nacionalidad. Un segundo clic en lo mismo, la × o un clic en el mar quitan la selección.
- Al elegir un país o un estado aparece una ficha translúcida unida por una línea al lugar: cifras clave, cambio contra la comparación y principal O.R. (o nacionalidad). Sigue al mapa y se acomoda donde no tape nada; en pantallas angostas no se muestra.
- Contexto (al elegir una nacionalidad): solo si el país tiene eventos propios en js/contexto.js. Primero los que caen dentro o cerca del periodo de las bases, cada uno con lo que registran nuestras bases 30 días antes y después; el resto, plegado. El efecto migratorio solo se escribe si la fuente lo documenta; los eventos regionales solo si mencionan al país.
- Los íconos del mapa tienen su propia ayuda (nombre, qué muestran y si están encendidos); en pantalla táctil aparece al tocarlos.

## Pregunta a INAMI (fase 1)

- Responde en una frase arriba de la hoja (cifra, periodo, por día y comparación con los días anteriores).
- Entiende cambios entre periodos: «qué nacionalidad creció más», «cuáles bajaron por O.R.», «internaciones noviembre contra diciembre». Compara por día (los periodos pueden durar distinto) y solo con volumen suficiente; sin mes dicho, toma el último mes completo contra el anterior. La comparación aparece en la frase de piezas y se quita con ×.
- Fechas relativas: «últimos 30 días», «últimas 2 semanas», «últimos 3 meses», «último trimestre», «primera/segunda quincena de noviembre».
- Si no reconoce qué ver, ofrece tres preguntas parecidas («¿Quisiste decir?»). A «¿por qué…?» responde con cifras y aclara que no explica causas.
- pruebas/consultas.js verifica 47 preguntas contra sumas independientes de los datos crudos.

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
