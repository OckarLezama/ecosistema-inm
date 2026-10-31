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
  · Una base puede venir en varias hojas o en varios archivos (por año,
    semana o día): se juntan con robot/lector.py, que también corrige
    encabezados mal escritos, resuelve días repetidos y recorta al 1 oct 2024.
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
  [10] ENCUENTROS CBP Y CARAVANAS
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
import lector  # noqa: E402
import revisiones  # noqa: E402

warnings.filterwarnings("ignore")
TIPOS_TRAM = []


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
    ("car",        {"NOMBRE", "INICIO", "LUGAR DE SALIDA", "PERSONAS"}, set()),
    ("tram",       {"TIPO DE TRAMITE", "PAIS / EMPLEADOR"}, set()),
    ("resc",       {"1RA VEZ", "REINCIDENTES"}, set()),
    ("can_nna",    {"FECHA DE NACIMIENTO", "CLASIFICACION"}, set()),
    ("can_ad",     {"SEXO", "MOTIVO DE SALIDA"}, {"FECHA DE NACIMIENTO"}),
    ("seg",        {"DETERMINACION", "PUNTO DE INTERNACION"}, set()),
    ("ing",        {"PUNTO DE INTERNACION", "TIPO", "TOTAL"}, {"DETERMINACION"}),
    ("pres",       {"PRESENTADOS", "ESTACION O ESTANCIA MIGRATORIA"}, set()),
    ("ret",        {"RETORNADOS A SU PAIS"}, set()),
    ("recib",      {"EXTRANJEROS RECIBIDOS DE EE.UU."}, set()),
    ("rep",        {"MEXICANOS REPATRIADOS", "PUNTO_REPATRIACION"}, set()),
    ("rep_com",    {"MEXICANOS REPATRIADOS", "PUNTO INTERNACION"}, {"PAIS"}),
    ("rep_gh",     {"MEXICANOS REPATRIADOS", "PUNTO INTERNACION", "PAIS"}, set()),
    ("docs_cruce", {"OTROS PAISES"}, set()),
    ("docs_est",   {"O.R.", "TOTAL GENERAL"}, set()),
    ("docs_nat",   {"NACIONALIDAD", "TOTAL GENERAL"}, set()),
]
NOMBRES = {"ing": "Ingresos", "seg": "Segunda revisión", "tram": "Trámites", "resc": "Rescates",
           "pres": "Presentados", "can_nna": "Canalizados NNA", "can_ad": "Canalizados adultos",
           "ret": "Retornados", "recib": "Recibidos de EE. UU.", "rep": "Repatriados",
           "cbp": "Encuentros CBP", "car": "Caravanas", "docs_est": "Documentos vigentes por estado",
           "docs_nat": "Documentos vigentes por país", "docs_cruce": "Documentos vigentes estado × país",
           "rep_com": "Repatriados en vuelos comerciales", "rep_gh": "Repatriados desde Guatemala y Honduras"}
# Bases reconocidas que todavía no entran al tablero (el área está corrigiendo el archivo)
# Bases que no entran al Pulso: se leen en robot/proteccion.py y se muestran en su propia pestaña (vuelos comerciales se suma aparte; Guatemala-Honduras ya está en Repatriados como Ciudad Hidalgo)
PENDIENTES = {"rep_com": "Se muestra en Protección al migrante › Vuelos comerciales. No está en el archivo de Repatriados: se suma aparte.",
              "rep_gh": "Mexicanos que EE. UU. envió a Guatemala u Honduras; se muestra en Protección al migrante › Guatemala y Honduras. Coincide día por día con el punto Ciudad Hidalgo de Repatriados: es el mismo flujo y no se suma otra vez."}
INDEPENDIENTES = {"rep_com", "rep_gh"}


# Una hoja es base si sus encabezados se reconocen (las hojas de apoyo, tablas dinámicas o formatos largos se saltan)
ACEPTA = lambda fila: reconocer(None, set(lector.encabezados(fila))) is not None


def reconocer(tabla, columnas=None):
    columnas = columnas if columnas is not None else {norm(c) for c in tabla.iloc[0].tolist()}
    for clave, pide, excluye in FIRMAS:
        if pide <= columnas and not (excluye & columnas):
            return clave
    return None


