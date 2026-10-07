# -*- coding: utf-8 -*-
"""
IA-NAMI · CATÁLOGOS DEL CONVERTIDOR
===================================
Listas de referencia que usa convertir.py. Se editan a mano cuando aparece
un nombre nuevo (el reporte de cada conversión avisa cuáles faltan).

ÍNDICE
  [1] NACIONALIDADES  nombre en las bases, nombre corto, clave ISO numérica
  [2] ESTADOS         las 32 oficinas de representación, en orden fijo
  [3] PUNTOS          coordenadas de puntos de internación, repatriación
                      y estaciones migratorias (ubicación aproximada)
"""

# ==== [1] NACIONALIDADES ==========================================
# (nombre tal como llega en las bases, sin acentos y en mayúsculas; nombre corto; ISO numérico)
# Las que no están aquí se suman en "Otras". México se maneja aparte.
NACIONALIDADES = [('REPUBLICA BOLIVARIANA DE VENEZUELA', 'Venezuela', 862),
 ('COLOMBIA', 'Colombia', 170),
 ('GUATEMALA', 'Guatemala', 320),
 ('ECUADOR', 'Ecuador', 218),
 ('HONDURAS', 'Honduras', 340),
 ('EL SALVADOR', 'El Salvador', 222),
 ('HAITI', 'Haití', 332),
 ('NICARAGUA', 'Nicaragua', 558),
 ('CUBA', 'Cuba', 192),
 ('PERU', 'Perú', 604),
 ('ESTADOS UNIDOS DE AMERICA', 'EE. UU.', 840),
 ('CANADA', 'Canadá', 124),
 ('REINO UNIDO DE GRAN BRETANA E IRLANDA DEL NORTE', 'Reino Unido', 826),
 ('ALEMANIA', 'Alemania', 276),
 ('FILIPINAS', 'Filipinas', 608),
 ('INDIA', 'India', 356),
 ('CHINA', 'China', 156),
 ('ARGENTINA', 'Argentina', 32),
 ('BRASIL', 'Brasil', 76),
 ('ESPANA', 'España', 724),
 ('FRANCIA', 'Francia', 250),
 ('ITALIA', 'Italia', 380),
 ('BELICE', 'Belice', 84),
 ('CHILE', 'Chile', 152),
 ('COSTA RICA', 'Costa Rica', 188),
 ('PANAMA', 'Panamá', 591),
 ('REPUBLICA DOMINICANA', 'Rep. Dominicana', 214),
 ('ESTADO PLURINACIONAL DE BOLIVIA', 'Bolivia', 68),
 ('JAMAICA', 'Jamaica', 388),
 ('FEDERACION DE RUSIA', 'Rusia', 643),
 ('TURQUIA', 'Turquía', 792),
 ('INDONESIA', 'Indonesia', 360),
 ('JAPON', 'Japón', 392),
 ('REPUBLICA DE COREA', 'Corea del Sur', 410),
 ('AFGANISTAN', 'Afganistán', 4),
 ('ANGOLA', 'Angola', 24),
 ('ARMENIA', 'Armenia', 51),
 ('CAMERUN', 'Camerún', 120),
 ('CONGO', 'Congo', 178),
 ('EGIPTO', 'Egipto', 818),
 ('GUINEA ECUATORIAL', 'Guinea Ecuatorial', 226),
 ('MADAGASCAR', 'Madagascar', 450),
 ('MAURITANIA', 'Mauritania', 478),
 ('REPUBLICA FEDERAL DEMOCRATICA DE NEPAL', 'Nepal', 524),
 ('REPUBLICA ISLAMICA DEL IRAN', 'Irán', 364),
 ('RUMANIA', 'Rumania', 642),
 ('SENEGAL', 'Senegal', 686),
 ('SUECIA', 'Suecia', 752),
 ('UZBEKISTAN', 'Uzbekistán', 860),
 ('VIETNAM', 'Vietnam', 704)]

# Nombres alternos que deben contarse como una nacionalidad del catálogo
ALIAS_NACIONALIDAD = {
    'VENEZUELA': 'REPUBLICA BOLIVARIANA DE VENEZUELA',
    'BOLIVIA': 'ESTADO PLURINACIONAL DE BOLIVIA',
    'RUSIA': 'FEDERACION DE RUSIA',
    'ESTADOS UNIDOS': 'ESTADOS UNIDOS DE AMERICA',
    'REINO UNIDO': 'REINO UNIDO DE GRAN BRETANA E IRLANDA DEL NORTE',
    'IRAN': 'REPUBLICA ISLAMICA DEL IRAN',
    'NEPAL': 'REPUBLICA FEDERAL DEMOCRATICA DE NEPAL',
    'COREA DEL SUR': 'REPUBLICA DE COREA',
}

