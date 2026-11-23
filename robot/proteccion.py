# ==================================================================
# IA-NAMI · PROTECCIÓN AL MIGRANTE (DGPMV)
# Lee el archivo de mexicanos repatriados desde EE. UU. (DGPMV) y
# escribe datos/proteccion.js con una tabla diaria compacta por punto
# de repatriación que la página agrega en el navegador. También revisa
# que las sumas cuadren y deja las observaciones como notas de calidad.
# ÍNDICE  [1] UTILIDADES  [2] LECTURA  [3] TABLA  [4] REVISIÓN  [5] SALIDA
# Uso: python robot/proteccion.py --origen DATA --destino datos
# ==================================================================
import argparse
import glob
import json
import os
import sys
import unicodedata

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogos as C  # noqa: E402
import lector  # noqa: E402


# ==== [1] UTILIDADES ==============================================
def norm(x):
    t = unicodedata.normalize("NFD", str(x).upper())
    return " ".join("".join(c for c in t if unicodedata.category(c) != "Mn").split())


ALIAS_E = {norm(k): norm(v) for k, v in getattr(C, "ALIAS_ESTADO", {}).items()}
ESTADO = {norm(e): e for e in C.ESTADOS}
PUNTO = {norm(k): v[0] for k, v in C.PUNTOS_REPATRIACION.items()}
PUNTO = {k: (v.replace(" (vuelos)", " (vuelos PRIM)")) for k, v in PUNTO.items()}   # en la vista de Protección: «AIFA (vuelos PRIM)»
MODALIDAD = {"TERRESTRE": 0, "AEREO": 1}
# columnas del archivo → nombre corto en la tabla
COLS = {"MEXICANOS REPATRIADOS": "v", "TOTAL ADULTOS": "ad", "ADULTOS HOMBRES": "ah", "ADULTOS MUJERES": "am",
        "TOTAL MENORES": "me", "MENORES HOMBRES": "mh", "MENORES MUJERES": "mm", "ACOMPANADOS": "ac", "NO_ACOMPANADOS": "na"}


def estado(x):
    n = norm(x)
    return ESTADO.get(ALIAS_E.get(n, n), str(x).strip().title())


def punto(x):
    return PUNTO.get(norm(x), " ".join(str(x).split()))


class Dic:
    """Asigna un número a cada nombre, en el orden en que aparece."""
    def __init__(self):
        self.l, self.i = [], {}

    def __call__(self, v):
        if v not in self.i:
            self.i[v] = len(self.l)
            self.l.append(v)
        return self.i[v]


# ==== [2] LECTURA =================================================
def leer(origen):
    """Encuentra el archivo por sus columnas, no por su nombre."""
    pide = {"PUNTO_REPATRIACION", "MODALIDAD", "MEXICANOS REPATRIADOS"}
    t, archivos = lector.leer_por_columnas(origen, pide, "Repatriados")
    if t is not None:
        return t, ", ".join(archivos)
    sys.exit("No se encontró el archivo de repatriados (columnas " + ", ".join(sorted(pide)) + ")")


