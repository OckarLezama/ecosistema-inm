# -*- coding: utf-8 -*-
"""
IA-NAMI · CONVERTIDOR DE BASES
==============================
Lee los archivos .xlsx de la carpeta DATA y genera los archivos ligeros
que usa la página:

    datos/datos.js      resumen de todas las bases (lo lee js/app.js)
    datos/reporte.txt   revisión de cada base: días faltantes, nombres
                        no reconocidos y renglones que no cuadran

Uso (desde la raíz del repositorio):

    python robot/convertir.py
    python robot/convertir.py --origen DATA --destino datos

Requiere: pandas, numpy, openpyxl.

Reglas
  · Cada base se reconoce por sus columnas, no por el nombre del archivo.
  · Se lee solo la primera hoja visible de cada archivo.
  · Los nombres de columnas, estados y nacionalidades se comparan sin
    acentos, sin mayúsculas y sin espacios sobrantes.
  · La fecha de nacimiento de NNA se convierte a grupo de edad y nunca
    se escribe en los archivos generados.
  · El periodo se toma de las fechas que traen las bases.

ÍNDICE
  [1] UTILIDADES            normalización de textos
  [2] LECTURA               primera hoja visible, encabezados
  [3] RECONOCIMIENTO        qué base es cada archivo
  [4] CATÁLOGOS             estado y nacionalidad a índice
  [5] CARGA DE BASES        una función por base
  [6] CUBO Y SERIES         semana × estado × nacionalidad, series diarias
  [7] COMPOSICIONES         desgloses propios de cada base
  [8] PUNTOS                internación, repatriación y estaciones
  [9] DOCUMENTOS VIGENTES
  [10] ENCUENTROS CBP
  [11] REPORTE Y SALIDA
"""
import argparse
import datetime as dt
import glob
import json
import os
import subprocess
import sys
import unicodedata
import warnings

import numpy as np
import openpyxl
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogos as C  # noqa: E402

warnings.filterwarnings("ignore")


# ==== [1] UTILIDADES ==============================================
def norm(texto):
    """Mayúsculas, sin acentos y con espacios simples."""
    t = unicodedata.normalize("NFD", str(texto).upper())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    return " ".join(t.split())


def entero(serie):
    return pd.to_numeric(serie, errors="coerce").fillna(0).astype(np.int64)


def fecha(serie):
    """Acepta fechas de Excel y textos día/mes/año."""
    return pd.to_datetime(serie, errors="coerce", dayfirst=True).dt.normalize()


# ==== [2] LECTURA =================================================
def leer_hoja(ruta):
    """Devuelve la primera hoja visible como tabla, con encabezados normalizados."""
    libro = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    visibles = [h.title for h in libro.worksheets if h.sheet_state == "visible"]
    ocultas = [h.title for h in libro.worksheets if h.sheet_state != "visible"]
    libro.close()
    tabla = pd.read_excel(ruta, sheet_name=visibles[0], header=None)
    return tabla, ocultas


def con_encabezado(tabla):
    t = tabla.iloc[1:].copy()
    t.columns = [norm(c) for c in tabla.iloc[0].tolist()]
    return t.reset_index(drop=True)


def fecha_de_carga(ruta):
    """Fecha del último cambio del archivo en el repositorio (o en disco)."""
    try:
        r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", os.path.basename(ruta)],
                           cwd=os.path.dirname(ruta), capture_output=True, text=True, timeout=20)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    return dt.date.fromtimestamp(os.path.getmtime(ruta)).isoformat()


