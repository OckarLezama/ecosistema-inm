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
| `robot/catalogos.py` | Nacionalidades, estados y coordenadas de puntos |
| `DATA/` | Bases en xlsx, tal como las entrega cada área |

## Actualizar los datos

1. Subir o reemplazar los xlsx en `DATA/`. El nombre del archivo es libre: cada base se reconoce por sus columnas.
2. Desde la raíz del repositorio:

   ```
   pip install -r robot/requisitos.txt
   python robot/convertir.py
   ```

3. Revisar `datos/reporte.txt` y subir `datos/datos.js` y `datos/reporte.txt`.

El periodo de la página se toma de las fechas que traen las bases.

## Ver la página

Abrir `index.html` en el navegador, o publicar con GitHub Pages (rama `main`, carpeta raíz).

## Reglas de los datos

- **Documentos vigentes:** la fecha de corte es el día en que se subió el archivo al repositorio.
- **Días pendientes:** si una base llega a una fecha anterior que las demás, los días que le faltan se marcan como pendientes en la barra de tiempo y no entran en las comparaciones.
- **Caravanas:** columnas NO., NOMBRE, INICIO, LUGAR DE SALIDA, LUGAR DE DISOLUCIÓN (opcional) y PERSONAS (estimadas). Si llega un lugar nuevo, el reporte lo avisa y se agrega en `LUGARES` de `robot/catalogos.py`.

## Pendientes

- Mapa de calor: se quitó de Pulso; queda para otra sección.
