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
   ```

3. Revisar `datos/reporte.txt` y las notas de calidad que imprime `control.py`, y subir todo lo de `datos/`.

El periodo de la página se toma de las fechas que traen las bases.

## Ver la página

Abrir `index.html` en el navegador, o publicar con GitHub Pages (rama `main`, carpeta raíz).

## Procesos

El menú «Procesos» agrupa las vistas por lo que hace el INM, no por dirección:

- **Control migratorio** · DGCVM y DGCOR (internaciones, segunda revisión, presentados, retornos, canalizados, rescates y recibidos)
- **Regulación migratoria** · DGRAM (trámites, documentos vigentes, actas)
- **Protección al migrante** · DGPMV (en construcción)

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
