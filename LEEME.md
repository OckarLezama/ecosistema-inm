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
| `robot/indices.py` | Genera `datos/indices.js` (IDH, Índice de Paz Global, Estados Frágiles e INFORM por país desde 2018) con los archivos oficiales. Se corre una vez al año |
| `js/proteccion.js` | Vista Procesos › Protección al migrante (DGPMV) |
| `lib/`, `fuentes/` | Librerías y tipografías incluidas en el sitio |
| `pruebas/` | Pruebas automáticas (Playwright) |
| `js/consulta.js` | Ventana Pregunta a INAMI: combos, texto libre, hoja de una página (PDF, imagen y compartir por WhatsApp), deshacer y nueva pregunta y «Profundizar en el tablero» |
| `robot/catalogos.py` | Nacionalidades, estados y coordenadas de puntos |
| `robot/lector.py` | Lectura común de las bases: junta hojas y archivos (gana la entrega más reciente; correcciones de mes), corrige encabezados mal escritos, recorta al 1 oct 2024 y escribe `datos/observaciones.js`, `datos/bitacora.js` y `datos/huella.json` |
| `robot/consolidar.py` | Consolidación periódica: un archivo por base y los originales a `DATA/_reemplazados/` |
| `robot/prueba_correcciones.py` | Prueba automática de las reglas de carga con un mes corregido simulado |
| `DATA/` | Bases en xlsx, tal como las entrega cada área |

## Actualizar los datos

1. Subir los xlsx a `DATA/` (GitHub Desktop: Pull origin → copiar → Commit → Push origin). Cada base se reconoce por sus columnas, no por el nombre.
   - Nombre sugerido: `FUENTE BASE AAAA-MM-DD a AAAA-MM-DD.xlsx` (primer y último día que trae). Las fotos al corte (documentos vigentes) llevan `al AAAA-MM-DD`.
   - Una base puede venir en varias hojas (si pasa del millón de renglones de Excel) o en varios archivos (por año, semana o día): el robot los junta. Los archivos semanales o diarios se van sumando; no se borran los anteriores.
   - **Gana la entrega más reciente** y **cada archivo manda en todo su periodo**: los días de ese periodo se toman solo de él (un día que no trae cuenta como cero), aunque una entrega anterior también los traiga. Nada se suma dos veces.
   - Fecha de entrega: la que diga el nombre (`… entregado AAAA-MM-DD`); si no la dice, cuándo entró el archivo al repositorio. Si no se puede saber, la corrección va después de lo que corrige y, entre envíos normales, el que llega más lejos.
   - **Correcciones de un mes completo**: el nombre lleva `CORRECCION` y el periodo que corrige, por ejemplo `DGCOR RESCATES CORRECCION 2026-09 entregado 2026-10-20.xlsx` (todo septiembre) o `DGCOR RESCATES CORRECCION 2026-09-01 a 2026-09-15.xlsx`. Reemplaza ese periodo completo; lo que traiga fuera de él no se usa (se avisa).
   - Envío de días nuevos: cualquier otro nombre; su periodo es del primer al último día que trae.
   - Cada carga deja una huella por base y día (`datos/huella.json`) y la siguiente anota en `datos/bitacora.js` qué cambió (sección **Bases › Cambios en los datos**).
   - Todo se toma desde el 1 oct 2024; lo anterior se avisa y no se usa.
   - Las hojas ocultas o con otras columnas no se leen (se avisa).
2. Desde la raíz del repositorio:

   ```
   pip install -r robot/requisitos.txt
   python robot/convertir.py
   python robot/regulacion.py
   python robot/control.py
   python robot/proteccion.py
   python robot/vocabulario.py --destino datos
   python robot/indices.py          # una vez al año, con los archivos oficiales en DATA/indices/
   ```

   Consolidación periódica (cada 3 meses, o cuando una base pase de unos 10 archivos): `python robot/consolidar.py` dice qué haría; `python robot/consolidar.py --aplicar` junta los archivos de cada base en uno solo (con las mismas reglas) y guarda los originales en `DATA/_reemplazados/AAAA-MM-DD/`, que los robots no leen. Comprueba que el consolidado dé lo mismo por día antes de mover nada.
   Prueba de las reglas de carga: `python robot/prueba_correcciones.py` (también corre con las pruebas de la página).