# ==== [4] CATÁLOGOS ===============================================
# Las nacionalidades se arman con las que traen las bases: una por código ISO, con su región.
# Lo que no tiene código (empleadores, apátridas, nombres nuevos) se suma en «Otras».
NAT, OTRAS, MEXICO, _iso = [], 0, 1, {}
_est = {norm(e): i for i, e in enumerate(C.ESTADOS)}
_est.update({a: _est[b] for a, b in C.ALIAS_ESTADO.items()})
PARTICULAS = {"De", "Del", "La", "Las", "Los", "Y", "E"}


def clave_nat(valor):
    k = norm(valor)
    return C.ALIAS_NACIONALIDAD.get(k, k)


def es_mexico(k):
    return k in ("MEXICO", "MEXICANA", "ESTADOS UNIDOS MEXICANOS")


def nombre_visible(valor):
    """Nombre para mostrar: respeta acentos y pone en minúsculas las partículas."""
    if not valor.isupper():
        return valor
    return " ".join(w if i == 0 or w not in PARTICULAS else w.lower() for i, w in enumerate(valor.title().split()))


def construir_catalogo(tablas):
    global NAT, OTRAS, MEXICO
    volumen, original = {}, {}
    for clave, tabla in tablas.items():
        if clave not in CARGAR and clave != "docs_nat":
            continue
        t = con_encabezado(tabla)
        col = next((c for c in ("NACIONALIDAD", "PAIS / EMPLEADOR") if c in t.columns), None)
        if not col:
            continue
        for valor, n in t[col].dropna().astype(str).str.strip().value_counts().items():
            k = clave_nat(valor)
            i = C.ISO_NACIONALIDAD.get(k)
            if i is None or es_mexico(k):
                continue
            volumen[i] = volumen.get(i, 0) + int(n)
            if i not in original or (original[i].isupper() and not valor.isupper()):
                original[i] = valor
    orden = sorted(volumen, key=lambda i: -volumen[i])
    NAT = [[C.NOMBRE_CORTO.get(i, nombre_visible(original[i])), i, C.REGION_ISO.get(i, "OT")] for i in orden]
    _iso.clear()
    _iso.update({i: j for j, i in enumerate(orden)})
    OTRAS, MEXICO = len(NAT), len(NAT) + 1


def idx_nat(valor):
    k = clave_nat(valor)
    if es_mexico(k):
        return MEXICO
    return _iso.get(C.ISO_NACIONALIDAD.get(k), OTRAS)


def idx_est(valor):
    return _est.get(norm(valor), -1)


# ==== [5] CARGA DE BASES ==========================================
AVISOS = {}          # clave de la base → lista de observaciones para el reporte


def avisar(clave, texto):
    AVISOS.setdefault(clave, []).append(texto)


def corregir(clave, texto):
    """Lo que cambia una cifra y hay que pedir al área que corrija: la sección Bases lo pone en «Corregir con el área»."""
    avisar(clave, lector.CORREGIR + texto)


def preparar(clave, t, col_nat="NACIONALIDAD"):
    """Columnas comunes: DIA (fecha), s (estado), n (nacionalidad)."""
    t["DIA"] = fecha(t["DIA"])
    sin_fecha = int(t["DIA"].isna().sum())
    if sin_fecha:
        corregir(clave, f"{sin_fecha:,} renglones sin fecha válida (no se cuentan)")
    t["s"] = t["O.R."].map(idx_est)
    malos = t.loc[t["s"] < 0, "O.R."].astype(str).str.strip().value_counts()
    if len(malos):
        corregir(clave, f"{int(malos.sum()):,} renglones con O.R. no reconocida (no se cuentan): " + ", ".join(malos.index[:6]))
    t["n"] = t[col_nat].map(idx_nat) if col_nat else MEXICO
    if col_nat:
        sin = t.loc[t["n"] == OTRAS, col_nat].astype(str).str.strip().value_counts()
        sin = sin[[norm(x) not in ("EMPLEADOR", "APATRIDA", "SIN DATO", "NAN") for x in sin.index]]
        if len(sin):
            avisar(clave, f"{int(sin.sum()):,} renglones traen países que no están en el catálogo de la plataforma; se cuentan en «Otras nacionalidades»: " + ", ".join(sin.index[:8]) + ("…" if len(sin.index) > 8 else "") + ".")
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
    mx = t["n"] == MEXICO
    if mx.any():
        avisar("seg", f"{int(t.loc[mx, 'v'].sum()):,} casos ({int(mx.sum()):,} renglones) vienen con nacionalidad mexicana; no se cuentan "
                      "en segunda revisión ni en rechazos (igual que Control migratorio)")
    return t


