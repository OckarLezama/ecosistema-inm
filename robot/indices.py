# -*- coding: utf-8 -*-
"""
IA-NAMI · ÍNDICES INTERNACIONALES POR PAÍS (se corre una vez al año)
====================================================================
Lee los archivos oficiales de cuatro índices y genera datos/indices.js con el
valor de cada país desde 2018. La página los muestra en la ficha del país y en
Contexto, siempre con su fuente y con la advertencia de que coincidir en el
tiempo no prueba causa.

Archivos (se descargan de la página oficial y se dejan en DATA/indices/; el
nombre puede cambiar, el robot reconoce cada uno por su contenido):
  IDH    PNUD · Human Development Report, «Composite indices complete time series» (CSV)
         https://hdr.undp.org/data-center/documentation-and-downloads
  IPG    Institute for Economics & Peace · Global Peace Index, «overall scores» (XLSX)
         https://www.visionofhumanity.org/public-release-data/
  IEF    Fund for Peace · Fragile States Index, un Excel por año (XLSX)
         https://fragilestatesindex.org/excel/
  INFORM Comisión Europea (JRC) · INFORM Risk, archivo anual o de tendencias (XLSX)
         https://drmkc.jrc.ec.europa.eu/inform-index/InformRisk

Uso (desde la raíz del repositorio):
    python robot/indices.py --origen DATA/indices --destino datos

ÍNDICE
  [1] DEFINICIÓN DE LOS ÍNDICES
  [2] UTILIDADES
  [3] LECTORES (uno por índice)
  [4] SALIDA
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys
import unicodedata

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogos as C  # noqa: E402

DESDE = 2018

# ==== [1] DEFINICIÓN DE LOS ÍNDICES ===============================
# mejor: 1 = un valor más alto es mejor; -1 = un valor más alto es peor
INDICES = {
    'idh': {'n': 'Índice de Desarrollo Humano', 'c': 'IDH', 'esc': '0 a 1', 'mejor': 1,
            'f': 'PNUD, Informe sobre Desarrollo Humano', 'u': 'https://hdr.undp.org/data-center',
            'nota': 'El año es el de los datos; el PNUD los publica unos dos años después.'},
    'ipg': {'n': 'Índice de Paz Global', 'c': 'IPG', 'esc': '1 a 5', 'mejor': -1,
            'f': 'Institute for Economics & Peace, Global Peace Index', 'u': 'https://www.visionofhumanity.org/maps/',
            'nota': 'Más bajo = más pacífico.'},
    'ief': {'n': 'Índice de Estados Frágiles', 'c': 'IEF', 'esc': '0 a 120', 'mejor': -1,
            'f': 'Fund for Peace, Fragile States Index', 'u': 'https://fragilestatesindex.org/global-data/',
            'nota': 'Más alto = más frágil.'},
    'inform': {'n': 'Índice de riesgo INFORM', 'c': 'INFORM', 'esc': '0 a 10', 'mejor': -1,
               'f': 'Comisión Europea (JRC), INFORM Risk', 'u': 'https://drmkc.jrc.ec.europa.eu/inform-index/InformRisk',
               'nota': 'Riesgo de crisis humanitaria; más alto = más riesgo. El año es el de la edición.'},
}


# ==== [2] UTILIDADES ==============================================
def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def codigo(iso3=None, nombre=None):
    """Código numérico del país (el mismo de las nacionalidades) a partir del ISO3 o del nombre en inglés."""
    if iso3 is not None and str(iso3).strip().upper() in C.ISO3:
        return C.ISO3[str(iso3).strip().upper()]
    if nombre is not None:
        return C.NOMBRES_EN.get(norm(nombre))
    return None


def numero(v):
    try:
        x = float(str(v).replace(',', '.'))
        return None if x != x else x
    except (TypeError, ValueError):
        return None


def con_encabezado(raw, pistas, max_filas=20):
    """Toma una hoja leída sin encabezado y usa como encabezado la primera fila que contenga todas las pistas."""
    for i in range(min(max_filas, len(raw))):
        fila = [norm(x) for x in raw.iloc[i].tolist()]
        if all(any(p == c or c.startswith(p) for c in fila) for p in pistas):
            df = raw.iloc[i + 1:].copy()
            df.columns = [str(x).strip() for x in raw.iloc[i].tolist()]
            return df
    return None


def columna(df, *pistas):
    for p in pistas:
        for c in df.columns:
            if norm(c) == p:
                return c
    for p in pistas:
        for c in df.columns:
            if norm(c).startswith(p):
                return c
    return None


def hojas(ruta):
    try:
        return pd.read_excel(ruta, sheet_name=None, header=None)
    except Exception as e:  # noqa: BLE001
        print('  no se pudo leer', os.path.basename(ruta), '·', e)
        return {}


def anio_de(texto):
    m = re.findall(r'(20\d\d)', str(texto))
    return int(m[-1]) if m else None


# ==== [3] LECTORES ================================================
def leer_idh(archivos, R, sin):
    """CSV del PNUD: columnas iso3, country, hdi_1990 … hdi_20xx."""
    for ruta in [a for a in archivos if a.lower().endswith('.csv')]:
        try:
            df = pd.read_csv(ruta, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(ruta, encoding='latin-1')
        if 'iso3' not in df.columns or not any(re.fullmatch(r'hdi_\d{4}', c) for c in df.columns):
            continue
        print('  IDH ·', os.path.basename(ruta))
        for _, r in df.iterrows():
            k = codigo(r['iso3'])
            if k is None:
                sin.add(('idh', r.get('country', r['iso3'])))
                continue
            for c in df.columns:
                m = re.fullmatch(r'hdi_(\d{4})', c)
                if m and int(m.group(1)) >= DESDE and numero(r[c]) is not None:
                    R.setdefault(k, {}).setdefault('idh', {})[int(m.group(1))] = round(numero(r[c]), 3)


def leer_ipg(archivos, R, sin):
    """Excel del IEP: hoja de puntajes generales con país, iso3c y una columna por año (las de «rank» se ignoran)."""
    for ruta in [a for a in archivos if a.lower().endswith(('.xlsx', '.xls'))]:
        for nombre, raw in hojas(ruta).items():
            if 'rank' in norm(nombre):
                continue
            df = con_encabezado(raw, ['country', 'iso3c'])
            if df is None:
                continue
            cols = [(c, int(norm(c)[:4])) for c in df.columns if re.fullmatch(r'20\d\d( 0)?( score)?', norm(c))]
            if not cols:
                continue
            print('  IPG ·', os.path.basename(ruta), '·', nombre)
            ci, cp = columna(df, 'iso3c', 'iso3'), columna(df, 'country')
            for _, r in df.iterrows():
                k = codigo(r[ci], r[cp])
                if k is None:
                    if str(r[cp]) not in ('nan', 'None'):
                        sin.add(('ipg', r[cp]))
                    continue
                for c, a in cols:
                    v = numero(r[c])
                    if a and a >= DESDE and v is not None and 1 <= v <= 5:
                        R.setdefault(k, {}).setdefault('ipg', {})[a] = round(v, 3)
            return


def leer_ief(archivos, R, sin):
    """Excel(es) del Fund for Peace: columnas Country, Year, Total (un archivo por año)."""
    for ruta in [a for a in archivos if a.lower().endswith(('.xlsx', '.xls'))]:
        for nombre, raw in hojas(ruta).items():
            df = con_encabezado(raw, ['country', 'year', 'total'])
            if df is None:
                continue
            print('  IEF ·', os.path.basename(ruta), '·', nombre)
            cp, cy, ct = columna(df, 'country'), columna(df, 'year'), columna(df, 'total')
            for _, r in df.iterrows():
                v, y = numero(r[ct]), r[cy]
                a = y.year if hasattr(y, 'year') else anio_de(y)
                if v is None or not a or a < DESDE:
                    continue
                k = codigo(None, r[cp])
                if k is None:
                    sin.add(('ief', r[cp]))
                    continue
                R.setdefault(k, {}).setdefault('ief', {})[a] = round(v, 1)


def leer_inform(archivos, R, sin):
    """INFORM Risk: (a) archivo de tendencias, formato largo (Iso3, IndicatorId, INFORMYear, IndicatorScore);
    (b) archivo anual, una hoja con ISO3 y la columna «INFORM RISK»; el año sale del nombre de la hoja o del archivo."""
    for ruta in [a for a in archivos if a.lower().endswith(('.xlsx', '.xls'))]:
        for nombre, raw in hojas(ruta).items():
            df = con_encabezado(raw, ['iso3', 'indicatorid'])
            if df is not None:
                cy, cs, ci = columna(df, 'informyear', 'year'), columna(df, 'indicatorscore', 'score'), columna(df, 'iso3')
                cid = columna(df, 'indicatorid')
                df = df[df[cid].astype(str).str.upper() == 'INFORM']
                print('  INFORM (tendencias) ·', os.path.basename(ruta), '·', nombre)
                for _, r in df.iterrows():
                    a, v, k = anio_de(r[cy]), numero(r[cs]), codigo(r[ci])
                    if k is None:
                        sin.add(('inform', r[ci]))
                    elif a and a >= DESDE and v is not None:
                        R.setdefault(k, {}).setdefault('inform', {})[a] = round(v, 1)
                continue
            df = con_encabezado(raw, ['iso3', 'inform risk'])
            if df is None:
                continue
            a = anio_de(nombre) or anio_de(os.path.basename(ruta))
            if not a or a < DESDE:
                continue
            print('  INFORM', a, '·', os.path.basename(ruta), '·', nombre)
            ci, cv = columna(df, 'iso3'), columna(df, 'inform risk')
            for _, r in df.iterrows():
                v, k = numero(r[cv]), codigo(r[ci])
                if k is None:
                    if str(r[ci]) not in ('nan', 'None', '(a-z)'):
                        sin.add(('inform', r[ci]))
                elif v is not None:
                    R.setdefault(k, {}).setdefault('inform', {})[a] = round(v, 1)


# ==== [4] SALIDA ==================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--origen', default='DATA/indices')
    ap.add_argument('--destino', default='datos')
    a = ap.parse_args()
    archivos = sorted(glob.glob(os.path.join(a.origen, '*')))
    if not archivos:
        sys.exit('No hay archivos en ' + a.origen + '. Descarga los oficiales (ver el encabezado de este archivo).')
    R, sin = {}, set()
    leer_idh(archivos, R, sin)
    leer_ipg(archivos, R, sin)
    leer_ief(archivos, R, sin)
    leer_inform(archivos, R, sin)
    nats = {c for _, _, c in C.NACIONALIDADES}
    salida = {'gen': datetime.date.today().isoformat(), 'ind': {}, 'p': {}}
    for k, d in INDICES.items():
        anios = sorted({y for p in R.values() for y in p.get(k, {})})
        if anios:
            salida['ind'][k] = dict(d, anios=[anios[0], anios[-1]])
    for c, p in R.items():
        if c in nats:
            salida['p'][str(c)] = {k: sorted([y, v] for y, v in p[k].items()) for k in p}
    print('\nÍndices encontrados:', ', '.join(INDICES[k]['c'] + ' ' + '–'.join(map(str, salida['ind'][k]['anios'])) for k in salida['ind']) or 'ninguno')
    print('Países con algún índice:', len(salida['p']))
    if sin:
        print('Sin código (revisa el nombre en catalogos.py, sección [9]):', sorted({str(x[1]) for x in sin})[:60])
    os.makedirs(a.destino, exist_ok=True)
    with open(os.path.join(a.destino, 'indices.js'), 'w', encoding='utf-8') as f:
        f.write('// Generado por robot/indices.py el ' + salida['gen'] + ' · no editar a mano\n')
        f.write('window.IANAMI_IDX = ' + json.dumps(salida, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('Listo:', os.path.join(a.destino, 'indices.js'))


if __name__ == '__main__':
    main()