# ==== [2] ESTADOS =================================================
ESTADOS = ['Aguascalientes',
 'Baja California',
 'Baja California Sur',
 'Campeche',
 'Chiapas',
 'Chihuahua',
 'Ciudad de México',
 'Coahuila',
 'Colima',
 'Durango',
 'Estado de México',
 'Guanajuato',
 'Guerrero',
 'Hidalgo',
 'Jalisco',
 'Michoacán',
 'Morelos',
 'Nayarit',
 'Nuevo León',
 'Oaxaca',
 'Puebla',
 'Querétaro',
 'Quintana Roo',
 'San Luis Potosí',
 'Sinaloa',
 'Sonora',
 'Tabasco',
 'Tamaulipas',
 'Tlaxcala',
 'Veracruz',
 'Yucatán',
 'Zacatecas']

# Formas alternas de escribir un estado
ALIAS_ESTADO = {
    'MEXICO': 'ESTADO DE MEXICO',
    'EDO. DE MEXICO': 'ESTADO DE MEXICO',
    'CDMX': 'CIUDAD DE MEXICO',
    'DISTRITO FEDERAL': 'CIUDAD DE MEXICO',
    'COAHUILA DE ZARAGOZA': 'COAHUILA',
    'MICHOACAN DE OCAMPO': 'MICHOACAN',
    'VERACRUZ DE IGNACIO DE LA LLAVE': 'VERACRUZ',
}

# ==== [3] PUNTOS ==================================================
# nombre en la base: (nombre corto, longitud, latitud)
PUNTOS_INTERNACION = {'ISLA COZUMEL': ('Cozumel (puerto)', -86.95, 20.51),
 'Aeropuerto Internacional de la Ciudad de México Terminal 2 "A"': ('AICM T2', -99.08, 19.42),
 'Aeropuerto Internacional de Cancún Terminal III': ('Cancún T3', -86.87, 21.04),
 'Aeropuerto Internacional de la Ciudad de México Terminal 1 "A"': ('AICM T1', -99.09, 19.44),
 'Aeropuerto Internacional de Guadalajara "A"': ('Guadalajara', -103.31, 20.52),
 'MAJAHUAL': ('Mahahual (puerto)', -87.71, 18.71),
 'Aeropuerto Internacional de Cancún Terminal IV': ('Cancún T4', -86.86, 21.05),
 'Aeropuerto Internacional de Los Cabos Terminal II': ('Los Cabos T2', -109.72, 23.15),
 'Conexión Peatonal Aeroportuaria Tijuana-San Diego': ('CBX Tijuana', -116.975, 32.547),
 'Aeropuerto Internacional de Puerto Vallarta': ('Puerto Vallarta', -105.25, 20.68),
 'Aeropuerto Internacional de Cancún Terminal II': ('Cancún T2', -86.88, 21.03),
 'Aeropuerto Internacional de Monterrey T1': ('Monterrey T1', -100.11, 25.78),
 'CABO SAN LUCAS': ('Cabo San Lucas (puerto)', -109.91, 22.88),
 'ENSENADA': ('Ensenada (puerto)', -116.63, 31.85),
 'Sub Representación Local Talismán': ('Talismán', -92.15, 14.96),
 'Aeropuerto Internacional de León': ('León', -101.48, 20.99),
 'Cruce Vehicular Chactemal': ('Chactemal', -88.4, 18.49),
 'Punto de Internación Puerta Este en la Puerta México de Tijuana': ('Puerta México, Tijuana', -117.027, 32.542),
 'Aeropuerto Internacional de Tulum "Felipe Carrillo Puerto"': ('Tulum', -87.66, 20.17),
 'Aeropuerto Internacional de Querétaro': ('Querétaro', -100.19, 20.62),
 'Aeropuerto Internacional de Morelia': ('Morelia', -101.03, 19.85),
 'Sub Representación Local Suchiate I': ('Suchiate I', -92.15, 14.68),
 'Punto de Internación El Chaparral, B.C.': ('El Chaparral', -117.033, 32.543),
 'PUERTO VALLARTA': ('Puerto Vallarta (puerto)', -105.24, 20.65),
 'Aeropuerto Internacional Felipe Ángeles': ('AIFA', -99.02, 19.74),
 'Aeropuerto Internacional de Mazatlán': ('Mazatlán', -106.27, 23.16),
 'Aeropuerto Internacional de Mérida "A"': ('Mérida', -89.66, 20.94),
 'Aeropuerto Internacional de Cozumel': ('Cozumel (aeropuerto)', -86.93, 20.52),
 'Aeropuerto Internacional de Monterrey T2': ('Monterrey T2', -100.1, 25.77),
 'Aeropuerto Internacional de Aguascalientes': ('Aguascalientes', -102.32, 21.71),
 'Sub Representación Local Citev': ('Citev, Tamaulipas', -99.52, 27.48),
 'Aeropuerto Internacional de Oaxaca': ('Oaxaca', -96.73, 17.0),
 'Aeropuerto Internacional de San Luis Potosí': ('San Luis Potosí', -100.93, 22.25),
 'Ciudad Hidalgo I': ('Ciudad Hidalgo I', -92.16, 14.69),
 'Aeropuerto Internacional de Zihuatanejo': ('Zihuatanejo', -101.46, 17.6),
 'Sub Representación Local Suchiate II': ('Suchiate II', -92.14, 14.63),
 'Puente Internacional Juárez-Lincoln, Nuevo Laredo, Tamaulipas': ('Juárez-Lincoln, Nuevo Laredo', -99.5, 27.5),
 'Aeropuerto Internacional de Zacatecas': ('Zacatecas', -102.69, 22.9),
 'Aeropuerto Internacional de Huatulco': ('Huatulco', -96.26, 15.78),
 'Aeropuerto Internacional de Chihuahua': ('Chihuahua', -105.96, 28.7),
 'Puente Internacional Colombia / Nuevo León': ('Puente Colombia', -99.74, 27.7),
 'Aeropuerto Internacional de Durango': ('Durango', -104.53, 24.12),
 'Aeropuerto Internacional de Veracruz': ('Veracruz', -96.19, 19.15),
 'Aeropuerto Internacional de Tijuana "A"': ('Tijuana (aeropuerto)', -116.97, 32.54)}