# ==== [3] RECONOCIMIENTO ==========================================
# (clave, columnas que debe tener, columnas que no debe tener)
FIRMAS = [
    ("cbp",        {"AGENCIA", "LOCATION"}, set()),
    ("tram",       {"TIPO DE TRAMITE", "PAIS / EMPLEADOR"}, set()),
    ("resc",       {"1RA VEZ", "REINCIDENTES"}, set()),
    ("can_nna",    {"FECHA DE NACIMIENTO", "CLASIFICACION"}, set()),
    ("can_ad",     {"SEXO", "MOTIVO DE SALIDA"}, {"FECHA DE NACIMIENTO"}),
    ("seg",        {"DETERMINACION", "PUNTO DE INTERNACION"}, set()),
    ("ing",        {"PUNTO DE INTERNACION", "TIPO", "TOTAL"}, {"DETERMINACION"}),
    ("pres",       {"PRESENTADOS", "ESTACION O ESTANCIA MIGRATORIA"}, set()),
    ("ret",        {"RETORNADOS A SU PAIS"}, set()),
    ("recib",      {"EXTRANJEROS RECIBIDOS DE EE.UU."}, set()),
    ("rep",        {"MEXICANOS REPATRIADOS"}, set()),
    ("docs_cruce", {"OTROS PAISES"}, set()),
    ("docs_est",   {"O.R.", "TOTAL GENERAL"}, set()),
    ("docs_nat",   {"NACIONALIDAD", "TOTAL GENERAL"}, set()),
]
NOMBRES = {"ing": "Ingresos", "seg": "Segunda revisión", "tram": "Trámites", "resc": "Rescates",
           "pres": "Presentados", "can_nna": "Canalizados NNA", "can_ad": "Canalizados adultos",
           "ret": "Retornados", "recib": "Recibidos de EE. UU.", "rep": "Repatriados",
           "cbp": "Encuentros CBP", "docs_est": "Documentos vigentes por estado",
           "docs_nat": "Documentos vigentes por país", "docs_cruce": "Documentos vigentes estado × país"}


def reconocer(tabla):
    columnas = {norm(c) for c in tabla.iloc[0].tolist()}
    for clave, pide, excluye in FIRMAS:
        if pide <= columnas and not (excluye & columnas):
            return clave
    return None


# ==== [4] CATÁLOGOS ===============================================
NAT = C.NACIONALIDADES
OTRAS, MEXICO = len(NAT), len(NAT) + 1
_nat = {n[0]: i for i, n in enumerate(NAT)}
_nat.update({a: _nat[b] for a, b in C.ALIAS_NACIONALIDAD.items() if b in _nat})
_est = {norm(e): i for i, e in enumerate(C.ESTADOS)}
_est.update({a: _est[b] for a, b in C.ALIAS_ESTADO.items()})


def idx_nat(valor):
    k = norm(valor)
    if k in ("MEXICO", "MEXICANA", "ESTADOS UNIDOS MEXICANOS"):
        return MEXICO
    return _nat.get(k, OTRAS)


def idx_est(valor):
    return _est.get(norm(valor), -1)


# ==== [5] CARGA DE BASES ==========================================
AVISOS = {}          # clave de la base → lista de observaciones para el reporte


def avisar(clave, texto):
    AVISOS.setdefault(clave, []).append(texto)


def preparar(clave, t, col_nat="NACIONALIDAD"):
    """Columnas comunes: DIA (fecha), s (estado), n (nacionalidad)."""
    t["DIA"] = fecha(t["DIA"])
    sin_fecha = int(t["DIA"].isna().sum())
    if sin_fecha:
        avisar(clave, f"{sin_fecha:,} renglones sin fecha válida (no se cuentan)")
    t["s"] = t["O.R."].map(idx_est)
    malos = t.loc[t["s"] < 0, "O.R."].astype(str).str.strip().value_counts()
    if len(malos):
        avisar(clave, f"{int(malos.sum()):,} renglones con O.R. no reconocida (no se cuentan): " + ", ".join(malos.index[:6]))
    t["n"] = t[col_nat].map(idx_nat) if col_nat else MEXICO
    return t[t["DIA"].notna() & (t["s"] >= 0)].copy()


def cargar_ing(t):
    t = preparar("ing", t)
    t["v"] = entero(t["TOTAL"])
    t["via"] = t["TIPO"].map(lambda x: {"AER": 0, "TER": 1, "MAR": 2}.get(norm(x)[:3], 0))
    t["punto"] = t["PUNTO DE INTERNACION"].map(norm)
    return t