3. Revisar la sección **Bases** de la página (o `datos/reporte.txt`): periodo de cada base, días sin datos y observaciones. Subir todo lo de `datos/`.

El periodo de la página se toma de las fechas que traen las bases.

## Ver la página

Abrir `index.html` en el navegador, o publicar con GitHub Pages (rama `main`, carpeta raíz).

## Procesos

El menú «Procesos» agrupa las vistas por lo que hace el INM, no por dirección:

- **Control migratorio** · DGCVM y DGCOR (internaciones, segunda revisión, presentados, retornos, canalizados, rescates y recibidos)
- **Regulación migratoria** · DGRAM (trámites, documentos vigentes, actas)
- **Protección al migrante** · DGPMV (repatriados; vuelos comerciales y Guatemala-Honduras se activan cuando el área envíe los archivos corregidos)

## Carga de la página

- El Pulso abre solo con `datos/datos.js`. Control, Regulación, Protección y Pregunta a INAMI bajan sus datos la primera vez que se abren (aviso «Cargando…» abajo al centro) y quedan en memoria. Con dos años de datos, abrir todo de golpe pesaría unos 50 MB; así, el Pulso abre en un par de segundos.
- Los servidores web comprimen los archivos (gzip): datos.js de 11.7 MB viaja como 3.3 MB; control.js 20.5 → 2.1 MB; regulacion.js 18.3 → 1.9 MB.

## Trámites (DGRAM): cómo se cuentan

- Desde 2026 la base trae un renglón por trámite y marca con 1 cada documento. Se cuenta un trámite por renglón (oct–dic 2024 da 105,679, igual que la base anterior).
- Errores de captura que el robot corrige y avisa: trámites con tarjeta que también marcan «Sin expedición» (cuenta solo la tarjeta) y trámites sin ningún documento marcado («Tarjeta sin tipo registrado» si terminaron con tarjeta; «Sin expedición» si no).
- Columnas nuevas que todavía no se usan: plazo normativo, días de resolución, dentro o fuera de plazo y motivo de estancia (base para un indicador de tiempos de resolución).

## Pantalla completa del Pulso