def otros(origen, ini):
    """Vuelos comerciales y Guatemala-Honduras: datos independientes (no se suman a Repatriados). Días contados desde el
    inicio de la base de repatriados, para usar el mismo calendario en la página."""
    import re
    out = {}
    for k, base, pide, sin in (("com", "Repatriados en vuelos comerciales", {"MEXICANOS REPATRIADOS", "PUNTO INTERNACION"}, {"PAIS"}),
                               ("gh", "Repatriados desde Guatemala y Honduras", {"MEXICANOS REPATRIADOS", "PUNTO INTERNACION", "PAIS"}, set())):
        t, archivos = lector.leer_por_columnas(origen, pide, base, sin)
        if t is None or not len(t):
            continue
        t = t[t["DIA"].notna()].copy()
        cols = {"MEXICANOS REPATRIADOS": "v", "ADULTOS": "ad", "MENORES": "me", "NNA ACOMPANADOS": "ac", "NNA NO ACOMPANADOS": "na"}
        for c in cols:
            t[c] = pd.to_numeric(t[c], errors="coerce").fillna(0).astype(int) if c in t.columns else 0
        E, P, PA = Dic(), Dic(), Dic()
        quita = lambda x: re.sub(r"^(OFICINA DE REPRESENTACION EN|O\.?R\.?)\s+", "", norm(x))
        t["e"] = t["O.R."].map(lambda x: estado(quita(x))).map(E)
        aerop = lambda x: re.sub(r"^A\.\s*I\.?\s*(de\s+)?", "A. I. ", " ".join(str(x).split()), flags=re.I)
        t["p"] = t["PUNTO INTERNACION"].map(aerop).map(lambda x: "A. I. " + x[6:].title() if x.startswith("A. I. ") and x[6:].isupper() else x).map(P)   # «A.I. MONTERREY» = «A. I. Monterrey» (nov 2026)
        t["pa"] = t["PAIS"].map(lambda x: " ".join(str(x).split()).title()).map(PA) if "PAIS" in t.columns else 0
        t["d"] = (t["DIA"] - ini).dt.days.astype(int)
        antes = int((t["d"] < 0).sum())
        if antes:
            lector.avisar(base, f"{antes} registros antes del {ini.date()} (no se usan).")
            t = t[t["d"] >= 0]
        m1 = (t["ADULTOS"] + t["MENORES"]) != t["MEXICANOS REPATRIADOS"]
        if m1.any():
            lector.corregir(base, f"{int(m1.sum())} renglones donde adultos + menores no da el total del renglón; la plataforma usa el total tal como viene.")
        m2 = (t["NNA ACOMPANADOS"] + t["NNA NO ACOMPANADOS"]) != t["MENORES"]
        if m2.any():
            lector.corregir(base, f"{int(m2.sum())} renglones donde NNA acompañados + no acompañados no da el total de menores; la plataforma usa cada columna tal como viene.")
        tab = {"d": t["d"].tolist(), "e": t["e"].tolist(), "p": t["p"].tolist(), "pa": t["pa"].tolist() if "PAIS" in t.columns else [0] * len(t)}
        for c, kk in cols.items():
            tab[kk] = t[c].tolist()
        out[k] = {"archivo": ", ".join(archivos), "d0": int(t["d"].min()), "d1": int(t["d"].max()), "dic": {"e": E.l, "p": P.l, "pa": PA.l}, "t": tab}
        print(f"{base}: {len(t)} registros, {int(t['MEXICANOS REPATRIADOS'].sum()):,} personas, {t['DIA'].min():%d/%m/%Y} – {t['DIA'].max():%d/%m/%Y}")
        lector.periodo(base, t["DIA"].min().date(), t["DIA"].max().date(), ", ".join(archivos), len(t))
    return out


# Estados de origen (DGPMV): un renglón por día con los repatriados de cada estado. Solo lo usa el informe migratorio.
# Debe cuadrar con Repatriados día por día; mientras no cuadre se avisa en el reporte de carga, mes por mes.
ESTADOS = {"AGUASCALIENTES": ("Aguascalientes", "AGS"), "BAJA CALIFORNIA": ("Baja California", "BC"), "BAJA CALIFORNIA SUR": ("Baja California Sur", "BCS"),
           "CAMPECHE": ("Campeche", "CAMP"), "CHIAPAS": ("Chiapas", "CHIS"), "CHIHUAHUA": ("Chihuahua", "CHIH"), "CIUDAD DE MEXICO": ("Ciudad de México", "CDMX"),
           "COAHUILA": ("Coahuila", "COAH"), "COLIMA": ("Colima", "COL"), "DURANGO": ("Durango", "DGO"), "GUANAJUATO": ("Guanajuato", "GTO"), "GUERRERO": ("Guerrero", "GRO"),
           "HIDALGO": ("Hidalgo", "HGO"), "JALISCO": ("Jalisco", "JAL"), "MEXICO": ("México", "MEX"), "MICHOACAN": ("Michoacán", "MICH"), "MORELOS": ("Morelos", "MOR"),
           "NAYARIT": ("Nayarit", "NAY"), "NUEVO LEON": ("Nuevo León", "NL"), "OAXACA": ("Oaxaca", "OAX"), "PUEBLA": ("Puebla", "PUE"), "QUERETARO": ("Querétaro", "QRO"),
           "QUINTANA ROO": ("Quintana Roo", "QROO"), "SAN LUIS POTOSI": ("San Luis Potosí", "SLP"), "SINALOA": ("Sinaloa", "SIN"), "SONORA": ("Sonora", "SON"),
           "TABASCO": ("Tabasco", "TAB"), "TAMAULIPAS": ("Tamaulipas", "TAMPS"), "TLAXCALA": ("Tlaxcala", "TLAX"), "VERACRUZ": ("Veracruz", "VER"),
           "YUCATAN": ("Yucatán", "YUC"), "ZACATECAS": ("Zacatecas", "ZAC")}


