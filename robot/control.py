# ==================================================================
# IA-NAMI · CONTROL Y VERIFICACIÓN MIGRATORIA (DGCVM)
# Lee los archivos DGCVM (ingresos, segunda revisión, presentados,
# retornados y canalizados) y el de rescates de DGCOR (lo que reporta
# cada O.R.), y escribe datos/control.js con tablas diarias compactas
# que la página agrega en el navegador.
# ÍNDICE  [1] UTILIDADES  [2] LECTURA  [3] TABLAS  [4] SALIDA
# Uso: python robot/control.py --origen DATA --destino datos
# ==================================================================
import argparse
import glob
import json
import os
import re
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


ALIAS = {norm(k): norm(v) for k, v in getattr(C, "ALIAS_NACIONALIDAD", {}).items()}
CORTO = {norm(a): b for a, b, iso in C.NACIONALIDADES}
ALIAS_E = {norm(k): norm(v) for k, v in getattr(C, "ALIAS_ESTADO", {}).items()}
ESTADO = {norm(e): e for e in C.ESTADOS}
PUNTO = {norm(k): v[0] for k, v in C.PUNTOS_INTERNACION.items()}
VIAS = {"AEREO": 0, "TERRESTRE": 1, "MARITIMOS": 2, "MARITIMO": 2}
MOTIVOS = ["Abandono de PAM", "Retorno asistido", "Regularización", "Deportación", "Pendiente de conclusión", "Evasión", "Otro", "Fallecimiento"]
CLASES = ["Acompañado", "No acompañado", "Separado"]


def nacionalidad(x):
    n = ALIAS.get(norm(x), norm(x))
    return CORTO.get(n) or ("México" if n in ("MEXICO", "ESTADOS UNIDOS MEXICANOS") else str(x).strip().title())


def estado(x):
    n = norm(x)
    return ESTADO.get(ALIAS_E.get(n, n), str(x).strip().title())


def punto(x):
    if norm(x) in PUNTO:
        return PUNTO[norm(x)]
    s = str(x).strip().replace('"', "")
    s = re.sub(r"^Aeropuerto Internacional (de la |de |del )?", "Aerop. ", s)
    s = re.sub(r"(Sub )?Representación Local ", "", s)
    s = re.sub(r"\s*Punto de [Ii]nternación\s*", " ", s).strip()
    if not s or s.lower() == "nan":
        return "Sin punto registrado"                    # se cuenta y se avisa en la sección Bases
    s = s[0].upper() + s[1:]
    return s.title() if s.isupper() else s


def estacion(x):
    s = str(x).strip().replace("Estación Migratoria ", "EM ").replace("Estancia Provisional ", "EP ")
    return s.replace("Oficina de Representación en ", "O.R. ").replace("Representación Local ", "RL ")


def motivo(x):
    return next((i for i, m in enumerate(MOTIVOS) if norm(m) == norm(x)), MOTIVOS.index("Otro"))


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
def leer(origen, columnas, sin=frozenset(), base=""):
    """Encuentra la base por sus columnas, no por su nombre; junta hojas y archivos (robot/lector.py)."""
    t, archivos = lector.leer_por_columnas(origen, columnas, base, sin)
    if t is None:
        sys.exit("No se encontró el archivo con columnas " + ", ".join(sorted(columnas)))
    return t[t["DIA"].notna()].copy(), ", ".join(archivos)