def cargar_seg(t):
    t = preparar("seg", t)
    t["v"] = entero(t["TOTAL"])
    t["det"] = t["DETERMINACION"].map(lambda x: 1 if norm(x).startswith("RECH") else 0)
    t["punto"] = t["PUNTO DE INTERNACION"].map(norm)
    return t


def cargar_tram(t):
    """Un renglón puede traer varios documentos: se suman las columnas de documento."""
    columnas = list(t.columns)
    docs = columnas[columnas.index("RANGOS DE EDAD") + 1:]
    t["PAIS / EMPLEADOR"] = t["PAIS / EMPLEADOR"].fillna("SIN DATO")
    t = preparar("tram", t, "PAIS / EMPLEADOR")
    t["v"] = t[docs].apply(entero).sum(axis=1)
    t["sexo"] = t["SEXO"].map(lambda x: {"HOMBRE": 0, "MUJER": 1}.get(norm(x), -1))
    edades = {"00": 0, "12": 1, "18": 2, "25": 3, "35": 4, "45": 5, "55": 6, "65": 7}
    t["edad"] = t["RANGOS DE EDAD"].map(lambda x: edades.get(str(x).strip()[:2], -1))
    t["res"] = t["TIPO DE RESOLUCION ESPECIFICA"].map(lambda x: {"POSITIVOS": 0, "NEGATIVOS": 1}.get(norm(x), 2))
    empleador = int((t["PAIS / EMPLEADOR"].map(norm) == "EMPLEADOR").sum())
    if empleador:
        avisar("tram", f"{empleador:,} renglones son de empleadores, no de personas (se cuentan en el total, sin nacionalidad)")
    return t


def cargar_resc(t):
    t = preparar("resc", t)
    for c in ("TOTAL", "1RA VEZ", "REINCIDENTES", "PRESENTADOS EN ESTACIONES MIGRATORIAS", "CANALIZADOS AL DIF"):
        t[c] = entero(t[c])
    t["v"] = t["TOTAL"]
    no_cuadra = int((t["TOTAL"] != t["1RA VEZ"] + t["REINCIDENTES"]).sum())
    if no_cuadra:
        avisar("resc", f"{no_cuadra:,} renglones donde TOTAL no es 1RA VEZ + REINCIDENTES")
    repetidos = int(t.duplicated(["DIA", "O.R.", "NACIONALIDAD"]).sum())
    if repetidos:
        avisar("resc", f"{repetidos:,} renglones repetidos (mismo día, O.R. y nacionalidad)")
    sin_destino = int((t["TOTAL"] - t["PRESENTADOS EN ESTACIONES MIGRATORIAS"] - t["CANALIZADOS AL DIF"]).clip(lower=0).sum())
    if sin_destino:
        avisar("resc", f"{sin_destino:,} rescatados sin destino registrado (ni estación ni DIF)")
    return t


def cargar_pres(t):
    t = preparar("pres", t)
    t["v"] = entero(t["PRESENTADOS"])
    t["estacion"] = t["ESTACION O ESTANCIA MIGRATORIA"].astype(str).str.strip()
    return t


def cargar_can_nna(t):
    """Cada renglón es una persona. La fecha de nacimiento solo se usa para el grupo de edad."""
    t = preparar("can_nna", t)
    t["v"] = 1
    nacimiento = fecha(t["FECHA DE NACIMIENTO"])
    sin_edad = int(nacimiento.isna().sum())
    if sin_edad:
        avisar("can_nna", f"{sin_edad:,} renglones sin fecha de nacimiento (se cuentan en el grupo 12 a 17)")
    anios = (t["DIA"] - nacimiento).dt.days / 365.25
    sexo = t["SEXO"].map(lambda x: 1 if norm(x).startswith("MUJ") else 0)
    grupo = np.where(anios < 12, 0, 1)
    clase = t["CLASIFICACION"].map(lambda x: {"ACOMPANADO": 0, "NO ACOMPANADO": 1, "SEPARADO": 2}.get(norm(x), 0))
    t["cat"] = (sexo * 6 + grupo * 3 + clase).astype(int)      # 12 categorías: sexo × edad × condición
    return t.drop(columns=["FECHA DE NACIMIENTO"])