def cargar_tram(t):
    """Un renglón puede traer varios documentos: se suman las columnas de documento."""
    columnas = list(t.columns)
    despues = columnas[columnas.index("RANGOS DE EDAD") + 1:]
    t, docs = lector.documentos_tramite(t)                      # solo columnas de documento, con los errores de captura corregidos
    usadas = {"PLAZO NORMATIVO DE RESOLUCION", "DIAS DE RESOLUCION / TRANSCURIDOS SIN RESOLVER", "DENTRO O FUERA DEL PLAZO NORMATIVO", "MOTIVO DE ESTANCIA"}   # las usa Regulación (Plazos)
    otras = [c for c in despues if c not in docs and c not in usadas]
    if otras:
        lector.avisar("Trámites", "Columnas nuevas que todavía no se usan: " + ", ".join(c.capitalize() for c in otras) + ".")
    t["PAIS / EMPLEADOR"] = t["PAIS / EMPLEADOR"].fillna("SIN DATO")
    t = preparar("tram", t, "PAIS / EMPLEADOR")
    t["v"] = t[docs].apply(entero).sum(axis=1)
    t["sexo"] = t["SEXO"].map(lambda x: {"HOMBRE": 0, "MUJER": 1}.get(norm(x), -1))
    edades = {"00": 0, "12": 1, "18": 2, "25": 3, "35": 4, "45": 5, "55": 6, "65": 7}
    t["edad"] = t["RANGOS DE EDAD"].map(lambda x: edades.get(str(x).strip()[:2], -1))
    # Expiden / no expiden tarjeta («Tipo de conclusión») y dentro / fuera del plazo normativo
    t["exp"] = t["TIPO DE CONCLUSION"].map(lambda x: 0 if norm(x).startswith("CON EXPEDICION") else 1) if "TIPO DE CONCLUSION" in t.columns else 0
    t["plz"] = t["DENTRO O FUERA DEL PLAZO NORMATIVO"].map(lambda x: 1 if "FUERA" in norm(x) else 0) if "DENTRO O FUERA DEL PLAZO NORMATIVO" in t.columns else 0
    t["res"] = t["TIPO DE RESOLUCION ESPECIFICA"].map(lambda x: {"POSITIVOS": 0, "NEGATIVOS": 1}.get(norm(x), 2))
    empleador = int((t["PAIS / EMPLEADOR"].map(norm) == "EMPLEADOR").sum())
    if empleador:
        avisar("tram", f"{empleador:,} renglones son de empleadores, no de personas (se cuentan en el total, sin nacionalidad)")
    return t


