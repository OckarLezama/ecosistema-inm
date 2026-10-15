# -*- coding: utf-8 -*-
"""
IA-NAMI · LECTURA COMÚN DE LAS BASES
====================================
Lo usan todos los robots. Una base puede llegar en varias hojas de un mismo
archivo (cuando pasa del millón de renglones que caben en una hoja de Excel)
o en varios archivos (por año, por semana o por día). Aquí se juntan.

Reglas
  · Cada base se reconoce por sus columnas, no por el nombre del archivo.
  · Solo se leen hojas visibles; una hoja se junta si trae las mismas columnas
    que la primera (las tablas dinámicas o copias viejas se ignoran y se avisa).
  · Encabezados: mayúsculas, sin acentos ni espacios sobrantes; los errores de
    escritura conocidos se corrigen y se avisan (ALIAS).
  · Si dos archivos traen el mismo día, se queda el que llega más lejos en
    fechas (el más reciente) y se avisa. Así un reenvío corregido no cuenta doble.
  · Todo se toma desde INICIO (el periodo de la presidenta); lo anterior se avisa.
  · Nombre sugerido de los archivos: «FUENTE BASE AAAA-MM-DD a AAAA-MM-DD.xlsx».
    El nombre no decide nada: si sus fechas no coinciden con el contenido, se avisa.

ÍNDICE  [1] UTILIDADES   [2] HOJAS   [3] JUNTAR   [4] AVISOS
"""
import os
import re
import unicodedata

import openpyxl
import pandas as pd

INICIO = pd.Timestamp("2024-10-01")
ALIAS = {"NACIONADLIDAD": "NACIONALIDAD", "NACIONALIDA": "NACIONALIDAD"}
AVISOS = {}          # nombre de la base → observaciones (sin repetir)


# ==== [1] UTILIDADES ==============================================
def norm(texto):
    t = unicodedata.normalize("NFD", str(texto).upper())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    return " ".join(t.split())


def avisar(base, texto):
    l = AVISOS.setdefault(base, [])
    if texto not in l:
        l.append(texto)


def fechas_del_nombre(nombre):
    """«… 2026-10-13 a 2026-10-19.xlsx» → (desde, hasta); «… al 2026-10-12» o «… 2025» también."""
    f = re.findall(r"(20\d\d)-(\d\d)-(\d\d)", nombre)
    if f:
        d = [pd.Timestamp(int(a), int(m), int(x)) for a, m, x in f]
        return d[0], d[-1]
    a = re.findall(r"\b(20\d\d)\b", nombre)
    if len(a) == 1:
        return int(a[0])                                    # solo el año: basta con que el contenido caiga en ese año
    return None


# ==== [2] HOJAS ===================================================
def encabezados(fila, base=None):
    cols = []
    for c in fila:
        n = norm(c)
        if n in ALIAS:
            if base:
                avisar(base, f"Encabezado «{c}» leído como «{ALIAS[n]}» (corregir en el archivo).")
            n = ALIAS[n]
        cols.append(n)
    return cols


def hojas(ruta):
    """[(nombre de hoja, tabla sin encabezado)] de las hojas visibles, y la lista de ocultas."""
    libro = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    vis = [h.title for h in libro.worksheets if h.sheet_state == "visible"]
    ocu = [h.title for h in libro.worksheets if h.sheet_state != "visible"]
    libro.close()
    return [(h, pd.read_excel(ruta, sheet_name=h, header=None)) for h in vis], ocu


def primera_fila(ruta, acepta=None):
    """Encabezados de la primera hoja visible, sin leer todo el archivo. Con `acepta` (función sobre la lista de
    encabezados), la primera hoja visible que la cumple: así una hoja de apoyo puesta antes que la base no estorba."""
    libro = openpyxl.load_workbook(ruta, read_only=True)
    fila = ()
    for h in libro.worksheets:
        if h.sheet_state != "visible":
            continue
        f = [c for c in next(h.iter_rows(max_row=1, values_only=True), ()) if c is not None]
        if acepta is None or acepta(f):
            fila = f
            break
    libro.close()
    return list(fila)


def tabla_de(ruta, base=None, acepta=None):
    """Junta las hojas visibles que traen las mismas columnas que la primera (o que la primera que cumple `acepta`).
    Devuelve una tabla con encabezados normalizados y la lista de hojas que no se leyeron."""
    hs, ocultas = hojas(ruta)
    if acepta is not None:
        k = next((i for i, (_, t) in enumerate(hs) if len(t) and acepta([c for c in t.iloc[0].tolist() if pd.notna(c)])), None)
        if k:
            hs = hs[k:] + hs[:k]
    if not hs:
        return None, ocultas
    orig = [" ".join(str(c).split()) for c in hs[0][1].iloc[0].tolist()]
    cols = encabezados(hs[0][1].iloc[0].tolist(), base)
    partes, fuera = [], list(ocultas)
    for nombre, t in hs:
        c = encabezados(t.iloc[0].tolist(), base)
        if set(c) != set(cols):
            fuera.append(nombre)
            continue
        x = t.iloc[1:].copy()
        x.columns = c
        partes.append(x[cols])
    t = pd.concat(partes, ignore_index=True)
    t.attrs["orig"] = orig                                   # encabezados tal como vienen (para mostrar nombres)
    return t, fuera


