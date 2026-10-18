# -*- coding: utf-8 -*-
"""
IA-NAMI · CONSOLIDACIÓN PERIÓDICA DE LAS BASES
==============================================
Con el tiempo cada base junta muchos archivos (días nuevos y correcciones). Este robot los junta en uno solo
por base, con las mismas reglas de robot/lector.py (gana la entrega más reciente; cada archivo manda en su rango),
y guarda los originales en DATA/_reemplazados/AAAA-MM-DD/ (los robots no leen subcarpetas; nada se borra).

  python robot/consolidar.py              → solo dice qué haría (no mueve nada)
  python robot/consolidar.py --aplicar    → escribe el consolidado y guarda los originales

Antes de mover, revisa que el consolidado dé exactamente los mismos renglones y totales por día que los originales;
si no cuadra, no mueve nada. Sugerido: cada 3 meses, o cuando una base pase de unos 10 archivos.
Después de --aplicar: correr los robots como siempre y subir DATA y datos con GitHub Desktop.
"""
import argparse
import datetime as dt
import os
import re
import shutil
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lector  # noqa: E402
import convertir  # noqa: E402

FILAS_HOJA = 1_000_000          # Excel admite 1,048,576 renglones por hoja


def prefijo(nombres):
    """Nombre común de la base: «DGCOR RESCATES» de «DGCOR RESCATES 2026-09.xlsx», «DGCOR RESCATES CORRECCION…»."""
    limpio = [re.sub(r"(?i)\b(correcci[oó]n|consolidado|entregad[oa]|recibid[oa]|al|a)\b|20\d\d(-\d\d){0,2}|\d{1,2}[a-z]{3}20\d\d|\.xlsx$", " ", n) for n in nombres]
    limpio = [" ".join(x.split()) for x in limpio]
    p = os.path.commonprefix(limpio).strip(" _-")
    return p or limpio[0]


def por_dia(t):
    med = next((c for c in lector.MEDIDAS if c in t.columns), None)
    d = pd.to_datetime(t["DIA"]).dt.normalize()
    v = pd.to_numeric(t[med], errors="coerce").fillna(0) if med else pd.Series(1, index=t.index)
    return pd.DataFrame({"d": d, "v": v}).groupby("d")["v"].agg(["size", "sum"])


def main():
    ap = argparse.ArgumentParser(description="Junta los archivos de cada base en uno solo y guarda los originales.")
    ap.add_argument("--origen", default="DATA")
    ap.add_argument("--aplicar", action="store_true", help="escribe el consolidado y mueve los originales (sin esto solo informa)")
    ap.add_argument("--minimo", type=int, default=2, help="consolidar solo bases con al menos este número de archivos")
    a = ap.parse_args()
    grupos = {}
    for f in sorted(os.listdir(a.origen)):
        if not f.lower().endswith(".xlsx") or f.startswith("~$"):
            continue
        ruta = os.path.join(a.origen, f)
        fila = lector.encabezados(lector.primera_fila(ruta, convertir.ACEPTA))
        clave = convertir.reconocer(None, set(fila))
        if clave and "DIA" in fila and clave not in convertir.PENDIENTES:
            grupos.setdefault(clave, []).append(f)
    hoy = dt.date.today().isoformat()
    guarda = os.path.join(a.origen, "_reemplazados", hoy)
    hecho = 0
    for clave, l in grupos.items():
        base = convertir.NOMBRES.get(clave, clave)
        if len(l) < a.minimo:
            print(f"{base}: {len(l)} archivo, no hace falta consolidar.")
            continue
        partes = []
        for f in l:
            t, _ = lector.tabla_de(os.path.join(a.origen, f), base, convertir.ACEPTA)
            partes.append((f, t))
        orig = partes[0][1].attrs.get("orig") or list(partes[0][1].columns)
        orig = [lector.ALIAS.get(lector.norm(c), c) for c in orig]
        junto = lector.juntar(partes, base, origen=a.origen)
        junto = junto[[c for c in partes[0][1].columns]]
        d0, d1 = pd.to_datetime(junto["DIA"]).min().date(), pd.to_datetime(junto["DIA"]).max().date()
        nombre = f"{prefijo(l)} consolidado {d0} a {d1} entregado {hoy}.xlsx"
        print(f"{base}: {len(l)} archivos → «{nombre}» ({len(junto):,} renglones, {d0} a {d1}).")
        for f in l:
            print("    se guardaría en _reemplazados: " + f if not a.aplicar else "    se guarda en _reemplazados: " + f)
        if not a.aplicar:
            continue
        salida = os.path.join(a.origen, nombre)
        with pd.ExcelWriter(salida, engine="openpyxl") as w:
            for k in range(0, max(1, len(junto)), FILAS_HOJA):
                parte = junto.iloc[k:k + FILAS_HOJA].copy()
                parte.columns = orig
                parte.to_excel(w, sheet_name=f"Hoja{k // FILAS_HOJA + 1}", index=False)
        # comprobación: el consolidado se lee igual que los originales juntos
        t2, _ = lector.tabla_de(salida, base, convertir.ACEPTA)
        t2 = t2[pd.to_datetime(t2["DIA"], errors="coerce").notna()]
        if not por_dia(t2).equals(por_dia(junto)):
            os.remove(salida)
            print(f"    NO CUADRA: el consolidado de {base} no da lo mismo por día; no se movió nada.")
            continue
        os.makedirs(guarda, exist_ok=True)
        for f in l:
            shutil.move(os.path.join(a.origen, f), os.path.join(guarda, f))
        hecho += 1
    if not a.aplicar:
        print("\nNo se movió nada. Para hacerlo: python robot/consolidar.py --aplicar")
    else:
        print(f"\n{hecho} bases consolidadas. Originales en {guarda}. Ahora corre los robots y sube DATA y datos.")


if __name__ == "__main__":
    main()