def cargar_resc(t):
    t = preparar("resc", t)
    for c in ("TOTAL", "1RA VEZ", "REINCIDENTES", "PRESENTADOS EN ESTACIONES MIGRATORIAS", "CANALIZADOS AL DIF"):
        t[c] = entero(t[c])
    # Si TOTAL no es 1RA VEZ + REINCIDENTES, se usa la suma: así la tarjeta (total) y su desglose (1.ª vez / reincidentes) dan lo mismo
    mal = t["TOTAL"] != t["1RA VEZ"] + t["REINCIDENTES"]
    if mal.any():
        dif = int((t.loc[mal, "1RA VEZ"] + t.loc[mal, "REINCIDENTES"] - t.loc[mal, "TOTAL"]).sum())
        ej = "; ".join(f"{pd.Timestamp(r.DIA).date()} {r['O.R.']} {r.NACIONALIDAD}: total {r.TOTAL}, 1.ª vez {r['1RA VEZ']}, reincidentes {r.REINCIDENTES}" for _, r in t[mal].head(3).iterrows())
        corregir("resc", f"{int(mal.sum()):,} renglones donde TOTAL no es 1RA VEZ + REINCIDENTES (diferencia de {dif:+,}); se usa la suma. Ej.: {ej}. Corregir en el archivo.")
        t.loc[mal, "TOTAL"] = t.loc[mal, "1RA VEZ"] + t.loc[mal, "REINCIDENTES"]
    t["v"] = t["TOTAL"]
    repetidos = int(t.duplicated(["DIA", "O.R.", "NACIONALIDAD"]).sum())
    if repetidos:
        corregir("resc", f"{repetidos:,} renglones repetidos (mismo día, O.R. y nacionalidad)")
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
        corregir("can_nna", f"{sin_edad:,} renglones sin fecha de nacimiento (se cuentan en el grupo 12 a 17)")
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
    # total = deportados + retornos asistidos (así el desglose cuadra con el total en todas las vistas)
    t["v"] = t["DEPORTADOS"] + t["RETORNOS ASISTIDOS"]
    dif = t["v"] != t["RETORNADOS A SU PAIS"]
    if dif.any():
        corregir("ret", f"{int(dif.sum()):,} renglones donde deportados + retornos asistidos no da la columna «Retornados a su país» "
                      f"(diferencia de {int((t['v'] - t['RETORNADOS A SU PAIS'])[dif].sum()):+,} personas). La plataforma usa la suma de deportados + retornos asistidos.")
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
# Fechas en las que siempre se corta una semana (inicio de periodos de gobierno), además de cada día 1 de mes
CORTES_FIJOS = {"2024-10-01", "2025-01-20"}


def semanas(inicio, dias):
    """Bloques de hasta 7 días que nunca cruzan un cambio de mes ni un inicio de periodo:
    así cualquier consulta por mes, año, Sheinbaum o Trump sale exacta también en el cruce estado × nacionalidad."""
    cortes, largo = [], 0
    for d in range(dias):
        f = inicio + pd.Timedelta(days=d)
        if largo and (f.day == 1 or f.date().isoformat() in CORTES_FIJOS or largo == 7):
            cortes.append(d)
            largo = 0
        largo += 1
    cortes.append(dias)
    return cortes


def resumir(t, inicio, dias, cortes):
    """Cubo semanal estado × nacionalidad y series diarias (total, por estado, por nacionalidad)."""
    t = t[t["v"] != 0]
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
            "ds": disperso(por_estado),
            "dn": disperso(por_nat)}


def disperso(matriz):
    """Solo las celdas con valor: [día, columna, valor, ...]."""
    d, c = np.nonzero(matriz)
    return [int(x) for x in np.column_stack([d, c, matriz[d, c]]).flatten()]


# ==== [7] COMPOSICIONES ===========================================
INICIO_BASES = None      # primer día de las bases; lo fija main()