def cargar_can_ad(t):
    t = preparar("can_ad", t)
    t["v"] = 1
    t["cat"] = t["SEXO"].map(lambda x: 1 if norm(x).startswith("MUJ") else 0)
    return t


def cargar_ret(t):
    t = preparar("ret", t)
    for c in ("RETORNADOS A SU PAIS", "DEPORTADOS", "RETORNOS ASISTIDOS"):
        t[c] = entero(t[c])
    t["v"] = t["RETORNADOS A SU PAIS"]
    return t


def cargar_recib(t):
    t = preparar("recib", t)
    for c in ("EXTRANJEROS RECIBIDOS DE EE.UU.", "ADULTOS", "MENORES"):
        t[c] = entero(t[c])
    t["v"] = t["EXTRANJEROS RECIBIDOS DE EE.UU."]
    return t


def cargar_rep(t):
    t = preparar("rep", t, None)
    for c in t.columns[4:13]:
        t[c] = entero(t[c])
    t["v"] = t["MEXICANOS REPATRIADOS"]
    t["punto"] = t["PUNTO_REPATRIACION"].map(norm)
    t["aereo"] = t["MODALIDAD"].map(lambda x: 1 if norm(x).startswith("AER") else 0)
    return t


CARGAR = {"ing": cargar_ing, "seg": cargar_seg, "tram": cargar_tram, "resc": cargar_resc, "pres": cargar_pres,
          "can_nna": cargar_can_nna, "can_ad": cargar_can_ad, "ret": cargar_ret, "recib": cargar_recib, "rep": cargar_rep}


# ==== [6] CUBO Y SERIES ===========================================
def semanas(dias):
    """Cortes de semanas de 7 días desde el inicio; un sobrante de 1 a 3 días se une a la última."""
    cortes = list(range(7, dias + 1, 7))
    if not cortes:
        return [dias]
    if cortes[-1] != dias:
        if dias - cortes[-1] <= 3:
            cortes[-1] = dias
        else:
            cortes.append(dias)
    return cortes


def resumir(t, inicio, dias, cortes):
    """Cubo semanal estado × nacionalidad y series diarias (total, por estado, por nacionalidad)."""
    d = (t["DIA"] - inicio).dt.days.values
    s, n, v = t["s"].values, np.asarray(t["n"]), t["v"].values
    w = np.searchsorted(cortes, d + 1)
    por_estado = np.zeros((dias, len(C.ESTADOS)), dtype=np.int64)
    por_nat = np.zeros((dias, len(NAT) + 2), dtype=np.int64)
    np.add.at(por_estado, (d, s), v)
    np.add.at(por_nat, (d, n), v)
    cubo = pd.DataFrame({"w": w, "s": s, "n": n, "v": v}).groupby(["w", "s", "n"]).v.sum().reset_index()
    cubo = cubo[cubo.v > 0]
    return {"cube": [int(x) for x in cubo.values.flatten()],
            "daily": [int(x) for x in por_estado.sum(axis=1)],
            "ds": [int(x) for x in por_estado.flatten()],
            "dn": [int(x) for x in por_nat.flatten()]}


# ==== [7] COMPOSICIONES ===========================================
def composicion(t, categoria, valor):
    """Lista [estado, nacionalidad, categoría, valor, ...] para los desgloses."""
    o = pd.DataFrame({"s": t["s"].values, "n": np.asarray(t["n"]), "c": np.asarray(categoria), "v": np.asarray(valor)})
    o = o[o.c >= 0].groupby(["s", "n", "c"]).v.sum().reset_index()
    return [int(x) for x in o[o.v > 0].values.flatten()]


def apilar(t, columnas):
    """Convierte varias columnas de conteo en renglones (categoría, valor)."""
    return pd.concat([t.assign(c=i, v=t[c]) for i, c in enumerate(columnas)])


