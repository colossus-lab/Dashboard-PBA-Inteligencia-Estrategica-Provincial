# Cruces socioeconómicos y tipologías electorales

¿El voto se correlaciona con condiciones sociales, económicas o demográficas? Esta sección cruza el resultado electoral municipal de 2023 con indicadores de **otras secciones del dashboard** (Educación, Seguridad, Economía, Agricultura) y agrupa los 135 municipios en **tipologías electorales** mediante clustering.

Caveat metodológico general: **correlación no implica causalidad**. Las regresiones reportadas describen asociación lineal entre dos variables observadas; la interpretación causal requiere modelos con controles que están fuera del alcance de este informe. El R² reportado mide cuánta de la varianza inter-municipal explica la variable independiente.

## Agro

¿Hay voto rural distintivo? Cruzamos la **proxy de ruralidad** (stock bovino per cápita por municipio, en escala logarítmica) contra el **% de LLA en presidente 2023 (primera vuelta)**. El R² mide cuánta de la variación entre municipios explica la ruralidad.

El stock bovino per cápita es solo una proxy entre muchas posibles para "ruralidad" — otras candidatas serían % población urbana, ingreso agrícola o estructura productiva.

## Trayectoria

Cruzamos el **% de sobreedad en nivel secundario** por municipio (proxy de rezago educativo) con el **% del peronismo a gobernador 2023**. La sobreedad mide cuántos alumnos están atrasados respecto a la edad esperada para su nivel; valores altos suelen correlacionar con condiciones socioeconómicas más adversas.

## Inseguridad

Cruzamos la **tasa de hechos delictivos /100.000 habitantes (SNIC 2024)** contra el **% de LLA en presidente 2023**. La hipótesis a contrastar: ¿la inseguridad correlaciona con voto disruptivo?

La tasa SNIC tiene limitaciones de comparabilidad municipal — subregistro variable, municipios costeros con estacionalidad — que se discuten en detalle en la sección Seguridad del dashboard.

## Transferencias

Cruzamos las **transferencias provinciales por elector** acumuladas en 2023 contra el **% del peronismo a gobernador 2023**. Pregunta: ¿los municipios más dependientes del envío provincial votan distinto?

## Heatmap

La matriz muestra la **participación electoral** de los 135 municipios (filas, ordenadas por sección electoral) a lo largo de las elecciones a gobernador 2007 – 2023 (columnas). Permite identificar municipios consistentemente apáticos, municipios de alta participación y cambios temporales por municipio o sección.

## Clusters

¿Hay tipologías de municipios según patrón de voto? Aplicamos **k-means con k = 5** sobre un vector de cuatro dimensiones por municipio:

> [% Peronismo, % Cambiemos/JxC, % LLA, % Otros] · en gobernador 2023.

El algoritmo agrupa los municipios en cinco clusters según similitud de patrón de voto. Cada cluster recibe un nombre por su **fuerza dominante** y un código numérico estable para su visualización en el mapa.

La interpretación es exploratoria: los clusters no representan "tipos" pre-existentes, sino agrupaciones emergentes de los datos. Resultados posibles que suelen observarse: un cluster "AMBA-peronista" denso, uno "interior-JxC" rural, uno "LLA-irruptivo" mixto, y dos clusters intermedios con mezclas distintas.
