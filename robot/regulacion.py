# -*- coding: utf-8 -*-
"""
IA-NAMI · CONVERTIDOR DE REGULACIÓN (DGRAM)
===========================================
Lee la base de trámites migratorios y genera datos/regulacion.js: una tabla
de hechos por día con columnas codificadas (estado, oficina, nacionalidad,
sexo, edad, tipo de trámite, resolución, condición de estancia, valor).
La página calcula todo (periodos, cruces y comparativos) sobre esa tabla.

Uso (desde la raíz del repositorio):
    python robot/regulacion.py --origen DATA --destino datos

ÍNDICE
  [1] UTILIDADES
  [2] LECTURA Y CODIFICACIÓN
  [3] DOCUMENTOS VIGENTES Y VALIDACIONES DEL REGISTRO CIVIL · SALIDA
"""
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


ALIAS = {norm(k): norm(v) for k, v in getattr(C, "ALIAS_NACIONALIDAD", {}).items()}
CORTO = {norm(a): b for a, b, iso in C.NACIONALIDADES}
ESTADO = {norm(e): e for e in C.ESTADOS}


def nacionalidad(x):
    n = ALIAS.get(norm(x), norm(x))
    return CORTO.get(n) or str(x).strip().title()


# Documento expedido: 7 tarjetas (condición de estancia) y 5 documentos más
DOCUMENTOS = [
    ("TARJETA DE RESIDENTE PERMANENTE", "Res. Permanente"),
    ("TARJETA DE RESIDENTE TEMPORAL", "Res. Temporal"),
    ("TARJETA DE RESIDENTE TEMPORAL ESTUDIANTE", "Res. T. Estudiante"),
    ("TARJETA DE VISITANTE POR RAZONES HUMANITARIAS", "Vis. Humanitario"),
    ("TARJETA DE VISITANTE REGIONAL", "Vis. Regional"),
    ("TARJETA DE VISITANTE TRABAJADOR FRONTERIZO", "Vis. Trab. Fronterizo"),
    ("TARJETA DE VISITANTE CON FINES DE ADOPCION", "Vis. Adopción"),
    ("TARJETA SIN TIPO REGISTRADO", "Tarjeta sin tipo"),    # terminó con tarjeta, pero la base no dice cuál
    ("CONSTANCIA DE INSCRIPCION DE EMPLEADOR", "Constancia de empleador"),
    ("OFICIO DE AUTORIZACION S.R.E.", "Oficio S.R.E."),
    ("OFICIO DE NOTIFICACION DE CAMBIO", "Oficio de cambio"),
    ("PERMISO SALIDA Y REGRESO", "Permiso salida y regreso"),
    ("SIN EXPEDICION DE DOCUMENTO MIGRATORIO", "Sin expedición"),
]
CONDICIONES = [d[1] for d in DOCUMENTOS]
TARJETAS = 8                                       # las primeras 8 son tarjetas; luego constancias y oficios; al final «Sin expedición»
EDADES = ["00", "12", "18", "25", "35", "45", "55", "65"]


# ==== [2] LECTURA Y CODIFICACIÓN ==================================
def leer(origen):
    t, archivos = lector.leer_por_columnas(origen, {"TIPO DE TRAMITE", "PAIS / EMPLEADOR", "OFICINA DE TRAMITES"}, "Trámites")
    if t is not None:
        return t, ", ".join(archivos)
    sys.exit("No se encontró la base de trámites migratorios en " + origen)


def codificar(t):
    t.columns = [norm(c) for c in t.columns]
    t, docs = lector.documentos_tramite(t)
    t["DIA"] = pd.to_datetime(t["DIA"], errors="coerce", dayfirst=True).dt.normalize()
    t = t[t["DIA"].notna()]
    m = t.melt(id_vars=["DIA", "O.R.", "OFICINA DE TRAMITES", "PAIS / EMPLEADOR", "SEXO", "RANGOS DE EDAD", "TIPO DE TRAMITE", "TIPO DE RESOLUCION ESPECIFICA", "TIPO DE RESOLUCION GENERAL"],
               value_vars=docs, var_name="doc", value_name="v")
    m["v"] = pd.to_numeric(m["v"], errors="coerce").fillna(0)
    m = m[m["v"] > 0].copy()
    claves = [d[0] for d in DOCUMENTOS]
    desconocidos = sorted({d for d in m["doc"].unique() if norm(d) not in claves})
    if desconocidos:
        print("Documentos que no están en el catálogo (se omiten): " + ", ".join(desconocidos))
    m = m[m["doc"].map(lambda d: norm(d) in claves)].copy()
    m["c"] = m["doc"].map(lambda d: claves.index(norm(d)))
    m["e"] = m["O.R."].map(lambda x: ESTADO.get(norm(x), str(x).strip()))
    m["n"] = m["PAIS / EMPLEADOR"].map(nacionalidad)
    m["s"] = m["SEXO"].map(lambda x: {"HOMBRE": 0, "MUJER": 1}.get(norm(x), 2))
    m["a"] = m["RANGOS DE EDAD"].map(lambda x: EDADES.index(str(x).strip()[:2]) if str(x).strip()[:2] in EDADES else -1)
    m["o"] = m["OFICINA DE TRAMITES"].astype(str).str.strip()
    m["t"] = m["TIPO DE TRAMITE"].astype(str).str.strip()
    m["r"] = m["TIPO DE RESOLUCION ESPECIFICA"].astype(str).str.strip()
    m["g"] = m["TIPO DE RESOLUCION GENERAL"].astype(str).str.strip()
    g = m.groupby(["DIA", "e", "o", "n", "s", "a", "t", "r", "g", "c"], as_index=False)["v"].sum()
    return g