# ==== [3] JUNTAR ==================================================
def dia(serie):
    return pd.to_datetime(serie, errors="coerce", dayfirst=True).dt.normalize()


def juntar(partes, base, col_dia="DIA"):
    """partes: [(archivo, tabla con encabezados normalizados)]. Junta en orden de fechas; un día que
    aparece en dos archivos se toma del que llega más lejos. Recorta antes de INICIO."""
    if col_dia not in partes[0][1].columns:                 # sin fechas (catálogos, cortes): el último archivo
        if len(partes) > 1:
            avisar(base, "Hay " + str(len(partes)) + " archivos de esta base y no trae fechas: se usa " + partes[-1][0] + ".")
        return partes[-1][1].reset_index(drop=True)
    info = []
    for nombre, t in partes:
        t = t.copy()
        t["_D"] = dia(t[col_dia])
        sin = int(t["_D"].isna().sum())
        if sin:
            avisar(base, f"{nombre}: {sin:,} renglones sin fecha válida (no se cuentan).")
        t = t[t["_D"].notna()]
        if not len(t):
            avisar(base, f"{nombre}: no trae renglones con fecha.")
            continue
        a, b = t["_D"].min(), t["_D"].max()
        fn = fechas_del_nombre(nombre)
        if isinstance(fn, int) and (a.year != fn or b.year != fn):
            avisar(base, f"{nombre}: el nombre dice {fn}, pero trae {a.date()} a {b.date()}.")
        elif isinstance(fn, tuple) and (fn[0] > a + pd.Timedelta(days=6) or fn[1] < b - pd.Timedelta(days=6) or fn[1] > b + pd.Timedelta(days=6)):
            avisar(base, f"{nombre}: el nombre dice {fn[0].date()} a {fn[1].date()}, pero trae {a.date()} a {b.date()}.")
        info.append((b, nombre, t))
    info.sort(key=lambda x: (x[0], x[1]))                     # el que llega más lejos va al final y gana
    usados, salida, filas = set(), [], {}
    for b, nombre, t in reversed(info):
        dias = set(t["_D"].unique())
        rep = dias & usados
        if rep:
            # salvaguarda: un día que el archivo más nuevo trae con muchos menos renglones puede ser un envío incompleto
            n_viejo = t[t["_D"].isin(rep)].groupby("_D").size()
            bajos = [(d.date(), int(n_viejo[d]), filas[d]) for d in sorted(rep) if d in n_viejo and filas.get(d, 0) < 0.5 * n_viejo[d] and n_viejo[d] >= 20]
            if bajos:
                avisar(base, "Revisar: " + str(len(bajos)) + " días llegan en el archivo más reciente con menos de la mitad de renglones que en " + nombre +
                       " (" + ", ".join(f"{d}: {nv:,} → {nn:,}" for d, nv, nn in bajos[:5]) + (" …" if len(bajos) > 5 else "") + "). Puede ser un envío incompleto.")
            avisar(base, f"{nombre}: {len(rep)} días también vienen en un archivo más reciente; se tomaron de ese.")
            t = t[~t["_D"].isin(rep)]
        for d, n in t.groupby("_D").size().items():
            filas.setdefault(d, int(n))
        usados |= dias
        salida.append(t)
    t = pd.concat(salida[::-1], ignore_index=True).sort_values("_D", kind="stable")
    antes = t["_D"] < INICIO
    if antes.any():
        avisar(base, f"Trae {int(antes.sum()):,} renglones anteriores al {INICIO.date()} (desde {t['_D'].min().date()}); "
                     "no se usan: el tablero empieza el 1 oct 2024.")
        t = t[~antes]
    t[col_dia] = t["_D"]
    return t.drop(columns="_D").reset_index(drop=True)