- El botón ⛶ de la barra del mapa abre el mapa a toda la pantalla con lo principal encima: «Estás viendo», la cifra grande, cuatro datos, la frase de un vistazo, la gráfica de barras y la barra de tiempo. Esc o ✕ regresan al Pulso tal como estaba.
- Usa el mismo motor del Pulso (periodo, filtro y día del cursor): el mapa, las cifras y la reproducción siempre coinciden. Al reproducir, la intensidad de los estados y las cifras avanzan día por día.
- Buscador de país o estado (O.R.), región, indicador y periodo: Sheinbaum, Trump (se activa cuando las bases lleguen a 2025) y Comparar (dos periodos, por día; el mapa muestra el segundo).
- «Ingresos de extranjeros» descuenta a los mexicanos (en el Pulso, Ingresos los incluye).
- Se ajusta a cualquier pantalla: todo se mide contra el rectángulo 16:9 que cabe (ancho y alto a la vez). En pantallas angostas, verticales o de menos de 560 px de alto pasa a una columna con desplazamiento. Probado de 390×844 a 3840×2160, con y sin pantalla táctil.
- El botón claro/oscuro solo está en pantalla completa; al salir, el Pulso regresa al tono que tenía.
- Entra limpia, en «Panorama», con el encuadre de América y Europa: cuatro totales del mismo tamaño, cada uno con su reparto al 100 %: Ingresos (aérea, terrestre, marítima, sin mexicanos), Trámites (hombres, mujeres), Rescatados (dos barras: primera vez/reincidente y destino: estación migratoria/DIF/sin destino, del reporte de las O.R.) y Repatriados (adultos/NNA, más las personas por vía aérea PRIM y terrestre; no es el número de vuelos). Abajo a la derecha, «Lo que cambió» (solo cambios con volumen, contra lo elegido en «Comparar con»; no aparece lo que es de temporada: si hace un año, en las mismas fechas, pasó lo mismo —mismo sentido y al menos la mitad del cambio— no es noticia; cada tarjeta dice cuánto cambió hace un año. Con «vs. año anterior» no aplica. Ya no sale la «concentración» de rechazos, porque no es un cambio). La misma regla de temporada aplica a la alerta del Resumen («Última semana, fuera de lo normal»), y los titulares de Control, Regulación y Protección dicen cuánto cambió hace un año en estas fechas. La consulta del Pulso no se arrastra y regresa al salir. Tarjetas de abajo: un clic en una barra (estado, nacionalidad, cinturón o CECO) filtra ahí mismo: las tarjetas no cambian ni se mueven, la barra queda marcada y arriba sale el chip; otro clic en la misma barra quita el filtro. Elegir un lugar en el mapa o en el buscador sí muestra «todos sus indicadores» y el contexto del país. Los nombres de las tarjetas no cambian con el filtro (el filtro va en su etiqueta). Rechazos sigue el mismo orden que los demás (nacionalidades, estado, composición y «Se internaron tras la 2da revisión»); en Presentados la composición se llama «Estaciones con más presentados». En Panorama los estados se pintan por rescates.
- Indicadores de la pantalla completa: Panorama, Ingresos, Trámites, Rescatados, Canalizados y Repatriados (los demás quedan en el Pulso), en un selector propio agrupado. Cada uno muestra su desglose del periodo y una gráfica con selector sutil Nacionalidad / O.R. (Repatriados: O.R. / Punto; Canalizados: sobre el total de NNA).
- La barra de tiempo con el play queda siempre a la vista, también en el modo columna (se probó con escalas de Windows de 125 %, 150 % y 175 % y tabletas Android).
- «Ver todo» (aquí y en el Pulso) detiene la reproducción y regresa al periodo completo. Un periodo largo se recorre en unos 30 segundos.

## Pantalla completa de los procesos

- Control migratorio y Regulación migratoria tienen su botón «Pantalla completa» junto al título. Usan la misma pieza que el Pulso (js/app.js, sección [13], objeto PERFILES): cada perfil define su panorama, sus indicadores, su frase y qué se compara. Protección al migrante se agrega cuando sus datos estén validados.
- Control: dos cadenas que no se mezclan. Regular (ingresos con su vía; rechazos con el resultado de la segunda revisión y la tasa de rechazo, sin mexicanos ni cruceros) e irregular (rescatados con condición y destino según el reporte de las O.R.; presentados según el sistema, por estación; canalizados NNA/adultos; retornados asistido/deportación). Ingresos por punto de internación descuenta a los mexicanos de cada punto.
- Regulación: lo que se tramitó en el periodo (documento que salió: tarjeta, constancia u oficio, o sin expedición; tipo y sexo) y lo que hay al corte (extranjeros con documento vigente, por tipo y sexo; no cambia con el periodo y lo dice). En el indicador también están «Constancias y oficios» (los trámites que no terminan en tarjeta: oficio de cambio, oficio de la S.R.E., constancia de empleador y permiso de salida y regreso; siguen al periodo, al play y a la comparación) y «Validación de actas» del Registro Civil: base nueva con su propio periodo (desde el 28 sep 2026), que no sigue al periodo, al play ni a la comparación; esos controles se ocultan y el mapa se atenúa. El mapa pinta los estados por trámites. Las oficinas como puntos requieren su catálogo de ubicaciones (pendiente).

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
- Perfil: si escribes solo un país («Venezuela», «venezolanos») o solo una O.R. («Chiapas»), sale una hoja con todos los indicadores del Pulso en tres grupos (Regular, Irregular, Desde EE. UU.): cifra completa, promedio por día, tendencia semanal, quién encabeza y el cambio contra los días anteriores (o el último mes contra el anterior si las bases no alcanzan; «—» con pocos casos). Las cifras no se suman entre sí. Extranjeros con documento vigente va al último corte. Repatriados solo aparece en el perfil de una O.R. Al tocar una tarjeta se abre ese indicador; «Profundizar en el tablero» abre el Pulso con el país o el estado elegido. pruebas/perfil_pregunta.js lo revisa.
- La «i» junto al título abre ejemplos por tipo de pregunta (cuántos, de los… cuántos, por, cambio y fechas relativas); al tocarlos se consultan. pruebas/pregunta_ayuda.js revisa que todos respondan.
- pruebas/consultas.js verifica 47 preguntas contra sumas independientes de los datos crudos.