# ==== [3] TABLAS ==================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    ing, f_ing = leer(a.origen, {"PUNTO DE INTERNACION", "TIPO", "TOTAL"}, {"DETERMINACION"}, "Ingresos")
    sp = ing["PUNTO DE INTERNACION"].isna() | (ing["PUNTO DE INTERNACION"].astype(str).str.strip().isin(["", "nan"]))
    if sp.any():
        for _, r in ing[sp].head(5).iterrows():
            lector.avisar("Ingresos", "Un renglón no trae punto de internación ({}, {}, {} personas). Se cuenta en el total como «Sin punto registrado».".format(r["DIA"].date(), r["O.R."], int(pd.to_numeric(r["TOTAL"], errors="coerce") or 0)))
        if sp.sum() > 5:
            lector.avisar("Ingresos", "{:,} registros sin punto de internación en total.".format(int(sp.sum())))
    seg, f_seg = leer(a.origen, {"DETERMINACION", "PUNTO DE INTERNACION"}, base="Segunda revisión")
    pre, f_pre = leer(a.origen, {"PRESENTADOS", "ESTACION O ESTANCIA MIGRATORIA"}, base="Presentados")
    ret, f_ret = leer(a.origen, {"RETORNADOS A SU PAIS", "DEPORTADOS"}, base="Retornados")
    nna, f_nna = leer(a.origen, {"FECHA DE NACIMIENTO", "CLASIFICACION", "MOTIVO DE SALIDA"}, base="Canalizados NNA")
    adu, f_adu = leer(a.origen, {"SEXO", "MOTIVO DE SALIDA"}, {"FECHA DE NACIMIENTO"}, "Canalizados adultos")
    res, f_res = leer(a.origen, {"1RA VEZ", "REINCIDENTES", "CANALIZADOS AL DIF"}, base="Rescates")
    tablas = (ing, seg, pre, ret, nna, adu)
    ini, fin = min(t["DIA"].min() for t in tablas), max(t["DIA"].max() for t in tablas)
    dia = lambda s: (s - ini).dt.days.astype(int)
    E, N, P, S = Dic(), Dic(), Dic(), Dic()
    calidad = []

    # Internaciones · se respeta la vía que trae la base; se avisa cuando un aeropuerto aparece como vía terrestre
    ing["vi"] = ing["TIPO"].map(lambda x: VIAS.get(norm(x), 1))
    pn = ing["PUNTO DE INTERNACION"].map(norm)
    mal = pn.str.contains("AEROPUERTO") & ~pn.str.contains("TERRESTRE") & (ing["vi"] != 0)
    if mal.sum():
        calidad.append("%d personas entraron por aeropuertos registrados como vía terrestre (por confirmar con el área)." % int(ing.loc[mal, "TOTAL"].sum()))
        lector.avisar("Ingresos", "{:,} ingresos están registrados como vía terrestre en puntos que son aeropuertos. El tablero los cuenta como terrestres, tal como vienen; el área debe confirmar la vía.".format(int(ing.loc[mal, "TOTAL"].sum())))
    g = ing.assign(d=dia(ing["DIA"]), e=ing["O.R."].map(estado), p=ing["PUNTO DE INTERNACION"].map(punto), n=ing["NACIONALIDAD"].map(nacionalidad)) \
           .groupby(["d", "e", "p", "vi", "n"], as_index=False)["TOTAL"].sum()
    ING = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "p": [P(x) for x in g["p"]], "vi": g["vi"].tolist(),
           "n": [N(x) for x in g["n"]], "v": g["TOTAL"].astype(int).tolist()}

    # Segunda revisión · r = 1 rechazo, 0 internación
    g = seg.assign(d=dia(seg["DIA"]), e=seg["O.R."].map(estado), p=seg["PUNTO DE INTERNACION"].map(punto), n=seg["NACIONALIDAD"].map(nacionalidad),
                   r=seg["DETERMINACION"].map(lambda x: 1 if norm(x).startswith("RECHAZ") else 0)) \
           .groupby(["d", "e", "p", "n", "r"], as_index=False)["TOTAL"].sum()
    SEG = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "p": [P(x) for x in g["p"]], "n": [N(x) for x in g["n"]],
           "r": g["r"].tolist(), "v": g["TOTAL"].astype(int).tolist()}
    mx = int(seg.loc[seg["NACIONALIDAD"].map(norm) == "MEXICO", "TOTAL"].sum())
    if mx:
        calidad.append("%d casos de segunda revisión vienen con nacionalidad mexicana; no se cuentan." % mx)
        lector.avisar("Segunda revisión", "{:,} casos de segunda revisión vienen con nacionalidad mexicana. No se cuentan: a un mexicano no se le niega la entrada, así que no son casos de revisión de extranjeros.".format(mx))

    # Presentados en estación o estancia
    g = pre.assign(d=dia(pre["DIA"]), e=pre["O.R."].map(estado), s=pre["ESTACION O ESTANCIA MIGRATORIA"].map(estacion), n=pre["NACIONALIDAD"].map(nacionalidad)) \
           .groupby(["d", "e", "s", "n"], as_index=False)["PRESENTADOS"].sum()
    PRE = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "s": [S(x) for x in g["s"]], "n": [N(x) for x in g["n"]], "v": g["PRESENTADOS"].astype(int).tolist()}

    # Retornados a su país: deportados y retornos asistidos
    g = ret.assign(d=dia(ret["DIA"]), e=ret["O.R."].map(estado), n=ret["NACIONALIDAD"].map(nacionalidad)) \
           .groupby(["d", "e", "n"], as_index=False)[["DEPORTADOS", "RETORNOS ASISTIDOS"]].sum()
    RET = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "n": [N(x) for x in g["n"]],
           "dep": g["DEPORTADOS"].astype(int).tolist(), "ra": g["RETORNOS ASISTIDOS"].astype(int).tolist()}

    # Canalizados · la fecha de nacimiento nunca sale: solo el grupo de edad a la fecha del evento
    edad = (nna["DIA"] - pd.to_datetime(nna["FECHA DE NACIMIENTO"], errors="coerce")).dt.days / 365.25
    nna["ge"] = pd.cut(edad, [-1, 5.999, 11.999, 17.999, 200], labels=False).fillna(-1).astype(int)
    mayores = int((nna["ge"] == 3).sum())
    if mayores:
        calidad.append("%d registros del archivo de NNA tienen 18 años o más a la fecha del evento; no se cuentan como NNA." % mayores)
        lector.avisar("Canalizados NNA", "{:,} registros tienen 18 años o más a la fecha del evento. No se cuentan como NNA (niñas, niños y adolescentes son menores de 18).".format(mayores))
    g = nna.assign(d=dia(nna["DIA"]), e=nna["O.R."].map(estado), n=nna["NACIONALIDAD"].map(nacionalidad), sx=nna["SEXO"].map(lambda x: 1 if norm(x) == "MUJER" else 0),
                   c=nna["CLASIFICACION"].map(lambda x: next((i for i, m in enumerate(CLASES) if norm(m) == norm(x)), 0)), m=nna["MOTIVO DE SALIDA"].map(motivo)) \
           .groupby(["d", "e", "n", "sx", "ge", "c", "m"], as_index=False).size()
    NNA = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "n": [N(x) for x in g["n"]], "s": g["sx"].tolist(),
           "g": g["ge"].tolist(), "c": g["c"].tolist(), "m": g["m"].tolist(), "v": g["size"].tolist()}
    g = adu.assign(d=dia(adu["DIA"]), e=adu["O.R."].map(estado), n=adu["NACIONALIDAD"].map(nacionalidad),
                   sx=adu["SEXO"].map(lambda x: 1 if norm(x) == "MUJER" else 0), m=adu["MOTIVO DE SALIDA"].map(motivo)) \
           .groupby(["d", "e", "n", "sx", "m"], as_index=False).size()
    ADU = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "n": [N(x) for x in g["n"]], "s": g["sx"].tolist(), "m": g["m"].tolist(), "v": g["size"].tolist()}

    # Lo que reporta cada O.R. (archivo de rescates): rescatados, 1.ª vez, reincidentes y su destino
    r = res[(res["DIA"] >= ini) & (res["DIA"] <= fin)]
    cols = ["TOTAL", "1RA VEZ", "REINCIDENTES", "PRESENTADOS EN ESTACIONES MIGRATORIAS", "CANALIZADOS AL DIF"]
    r = r.copy()
    for c in cols:
        r[c] = pd.to_numeric(r[c], errors="coerce").fillna(0)
    r["TOTAL"] = r["1RA VEZ"] + r["REINCIDENTES"]          # igual que convertir.py: el total es 1.ª vez + reincidentes (si el archivo no cuadra, se avisa en Bases)
    g = r.assign(d=dia(r["DIA"]), e=r["O.R."].map(estado), n=r["NACIONALIDAD"].map(nacionalidad)).groupby(["d", "e", "n"], as_index=False)[cols].sum()
    g = g[g[cols].sum(axis=1) > 0]
    ORR = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "n": [N(x) for x in g["n"]], "v": g["TOTAL"].astype(int).tolist(), "pv": g["1RA VEZ"].astype(int).tolist(),
           "rei": g["REINCIDENTES"].astype(int).tolist(), "pre": g["PRESENTADOS EN ESTACIONES MIGRATORIAS"].astype(int).tolist(), "can": g["CANALIZADOS AL DIF"].astype(int).tolist()}

    # Extranjeros recibidos de EE. UU. (reporte de las O.R.): adultos y menores
    rec, f_rec = leer(a.origen, {"EXTRANJEROS RECIBIDOS DE EE.UU.", "MENORES"}, base="Recibidos de EE. UU.")
    rec = rec[(rec["DIA"] >= ini) & (rec["DIA"] <= fin)]
    g = rec.assign(d=dia(rec["DIA"]), e=rec["O.R."].map(estado), n=rec["NACIONALIDAD"].map(nacionalidad)).groupby(["d", "e", "n"], as_index=False)[["ADULTOS", "MENORES"]].sum()
    REC = {"d": g["d"].tolist(), "e": [E(x) for x in g["e"]], "n": [N(x) for x in g["n"]], "ad": g["ADULTOS"].astype(int).tolist(), "me": g["MENORES"].astype(int).tolist()}

    # ==== [4] SALIDA ==============================================
    out = {"inicio": ini.strftime("%Y-%m-%d"), "dias": int((fin - ini).days) + 1,
           "archivos": [f_ing, f_seg, f_pre, f_ret, f_nna, f_adu, f_res, f_rec],
           "dic": {"e": E.l, "n": N.l, "p": P.l, "s": S.l}, "vias": ["Aérea", "Terrestre", "Cruceros"],
           "motivos": MOTIVOS, "clases": CLASES, "edades": ["0–5", "6–11", "12–17", "18 o más"], "calidad": calidad,
           "ing": ING, "seg": SEG, "pre": PRE, "ret": RET, "nna": NNA, "adu": ADU, "orr": ORR, "rec": REC}
    # último día con datos de cada tabla: cada base tiene su propio corte (Pregunta a INAMI cuenta «últimos 30 días» desde ahí)
    out["fin"] = {k: (max(T["d"]) if T["d"] else 0) for k, T in (("ing", ING), ("seg", SEG), ("pre", PRE), ("ret", RET), ("nna", NNA), ("adu", ADU), ("orr", ORR), ("rec", REC))}
    os.makedirs(a.destino, exist_ok=True)
    ruta = os.path.join(a.destino, "control.js")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("window.IANAMI_CVM=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("Escrito", ruta, "·", os.path.getsize(ruta) // 1024, "KB")
    for c in calidad:
        print("Calidad:", c)
    lector.guardar(a.destino, "control")


if __name__ == "__main__":
    main()