def composiciones(B):
    o = {}
    ing, seg, tram, resc, pres, ret, recib, rep = (B[k] for k in ("ing", "seg", "tram", "resc", "pres", "ret", "recib", "rep"))
    o["ing_via"] = composicion(ing, ing["via"], ing["v"])
    o["rech_det"] = composicion(seg, seg["det"], seg["v"])
    con_edad = tram[(tram["sexo"] >= 0) & (tram["edad"] >= 0)]
    o["tram_se"] = composicion(con_edad, con_edad["sexo"] * 8 + con_edad["edad"], con_edad["v"])
    o["tram_res"] = composicion(tram, tram["res"], tram["v"])
    a = apilar(resc, ["1RA VEZ", "REINCIDENTES"])
    o["resc_rei"] = composicion(a, a["c"], a["v"])
    sd = resc.assign(SIN=(resc["TOTAL"] - resc["PRESENTADOS EN ESTACIONES MIGRATORIAS"] - resc["CANALIZADOS AL DIF"]).clip(lower=0))
    a = apilar(sd, ["PRESENTADOS EN ESTACIONES MIGRATORIAS", "CANALIZADOS AL DIF", "SIN"])
    o["resc_des"] = composicion(a, a["c"], a["v"])
    estaciones = list(pres.groupby("estacion").v.sum().sort_values(ascending=False).index)
    o["pres_est"] = composicion(pres, pres["estacion"].map({e: i for i, e in enumerate(estaciones)}), pres["v"])
    o["can_nna"] = composicion(B["can_nna"], B["can_nna"]["cat"], B["can_nna"]["v"])
    o["can_ad"] = composicion(B["can_ad"], B["can_ad"]["cat"], B["can_ad"]["v"])
    a = apilar(ret, ["DEPORTADOS", "RETORNOS ASISTIDOS"])
    o["ret_tipo"] = composicion(a, a["c"], a["v"])
    a = apilar(recib, ["ADULTOS", "MENORES"])
    o["recib_edad"] = composicion(a, a["c"], a["v"])
    a = pd.concat([apilar(rep, ["ADULTOS HOMBRES", "ADULTOS MUJERES", "MENORES HOMBRES", "MENORES MUJERES", "ACOMPANADOS", "NO_ACOMPANADOS"]),
                   rep.assign(c=6 + rep["aereo"], v=rep["v"])])
    o["rep_comp"] = composicion(a, a["c"], a["v"])
    return o, [abreviar(e) for e in estaciones]


def abreviar(nombre):
    return nombre.replace("Estación Migratoria ", "EM ").replace("Estancia Provisional ", "EP ")


# ==== [8] PUNTOS ==================================================
def por_semana(t, inicio, cortes):
    w = np.searchsorted(cortes, (t["DIA"] - inicio).dt.days.values + 1)
    return [int(x) for x in pd.Series(t["v"].values).groupby(w).sum().reindex(range(len(cortes)), fill_value=0).values]