## Pregunta a INAMI

- La consulta se arma con **Qué, Desglosar por, Periodo y Filtros**; cada combo solo ofrece lo que existe en la base del indicador. Los valores (nacionalidades, O.R., puntos, documentos…) se leen de los datos, así que una base nueva o un valor nuevo aparecen solos.
- El **texto libre** llena esos combos y avisa lo que no reconoció o lo que la base no trae (por ejemplo, sexo en rescatados).
- La respuesta es una **hoja de una página** con cinco plantillas según la consulta: proporción («de X, ¿cuántos Y?»), ranking, tiempo, comparación (2 o 3 valores) y fuentes (rescatados de la O.R. contra sistema DGCVM y SIRENNA).
- Se descarga en **PDF** o como **imagen** (horizontal 2400×1350 o vertical 9:16 de 1620×2880, el formato de estado de WhatsApp). En el celular la imagen se comparte con el menú del teléfono.
- **Ver en el tablero** abre el proceso que corresponde con los mismos filtros.
- Cifras de NNA de 1 a 4 se publican como «menos de 5».
- Los indicadores, partes y sinónimos están en la sección [2] de `js/consulta.js`.
- Temas: además de los del Pulso, **encuentros CBP** (por sector, agencia, mexicanos y extranjeros), **caravanas** (cuántas y personas estimadas, por lugar de salida y nombre), **validación de actas del Registro Civil** (periodo propio de la base, corte semanal), **extranjeros con documento vigente** (foto al último corte: no sigue al periodo; los archivos cruzan de dos en dos, así que estado y nacionalidad juntos solo existen para las 25 nacionalidades principales), **mexicanos que ingresaron** y **todos los ingresos** (extranjeros + mexicanos). «Ingresos de México» se responde con mexicanos que ingresaron.
- **Ficha o Bullets:** la misma consulta, como hoja con gráficas o en viñetas para mandar como mensaje. Las viñetas siguen el estilo de la Mesa de Seguridad (cifra en «2 MIL 771», «(75%) 2 MIL 070 mexicanos», cambio contra los días anteriores, acumulado desde el 1 oct 2024 y principales con su %), solo con cifras: sin causas ni interpretación. **WhatsApp** abre el chat con el texto listo; **Copiar texto**, **Imagen** y **PDF** también funcionan.
- **Compartir la ficha:** en celular y tableta, la imagen se prepara en cuanto sale el resultado y al tocar Compartir abre el menú del teléfono con la imagen adjunta (el botón se ve atenuado mientras se prepara). En computadora abre WhatsApp Web y descarga la imagen para adjuntarla.

## Glosario (un nombre por cifra)

| Nombre | Qué cuenta | Dónde aparece |
|---|---|---|
| **Ingresos** | Entradas de extranjeros por los puntos de internación (sin mexicanos) | Pulso, Resumen, Infografía, Control › Ingresos, Informes, Pregunta a INAMI. «Punto de internación» y «vía de internación» se quedan: son el nombre oficial del lugar y de la vía |
| **Rescatados** | Rescates (eventos) del reporte de las O.R.: una persona rescatada dos veces cuenta dos | Igual en todas; donde se describe dice «rescates (eventos)» |
| **Canalizados** | NNA + adultos que los acompañan, canalizados al DIF | Pulso e Infografía |
| **NNA canalizados** | Solo niñas, niños y adolescentes (SIRENNA) | Resumen, Control › Canalizados (NNA), Informes, Pregunta a INAMI |
| **Retornados** | Deportados + retornos asistidos | Igual en todas |

Áreas en «Arma tu informe»: Control (ingresos, segunda revisión, rechazos, rescatados, presentados, NNA canalizados, retornados), Regulación, Protección (repatriados) y Desde EE. UU. (recibidos y encuentros CBP), igual que el menú Procesos.