def vigentes(origen):
    """Documentos vigentes: estado × países (los 25 que trae el archivo) y tipo de tarjeta × sexo."""
    o = {}
    for ruta in sorted(glob.glob(os.path.join(origen, "*.xlsx"))):
        fila0 = [norm(x) for x in lector.primera_fila(ruta)]
        if not ("OTROS PAISES" in fila0 or (fila0 and fila0[0] in ("NACIONALIDAD", "O.R.") and "TOTAL GENERAL" in fila0)):
            continue                                         # solo se abren completos los archivos de documentos vigentes
        t = pd.read_excel(ruta, header=None)
        fila0 = [norm(x) for x in t.iloc[0].tolist()]
        if "OTROS PAISES" in fila0:
            t.columns = [str(x).strip() for x in t.iloc[0]]
            t = t.iloc[1:]
            t = t[t["O.R."].notna() & ~t["O.R."].astype(str).str.upper().str.contains("TOTAL")]
            paises = [c for c in t.columns[4:]]
            o["dv_e"] = [ESTADO.get(norm(x), str(x).strip()) for x in t["O.R."]]
            o["dv_p"] = [nacionalidad(x) for x in paises]
            o["dv_m"] = [[int(pd.to_numeric(v, errors="coerce") or 0) for v in fila] for fila in t[paises].values.tolist()]
            o["dv_et"] = [int(x) for x in pd.to_numeric(t[t.columns[1]], errors="coerce").fillna(0)]
            o["dv_otros"] = [int(x) for x in pd.to_numeric(t[t.columns[2]], errors="coerce").fillna(0)]
        elif fila0 and fila0[0] == "NACIONALIDAD" and "TOTAL GENERAL" in fila0:
            hdr = pd.Series(t.iloc[0].tolist()).ffill().tolist()
            cuerpo = t.iloc[2:]
            cuerpo = cuerpo[cuerpo[0].notna() & ~cuerpo[0].astype(str).str.upper().str.contains("TOTAL")]
            num = lambda c: pd.to_numeric(cuerpo[c], errors="coerce").fillna(0).astype(int)
            tipos = [" ".join(str(hdr[i]).replace("Tarjeta de ", "").split()) for i in range(4, len(hdr), 3)]
            filas = [[nacionalidad(n), int(h), int(m)] + [int(x) for x in tipo] for n, h, m, tipo in
                     zip(cuerpo[0], num(1), num(2), zip(*[num(i + 2) for i in range(4, len(hdr), 3)]))]
            filas.sort(key=lambda f: -(f[1] + f[2]))
            o["dv_n"] = filas[:40]
            o["dv_nt"] = tipos
        elif fila0 and fila0[0] == "O.R." and "TOTAL GENERAL" in fila0:
            hdr = pd.Series(t.iloc[0].tolist()).ffill().tolist()
            cuerpo = t.iloc[2:]
            cuerpo = cuerpo[~cuerpo[0].astype(str).str.upper().str.contains("TOTAL")]
            o["dv_tipo"] = [[" ".join(str(hdr[i]).replace("Tarjeta de ", "").split()), int(pd.to_numeric(cuerpo[i], errors="coerce").sum()), int(pd.to_numeric(cuerpo[i + 1], errors="coerce").sum())]
                            for i in range(4, len(hdr), 3)]
            # estado × tipo de documento: [estado, hombres, mujeres, total por tipo en el orden de dv_tipo]
            cuerpo = cuerpo[cuerpo[0].notna()]
            num = lambda c: pd.to_numeric(cuerpo[c], errors="coerce").fillna(0).astype(int).tolist()
            o["dv_ed"] = [[ESTADO.get(norm(e), str(e).strip()), h, m] + list(tp) for e, h, m, tp in
                          zip(cuerpo[0], num(1), num(2), zip(*[num(i + 2) for i in range(4, len(hdr), 3)]))]
    return o