def leer_por_columnas(origen, columnas, base, sin=frozenset()):
    """Busca en origen todos los archivos cuya primera hoja visible trae `columnas` (y ninguna de `sin`),
    junta hojas y archivos, y devuelve (tabla, [archivos])."""
    partes = []
    for ruta in sorted(os.path.join(origen, f) for f in os.listdir(origen) if f.lower().endswith(".xlsx") and not f.startswith("~$")):
        cols = set(encabezados(primera_fila(ruta)))
        if columnas <= cols and not (sin & cols):
            t, fuera = tabla_de(ruta, base)
            if fuera:
                avisar(base, os.path.basename(ruta) + ": no se leyeron las hojas " + ", ".join(fuera) + " (ocultas o con otras columnas).")
            partes.append((os.path.basename(ruta), t))
    if not partes:
        return None, []
    return juntar(partes, base), [p[0] for p in partes]


# ==== [3b] TRÁMITES: UN TRÁMITE, UN DOCUMENTO =======================
DOC = ("CONSTANCIA", "OFICIO", "PERMISO", "SIN EXPEDICION", "TARJETA")
SIN_TIPO = "TARJETA SIN TIPO REGISTRADO"


def documentos_tramite(t):
    """Desde 2026 la base de DGRAM trae un renglón por trámite y marca con 1 cada documento. Trae dos errores
    de captura que aquí se corrigen y se avisan: trámites con tarjeta que también marcan «Sin expedición»
    (no cuenta), y trámites sin ningún documento marcado (con tarjeta: «Tarjeta sin tipo registrado»;
    sin tarjeta: «Sin expedición»). En el formato anterior (renglones agrupados con conteos) no cambia nada."""
    docs = [c for c in t.columns if c.startswith(DOC)]
    sin = next((c for c in docs if c.startswith("SIN EXPEDICION")), None)
    X = t[docs].apply(pd.to_numeric, errors="coerce").fillna(0)
    if X.values.max(initial=0) > 1:                          # formato agrupado (conteos): se usa tal cual
        t[docs] = X
        return t, docs
    con = t["TIPO DE CONCLUSION"].map(norm).str.startswith("CON EXPEDICION") if "TIPO DE CONCLUSION" in t.columns else pd.Series(False, index=t.index)
    tarj = X[[c for c in docs if c.startswith("TARJETA")]].sum(axis=1) > 0
    if sin:
        doble = con & tarj & (X[sin] > 0)
        if doble.any():
            avisar("Trámites", f"{int(doble.sum()):,} trámites con tarjeta marcan también «Sin expedición de documento»; se cuentan solo con su tarjeta.")
            X.loc[doble, sin] = 0
    vacio = X.sum(axis=1) == 0
    X[SIN_TIPO] = 0
    if vacio.any():
        a, b = int((vacio & con).sum()), int((vacio & ~con).sum())
        avisar("Trámites", f"{int(vacio.sum()):,} trámites no marcan ningún documento: {a:,} terminaron con tarjeta (se cuentan como «Tarjeta sin tipo registrado») y {b:,} sin tarjeta (se cuentan como «Sin expedición»).")
        X.loc[vacio & con, SIN_TIPO] = 1
        if sin:
            X.loc[vacio & ~con, sin] = 1
    res = next((c for c in t.columns if c.startswith("TIPO DE RESOLUCION")), None)
    if res is not None:                                       # concluidos que la base aún marca «en proceso» o «cancelado»
        r = t[res].map(norm)
        ep, ca = r.str.startswith("EN PROCESO"), r.str.startswith("CANCELAD")
        if ep.any() or ca.any():
            avisar("Trámites", f"Entre los trámites concluidos, «Tipo de resolución» dice {int(ep.sum()):,} «En proceso» y {int(ca.sum()):,} «Cancelados»; "
                   f"{int((ep & con).sum()):,} de los «En proceso» ya dicen «Con expedición de tarjeta». Se cuentan por «Tipo de conclusión»; confirmar con el área.")
    mult = X.sum(axis=1) > 1
    if mult.any():
        avisar("Trámites", f"{int(mult.sum()):,} trámites marcan más de un documento; cuentan una vez por documento.")
    for c in X.columns:
        t[c] = X[c]
    return t, docs + [SIN_TIPO]


# ==== [4] AVISOS ==================================================
def avisos_de(base):
    return AVISOS.get(base, [])


def guardar(destino, robot):
    """Escribe las observaciones de este robot en datos/observaciones.js (cada robot reemplaza solo las suyas).
    La sección Bases de la página las muestra junto a cada base."""
    import json
    ruta = os.path.join(destino, "observaciones.js")
    todo = {}
    if os.path.exists(ruta):
        txt = open(ruta, encoding="utf-8").read()
        try:
            todo = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
        except ValueError:
            todo = {}
    todo[robot] = AVISOS
    os.makedirs(destino, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("// Observaciones de cada base, por robot. Lo escribe robot/lector.py · no editar a mano\n")
        f.write("window.IANAMI_OBS=" + json.dumps(todo, ensure_ascii=False, separators=(",", ":")) + ";\n")