def composicion(t, categoria, valor):
    """Lista [mes, estado, nacionalidad, categoría, valor, ...] para los desgloses.
    El mes cuenta desde el primer mes de las bases, para poder filtrar por periodo."""
    mes = (t["DIA"].dt.year - INICIO_BASES.year) * 12 + t["DIA"].dt.month - INICIO_BASES.month
    o = pd.DataFrame({"m": mes.values, "s": t["s"].values, "n": np.asarray(t["n"]), "c": np.asarray(categoria), "v": np.asarray(valor)})
    o = o[o.c >= 0].groupby(["m", "s", "n", "c"]).v.sum().reset_index()
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
    o["tram_exp"] = composicion(tram, tram["exp"], tram["v"])
    o["tram_plz"] = composicion(tram, tram["plz"], tram["v"])
    # tipo de trámite: los 14 más frecuentes y "Otros"
    global TIPOS_TRAM
    orden = list(tram.groupby("TIPO DE TRAMITE").v.sum().sort_values(ascending=False).index)
    TIPOS_TRAM = [" ".join(str(x).split()) for x in orden[:14]] + (["Otros"] if len(orden) > 14 else [])
    o["tram_tipo"] = composicion(tram, tram["TIPO DE TRAMITE"].map(lambda x: orden.index(x) if orden.index(x) < 14 else 14), tram["v"])
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
    salida, con_coord, indice = [], 0, {}
    for nombre, (corto, lon, lat) in C.PUNTOS_INTERNACION.items():
        d = ing[ing["punto"] == norm(nombre)]
        if not len(d):
            continue
        indice[norm(nombre)] = len(salida)
        con_coord += int(d.v.sum())
        extranjeros = d[d["n"] != MEXICO]
        top = extranjeros.groupby(extranjeros["NACIONALIDAD"].astype(str).str.strip()).v.sum().sort_values(ascending=False).head(5)
        r = rech.loc[norm(nombre)] if norm(nombre) in rech.index else None
        salida.append({"n": corto, "t": int(d.groupby("via").v.sum().idxmax()), "s": int(d["s"].iloc[0]), "x": lon, "y": lat,
                       "wk": por_semana(d, inicio, cortes), "mx": int(d[d["n"] == MEXICO].v.sum()),
                       "top": [[idx_nat(a) if idx_nat(a) != OTRAS else a.title(), int(b)] for a, b in top.items()],
                       "rech": int(r.get(1, 0)) if r is not None else 0, "seg": int(r.sum()) if r is not None else 0})
    total = int(ing.v.sum())
    avisar("ing", f"Solo {len(salida)} de {ing['punto'].nunique()} puntos de internación tienen ubicación para dibujarse en el mapa "
                  f"(concentran el {con_coord / max(total, 1) * 100:.0f}% de los ingresos). Los demás sí se cuentan en todas las cifras; solo no aparecen como punto en el mapa.")
    repat = []
    por_corto = {}
    for nombre, (corto, lon, lat) in C.PUNTOS_REPATRIACION.items():   # nombres distintos del mismo punto se juntan
        por_corto.setdefault((corto, lon, lat), set()).add(norm(nombre))
    for (corto, lon, lat), nombres in por_corto.items():
        d = rep[rep["punto"].isin(nombres)]
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
    return salida, repat, estaciones, por_punto(ing, indice), por_punto(seg[seg["det"] == 1], indice)


def por_punto(t, indice):
    """Para cada nacionalidad, sus 3 puntos de internación principales: {n: [[punto, valor], ...]}."""
    d = t[t["punto"].isin(indice.keys()) & (t["n"] < OTRAS)]
    g = d.groupby(["n", "punto"]).v.sum().reset_index().sort_values("v", ascending=False)
    return {int(n): [[indice[p], int(v)] for p, v in zip(sub["punto"], sub["v"])][:3] for n, sub in g.groupby("n")}


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
        j = idx_nat(r[0])
        if j < OTRAS and pd.notna(pd.to_numeric(r[3], errors="coerce")):
            por_nat[j] = [int(r[3]), int(r[1]), int(r[2])]
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
                         "top": [[NAT[idx_nat(k)][0] if idx_nat(k) < OTRAS else original.get(k, k.title()), int(v)] for k, v in top.items() if v > 0]})
    sin_coord = sorted(set(t["sector"]) - set(C.SECTORES_CBP))
    if sin_coord:
        avisar("cbp", "Sectores sin coordenadas en el catálogo: " + ", ".join(sin_coord))
    return t, {"total": int(t["v"].sum()), "mex": int(t["MEXICO"].sum()), "ext": int(t["EXTRANJEROS"].sum()),
               "sectores": sectores, "estados": por_estado}


def ubicar(lugar):
    """Coordenadas de un lugar de caravana; se busca por la parte antes de la primera coma."""
    texto = norm(lugar)
    for parte in [texto.split(",")[0].strip(), texto]:
        if parte in C.LUGARES:
            return list(C.LUGARES[parte])
    for clave, xy in C.LUGARES.items():
        if clave in texto:
            return list(xy)
    return None