def puntos(B, inicio, cortes):
    ing, seg, rep, pres = B["ing"], B["seg"], B["rep"], B["pres"]
    rech = seg.groupby(["punto", "det"]).v.sum().unstack(fill_value=0)
    salida, con_coord = [], 0
    for nombre, (corto, lon, lat) in C.PUNTOS_INTERNACION.items():
        d = ing[ing["punto"] == norm(nombre)]
        if not len(d):
            continue
        con_coord += int(d.v.sum())
        extranjeros = d[d["n"] != MEXICO]
        top = extranjeros.groupby(extranjeros["NACIONALIDAD"].astype(str).str.strip()).v.sum().sort_values(ascending=False).head(5)
        r = rech.loc[norm(nombre)] if norm(nombre) in rech.index else None
        salida.append({"n": corto, "t": int(d.groupby("via").v.sum().idxmax()), "s": int(d["s"].iloc[0]), "x": lon, "y": lat,
                       "wk": por_semana(d, inicio, cortes), "mx": int(d[d["n"] == MEXICO].v.sum()),
                       "top": [[idx_nat(a) if idx_nat(a) != OTRAS else a.title(), int(b)] for a, b in top.items()],
                       "rech": int(r.get(1, 0)) if r is not None else 0, "seg": int(r.sum()) if r is not None else 0})
    total = int(ing.v.sum())
    avisar("ing", f"{len(salida)} de {ing['punto'].nunique()} puntos de internación tienen coordenadas en el catálogo "
                  f"({con_coord / max(total, 1) * 100:.0f}% de los ingresos); el resto no aparece como punto en el mapa")
    repat = []
    for nombre, (corto, lon, lat) in C.PUNTOS_REPATRIACION.items():
        d = rep[rep["punto"] == norm(nombre)]
        if not len(d):
            continue
        repat.append({"n": corto, "s": int(d["s"].iloc[0]), "x": lon, "y": lat, "wk": por_semana(d, inicio, cortes),
                      "men": int(d["TOTAL MENORES"].sum()), "na": int(d["NO_ACOMPANADOS"].sum()),
                      "muj": int(d["ADULTOS MUJERES"].sum() + d["MENORES MUJERES"].sum())})
    faltan = sorted(set(rep["PUNTO_REPATRIACION"].astype(str).str.strip()) - {k for k in C.PUNTOS_REPATRIACION if norm(k) in set(rep["punto"])})
    faltan = [f for f in faltan if norm(f) not in {norm(k) for k in C.PUNTOS_REPATRIACION}]
    if faltan:
        avisar("rep", "Puntos de repatriación sin coordenadas: " + ", ".join(faltan[:8]))
    estaciones = []
    for nombre, (lon, lat) in C.ESTACIONES.items():
        d = pres[pres["estacion"].map(norm) == norm(nombre)]
        if len(d):
            estaciones.append({"n": abreviar(nombre), "s": int(d["s"].iloc[0]), "x": lon, "y": lat, "wk": por_semana(d, inicio, cortes)})
    return salida, repat, estaciones


# ==== [9] DOCUMENTOS VIGENTES =====================================
def documentos(tablas, cargas):
    """Fotografía semanal: total, sexo, tipo de documento, por estado y por nacionalidad."""
    if "docs_est" not in tablas or "docs_nat" not in tablas:
        return None
    e, p = tablas["docs_est"], tablas["docs_nat"]
    # Encabezado de dos renglones: tipo de documento arriba; Hombre, Mujer, Total abajo
    tipos = []
    for col in range(4, e.shape[1], 3):
        nombre = " ".join(str(e.iat[0, col]).split())
        if nombre and nombre != "nan":
            tipos.append((col, nombre))
    cuerpo = e.iloc[2:]
    filas = cuerpo[cuerpo[0].map(idx_est) >= 0]
    por_estado = [0] * len(C.ESTADOS)
    for _, r in filas.iterrows():
        por_estado[idx_est(r[0])] = int(r[3])
    total_h, total_m = int(entero(filas[1]).sum()), int(entero(filas[2]).sum())
    lista = sorted(((corto_doc(n), int(entero(filas[c + 2]).sum())) for c, n in tipos), key=lambda x: -x[1])
    por_nat = {}
    for _, r in p.iloc[2:].iterrows():
        k = norm(r[0])
        k = C.ALIAS_NACIONALIDAD.get(k, k)
        if k in _nat and pd.notna(pd.to_numeric(r[3], errors="coerce")):
            por_nat[_nat[k]] = [int(r[3]), int(r[1]), int(r[2])]
    return {"total": total_h + total_m, "h": total_h, "m": total_m, "tipos": [list(x) for x in lista],
            "est": por_estado, "nat": por_nat, "corte": max(cargas.get("docs_est", ""), cargas.get("docs_nat", ""))}


def corto_doc(nombre):
    n = norm(nombre).replace("TARJETA DE ", "").replace("RESIDENTE ", "").replace("VISITANTE ", "")
    cortos = {"PERMANENTE": "Permanente", "REGIONAL": "Regional", "TEMPORAL": "Temporal", "TEMPORAL ESTUDIANTE": "Estudiante",
              "POR RAZONES HUMANITARIAS": "Humanitaria", "TRABAJADOR FRONTERIZO": "Trabajador fronterizo",
              "CON FINES DE ADOPCION": "Adopción"}
    return cortos.get(n, n.capitalize())


