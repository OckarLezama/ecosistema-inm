/* ==================================================================
   IA-NAMI · TEMPORADAS VACACIONALES (calendario escolar SEP, educación básica)
   Para marcar temporadas en la barra de tiempo y alinear comparaciones
   (Semana Santa cambia de fecha cada año). Fechas = días sin clases, inclusivos.
   Verificado con fuentes públicas el 8 oct 2026; "conf": false = por confirmar.
   Navidad, Año Nuevo y Acción de Gracias (EE. UU.) se calculan en js/app.js.
   ================================================================== */
window.IANAMI_TEMPORADAS = {
 "invierno": [
  {
   "ciclo": "2017-2018",
   "inicio": "2017-12-21",
   "fin": "2018-01-07",
   "conf": true,
   "fuente": "La Jornada / TVNotas (Acuerdo 04/05/17, DOF 25-may-2017)",
   "url": "https://www.jornada.com.mx/2017/05/26/politica/015n2pol",
   "nota": "Vacaciones oficiales 21-dic-2017 al 5-ene-2018 (igual en calendarios de 185/195/200 días); regreso lunes 8-ene-2018 (lunes siguiente, inferido)."
  },
  {
   "ciclo": "2018-2019",
   "inicio": "2018-12-20",
   "fin": "2019-01-06",
   "conf": true,
   "fuente": "Gobierno de Guanajuato (boletín) / Alto Nivel (Acuerdo 09/05/18, DOF 22-may-2018)",
   "url": "https://boletines.guanajuato.gob.mx/2018/08/03/calendario-escolar-2018-2019/",
   "nota": "Vacaciones 20-dic-2018 al 4-ene-2019; regreso 7-ene-2019."
  },
  {
   "ciclo": "2019-2020",
   "inicio": "2019-12-21",
   "fin": "2020-01-07",
   "conf": true,
   "fuente": "Presentación SEP calendario 2019-2020 (vía López-Dóriga) / Chilango",
   "url": "https://lopezdoriga.com/wp-content/uploads/2019/05/presentacion-calendario-escolar-2019-2020.pdf",
   "nota": "Periodo oficial 23-dic-2019 al 7-ene-2020; último día de clases viernes 20-dic; regreso 8-ene-2020 (inferido)."
  },
  {
   "ciclo": "2020-2021",
   "inicio": "2020-12-19",
   "fin": "2021-01-10",
   "conf": true,
   "fuente": "Chilango (calendario SEP 2020-2021, anunciado 5-ago-2020)",
   "url": "https://www.chilango.com/noticias/vacaciones-del-ciclo-escolar-2020-2021/",
   "nota": "Ciclo a distancia (Aprende en Casa II). Regreso lunes 11-ene-2021. Zeta Tijuana reporta inicio 16-dic; se usa la fecha de Chilango (fin de semana tras viernes 18-dic)."
  },
  {
   "ciclo": "2021-2022",
   "inicio": "2021-12-18",
   "fin": "2022-01-02",
   "conf": true,
   "fuente": "adn40 (calendario SEP 2021-2022)",
   "url": "https://www.adn40.mx/mexico/calendario-sep-2021-2022-vacaciones-invierno-lhp",
   "nota": "Vacaciones oficiales 20 al 31-dic-2021; regreso lunes 3-ene-2022; 6-ene sin clases."
  },
  {
   "ciclo": "2022-2023",
   "inicio": "2022-12-17",
   "fin": "2023-01-08",
   "conf": true,
   "fuente": "TV Azteca / Uno TV / Tus Buenas Noticias (calendario SEP 2022-2023)",
   "url": "https://www.tusbuenasnoticias.com/noticias/mexico/2022/12/30/17188-sep-cuando-regresan-a-clases-en-el-2023-ninos-y-jovenes",
   "nota": "Vacaciones oficiales 19 al 30-dic-2022; del 2 al 6-ene-2023 taller intensivo docente sin alumnos; regreso de alumnos 9-ene-2023."
  },
  {
   "ciclo": "2023-2024",
   "inicio": "2023-12-16",
   "fin": "2024-01-07",
   "conf": true,
   "fuente": "N+ (calendario oficial SEP 2023-2024)",
   "url": "https://www.nmas.com.mx/nacional/calendario-sep-2023-2024-fechas-de-inicio-fin-de-clases-puentes-vacaciones/",
   "nota": "Vacaciones 18-dic-2023 al 5-ene-2024; regreso 8-ene-2024 (lunes siguiente)."
  },
  {
   "ciclo": "2024-2025",
   "inicio": "2024-12-19",
   "fin": "2025-01-08",
   "conf": true,
   "fuente": "Fox Sports MX (calendario SEP 2024-2025)",
   "url": "https://www.foxsports.com.mx/2024/11/13/sep-hace-oficial-la-fecha-en-que-inician-las-vacaciones-de-invierno-que-dia-terminan-las-clases/",
   "nota": "Último día de clases miércoles 18-dic-2024; 6-8 ene talleres intensivos (sin alumnos); regreso jueves 9-ene-2025."
  },
  {
   "ciclo": "2025-2026",
   "inicio": "2025-12-20",
   "fin": "2026-01-11",
   "conf": true,
   "fuente": "Uno TV / Luz Noticias / Récord (calendario SEP 2025-2026, DOF 9-jun-2025)",
   "url": "https://www.luznoticias.mx/2025-11-17/mexico/sep-cuando-terminan-las-vacaciones-de-invierno-2025-2026/267120",
   "nota": "Último día de clases viernes 19-dic-2025; vacaciones de alumnos hasta 9-ene-2026 (taller intensivo docente 7-9 ene); regreso lunes 12-ene-2026."
  },
  {
   "ciclo": "2026-2027",
   "inicio": "2026-12-19",
   "fin": "2027-01-06",
   "conf": true,
   "fuente": "Diario de México / adn40 / Luz Noticias (calendario SEP 2026-2027, 185 días)",
   "url": "https://www.diariodemexico.com/mi-nacion/oficializa-sep-calendario-escolar-2026-2027-185-dias-clases-vacaciones-fechas-clave-educacion-basica",
   "nota": "Vacaciones oficiales 21-dic-2026 al 6-ene-2027; regreso jueves 7-ene-2027. Periodo recortado respecto a años previos."
  }
 ],
 "semana_santa": [
  {
   "ciclo": "2017-2018",
   "inicio": "2018-03-24",
   "fin": "2018-04-08",
   "conf": true,
   "fuente": "La Jornada / TVNotas (Acuerdo 04/05/17, DOF 25-may-2017)",
   "url": "https://www.jornada.com.mx/2017/05/26/politica/015n2pol",
   "nota": "Vacaciones de primavera oficiales 26-mar al 6-abr-2018; regreso 9-abr (inferido)."
  },
  {
   "ciclo": "2018-2019",
   "inicio": "2019-04-13",
   "fin": "2019-04-28",
   "conf": true,
   "fuente": "Gobierno de Guanajuato (boletín) / Alto Nivel",
   "url": "https://boletines.guanajuato.gob.mx/2018/08/03/calendario-escolar-2018-2019/",
   "nota": "Vacaciones oficiales 15 al 26-abr-2019; regreso 29-abr (inferido)."
  },
  {
   "ciclo": "2019-2020",
   "inicio": "2020-04-04",
   "fin": "2020-04-19",
   "conf": true,
   "fuente": "Presentación SEP calendario 2019-2020 (vía López-Dóriga) / Chilango",
   "url": "https://lopezdoriga.com/wp-content/uploads/2019/05/presentacion-calendario-escolar-2019-2020.pdf",
   "nota": "Periodo oficial 6 al 17-abr-2020. Por COVID-19 las clases presenciales se suspendieron desde el 23-mar-2020 y no se reanudaron; después siguió Aprende en Casa a distancia."
  },
  {
   "ciclo": "2020-2021",
   "inicio": "2021-03-27",
   "fin": "2021-04-11",
   "conf": true,
   "fuente": "Chilango (calendario SEP 2020-2021)",
   "url": "https://www.chilango.com/noticias/vacaciones-del-ciclo-escolar-2020-2021/",
   "nota": "Ciclo a distancia. Vacaciones oficiales 29-mar al 9-abr-2021. Chilango indica que el lunes 12-abr fue Consejo Técnico, con regreso de alumnos el 13-abr; ese día no se incluye aquí."
  },
  {
   "ciclo": "2021-2022",
   "inicio": "2022-04-09",
   "fin": "2022-04-24",
   "conf": true,
   "fuente": "adn40 (calendario SEP 2021-2022)",
   "url": "https://www.adn40.mx/mexico/calendario-sep-2021-2022-vacaciones-invierno-lhp",
   "nota": "Vacaciones oficiales 11 al 22-abr-2022; regreso 25-abr."
  },
  {
   "ciclo": "2022-2023",
   "inicio": "2023-04-01",
   "fin": "2023-04-16",
   "conf": true,
   "fuente": "TV Azteca / adn40 (calendario SEP 2022-2023)",
   "url": "https://www.tvazteca.com/aztecanoticias/calendario-escolar-sep-2022-2023-vacaciones-csz",
   "nota": "Vacaciones oficiales 3 al 14-abr-2023; regreso 17-abr (inferido)."
  },
  {
   "ciclo": "2023-2024",
   "inicio": "2024-03-23",
   "fin": "2024-04-07",
   "conf": true,
   "fuente": "N+ (calendario oficial SEP 2023-2024)",
   "url": "https://www.nmas.com.mx/nacional/calendario-sep-2023-2024-fechas-de-inicio-fin-de-clases-puentes-vacaciones/",
   "nota": "Vacaciones oficiales 25-mar al 5-abr-2024; regreso 8-abr."
  },
  {
   "ciclo": "2024-2025",
   "inicio": "2025-04-12",
   "fin": "2025-04-27",
   "conf": true,
   "fuente": "Fox Sports MX (calendario SEP 2024-2025)",
   "url": "https://www.foxsports.com.mx/2024/06/12/sep-calendario-escolar-2024-25-cuando-seran-las-vacaciones-de-invierno/",
   "nota": "Vacaciones oficiales 14 al 25-abr-2025; regreso 28-abr (inferido)."
  },
  {
   "ciclo": "2025-2026",
   "inicio": "2026-03-27",
   "fin": "2026-04-12",
   "conf": true,
   "fuente": "Uno TV / Crónica (calendario SEP 2025-2026, DOF 9-jun-2025)",
   "url": "https://www.unotv.com/nacional/calendario-escolar-2025-2026-cuando-inician-y-cuando-terminan-las-clases/",
   "nota": "Vacaciones oficiales 30-mar al 10-abr-2026; se suma el CTE del viernes 27-mar (sin alumnos); regreso lunes 13-abr-2026."
  },
  {
   "ciclo": "2026-2027",
   "inicio": "2027-03-20",
   "fin": "2027-04-04",
   "conf": true,
   "fuente": "Diario de México / Azteca Jalisco / adn40 / Posta (calendario SEP 2026-2027)",
   "url": "https://www.aztecajalisco.com/local/calendario-sep-cuando-seran-las-vacaciones-semana-santa-2027/",
   "nota": "Vacaciones oficiales 22-mar al 2-abr-2027 (Pascua: 28-mar-2027); regreso 5-abr. Luz Noticias publicó 29-mar al 9-abr-2027, que no coincide con la mayoría de las fuentes."
  }
 ],
 "verano": [
  {
   "ciclo": "2017-2018",
   "inicio": "2018-07-10",
   "fin": "2018-08-19",
   "conf": true,
   "fuente": "La Jornada / Excélsior (Acuerdo 04/05/17) + Alto Nivel (inicio 2018-2019)",
   "url": "https://www.jornada.com.mx/2017/05/26/politica/015n2pol",
   "nota": "Calendario general de 195 días: fin de cursos 9-jul-2018. El calendario optativo de 185 días terminaba el 25-jun-2018. El ciclo 2018-2019 inició el 20-ago-2018."
  },
  {
   "ciclo": "2018-2019",
   "inicio": "2019-07-09",
   "fin": "2019-08-25",
   "conf": true,
   "fuente": "Gobierno de Guanajuato / Alto Nivel (Acuerdo 09/05/18) + Chilango (inicio 2019-2020)",
   "url": "https://www.altonivel.com.mx/calendario-escolar-sep-2018-2019/",
   "nota": "Calendario obligatorio de 195 días: fin 8-jul-2019 (Diario Educación cita 9-jul). El de 185 días terminaba el 24-jun-2019. El ciclo 2019-2020 inició el 26-ago-2019."
  },
  {
   "ciclo": "2019-2020",
   "inicio": "2020-06-20",
   "fin": "2020-08-23",
   "conf": true,
   "fuente": "Diario de México (fechas referenciales SEP, 2020) + Zeta Tijuana (inicio 2020-2021)",
   "url": "https://www.diariodemexico.com/mi-nacion/sep-difunde-fechas-referenciales-para-ciclo-escolar-2020-2021/amp",
   "nota": "Pandemia: el calendario original terminaba el 6-jul-2020. Aprende en Casa terminó el 5-jun-2020 y el fin de clases oficial fue el viernes 19-jun-2020. Si se toma el fin efectivo de lecciones, el verano empezaría el 6-jun. El ciclo 2020-2021 inició a distancia el 24-ago-2020."
  },
  {
   "ciclo": "2020-2021",
   "inicio": "2021-07-10",
   "fin": "2021-08-29",
   "conf": true,
   "fuente": "Zeta Tijuana / Chilango (calendario 2020-2021) + DOF vía SinEmbargo (inicio 2021-2022)",
   "url": "https://www.sinembargo.mx/wp-content/uploads/2021/06/DOF-SEP-publica-calendario-escolar-2021-2022.pdf?x91281",
   "nota": "Fin de ciclo 9-jul-2021; el ciclo 2021-2022 inició el 30-ago-2021 (regreso híbrido/presencial)."
  },
  {
   "ciclo": "2021-2022",
   "inicio": "2022-07-29",
   "fin": "2022-08-28",
   "conf": true,
   "fuente": "DOF (Acuerdo 2021-2022 vía SinEmbargo) + Acuerdo 09/06/22, DOF 3-jun-2022 (vía Gob. Michoacán)",
   "url": "https://www.sinembargo.mx/wp-content/uploads/2021/06/DOF-SEP-publica-calendario-escolar-2021-2022.pdf?x91281",
   "nota": "Último día de clases jueves 28-jul-2022; el ciclo 2022-2023 inició el 29-ago-2022."
  },
  {
   "ciclo": "2022-2023",
   "inicio": "2023-07-27",
   "fin": "2023-08-27",
   "conf": true,
   "fuente": "Acuerdo 09/06/22, DOF 3-jun-2022 (vía Gob. Michoacán) + N+ (inicio 2023-2024)",
   "url": "https://michoacan.gob.mx/wp-content/uploads/2022/08/CALENDARIO-ESCOLAR-SEP-2022-A-2023-DOF.pdf",
   "nota": "Fin de cursos miércoles 26-jul-2023 (190 días); el ciclo 2023-2024 inició el 28-ago-2023."
  },
  {
   "ciclo": "2023-2024",
   "inicio": "2024-07-17",
   "fin": "2024-08-25",
   "conf": true,
   "fuente": "N+ (calendario 2023-2024) + Fox Sports MX (inicio 2024-2025)",
   "url": "https://www.nmas.com.mx/nacional/calendario-sep-2023-2024-fechas-de-inicio-fin-de-clases-puentes-vacaciones/",
   "nota": "Fin de ciclo martes 16-jul-2024; el ciclo 2024-2025 inició el 26-ago-2024."
  },
  {
   "ciclo": "2024-2025",
   "inicio": "2025-07-17",
   "fin": "2025-08-31",
   "conf": true,
   "fuente": "Uno TV / La Verdad Noticias (fin 2024-2025) + Uno TV (inicio 2025-2026)",
   "url": "https://laverdadnoticias.com/ultimas-noticias/mexico/cuando-es-el-ultimo-dia-de-clases-del-ciclo-2024-2025-sep-confirma-el-cierre-oficial",
   "nota": "Fin nacional miércoles 16-jul-2025; algunos estados adelantaron el cierre por calor. El ciclo 2025-2026 inició el lunes 1-sep-2025."
  },
  {
   "ciclo": "2025-2026",
   "inicio": "2026-07-16",
   "fin": "2026-08-30",
   "conf": true,
   "fuente": "El Imparcial / Expansión Política (SEP mantiene calendario, DOF 9-jun-2025) + Diario de México (inicio 2026-2027)",
   "url": "https://www.elimparcial.com/mexico/2026/05/11/ya-es-oficial-sep-mantendra-calendario-escolar-2025-2026-sin-cambios-y-confirmo-fechas-de-fin-de-clases-e-inicio-de-nuevo-ciclo/",
   "nota": "La propuesta de la SEP de cerrar el 5-jun-2026 por el Mundial y el calor fue rechazada el 11-may-2026; se mantuvo el fin del 15-jul-2026. Hubo suspensión federal el 30-jun-2026 por un partido del Mundial. Varios estados cerraron antes: Colima 25-jun, Yucatán 26-jun y Tlaxcala presencial 30-jun. El ciclo 2026-2027 inició el 31-ago-2026."
  },
  {
   "ciclo": "2026-2027",
   "inicio": "2027-07-10",
   "fin": null,
   "conf": false,
   "fuente": "Diario de México / Luz Noticias / extracto del Acuerdo 2026-2027 (SNTE)",
   "url": "https://cdnsnte1.snte.org.mx/wp-content/uploads/2026/07/15154949/EXTRACTO-acuerdo-07.07.26-se-establecen-los-calendarios-escolares-para-el-ciclo-lectivo-2026-2027-para-la-educacioin-preescolar-primaria-sec.pdf",
   "nota": "Fin de clases confirmado: viernes 9-jul-2027, así que el inicio del verano (10-jul-2027) sí está confirmado. El fin no se puede confirmar porque el calendario 2027-2028 aún no se publica."
  }
 ]
};