def caravanas(tabla):
    """Caravanas: nombre, fecha de inicio, lugar de salida y de disolución, personas (estimadas)."""
    t = con_encabezado(tabla)
    t["INICIO"] = fecha(t["INICIO"])
    t = t[t["INICIO"].notna()]
    vacio = lambda v: "" if pd.isna(v) else " ".join(str(v).split())
    lista, sin_ubicar = [], set()
    for _, r in t.sort_values("INICIO").iterrows():
        salida, disol = vacio(r.get("LUGAR DE SALIDA")), vacio(r.get("LUGAR DE DISOLUCION"))
        sx, dx = ubicar(salida) if salida else None, ubicar(disol) if disol else None
        sin_ubicar.update(x for x, c in ((salida, sx), (disol, dx)) if x and c is None)
        lista.append({"n": vacio(r.get("NOMBRE")) or "Sin nombre", "f": r["INICIO"].date().isoformat(),
                      "s": salida, "sx": sx, "d": disol, "dx": dx, "p": int(pd.to_numeric(r.get("PERSONAS"), errors="coerce") or 0)})
    if sin_ubicar:
        avisar("car", "Estos lugares no tienen ubicación en el catálogo, así que su recorrido no se dibuja en el mapa: " + ", ".join(sorted(sin_ubicar)))
    return lista


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
    sin_reconocer, grupos = [], {}
    for ruta in sorted(glob.glob(os.path.join(a.origen, "*.xlsx"))):
        if os.path.basename(ruta).startswith("~$"):
            continue
        clave = reconocer(None, set(lector.encabezados(lector.primera_fila(ruta, ACEPTA))))
        if not clave:
            sin_reconocer.append(os.path.basename(ruta))
            continue
        grupos.setdefault(clave, []).append((ruta, None, None))
    for clave, l in grupos.items():
        archivos[clave] = ", ".join(os.path.basename(r) for r, _, _ in l)
        cargas[clave] = max(fecha_de_carga(r) for r, _, _ in l)
        if clave in PENDIENTES:
            lector.avisar(NOMBRES[clave], PENDIENTES[clave])
            continue
        if "DIA" not in lector.encabezados(lector.primera_fila(l[0][0], ACEPTA)):   # sin fechas (documentos vigentes, caravanas): la entrega más reciente, tal cual
            ult = max(l, key=lambda x: (lector.entrega_de(os.path.basename(x[0]), a.origen)[0], os.path.basename(x[0])))[0]
            if len(l) > 1:
                lector.avisar(NOMBRES[clave], "Hay " + str(len(l)) + " archivos de esta base; se usa la entrega más reciente: " + os.path.basename(ult) + ".")
            tablas[clave], ocultas[clave] = leer_hoja(ult)
            continue
        partes = []
        for ruta, _, _ in l:                                   # todas las hojas visibles con las mismas columnas
            t, fuera = lector.tabla_de(ruta, NOMBRES[clave], ACEPTA)
            if fuera:
                lector.avisar(NOMBRES[clave], os.path.basename(ruta) + ": las hojas «" + "», «".join(fuera) + "» no se usaron (están ocultas o no tienen las columnas de la base). Si traen datos que deben contar, pedir al área que los pase a la hoja principal.")
            partes.append((os.path.basename(ruta), t))
        # Columnas: las de todos los archivos (si una entrega nueva trae otras nacionalidades, no se pierden las anteriores)
        cols, nom = [], {}
        for _, p in partes:
            o = p.attrs.get("orig") or list(p.columns)
            for c, x in zip(p.columns, o):
                if c not in nom:
                    cols.append(c)
                    x = lector.ALIAS.get(lector.norm(x), x)                     # errores de captura («NACIONADLIDAD»)
                    nom[c] = x if norm(x) == c else c                           # y nombres nuevos («FECHA» → «DIA»)
        t = lector.juntar(partes, NOMBRES[clave], origen=a.origen)
        t = t.reindex(columns=cols)
        orig = [nom[c] for c in cols]
        tablas[clave] = pd.concat([pd.DataFrame([orig], columns=t.columns), t], ignore_index=True)
        tablas[clave].columns = range(t.shape[1])
        ocultas[clave] = []
    faltan = [NOMBRES[k] for k in CARGAR if k not in tablas]
    if faltan:
        sys.exit("Faltan bases en " + a.origen + ": " + ", ".join(faltan))

    # -- Cargar y fijar el periodo con las fechas de las bases
    construir_catalogo(tablas)
    B = {k: CARGAR[k](con_encabezado(tablas[k])) for k in CARGAR}
    inicio = min(t["DIA"].min() for t in B.values())          # el periodo lo fijan las bases del INM, no la de la CBP
    fin = max(t["DIA"].max() for t in B.values())
    global INICIO_BASES
    INICIO_BASES = inicio
    dias = (fin - inicio).days + 1
    cortes = semanas(inicio, dias)

    # -- Indicadores de la página
    # Segunda revisión y rechazos: solo extranjeros, igual que Control migratorio (a un mexicano no se le niega la entrada;
    # los renglones con nacionalidad mexicana se avisan en la base y no se cuentan)
    seg_ext = B["seg"][B["seg"]["n"] != MEXICO]
    rech = seg_ext[seg_ext["det"] == 1]
    # Canalizados = NNA + adultos que los acompañan: se cuenta solo hasta donde llegan las dos bases
    # (si una llega más lejos, sus días de más no se suman, para no mostrar adultos sin sus NNA)
    fin_can = min(B["can_nna"]["DIA"].max(), B["can_ad"]["DIA"].max())
    for k, nom in (("can_nna", "NNA"), ("can_ad", "adultos")):
        extra = B[k]["DIA"] > fin_can
        if extra.any():
            avisar(k, f"La base de {nom} llega al {B[k]['DIA'].max().date()} y la otra al {fin_can.date()}: en «Canalizados» del Pulso "
                      f"se cuenta hasta el {fin_can.date()} ({int(B[k].loc[extra, 'v'].sum()):,} registros posteriores quedan fuera hasta que llegue la otra base)")
    can = pd.concat([B["can_nna"][["DIA", "s", "n", "v"]], B["can_ad"][["DIA", "s", "n", "v"]]])
    can = can[can["DIA"] <= fin_can]
    # Ingresos: el total completo (extranjeros + mexicanos que regresan, oct 2026). La parte de mexicanos va también aparte
    # (ing_mx) para decir siempre cuántos son extranjeros y cuántos mexicanos; rechazos y segunda revisión siguen siendo solo extranjeros.
    ing_mx = B["ing"][B["ing"]["n"] == MEXICO]
    BX = dict(B, seg=seg_ext, can_nna=B["can_nna"][B["can_nna"]["DIA"] <= fin_can], can_ad=B["can_ad"][B["can_ad"]["DIA"] <= fin_can])
    indicadores = {"ing": B["ing"], "ing_mx": ing_mx, "rech": rech, "tram": B["tram"], "resc": B["resc"], "pres": B["pres"],
                   "can": can, "ret": B["ret"], "recib": B["recib"], "rep": B["rep"],
                   # partes con la misma granularidad que las tarjetas (por día, estado y nacionalidad): así el desglose de la ayuda
                   # (1.ª vez / reincidentes, con tarjeta / sin tarjeta) suma exactamente la tarjeta en cualquier periodo
                   "resc_pv": B["resc"].assign(v=B["resc"]["1RA VEZ"]), "tram_tar": B["tram"][B["tram"]["exp"] == 0]}
    salida = {"inicio": inicio.date().isoformat(), "corte": fin.date().isoformat(), "dias": dias,
              "generado": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
              "nats": [list(n) for n in NAT] + [["Otras", 0, "OT"], ["México", 484, "NA"]],
              "ests": C.ESTADOS, "ends": cortes, "cube": {}, "daily": {}, "ds": {}, "dn": {}}
    for k, t in indicadores.items():
        r = resumir(t, inicio, dias, cortes)
        for parte in ("cube", "daily", "ds", "dn"):
            salida[parte][k] = r[parte]
    salida["comp"], salida["estaciones"] = composiciones(BX)
    salida["tramTipos"] = TIPOS_TRAM
    salida["puntos"], salida["repPuntos"], salida["emPuntos"], salida["ingPunto"], salida["rechPunto"] = puntos(BX, inicio, cortes)
    salida["docs"] = documentos(tablas, cargas)
    salida["cbp"] = None
    if "cbp" in tablas:
        B["cbp"], salida["cbp"] = encuentros(tablas["cbp"], inicio, dias, cortes)
        # Encuentros como indicador (tarjeta del Pulso y Pregunta a INAMI): un renglón por día × sector × agencia × nacionalidad.
        # No tiene estado de México (CBP reporta por sector de EE. UU.): «s» es 0 solo para el cubo y la página no lo usa por estado.
        tc = B["cbp"]
        fijas = ["DIA", "AGENCIA", "LOCATION", "CIUDAD EEUU", "CIUDAD MX", "TOTAL", "MEXICO", "EXTRANJEROS", "v", "sector"]
        cols = [c for c in tc.columns if c not in fijas]                      # países y OTROS
        largo = tc.drop(columns=["v"]).melt(id_vars=["DIA", "AGENCIA", "LOCATION"], value_vars=cols + ["MEXICO"], var_name="pais", value_name="v")
        largo = largo[largo["v"] > 0].copy()
        largo["n"] = largo["pais"].map(lambda k: MEXICO if k == "MEXICO" else OTRAS if k == "OTROS" else idx_nat(k))
        largo["s"] = 0
        dif = int(tc["TOTAL"].sum()) - int(largo["v"].sum())
        if dif:
            avisar("cbp", f"La suma por nacionalidad difiere del TOTAL en {dif:+,} encuentros")
        r = resumir(largo, inicio, dias, cortes)
        for parte in ("cube", "daily", "dn"):
            salida[parte]["cbp"] = r[parte]
        salida["ds"]["cbp"] = []
        secs = sorted(largo["LOCATION"].astype(str).str.strip().unique())
        ags = ["USBP", "OFO", "CBP ONE"]
        salida["cbpT"] = {"sec": secs, "ag": ags, "d": [int(x) for x in (largo["DIA"] - inicio).dt.days],
                          "s": [secs.index(str(x).strip()) for x in largo["LOCATION"]],
                          "a": [ags.index(norm(x)) if norm(x) in ags else -1 for x in largo["AGENCIA"]],
                          "n": [int(x) for x in largo["n"]], "v": [int(x) for x in largo["v"]]}
    salida["caravanas"] = caravanas(tablas["car"]) if "car" in tablas else []

    # -- Revisiones de la carga: repetidos, puntos que se quedan en cero y saltos (robot/revisiones.py)
    for k, l in revisiones.revisar(B).items():
        for x in l:
            corregir(k, x)

    # -- Estado de cada base (para la sección Bases y el reporte)
    salida["bases"] = []
    lineas = ["IA-NAMI · REPORTE DE CONVERSIÓN", f"Generado: {salida['generado']}",
              f"Periodo de las bases: {salida['inicio']} a {salida['corte']} ({dias} días)", ""]
    for k in list(CARGAR) + ["docs_est", "docs_nat", "docs_cruce", "cbp", "car"] + list(PENDIENTES):
        if k not in tablas and k not in PENDIENTES:
            continue
        if k in PENDIENTES:
            if k in archivos:
                lineas.append(f"== {NOMBRES[k]}  ·  {archivos[k]}  ·  {PENDIENTES[k]}")
                salida["bases"].append({"k": k, "n": NOMBRES[k], "archivo": archivos[k], "cargado": cargas[k], "pendiente": k not in INDEPENDIENTES, "obs": lector.avisos_de(NOMBRES[k]), "avisos": 1})
                lineas.append("")
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
        if k == "car":
            lineas.append(f"   {len(salida['caravanas'])} caravanas · del {salida['caravanas'][0]['f']} al {salida['caravanas'][-1]['f']}" if salida["caravanas"] else "   Sin caravanas")
        if ocultas.get(k):
            avisar(k, "El archivo trae hojas ocultas que no se leen: " + ", ".join(ocultas[k]))
        obs = AVISOS.get(k, []) + lector.avisos_de(NOMBRES[k])
        for x in obs:
            lineas.append("   · " + x)
        info["avisos"] = len(obs)
        info["obs"] = obs
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
    lector.guardar(a.destino, "convertir", {NOMBRES[k]: l for k, l in AVISOS.items() if k in NOMBRES})


if __name__ == "__main__":
    main()