## Reglas de los datos

- **Trámites:** todos = expiden tarjetas + no expiden tarjetas, según la columna «Tipo de conclusión» (con / sin expedición de tarjeta migratoria). «Tipo no registrado» = salieron con tarjeta pero no marcan cuál. No expiden = constancias, oficios, permisos y sin expedición.
- **Plazos (Regulación › Plazos):** «Dentro o fuera del plazo normativo», días de resolución (o transcurridos si sigue en proceso) y plazo de la norma por tipo de trámite. Los días de respuesta no se separan por nacionalidad ni documento. Los meses recientes tienen menos «fuera del plazo» porque muchos trámites aún no cumplen su plazo.
- **Motivo de estancia:** en Trámites (caja «¿Por qué se quedan?») y en Pregunta a INAMI.

- **% de rechazo:** rechazos ÷ (extranjeros que llegan por aire o tierra + rechazos). Sin mexicanos ni vía marítima (tripulación de cruceros). Es la misma cifra en Pulso y en Control migratorio.
- **Ingresos:** las tarjetas cuentan extranjeros (76.51 M). Los mexicanos que regresan se muestran aparte y suman el total del país (extranjeros + mexicanos = 98.90 M) en la ayuda de la tarjeta del Pulso, en Control › Ingresos y en Pregunta a INAMI.
- **Segunda revisión y rechazos:** solo extranjeros en todas las vistas; los casos con nacionalidad mexicana se avisan en Bases.
- **Retornados:** deportados + retornos asistidos (así el desglose cuadra con el total); si la columna del total no coincide, se avisa en Bases.
- **Cifras en las tarjetas:** número completo hasta 999,999; desde un millón, «x.xx M». En listas y comparaciones cortas, de 10,000 en adelante: «x.x mil» (nunca «k»).
- **Periodo incompleto en las gráficas por mes o semana:** el tramo hacia ese punto va punteado y dice cuántos días tiene («13 días»), para que su cifra más baja no se lea como caída.
- **Botón «atrás» del navegador:** regresa a la sección anterior dentro de la plataforma (cada sección conserva sus filtros); no saca del sitio.
- **Menú:** Prospectiva y Contexto no se muestran hasta que existan (su código se conserva).
- **Puntos en el Pulso:** son solo información en el mapa (su globo al pasar el mouse); las tarjetas de abajo siempre son del país, del estado o de la nacionalidad elegida. Un clic en un punto (o buscarlo) lleva a su análisis: punto de internación → Control › Ingresos con ese punto; estación → Control › Rescates (presentados); punto de repatriación → Protección al migrante con ese punto. En la Infografía el punto solo muestra su globo.
- **Encuentros CBP:** los registra EE. UU. (no el INM), incluyen mexicanos y no tienen O.R.: en el Pulso la tarjeta está en «Desde EE. UU.» (recibidos → repatriados → encuentros), se desactiva al elegir un estado, funciona con nacionalidad y al elegirla el mapa muestra los sectores de la frontera. El análisis completo irá en Analizar.
- **Rescates y recibidos:** vienen del reporte de las O.R. (DGCOR); presentados y canalizados, del sistema (DGCVM). Son fuentes distintas y no se suman.

- **Documentos vigentes:** la fecha de corte es el día en que se subió el archivo al repositorio.
- **Días pendientes:** si una base llega a una fecha anterior que las demás, los días que le faltan se marcan como pendientes en la barra de tiempo y no entran en las comparaciones.
- **Semanas:** el cruce estado × nacionalidad se guarda en bloques de hasta 7 días que nunca cruzan un cambio de mes ni el 1 oct 2024 o el 20 ene 2025; por eso las consultas por mes, año y periodo salen exactas.
- **Caravanas:** columnas NO., NOMBRE, INICIO, LUGAR DE SALIDA, LUGAR DE DISOLUCIÓN (opcional) y PERSONAS (estimadas). Si llega un lugar nuevo, el reporte lo avisa y se agrega en `LUGARES` de `robot/catalogos.py`.

