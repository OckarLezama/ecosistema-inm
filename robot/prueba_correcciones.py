# -*- coding: utf-8 -*-
"""
IA-NAMI · PRUEBA AUTOMÁTICA DE CORRECCIONES DE MES
Simula entregas en una carpeta temporal y revisa las reglas de robot/lector.py:
  1. gana la entrega más reciente;  2. cada archivo manda en todo su rango;
  3. una «CORRECCION 2026-09» corrige todo septiembre (lo que trae fuera del mes no se usa);
  4. la bitácora anota qué días cambiaron, cuánto había antes y cuánto hay ahora;
  5. en bases sin fechas (cortes) se usa la entrega más reciente, no el último nombre.
Uso: python robot/prueba_correcciones.py   (sale con error si algo no cuadra)
"""
import json
import os
import sys
import tempfile

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lector  # noqa: E402

MAL = []


def ok(cond, texto):
    print(("  bien  " if cond else "  MAL   ") + texto)
    if not cond:
        MAL.append(texto)


def archivo(carpeta, nombre, dias, total, extra=None):
    filas = [{"DIA": d, "NACIONALIDAD": "GUATEMALA", "TOTAL": total} for d in dias]
    for d, v in (extra or []):
        filas.append({"DIA": d, "NACIONALIDAD": "GUATEMALA", "TOTAL": v})
    pd.DataFrame(filas).to_excel(os.path.join(carpeta, nombre), index=False)


def reinicia():
    lector.AVISOS.clear(); lector.HUELLAS.clear(); lector.CAMBIOS.clear(); lector.PERIODOS.clear()


def por_mes(t):
    t = t.assign(M=pd.to_datetime(t["DIA"]).dt.strftime("%Y-%m"), V=pd.to_numeric(t["TOTAL"]))
    return t.groupby("M")["V"].sum().to_dict()


def main():
    cols = {"DIA", "NACIONALIDAD", "TOTAL"}
    with tempfile.TemporaryDirectory() as tmp:
        data, dest = os.path.join(tmp, "DATA"), os.path.join(tmp, "datos")
        os.makedirs(data)
        print("Caso 1 · entrega normal: agosto a 13 oct, 10 al día")
        archivo(data, "PRUEBA BASE 2026-08-01 a 2026-10-13 entregado 2026-10-14.xlsx", pd.date_range("2026-08-01", "2026-10-13"), 10)
        reinicia(); t, _ = lector.leer_por_columnas(data, cols, "Prueba"); lector.guardar(dest, "prueba")
        m = por_mes(t)
        ok(m.get("2026-09") == 300 and m.get("2026-08") == 310 and m.get("2026-10") == 130, "se lee completa (ago 310, sep 300, oct 130)")
        ok(os.path.exists(os.path.join(dest, "huella.json")), "la primera corrida deja la huella")

        print("Caso 2 · corrección de septiembre: 12 al día, sin el 15 y con un renglón de octubre que no le toca")
        archivo(data, "PRUEBA BASE CORRECCION 2026-09 entregado 2026-10-17.xlsx",
                [d for d in pd.date_range("2026-09-01", "2026-09-30") if d.day != 15], 12, extra=[(pd.Timestamp("2026-10-02"), 999)])
        reinicia(); t, _ = lector.leer_por_columnas(data, cols, "Prueba"); lector.guardar(dest, "prueba")
        m = por_mes(t)
        ok(m.get("2026-09") == 12 * 29, "septiembre se toma completo de la corrección (348)")
        ok(m.get("2026-08") == 310 and m.get("2026-10") == 130, "agosto y octubre no cambian (el renglón de octubre de la corrección no se usa)")
        ok(not (pd.to_datetime(t["DIA"]) == "2026-09-15").any(), "el 15 de septiembre queda en cero: la corrección manda en todo su mes")
        av = " ".join(lector.avisos_de("Prueba"))
        ok("fuera de ese periodo" in av and "se cuentan en cero" in av, "se avisa del renglón fuera del mes y del día que quedó en cero")
        txt = open(os.path.join(dest, "bitacora.js"), encoding="utf-8").read()
        b = json.loads(txt[txt.index("["):txt.rindex("]") + 1])
        e = b[0] if b else {}
        ok(e.get("tipo") == "corrección" and e.get("dias") == 30 and e.get("quitados") == 1, "la bitácora anota la corrección: 30 días (29 con otra cifra y 1 en cero)")
        ok(e.get("antes") == 300 and e.get("despues") == 348 and any("CORRECCION" in a for a in e.get("archivos", [])), "y cuánto había (300), cuánto hay (348) y qué archivo lo cambió")

        print("Caso 3 · después llega la base completa reenviada (11 al día): es la entrega más reciente y manda")
        archivo(data, "PRUEBA BASE 2026-08-01 a 2026-10-20 entregado 2026-10-25.xlsx", pd.date_range("2026-08-01", "2026-10-20"), 11)
        reinicia(); t, _ = lector.leer_por_columnas(data, cols, "Prueba"); lector.guardar(dest, "prueba")
        m = por_mes(t)
        ok(m.get("2026-09") == 330 and m.get("2026-10") == 220, "septiembre y octubre se toman del reenvío completo (330 y 220)")

        print("Caso 4 · sin fecha de entrega (ni en el nombre ni en el repositorio): una corrección va después de lo que corrige")
        d2 = os.path.join(tmp, "DATA2"); os.makedirs(d2)
        archivo(d2, "OTRA BASE 2026-08-01 a 2026-10-13.xlsx", pd.date_range("2026-08-01", "2026-10-13"), 10)
        archivo(d2, "OTRA BASE CORRECCION 2026-09.xlsx", pd.date_range("2026-09-01", "2026-09-30"), 20)
        reinicia(); t, _ = lector.leer_por_columnas(d2, cols, "Otra")
        ok(por_mes(t).get("2026-09") == 600, "la corrección más reciente manda en septiembre (600)")

        print("Caso 5 · base sin fechas (corte): se usa la entrega más reciente aunque su nombre ordene antes")
        a1 = pd.DataFrame({"O.R.": ["CHIAPAS"], "TOTAL GENERAL": [100]}); a2 = pd.DataFrame({"O.R.": ["CHIAPAS"], "TOTAL GENERAL": [200]})
        reinicia(); t = lector.juntar([("DOC al 2026-10-13 entregado 2026-10-14.xlsx", a2), ("DOC al 2026-09-30 entregado 2026-10-01.xlsx", a1)], "Docs")
        ok(int(t["TOTAL GENERAL"].iloc[0]) == 200, "se usa el corte entregado al último (200)")
    print("prueba_correcciones: " + ("todo bien" if not MAL else str(len(MAL)) + " fallas"))
    sys.exit(1 if MAL else 0)


if __name__ == "__main__":
    main()
