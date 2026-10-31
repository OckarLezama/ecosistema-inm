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
ESTADO = {norm(e): e for e in C.ESTADOS}


def nacionalidad(x):
    if pd.isna(x) or norm(x) in ("", "NAN", "NONE"):
        return "Sin dato"
    n = ALIAS.get(norm(x), norm(x))
    return CORTO.get(n) or ("México" if n in ("MEXICO", "ESTADOS UNIDOS MEXICANOS") else str(x).strip().title())


# Documento expedido: 7 tarjetas (condición de estancia) y 5 documentos más
DOCUMENTOS = [
    ("TARJETA DE RESIDENTE PERMANENTE", "Res. Permanente"),
    ("TARJETA DE RESIDENTE TEMPORAL", "Res. Temporal"),
    ("TARJETA DE RESIDENTE TEMPORAL ESTUDIANTE", "Res. T. Estudiante"),
    ("TARJETA DE VISITANTE POR RAZONES HUMANITARIAS", "Vis. Humanitario"),
    ("TARJETA DE VISITANTE REGIONAL", "Vis. Regional"),
    ("TARJETA DE VISITANTE TRABAJADOR FRONTERIZO", "Vis. Trab. Fronterizo"),
    ("TARJETA DE VISITANTE CON FINES DE ADOPCION", "Vis. Adopción"),
    ("TARJETA SIN TIPO REGISTRADO", "Tarjeta sin tipo registrado"),    # terminó con tarjeta, pero la base no dice cuál
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
    t = t[t["DIA"].notna()].copy()
    # Columnas de plazo y motivo (desde 2026 vienen en todos los periodos). Sin ellas, el tablero simplemente no muestra Plazos.
    hay = {"PLAZO NORMATIVO DE RESOLUCION", "DIAS DE RESOLUCION / TRANSCURIDOS SIN RESOLVER", "DENTRO O FUERA DEL PLAZO NORMATIVO"} <= set(t.columns)
    t["MOTIVO"] = (t["MOTIVO DE ESTANCIA"].astype(str).str.strip().str.capitalize().replace({"Tiempo": "Por tiempo", "Nan": "Sin dato"})
                   if "MOTIVO DE ESTANCIA" in t.columns else "Sin dato")
    t["F"] = t["DENTRO O FUERA DEL PLAZO NORMATIVO"].map(lambda x: 1 if "FUERA" in norm(x) else 0) if hay else 0
    m = t.melt(id_vars=["DIA", "O.R.", "OFICINA DE TRAMITES", "PAIS / EMPLEADOR", "SEXO", "RANGOS DE EDAD", "TIPO DE TRAMITE", "TIPO DE RESOLUCION ESPECIFICA", "TIPO DE RESOLUCION GENERAL", "MOTIVO", "F"],
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
    m["m"] = m["MOTIVO"]
    m["f"] = m["F"].astype(int)
    g = m.groupby(["DIA", "e", "o", "n", "s", "a", "t", "r", "g", "c", "m", "f"], as_index=False)["v"].sum()
    pz = None
    if hay:   # un renglón por trámite: días de resolución (o transcurridos si sigue en proceso) en rangos, y su suma
        x = pd.DataFrame({"DIA": t["DIA"], "e": t["O.R."].map(lambda v: ESTADO.get(norm(v), str(v).strip())), "o": t["OFICINA DE TRAMITES"].astype(str).str.strip(),
                          "t": t["TIPO DE TRAMITE"].astype(str).str.strip(), "g": t["TIPO DE RESOLUCION GENERAL"].astype(str).str.strip(), "f": t["F"].astype(int),
                          "dd": pd.to_numeric(t["DIAS DE RESOLUCION / TRANSCURIDOS SIN RESOLVER"], errors="coerce").fillna(0).clip(lower=0),
                          "pl": pd.to_numeric(t["PLAZO NORMATIVO DE RESOLUCION"], errors="coerce").fillna(0)})
        x["b"] = pd.cut(x["dd"], [-1, 0, 3, 7, 15, 30, 60, 90, 180, 1e9], labels=False).astype(int)
        x["v"] = 1
        pz = x.groupby(["DIA", "o", "t", "g", "f", "b"], as_index=False)   # el estado sale de la oficina (ofiEst)
        pz = pz.agg(v=("v", "sum"), sd=("dd", "sum"))
        pz.attrs["plazo"] = x.groupby("t")["pl"].agg(lambda s: int(s.mode().iloc[0])).to_dict()
    return g, pz


def vigentes(origen):
    """Documentos vigentes: estado × países (los 25 que trae el archivo) y tipo de tarjeta × sexo."""
    o = {}
    for ruta in lector.por_entrega(glob.glob(os.path.join(origen, "*.xlsx")), origen):   # si hay varias entregas, la más reciente queda al final y manda
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
            o["dv_n"] = filas                      # todas las nacionalidades (el buscador las necesita todas)
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


def _encabezado_va(ruta):
    """Hoja visible y renglón del encabezado (el archivo puede traer renglones vacíos arriba)."""
    import openpyxl
    libro = openpyxl.load_workbook(ruta, read_only=True)
    try:
        for h in libro.worksheets:
            if h.sheet_state != "visible":
                continue
            for k, fila in enumerate(h.iter_rows(max_row=8, values_only=True)):
                if "RESULTADO DE LA VALIDACION" in {norm(c) for c in fila if c is not None}:
                    return h.title, k
            return None, None
    finally:
        libro.close()
    return None, None


def _resultado(x):
    n = norm(x)
    if "PENDIENTE" in n:
        return "Pendiente"
    if "NO VALID" in n or "NO LOCALIZ" in n or "INEXISTENTE" in n:
        return "No válida"
    if "VALID" in n or "LOCALIZADO" in n:
        return "Válida"
    return "Respuesta poco clara" if "CLARA" in n else str(x).strip().capitalize()


def validaciones(origen):
    """Validación de actas del Registro Civil. Nunca se publican número de acta, oficialía, libro ni municipio.
    Desde oct 2026 llega la base histórica (may 2025 en adelante), con un renglón vacío arriba del encabezado."""
    base = "Validación del Registro Civil"
    # Entregas: la base completa o solo las solicitudes nuevas de la semana. Se juntan como las demás bases:
    # de la más antigua a la más reciente, cada entrega manda en su periodo de fechas de solicitud.
    junto, usados = None, []
    for ruta in lector.por_entrega(glob.glob(os.path.join(origen, "*.xlsx")), origen):
        if os.path.basename(ruta).startswith("~$"):
            continue
        filas = _filas_va(ruta, base)
        if filas is None or not len(filas):
            continue
        if junto is not None:
            a0, a1 = filas["fs"].min(), filas["fs"].max()
            junto = junto[(junto["fs"] < a0) | (junto["fs"] > a1)]
            if not len(junto):
                usados = []                                     # la entrega nueva trae todo: reemplaza a las anteriores
        junto = filas if junto is None else pd.concat([junto, filas], ignore_index=True)
        usados.append(os.path.basename(ruta))
    if junto is None:
        return {}
    filas = junto.reset_index(drop=True)                     # en el orden de los archivos (como antes)
    ruta = usados[-1]
    if len(usados) > 1:
        lector.avisar(base, "Se juntaron " + str(len(usados)) + " entregas: " + ", ".join(usados) + " (cada una manda en su periodo de fechas de solicitud).")
    ini = filas["fs"].min()
    poco = filas.groupby(filas["fs"].dt.to_period("M")).size()
    if len(poco) > 3 and poco.iloc[:4].sum() < 0.01 * len(filas):
        lector.corregir(base, f"Hay {int(poco.iloc[:4].sum())} solicitudes antes de {str(poco.index[4])}; la base completa empieza en mayo de 2025 (revisar si son fechas mal capturadas).")
    dic = {k: sorted(filas[k].dropna().unique().tolist()) for k in ("ofr", "ent", "n", "t", "acto", "res", "sol")}
    lector.periodo(base, ini.date(), filas["fs"].max().date(), ", ".join(usados), len(filas))
    print(f"Validación del Registro Civil: {len(filas):,} solicitudes del {ini.date()} al {filas['fs'].max().date()} · " +
          ", ".join(f"{k} {v:,}" for k, v in filas["res"].value_counts().items()))
    return {"va_ini": ini.date().isoformat(), "va_dic": dic, "va_archivo": ", ".join(usados),
            "va": [[int((r.fs - ini).days), int((r.fs - r.fr).days) if pd.notna(r.fr) else -1] + [dic[k].index(getattr(r, k)) for k in ("ofr", "ent", "n", "t", "acto", "res", "sol")] for r in filas.itertuples()]}


def _filas_va(ruta, base):
    """Solicitudes de una entrega, ya limpias (sin número de acta, oficialía, libro ni municipio). None si no es la base."""
    hoja, k = _encabezado_va(ruta)
    if hoja is None:
        return None
    t = pd.read_excel(ruta, sheet_name=hoja, header=k)
    t = t[[c for c in t.columns if not str(c).startswith("Unnamed")]]
    t.columns = [norm(c).replace("OR SOLICITANTE", "O.R. SOLICITANTE") for c in t.columns]
    t = t[t["FECHA DE SOLICITUD"].notna() | t["RESULTADO DE LA VALIDACION"].notna()]
    fs = pd.to_datetime(t["FECHA DE SOLICITUD"], errors="coerce").dt.normalize()
    fr = pd.to_datetime(t["FECHA DE REGISTRO"], errors="coerce").dt.normalize()
    mala = fr.notna() & ((fr.dt.year < 1900) | (fr > fs))
    if mala.any():
        lector.corregir(base, f"{int(mala.sum()):,} actas con fecha de registro imposible (antes de 1900, en el futuro o después de la solicitud); "
                            "no entran en «matrimonio de 30 días o menos».")
        fr = fr.where(~mala)
    sinf = int(fs.isna().sum())
    if sinf:
        lector.corregir(base, f"{sinf:,} solicitudes sin fecha de solicitud válida (no se cuentan).")
    quita_or = lambda x: re.sub(r"^O\.?R\.?\s+", "", str(x).strip(), flags=re.I)
    ent = t["ENTIDAD FEDERATIVA DE REGISTRO"].map(lambda x: ESTADO.get(norm(str(x).replace("_", " ")), str(x).replace("_", " ").title()))
    orr = t["O.R. QUE REPORTA"].map(lambda x: ESTADO.get(norm(quita_or(x)), quita_or(x)))
    sol = t["O.R. SOLICITANTE DE VALIDACIONES"].fillna("Sin dato").astype(str).str.strip()
    res = t["RESULTADO DE LA VALIDACION"].map(_resultado)
    tipo = t["TIPO DE TRAMITE MIGRATORIO"].astype(str).str.strip()
    if "TIPO DE ACTO REGISTRAL" not in t.columns:                   # desde oct 2026 algunas entregas ya no traen esta columna
        lector.corregir(base, os.path.basename(ruta)+": no trae «TIPO DE ACTO REGISTRAL»; esas solicitudes quedan como «Sin dato» en el tipo de acta.")
    acto = t["TIPO DE ACTO REGISTRAL"].astype(str).str.strip().str.capitalize() if "TIPO DE ACTO REGISTRAL" in t.columns else pd.Series("Sin dato", index=t.index)
    filas = pd.DataFrame({"fs": fs, "fr": fr, "ofr": orr, "ent": ent, "n": t["NACIONALIDAD"].map(nacionalidad), "t": tipo, "acto": acto, "res": res, "sol": sol})
    filas = filas[filas["fs"].notna()]
    for k in ("ofr", "ent", "n", "t", "acto", "res", "sol"):
        filas[k] = filas[k].where(filas[k].notna() & (filas[k].astype(str).str.strip().str.lower() != "nan"), "Sin dato")
    return filas


# ==== [3] SALIDA ==================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    t, archivo = leer(a.origen)
    g, pz = codificar(t)
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
    for k in ("s", "a", "c", "f"):
        cols[k] = g[k].astype(int).tolist()
    orden = list(g.groupby("m")["v"].sum().sort_values(ascending=False).index)
    dic["m"] = orden
    cols["m"] = g["m"].map({x: i for i, x in enumerate(orden)}).astype(int).tolist()
    cols["v"] = g["v"].astype(int).tolist()
    # oficina → estado al que pertenece
    oe = g.groupby("o")["e"].agg(lambda s: s.value_counts().index[0])
    salida["ofiEst"] = [dic["e"].index(oe[o]) for o in dic["o"]]
    salida["dic"] = dic
    if pz is not None:   # Plazos: mismos catálogos (estado, oficina, tipo de trámite, resolución general)
        ix = {k: {x: i for i, x in enumerate(dic[k])} for k in ("o", "t", "g")}
        pz = pz[pz["o"].isin(ix["o"]) & pz["t"].isin(ix["t"]) & pz["g"].isin(ix["g"])]
        salida["pz"] = {"d": (pz["DIA"] - inicio).dt.days.astype(int).tolist(), **{k: pz[k].map(ix[k]).astype(int).tolist() for k in ("o", "t", "g")},
                        "f": pz["f"].astype(int).tolist(), "b": pz["b"].astype(int).tolist(), "v": pz["v"].astype(int).tolist(), "sd": pz["sd"].round().astype(int).tolist()}
        salida["pzPlazo"] = [pz.attrs.get("plazo", {}).get(x, 0) for x in dic["t"]]
        salida["pzRangos"] = ["0 días", "1–3", "4–7", "8–15", "16–30", "31–60", "61–90", "91–180", "más de 180"]
    salida.update(vigentes(a.origen))
    salida.update(validaciones(a.origen))
    salida["cols"] = cols
    os.makedirs(a.destino, exist_ok=True)
    # Plazos va en su propio archivo (datos/plazos.js): así ningún archivo pasa de ~25 MB
    pzs = {k: salida.pop(k) for k in ("pz", "pzPlazo", "pzRangos") if k in salida}
    with open(os.path.join(a.destino, "plazos.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_REG_PZ=" + json.dumps(pzs, ensure_ascii=False, separators=(",", ":")) + ";\n")
    txt = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(a.destino, "regulacion.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_REG=" + txt + ";\n")
    print(f"regulacion.js: {len(g):,} renglones · {len(txt.encode('utf-8')) / 1e6:.2f} MB")
    lector.guardar(a.destino, "regulacion")


if __name__ == "__main__":
    main()