# ==== [10] ENCUENTROS CBP =========================================
def encuentros(tabla, inicio, dias, cortes):
    """Encuentros de la CBP por sector fronterizo: total, mexicanos, extranjeros, agencia y nacionalidades."""
    original = {norm(c): " ".join(str(c).split()) for c in tabla.iloc[0].tolist()}
    t = con_encabezado(tabla)
    t["DIA"] = fecha(t["DIA"])
    fijas = ["DIA", "AGENCIA", "LOCATION", "CIUDAD EEUU", "CIUDAD MX", "TOTAL", "MEXICO", "EXTRANJEROS"]
    paises = [c for c in t.columns if c not in fijas and c != "OTROS"]
    for c in t.columns[5:]:
        t[c] = entero(t[c])
    d = (t["DIA"] - inicio).dt.days
    t = t[t["DIA"].notna() & (d >= 0) & (d < dias)].copy()
    t["v"] = t["TOTAL"]
    t["sector"] = t["LOCATION"].map(norm)
    agencias = ["USBP", "OFO", "CBP ONE"]
    sectores, por_estado = [], {}
    for clave, (lon, lat) in C.SECTORES_CBP.items():
        s = t[t["sector"] == clave]
        if not len(s):
            continue
        top = s[paises].sum().sort_values(ascending=False).head(5)
        estado_eu = str(s["CIUDAD EEUU"].iloc[0]).strip()
        por_estado[estado_eu] = por_estado.get(estado_eu, 0) + int(s["v"].sum())
        sectores.append({"n": str(s["LOCATION"].iloc[0]).strip(), "eu": estado_eu, "mx": idx_est(s["CIUDAD MX"].iloc[0]),
                         "x": lon, "y": lat, "wk": por_semana(s, inicio, cortes), "tot": int(s["v"].sum()),
                         "mex": int(s["MEXICO"].sum()), "ext": int(s["EXTRANJEROS"].sum()),
                         "ag": [int(s.loc[s["AGENCIA"].map(norm) == a, "v"].sum()) for a in agencias],
                         "top": [[NAT[idx_nat(k)][1] if idx_nat(k) < OTRAS else original.get(k, k.title()), int(v)] for k, v in top.items() if v > 0]})
    sin_coord = sorted(set(t["sector"]) - set(C.SECTORES_CBP))
    if sin_coord:
        avisar("cbp", "Sectores sin coordenadas en el catálogo: " + ", ".join(sin_coord))
    return t, {"total": int(t["v"].sum()), "mex": int(t["MEXICO"].sum()), "ext": int(t["EXTRANJEROS"].sum()),
               "sectores": sectores, "estados": por_estado}


# ==== [11] REPORTE Y SALIDA =======================================
def dias_faltantes(t, inicio, fin):
    todos = pd.date_range(inicio, fin)
    return [x.date().isoformat() for x in todos.difference(pd.DatetimeIndex(t["DIA"].unique()))]