def validaciones(origen):
    """Validación de actas del Registro Civil. Nunca se publican número de acta, oficialía, libro ni municipio."""
    for ruta in sorted(glob.glob(os.path.join(origen, "*.xlsx"))):
        if "RESULTADO DE LA VALIDACION" not in {norm(c) for c in lector.primera_fila(ruta)}:
            continue
        t = pd.read_excel(ruta)
        t.columns = [norm(c) for c in t.columns]
        fs = pd.to_datetime(t["FECHA DE SOLICITUD"], errors="coerce").dt.normalize()
        fr = pd.to_datetime(t["FECHA DE REGISTRO"], errors="coerce").dt.normalize()
        ent = t["ENTIDAD FEDERATIVA DE REGISTRO"].map(lambda x: ESTADO.get(norm(str(x).replace("_", " ")), str(x).replace("_", " ").title()))
        orr = t["O.R. QUE REPORTA"].map(lambda x: ESTADO.get(norm(x), str(x).strip()))
        sol = t["O.R. SOLICITANTE DE VALIDACIONES"].fillna("Sin dato").astype(str).str.strip()
        res = t["RESULTADO DE LA VALIDACION"].map(lambda x: "Válida" if "VALID" in norm(x) else "Pendiente" if "PENDIENTE" in norm(x) else str(x).strip().capitalize())
        tipo = t["TIPO DE TRAMITE MIGRATORIO"].astype(str).str.strip()
        filas = pd.DataFrame({"fs": fs, "fr": fr, "ofr": orr, "ent": ent, "n": t["NACIONALIDAD"].map(nacionalidad), "t": tipo, "acto": t["TIPO DE ACTO REGISTRAL"].astype(str).str.strip(), "res": res, "sol": sol})
        filas = filas[filas["fs"].notna()]
        dic = {k: sorted(filas[k].dropna().unique().tolist()) for k in ("ofr", "ent", "n", "t", "acto", "res", "sol")}
        ini = filas["fs"].min()
        return {"va_ini": ini.date().isoformat(), "va_dic": dic, "va_archivo": os.path.basename(ruta),
                "va": [[int((r.fs - ini).days), int((r.fs - r.fr).days) if pd.notna(r.fr) else -1] + [dic[k].index(getattr(r, k)) for k in ("ofr", "ent", "n", "t", "acto", "res", "sol")] for r in filas.itertuples()]}
    return {}


# ==== [3] SALIDA ==================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    t, archivo = leer(a.origen)
    g = codificar(t)
    inicio = g["DIA"].min()
    dic = {}
    salida = {"inicio": inicio.date().isoformat(), "dias": int((g["DIA"].max() - inicio).days) + 1, "archivo": archivo,
              "condiciones": CONDICIONES, "tarjetas": TARJETAS, "edades": ["0–11", "12–17", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"], "sexos": ["Hombres", "Mujeres", "Empleador"]}
    cols = {"d": (g["DIA"] - inicio).dt.days.astype(int).tolist()}
    for k in ("e", "o", "n", "t", "r", "g"):
        orden = list(g.groupby(k)["v"].sum().sort_values(ascending=False).index)
        dic[k] = orden
        idx = {x: i for i, x in enumerate(orden)}
        cols[k] = g[k].map(idx).astype(int).tolist()
    for k in ("s", "a", "c"):
        cols[k] = g[k].astype(int).tolist()
    cols["v"] = g["v"].astype(int).tolist()
    # oficina → estado al que pertenece
    oe = g.groupby("o")["e"].agg(lambda s: s.value_counts().index[0])
    salida["ofiEst"] = [dic["e"].index(oe[o]) for o in dic["o"]]
    salida["dic"] = dic
    salida.update(vigentes(a.origen))
    salida.update(validaciones(a.origen))
    salida["cols"] = cols
    os.makedirs(a.destino, exist_ok=True)
    txt = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(a.destino, "regulacion.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_REG=" + txt + ";\n")
    print(f"regulacion.js: {len(g):,} renglones · {len(txt.encode('utf-8')) / 1e6:.2f} MB")
    lector.guardar(a.destino, "regulacion")


if __name__ == "__main__":
    main()