def origen(origen, rep):
    base = "Repatriados por estado de origen"
    t, archivos = lector.leer_por_columnas(origen, {"FECHA", "CHIAPAS", "GUANAJUATO", "TOTAL"}, base)
    if t is None or not len(t):
        return None
    t["FECHA"] = lector.dia(t["FECHA"])
    t = t[t["FECHA"].notna()].copy()
    faltan = [k for k in ESTADOS if k not in t.columns]
    if faltan:
        lector.corregir(base, "Faltan las columnas de " + ", ".join(faltan) + "; esos estados se cuentan en cero.")
    for c in list(ESTADOS) + ["NATURALIZADO", "TOTAL"]:
        t[c] = pd.to_numeric(t[c], errors="coerce").fillna(0).astype(int) if c in t.columns else 0
    rep_dia = t["FECHA"].duplicated(keep=False)
    if rep_dia.any():
        lector.corregir(base, f"{int(rep_dia.sum())} renglones con la fecha repetida; se suman.")
    t = t.groupby("FECHA", as_index=False).sum(numeric_only=True)
    ini, fin = t["FECHA"].min(), t["FECHA"].max()
    cal = pd.date_range(ini, fin)
    hueco = len(cal) - len(t)
    if hueco:
        lector.avisar(base, f"{hueco} días sin renglón entre el {ini:%d/%m/%Y} y el {fin:%d/%m/%Y}; se cuentan como cero.")
    t = t.set_index("FECHA").reindex(cal, fill_value=0)
    suma = t[list(ESTADOS)].sum(axis=1) + t["NATURALIZADO"]
    mal = suma != t["TOTAL"]
    if mal.any():
        lector.corregir(base, f"{int(mal.sum())} días donde la suma de los estados no da el TOTAL; el informe usa la suma de los estados.")
    t["TOTAL"] = suma
    # cuadre con Repatriados, mes por mes, en los días que tienen las dos bases
    r = rep.groupby("DIA")["MEXICANOS REPATRIADOS"].sum()
    dd = pd.concat([t["TOTAL"].rename("o"), r.rename("r")], axis=1).dropna()
    dd = dd[(dd.index >= max(ini, r.index.min())) & (dd.index <= min(fin, r.index.max()))]
    dm = (dd["o"] - dd["r"]).groupby(dd.index.to_period("M")).sum()
    dm = dm[dm != 0]
    MES = "ene feb mar abr may jun jul ago sep oct nov dic".split()
    if len(dm):
        lector.corregir(base, "No cuadra con Repatriados (" + f"{int(dd['o'].sum()):,} contra {int(dd['r'].sum()):,}" + "): " +
                        ", ".join(f"{MES[p.month - 1]} {p.year % 100:02d} {int(v):+,}" for p, v in dm.items()) +
                        ". DGPMV debe confirmar cuál archivo tiene el día correcto; el informe migratorio usa este archivo.")
    else:
        lector.avisar(base, "Cuadra día por día con Repatriados.")
    print(f"{base}: {len(t)} días, {int(t['TOTAL'].sum()):,} personas, {ini:%d/%m/%Y} – {fin:%d/%m/%Y}, " + ("no cuadra con Repatriados en " + str(len(dm)) + " meses" if len(dm) else "cuadra con Repatriados"))
    lector.periodo(base, ini.date(), fin.date(), ", ".join(archivos), len(t))
    return {"archivo": ", ".join(archivos), "inicio": ini.strftime("%Y-%m-%d"), "dias": len(t), "est": [list(v) for v in ESTADOS.values()],
            "v": [t[k].astype(int).tolist() for k in ESTADOS], "nat": t["NATURALIZADO"].astype(int).tolist()}


