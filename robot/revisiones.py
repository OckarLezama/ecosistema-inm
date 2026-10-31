# -*- coding: utf-8 -*-
"""Revisiones de cada carga: lo que probablemente es un error de captura y hay que pedir al área que corrija.
Las llama robot/convertir.py con las bases ya leídas (B) y regresan textos que van a «Corregir con el área» en la sección Bases.
  1. Renglones repetidos: en las bases de conteos (un renglón = día × lugar × nacionalidad…), dos renglones con las mismas columnas de texto.
  2. Puntos que se quedan en cero: un punto, O.R. o estación que traía datos casi a diario y de pronto pasa 5 días o más sin nada.
  3. Saltos: un día con más del triple o menos de un tercio de lo normal para ese día de la semana.
Solo se revisan los últimos 90 días de cada base (lo que el área todavía puede corregir); lo anterior ya se avisó en su carga."""
import pandas as pd

MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
VENTANA = 90          # días hacia atrás desde el último día de la base
MIN_HUECO = 5         # días seguidos sin datos para avisar
CONTEOS = {"ing", "seg", "pres", "ret", "recib"}       # resc y rep ya revisan sus repetidos al cargarse
LUGARES = {"ing": ("punto", "PUNTO DE INTERNACION", "Puntos"), "rep": ("punto", "PUNTO_REPATRIACION", "Puntos"),
           "pres": ("estacion", "estacion", "Estaciones"), "resc": ("O.R.", "O.R.", "O.R.")}


def f(d):
    return f"{d.day} {MES[d.month - 1]}"


def rango(a, b):
    if a == b:
        return f"el {f(a)}"
    return f"del {a.day} al {f(b)}" if a.month == b.month else f"del {f(a)} al {f(b)}"


def repetidos(t):
    texto = [c for c in t.columns if c[:1].isupper() and c != "DIA" and not pd.api.types.is_numeric_dtype(t[c]) and not pd.api.types.is_datetime64_any_dtype(t[c])]
    if not texto:
        return None
    dup = t.duplicated(["DIA"] + texto, keep="first")
    if not dup.any():
        return None
    ult = t.loc[dup, "DIA"].max()
    return f"{int(dup.sum()):,} renglones repetidos (mismo día y mismos datos: {', '.join(c.lower() for c in texto[:4])}{'…' if len(texto) > 4 else ''}); se suman los dos. El más reciente, {f(ult)} {ult.year}. Confirmar si es doble captura."


def huecos(t, col, nombre_col):
    fin = t["DIA"].max()
    ini = fin - pd.Timedelta(days=VENTANA + 28)
    x = t[(t["DIA"] > ini) & (t["v"] > 0)]
    if not len(x):
        return []
    dias = pd.date_range(ini + pd.Timedelta(days=1), fin)
    base = set(x["DIA"])                                           # días en que la base sí trae algo
    pres = x.groupby(col)["DIA"].apply(set)
    nom = x.groupby(col)[nombre_col].first() if nombre_col != col else None
    hallados = {}
    for g, s in pres.items():
        i = 0
        while i < len(dias):
            if dias[i] in s or dias[i] not in base:
                i += 1
                continue
            j = i
            while j + 1 < len(dias) and dias[j + 1] not in s:
                j += 1
            largo = sum(1 for d in dias[i:j + 1] if d in base)
            antes = [d for d in dias[max(0, i - 28):i]]
            if largo >= MIN_HUECO and dias[i] > fin - pd.Timedelta(days=VENTANA) and len(antes) >= 28 and sum(d in s for d in antes) >= 24:
                hasta = dias[j]
                sigue = j + 1 >= len(dias)
                hallados.setdefault((dias[i], hasta, sigue), []).append(str(nom[g] if nom is not None else g).strip().title())
            i = j + 1
    # Los que terminan el mismo día van juntos: «Sin datos hasta el 12 oct: Cozumel y Morelia (desde el 1), Mérida (desde el 3)…»
    fin_igual = {}
    for (a, b, sigue), lug in hallados.items():
        fin_igual.setdefault((b, sigue), []).append((a, sorted(lug)))
    l = []
    for (b, sigue), grupos in sorted(fin_igual.items()):
        grupos.sort()
        if len(grupos) == 1 and not sigue:
            a, lug = grupos[0]
            l.append(f"Sin datos {rango(a, b)} en: {' · '.join(lug)}. Antes y después sí traen; si esos días hubo movimiento, falta en el archivo.")
            continue
        partes = "; ".join(f"{' · '.join(lug)} (desde el {f(a)})" for a, lug in grupos)
        if sigue:
            l.append(f"Sin datos hasta el {f(b)}, último día de la base: {partes}. Antes traían datos casi a diario; si sí hubo movimiento, falta en el archivo.")
        else:
            l.append(f"Sin datos hasta el {f(b)}: {partes}. Antes y después sí traen; si esos días hubo movimiento, falta en el archivo.")
    return l


def saltos(t):
    d = t.groupby("DIA")["v"].sum()
    fin = d.index.max()
    d = d.reindex(pd.date_range(d.index.min(), fin), fill_value=0)
    l = []
    for dia in d.index[d.index > fin - pd.Timedelta(days=28)]:
        prev = [d.get(dia - pd.Timedelta(days=7 * i)) for i in range(1, 9)]
        prev = [p for p in prev if p is not None and p > 0]
        if len(prev) < 6:
            continue
        med, v = float(pd.Series(prev).median()), float(d[dia])
        if med < 100 or v == 0:                                    # bases chicas varían mucho de un día a otro: no se revisan
            continue
        if v >= 3 * med:
            l.append((dia, f"Revisar el {f(dia)}: {int(v):,}, {v / med:.0f} veces lo normal para ese día de la semana (≈{int(med):,}). Si no hubo un hecho que lo explique, puede ser doble captura."))
        elif v <= med / 3:
            l.append((dia, f"Revisar el {f(dia)}: {int(v):,}, menos de un tercio de lo normal para ese día de la semana (≈{int(med):,}). Puede faltar parte del archivo."))
    return [x for _, x in l]


def revisar(B):
    """{clave de la base: [textos]}"""
    out = {}
    for k, t in B.items():
        if not len(t) or "DIA" not in t.columns or "v" not in t.columns:
            continue
        l = []
        if k in CONTEOS:
            r = repetidos(t)
            if r:
                l.append(r)
        if k in LUGARES:
            col, nom, _ = LUGARES[k]
            tt = t[t["aereo"] == 0] if k == "rep" else t              # los vuelos de repatriación no son diarios
            if col in tt.columns:
                l += huecos(tt, col, nom if nom in tt.columns else col)
        l += saltos(t)
        if l:
            out[k] = l
    return out
