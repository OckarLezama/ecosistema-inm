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
    revisa(t["TOTAL ADULTOS"] + t["TOTAL MENORES"] != t["MEXICANOS REPATRIADOS"], "adultos + menores no suman el total de repatriados")
    revisa(t["ADULTOS HOMBRES"] + t["ADULTOS MUJERES"] != t["TOTAL ADULTOS"], "hombres + mujeres no suman el total de adultos")
    revisa(t["MENORES HOMBRES"] + t["MENORES MUJERES"] != t["TOTAL MENORES"], "niños + niñas no suman el total de menores")
    revisa(t["ACOMPANADOS"] + t["NO_ACOMPANADOS"] != t["TOTAL MENORES"], "NNA acompañados + no acompañados no suman el total de menores")
    dup = t.duplicated(["d", "p", "m"], keep=False)
    revisa(dup, "repetidos (mismo día, punto y modalidad)")
    dias = (fin - ini).days + 1
    for p, n in t[t["m"] == 0].groupby("p")["d"].nunique().items():
        if n < dias:
            calidad.append(f"{P.l[p]}: sin registro en {dias - n} de {dias} días (se cuentan como cero; confirmar con el área).")
    calidad.append("El archivo no trae número de vuelos: en la modalidad aérea (vuelos PRIM) se cuentan los días con llegada.")

    # ==== [5] SALIDA ==============================================
    out = {"inicio": ini.strftime("%Y-%m-%d"), "dias": dias, "archivo": archivo,
           "dic": {"e": E.l, "p": P.l}, "rep": tabla, "calidad": calidad}
    os.makedirs(a.destino, exist_ok=True)
    with open(os.path.join(a.destino, "proteccion.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_PMV=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"proteccion.js: {len(t)} registros, {int(t['MEXICANOS REPATRIADOS'].sum()):,} repatriados, {ini:%d/%m/%Y} – {fin:%d/%m/%Y}")
    for x in calidad:
        print("  ·", x)
        lector.avisar("Repatriados", x)
    lector.guardar(a.destino, "proteccion")


if __name__ == "__main__":
    main()