# ==== [3] TABLA ===================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    t, archivo = leer(a.origen)
    calidad, arreglar = [], set()          # arreglar: lo que hay que pedir al área que corrija (sumas que no cuadran, repetidos)
    sin_fecha = int(t["DIA"].isna().sum())
    if sin_fecha:
        calidad.append(f"{sin_fecha} registros sin fecha válida no se incluyen.")
        arreglar.add(calidad[-1])
    t = t[t["DIA"].notna()].copy()
    ini, fin = t["DIA"].min(), t["DIA"].max()
    for c in COLS:
        t[c] = pd.to_numeric(t[c], errors="coerce").fillna(0).astype(int)
    E, P = Dic(), Dic()
    t["e"] = t["O.R."].map(estado).map(E)
    t["p"] = t["PUNTO_REPATRIACION"].map(punto).map(P)
    t["m"] = t["MODALIDAD"].map(lambda x: MODALIDAD.get(norm(x), 0))
    t["d"] = (t["DIA"] - ini).dt.days.astype(int)
    tabla = {"d": t["d"].tolist(), "e": t["e"].tolist(), "p": t["p"].tolist(), "m": t["m"].tolist()}
    for c, k in COLS.items():
        tabla[k] = t[c].tolist()

    # ==== [4] REVISIÓN ============================================
    def revisa(mal, texto):
        n = int(mal.sum())
        if n:
            calidad.append(f"{n} {'registro' if n == 1 else 'registros'}: {texto}.")
            arreglar.add(calidad[-1])
    revisa(t["TOTAL ADULTOS"] + t["TOTAL MENORES"] != t["MEXICANOS REPATRIADOS"], "adultos + menores no da el total de repatriados del renglón; el tablero usa el total tal como viene")
    revisa(t["ADULTOS HOMBRES"] + t["ADULTOS MUJERES"] != t["TOTAL ADULTOS"], "hombres + mujeres no da el total de adultos; el tablero usa cada columna tal como viene")
    revisa(t["MENORES HOMBRES"] + t["MENORES MUJERES"] != t["TOTAL MENORES"], "niños + niñas no da el total de menores; el tablero usa cada columna tal como viene")
    revisa(t["ACOMPANADOS"] + t["NO_ACOMPANADOS"] != t["TOTAL MENORES"], "NNA acompañados + no acompañados no da el total de menores; el tablero usa cada columna tal como viene")
    dup = t.duplicated(["d", "p", "m"], keep=False)
    revisa(dup, "repetidos (mismo día, punto y modalidad); se suman los dos, confirmar con el área si es doble captura")
    dias = (fin - ini).days + 1
    for p, n in t[t["m"] == 0].groupby("p")["d"].nunique().items():
        if n < dias:
            calidad.append(f"{P.l[p]}: {dias - n} de {dias} días no tienen ningún renglón. Se cuentan como cero; si ese día sí llegaron personas, faltan en el archivo.")
    calidad.append("El archivo no trae número de vuelos: en la modalidad aérea (vuelos PRIM) se cuentan los días con llegada.")

    # ==== [5] SALIDA ==============================================
    out = {"inicio": ini.strftime("%Y-%m-%d"), "dias": dias, "archivo": archivo,
           "dic": {"e": E.l, "p": P.l}, "rep": tabla, "calidad": calidad, "otros": otros(a.origen, ini), "orig": origen(a.origen, t)}
    os.makedirs(a.destino, exist_ok=True)
    with open(os.path.join(a.destino, "proteccion.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_PMV=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"proteccion.js: {len(t)} registros, {int(t['MEXICANOS REPATRIADOS'].sum()):,} repatriados, {ini:%d/%m/%Y} – {fin:%d/%m/%Y}")
    for x in calidad:
        print("  ·", x)
        (lector.corregir if x in arreglar else lector.avisar)("Repatriados", x)
    lector.periodo("Repatriados", ini.date(), fin.date(), archivo, len(t))
    lector.guardar(a.destino, "proteccion")


if __name__ == "__main__":
    main()
