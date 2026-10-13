# ==================================================================
# IA-NAMI · VOCABULARIO DE CONSULTAR
# Escribe datos/vocabulario.js con lo que Consultar necesita para
# entender preguntas escritas de muchas formas: nombres oficiales y
# alternos de nacionalidades y estados, gentilicios, abreviaturas de
# estados, nombres completos de puntos y sinónimos de uso común.
# Todo sale de robot/catalogos.py: para enseñar una palabra nueva se
# agrega ahí y se vuelve a correr este robot.
# ÍNDICE  [1] UTILIDADES  [2] VOCABULARIO  [3] SALIDA
# Uso: python robot/vocabulario.py --destino datos
# ==================================================================
import argparse
import json
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogos as C  # noqa: E402


# ==== [1] UTILIDADES ==============================================
def norm(x):
    t = unicodedata.normalize("NFD", str(x).lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return " ".join("".join(c if c.isalnum() or c == "ñ" else " " for c in t).split())


# ==== [2] VOCABULARIO =============================================
def vocabulario():
    corto = {norm(a): b for a, b, iso in C.NACIONALIDADES}
    por_iso = {iso: b for a, b, iso in C.NACIONALIDADES}
    nac = {}
    for a, b, iso in C.NACIONALIDADES:
        nac[norm(a)] = b
    for alias, oficial in C.ALIAS_NACIONALIDAD.items():
        if norm(oficial) in corto:
            nac[norm(alias)] = corto[norm(oficial)]
    for nombre, iso in getattr(C, "ISO_NACIONALIDAD", {}).items():
        if iso in por_iso:
            nac[norm(nombre)] = por_iso[iso]
    for iso, nom in getattr(C, "NOMBRE_CORTO", {}).items():
        if iso in por_iso:
            nac[norm(nom)] = por_iso[iso]
    est = {norm(e): e for e in C.ESTADOS}
    for alias, oficial in C.ALIAS_ESTADO.items():
        for e in C.ESTADOS:
            if norm(e) == norm(oficial):
                est[norm(alias)] = e
    abrev = {"ags": "Aguascalientes", "bc": "Baja California", "bcs": "Baja California Sur", "camp": "Campeche", "chis": "Chiapas", "chih": "Chihuahua",
             "coah": "Coahuila", "col": "Colima", "dgo": "Durango", "edomex": "Estado de México", "gto": "Guanajuato", "gro": "Guerrero", "hgo": "Hidalgo",
             "jal": "Jalisco", "mich": "Michoacán", "mor": "Morelos", "nay": "Nayarit", "nl": "Nuevo León", "oax": "Oaxaca", "pue": "Puebla", "qro": "Querétaro",
             "qroo": "Quintana Roo", "slp": "San Luis Potosí", "sin": "Sinaloa", "son": "Sonora", "tab": "Tabasco", "tamps": "Tamaulipas", "tlax": "Tlaxcala",
             "ver": "Veracruz", "yuc": "Yucatán", "zac": "Zacatecas"}
    for a, e in abrev.items():
        if e in C.ESTADOS:
            est[a] = e
    pto = {}
    for d in (getattr(C, "PUNTOS_INTERNACION", {}), getattr(C, "PUNTOS_REPATRIACION", {})):
        for largo, v in d.items():
            pto[norm(largo)] = v[0]
    return {"n": nac, "e": est, "p": pto, "gent": dict(getattr(C, "GENTILICIOS", {})), "sin": dict(getattr(C, "SINONIMOS", {}))}


# ==== [3] SALIDA ==================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--destino", default="datos")
    a = ap.parse_args()
    v = vocabulario()
    os.makedirs(a.destino, exist_ok=True)
    with open(os.path.join(a.destino, "vocabulario.js"), "w", encoding="utf-8") as f:
        f.write("window.IANAMI_VOC=" + json.dumps(v, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("vocabulario.js:", ", ".join(f"{len(x)} {k}" for k, x in v.items()))


if __name__ == "__main__":
    main()
