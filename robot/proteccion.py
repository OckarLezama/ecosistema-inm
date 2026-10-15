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
        t["p"] = t["PUNTO INTERNACION"].map(lambda x: re.sub(r"^A\.\s*I\.?\s*(de\s+)?", "A. I. ", " ".join(str(x).split()), flags=re.I)).map(P)
        t["pa"] = t["PAIS"].map(lambda x: " ".join(str(x).split()).title()).map(PA) if "PAIS" in t.columns else 0
        t["d"] = (t["DIA"] - ini).dt.days.astype(int)
        antes = int((t["d"] < 0).sum())
        if antes:
            lector.avisar(base, f"{antes} registros antes del {ini.date()} (no se usan).")
            t = t[t["d"] >= 0]
        m1 = (t["ADULTOS"] + t["MENORES"]) != t["MEXICANOS REPATRIADOS"]
        if m1.any():
            lector.avisar(base, f"{int(m1.sum())} registros donde adultos + menores no suman el total.")
        m2 = (t["NNA ACOMPANADOS"] + t["NNA NO ACOMPANADOS"]) != t["MENORES"]
        if m2.any():
            lector.avisar(base, f"{int(m2.sum())} registros donde NNA acompañados + no acompañados no suman los menores.")
        tab = {"d": t["d"].tolist(), "e": t["e"].tolist(), "p": t["p"].tolist(), "pa": t["pa"].tolist() if "PAIS" in t.columns else [0] * len(t)}
        for c, kk in cols.items():
            tab[kk] = t[c].tolist()
        out[k] = {"archivo": ", ".join(archivos), "d0": int(t["d"].min()), "d1": int(t["d"].max()), "dic": {"e": E.l, "p": P.l, "pa": PA.l}, "t": tab}
        print(f"{base}: {len(t)} registros, {int(t['MEXICANOS REPATRIADOS'].sum()):,} personas, {t['DIA'].min():%d/%m/%Y} – {t['DIA'].max():%d/%m/%Y}")
        lector.periodo(base, t["DIA"].min().date(), t["DIA"].max().date(), ", ".join(archivos), len(t))
    return out


# ==== [3] TABLA ===================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    t, archivo = leer(a.origen)
    calidad = []
    sin_fecha = int(t["DIA"].isna().sum())
    if sin_fecha:
        calidad.append(f"{sin_fecha} registros sin fecha válida no se incluyen.")
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
           "dic": {"e": E.l, "p": P.l}, "rep": tabla, "calidad": calidad, "otros": otros(a.origen, ini)}
    os.makedirs(a.destino, exist_ok=True)
    with open(os.path.join(a.destino, "proteccion.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_PMV=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"proteccion.js: {len(t)} registros, {int(t['MEXICANOS REPATRIADOS'].sum()):,} repatriados, {ini:%d/%m/%Y} – {fin:%d/%m/%Y}")
    for x in calidad:
        print("  ·", x)
        lector.avisar("Repatriados", x)
    lector.periodo("Repatriados", ini.date(), fin.date(), archivo, len(t))
    lector.guardar(a.destino, "proteccion")


if __name__ == "__main__":
    main()