PUNTOS_REPATRIACION = {'Punto de Internación El Chaparral, B.C.': ('El Chaparral, Tijuana', -117.03, 32.54),
 'Representación Local Mexicali I Punto de Internación': ('Mexicali', -115.5, 32.66),
 'Puente Internacional Garita Libertad-Chihuahua': ('Cd. Juárez (Libertad)', -106.45, 31.75),
 'Puente Internacional Ojinaga-Chihuahua': ('Ojinaga', -104.41, 29.56),
 'Puente Internacional Puerta de México - Piedras Negras Coahuila': ('Piedras Negras', -100.51, 28.7),
 'Puente Internacional Puerta de México, Ciudad Acuña': ('Cd. Acuña', -100.93, 29.32),
 'Aeropuerto Internacional Felipe Ángeles': ('AIFA (vuelos)', -99.02, 19.74),
 'Garita Nogales I, Son.': ('Nogales', -110.94, 31.33),
 'Punto de Internacion San Luis Rio Colorado, Son.': ('San Luis Río Colorado', -114.78, 32.49),
 'Puente Internacional Benito Juárez, Reynosa, Tamaulipas': ('Reynosa', -98.28, 26.09),
 'Puente Internacional Juárez-Lincoln, Nuevo Laredo, Tamaulipas': ('Nuevo Laredo', -99.51, 27.5),
 'Puente Internacional Puerta de México, Matamoros, Tamaulipas': ('Matamoros', -97.5, 25.88)}

# estación o estancia: (longitud, latitud)
ESTACIONES = {'Estación Migratoria Tuxtla Gutiérrez': (-93.12, 16.75),
 'Estación Migratoria Tapachula': (-92.26, 14.91),
 'Estación Migratoria Acayucan': (-94.91, 17.95),
 'Estación Migratoria Villahermosa': (-92.93, 17.99),
 'Estación Migratoria Iztapalapa': (-99.06, 19.36),
 'Estancia Provisional Monterrey': (-100.31, 25.68),
 'Estación Migratoria Palenque': (-91.98, 17.51),
 'Estación Migratoria Hermosillo': (-110.96, 29.07)}