def main():
    ap = argparse.ArgumentParser(description="Convierte las bases de DATA en los archivos de la página.")
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()

    # -- Leer y reconocer cada archivo
    tablas, archivos, cargas, ocultas = {}, {}, {}, {}
    sin_reconocer = []
    for ruta in sorted(glob.glob(os.path.join(a.origen, "*.xlsx"))):
        if os.path.basename(ruta).startswith("~$"):
            continue
        tabla, oc = leer_hoja(ruta)
        clave = reconocer(tabla)
        if not clave:
            sin_reconocer.append(os.path.basename(ruta))
            continue
        if clave in tablas:
            sys.exit(f"Hay dos archivos de la misma base ({NOMBRES[clave]}): {archivos[clave]} y {os.path.basename(ruta)}")
        tablas[clave], archivos[clave], cargas[clave], ocultas[clave] = tabla, os.path.basename(ruta), fecha_de_carga(ruta), oc
    faltan = [NOMBRES[k] for k in CARGAR if k not in tablas]
    if faltan:
        sys.exit("Faltan bases en " + a.origen + ": " + ", ".join(faltan))

    # -- Cargar y fijar el periodo con las fechas de las bases
    B = {k: CARGAR[k](con_encabezado(tablas[k])) for k in CARGAR}
    inicio = min(t["DIA"].min() for t in B.values())          # el periodo lo fijan las bases del INM, no la de la CBP
    fin = max(t["DIA"].max() for t in B.values())
    dias = (fin - inicio).days + 1
    cortes = semanas(dias)

    # -- Indicadores de la página
    rech = B["seg"][B["seg"]["det"] == 1]
    can = pd.concat([B["can_nna"][["DIA", "s", "n", "v"]], B["can_ad"][["DIA", "s", "n", "v"]]])
    indicadores = {"ing": B["ing"], "rech": rech, "tram": B["tram"], "resc": B["resc"], "pres": B["pres"],
                   "can": can, "ret": B["ret"], "recib": B["recib"], "rep": B["rep"]}
    salida = {"inicio": inicio.date().isoformat(), "corte": fin.date().isoformat(), "dias": dias,
              "generado": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
              "nats": [[n[1], n[2]] for n in NAT] + [["Otras", 0], ["México", 484]],
              "ests": C.ESTADOS, "ends": cortes, "cube": {}, "daily": {}, "ds": {}, "dn": {}}
    for k, t in indicadores.items():
        r = resumir(t, inicio, dias, cortes)
        for parte in ("cube", "daily", "ds", "dn"):
            salida[parte][k] = r[parte]
    salida["comp"], salida["estaciones"] = composiciones(B)
    salida["puntos"], salida["repPuntos"], salida["emPuntos"] = puntos(B, inicio, cortes)
    salida["docs"] = documentos(tablas, cargas)
    salida["cbp"] = None
    if "cbp" in tablas:
        B["cbp"], salida["cbp"] = encuentros(tablas["cbp"], inicio, dias, cortes)

    # -- Estado de cada base (para la sección Bases y el reporte)
    salida["bases"] = []
    lineas = ["IA-NAMI · REPORTE DE CONVERSIÓN", f"Generado: {salida['generado']}",
              f"Periodo de las bases: {salida['inicio']} a {salida['corte']} ({dias} días)", ""]
    for k in list(CARGAR) + ["docs_est", "docs_nat", "docs_cruce", "cbp"]:
        if k not in tablas:
            continue
        info = {"k": k, "n": NOMBRES[k], "archivo": archivos[k], "cargado": cargas[k]}
        lineas.append(f"== {NOMBRES[k]}  ·  {archivos[k]}  ·  cargado {cargas[k]}")
        if k in B:
            t = B[k]
            falt = dias_faltantes(t, inicio, fin)
            otras = int(t.loc[t["n"] == OTRAS, "v"].sum()) if "n" in t.columns else 0
            info.update({"filas": int(len(t)), "total": int(t["v"].sum()), "desde": t["DIA"].min().date().isoformat(),
                         "hasta": t["DIA"].max().date().isoformat(), "faltan": len(falt)})
            lineas.append(f"   {len(t):,} renglones · total {int(t['v'].sum()):,} · del {info['desde']} al {info['hasta']}")
            lineas.append(f"   Días sin datos: {len(falt)}" + (" → " + ", ".join(falt[:14]) + (" …" if len(falt) > 14 else "") if falt else ""))
            if k not in ("rep", "cbp"):
                lineas.append(f"   En «Otras» nacionalidades: {otras:,} ({otras / max(int(t['v'].sum()), 1) * 100:.1f}%)")
        if ocultas.get(k):
            avisar(k, "El archivo trae hojas ocultas que no se leen: " + ", ".join(ocultas[k]))
        for x in AVISOS.get(k, []):
            lineas.append("   · " + x)
        info["avisos"] = len(AVISOS.get(k, []))
        salida["bases"].append(info)
        lineas.append("")
    if sin_reconocer:
        lineas.append("Archivos que no se reconocieron: " + ", ".join(sin_reconocer))

    os.makedirs(a.destino, exist_ok=True)
    texto = json.dumps(salida, separators=(",", ":"), ensure_ascii=False)
    with open(os.path.join(a.destino, "datos.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_DATOS=" + texto + ";\n")
    with open(os.path.join(a.destino, "reporte.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")
    print("\n".join(lineas))
    print(f"datos.js: {len(texto.encode('utf-8')) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