## Índices internacionales por país

- IDH (PNUD), Índice de Paz Global (Institute for Economics & Peace), Índice de Estados Frágiles (Fund for Peace) e INFORM Risk (Comisión Europea, JRC), desde 2018.
- Se ven en la ficha del país (Pulso y pantalla completa: último valor y año) y en su caja de Contexto (evolución, si mejoró o empeoró, y la liga a la fuente). Siempre con la nota: describen al país, no explican por sí solos la migración, y coincidir en el tiempo no prueba causa.
- Para actualizarlos: descargar los archivos oficiales (las ligas están en el encabezado de `robot/indices.py`), dejarlos en `DATA/indices/` y correr `python robot/indices.py`. El robot reconoce cada archivo por su contenido e imprime los países que no pudo identificar (se agregan en `catalogos.py`, sección [9]).
- Mientras no se corra, `datos/indices.js` queda vacío y la página no muestra nada de esto.

## Pendientes

- DGPMV: vuelos comerciales y Guatemala-Honduras tienen su pestaña. Vuelos comerciales no está en Repatriados (se suma aparte). Guatemala-Honduras coincide día por día (98%) con el punto Ciudad Hidalgo de Repatriados: es el mismo flujo, no se suma; la pestaña muestra el cruce. Confirmar con el área.
- Regulación: el análisis de plazos vive dentro de Trámites (banda «¿El INM resuelve a tiempo?» que se abre); ya no hay pestaña Plazos.
- Gráficas: la cuadrícula («cuadritos») la pone window.IANAMI_CUAD (app.js) en todas las gráficas con ejes, alineada a los ejes; no usar fondos CSS que se enciman.
- Mapas de Protección: colores del mapa del Pulso y encuadre que llena el recuadro sin deformarse (encuadreGeo), recalculado al cambiar el tamaño.
- Pantalla completa automática: agregar «?completa» a la dirección; el primer toque la activa (el navegador no permite entrar sin un gesto).
- Analizar: encuentros CBP completos y el producto «Mesa de Seguridad» (viñetas + gráficas).
- Mover los Excel de DATA a un repositorio privado.
- DGRAM: confirmar por qué los trámites con tarjeta marcan «Sin expedición» y los 47,617 sin documento; el reparto por documento de oct–dic 2024 cambió respecto a la base anterior (oficios S.R.E. 8,019 → 10,790).
- Índices: correr `robot/indices.py` con los archivos oficiales (desde aquí no se pudieron descargar).

- Vigentes: pedir al área un archivo estado × país × tipo de documento para el cruce de tres (hoy los archivos cruzan de dos en dos).
- Vigentes: que el robot guarde cada corte semanal para medir la variación del stock.
- Validación: confirmar si el archivo semanal trae solo solicitudes nuevas o el acumulado con resultados actualizados.
- Trámites: confirmar con el área el cierre de oficinas del 20 al 31 de diciembre y la clasificación «personas nuevas».
- Control: presentados según las O.R. (≈397 mil) contra el sistema (≈50 mil); Tabasco reporta 2% y Coahuila y Chihuahua 0 en el sistema.
- Control: confirmar si «canalizados al DIF» del reporte de rescates incluye adultos, y la definición de «abandono de PAM».
- Control: aeropuertos registrados como vía terrestre y casos de segunda revisión con nacionalidad mexicana (los avisa `control.py`).
- Comparación con el mismo periodo del año anterior: se activa sola cuando haya datos de ese año.

- Mapa de calor: se quitó de Pulso; queda para otra sección.
- Mover los xlsx de `DATA/` a un repositorio privado.
- Protección: DGPMV COMERCIALES trae fechas en 2027 y 2024, meses cambiados y fechas como texto; se pidió al área corregirlo. Cada archivo de DGPMV tendrá su propio periodo y fecha de corte.
- Protección: confirmar qué significa «PAÍS» en DGPMV GUATEMALA-HONDURAS y si de verdad no hay menores.
- Protección: pedir el número de vuelos PRIM por día (hoy solo se cuentan días con llegada).

<!-- publicación: 15 oct 2026 -->
