# Auditoría de consistencia de datos en informes

**Fecha**: 2026-05-01
**Alcance**: 14 informes Markdown en `public/reports/` cruzados contra los crudos en `1- Poblacion/` … `7- Industria/` y los JSON canónicos en `public/data/`.
**Estado**: auditoría completa de los 14 informes (revisión dirigida sobre los KPIs principales y verificación cruzada con `data/*.json`).

---

## Resumen ejecutivo

| Informe | Cifras verificadas | Hallazgos | Severidad máx. |
|---|---|---|---|
| seguridad.md | totales, ranking top 10, costeros | **3 errores en .md + 1 en JSON** | 🔴 Alta |
| poblacion/estructura.md | totales + 17 municipios + 2010 vs 2022 | 1 menor (.md) + **JSON divergente** | 🔴 Alta |
| salud.md | nacidos vivos serie + bajo peso 2024 | **1 error replicado en 3 informes** | 🟠 Media |
| educacion.md | establecimientos, matrícula | typo + **JSON con KPIs erróneos** | 🔴 Alta |
| agricultura.md | totales 1969–2025 | **1 error de variación %** | 🟠 Media |
| industria.md | PyMEs serie 2007–2023, parques | **JSON: 238 parques vs .md 612** | 🔴 Alta |
| economia-fiscal.md | recaudación, transferencias, PBG, expo | **PBG absoluto inconsistente** + JSON 2026 vs .md 2025 | 🟠 Media |
| poblacion/economia.md | universo 14+ | ✅ .md correcto; JSON tasa desocupación divergente | 🟠 Media |
| poblacion/educacion-censal.md | 17,4M / 5,93M / 34% | ✅ .md y JSON coherentes |  |
| poblacion/fecundidad.md | 4,67M mujeres / promedio 1,4 | ✅ .md correcto |  |
| poblacion/habitacional-personas.md | 17,4M | ✅ universo correcto; KPIs JSON no comparables (porcentajes, no absolutos) |  |
| poblacion/habitacional-hogares.md | 6,05M hogares (.md) | **JSON dice 5,98M hogares** | 🟠 Media |
| poblacion/salud-prevision.md | 62,3% / 35,1% / 2,6% | **JSON usa otra clasificación** | 🔴 Alta |
| poblacion/viviendas.md | 6,75M viviendas (.md) | **JSON dice 6,74M** | 🟡 Baja |

Fuente de verdad utilizada: **Censo 2022 INDEC** (`1- Poblacion/1- Estructura por sexo y edad de la población/c2022_bsas_est_c1_2 (1).xlsx`, hoja "Cuadro1.2"). Tabla canónica extraída a `scripts/_canonical_pob_2022.json`.

---

## 1. seguridad.md — hallazgos confirmados

### 🔴 Error A1 — Población de La Matanza (caso reportado por el usuario)

- **Ubicación**: [public/reports/seguridad.md:98](public/reports/seguridad.md)
- **Reportado**: `~2.400.000`
- **Real (Censo 2022 INDEC)**: `1.841.247`
- **Sobreestimación**: +30,3% (≈559.000 personas)
- **Impacto**: la columna se usa para contextualizar la concentración delictiva ("La Matanza concentra el 7,5% de los hechos…"). Una población inflada hace ver al municipio menos denso en delitos por habitante de lo que realmente es.
- **Fix**: reemplazar por `~1.841.000` o `1.841.247`.

### 🟠 Error A2 — Subestimación sistemática del resto del top 10

Toda la columna "Población aprox." de la tabla 5.1 ([seguridad.md:96-107](public/reports/seguridad.md)) está desactualizada: usa cifras pre-Censo 2022.

| # | Municipio | Reportado | Real 2022 | Δ |
|---|---|---|---|---|
| 1 | La Matanza | ~2.400.000 | 1.841.247 | **+30%** |
| 2 | General Pueyrredón | ~660.000 | 667.082 | -1% ✓ |
| 3 | La Plata | ~730.000 | 768.547 | -5% |
| 4 | Quilmes | ~600.000 | 633.391 | -5% |
| 5 | Lomas de Zamora | ~620.000 | 690.480 | **-10%** |
| 6 | Almirante Brown | ~580.000 | 584.827 | ✓ |
| 7 | Lanús | ~460.000 | 461.267 | ✓ |
| 8 | Merlo | ~540.000 | 582.486 | -7% |
| 9 | General San Martín | ~440.000 | 450.518 | ✓ |
| 10 | Moreno | ~530.000 | 576.632 | -8% |

**Fix**: reemplazar toda la columna por valores Censo 2022 (`~XXX.XXX` redondeado al millar, sin sufijo `~` o con cita explícita "INDEC 2022").

### 🟠 Error A3 — Mar Chiquita en tabla de costeros

- **Ubicación**: [public/reports/seguridad.md:227](public/reports/seguridad.md)
- **Reportado**: `Mar Chiquita: ~21.000` (residentes Censo 2022)
- **Real**: `33.110`
- **Subestimación**: -37%
- **Fix**: corregir a `~33.100`. Las demás filas de la tabla están dentro de ±3% (correctas).

### ✅ Lo que SÍ está bien en seguridad.md

Verificación cruzada contra `4- Seguridad/seguridad-snic-provincial-…` y `…-departamental-…`:

- Total PBA 2024: **678.943 hechos / 157.204 víctimas** ✓
- Robos 120.692, Hurtos 91.215, Amenazas 69.294, Lesiones dolosas 66.484, Homicidios dolosos 790 ✓
- Las 10 columnas "Hechos" y "Víctimas" del top 10 (línea 96-107): **exactas** contra el SNIC.
- Estafas virtuales +474,3%, comercialización estupefacientes +107,4%, portación ilegal +1.228% ✓

---

## 2. poblacion/estructura.md

Verificado contra Censo 2022 (la propia fuente del informe):

- Total provincial 17.523.996 ✓
- Variación intercensal 12,2% ✓ (real 12,15%)
- 24 GBA 10.849.398 ✓ / Resto 6.674.598 ✓
- Top 15 municipios (línea 42-56): **17 de 17 valores correctos** (La Matanza 1.841.247, La Plata 768.547, Lomas 690.480, Pueyrredón 667.082, Quilmes 633.391, Almirante Brown 584.827, Merlo 582.486, Moreno 576.632, Florencio Varela 496.433, Lanús 461.267, San Martín 450.518, Tigre 446.949, Pilar 394.754, Avellaneda 367.554, Berazategui 358.712).
- Tordillo 2.542 ✓, Pila 4.642 ✓, Patagones 37.646 ✓, San Vicente +65,1% ✓.

### 🟡 Hallazgo menor B1 — Población nacional

- **Ubicación**: [estructura.md:21](public/reports/poblacion/estructura.md)
- **Texto**: "PBA … con el **38,5%** de la población nacional (45,5 millones)".
- **Cálculo**: 17.523.996 / 45.500.000 = 38,5% ✓ (consistente con las cifras citadas).
- **Pero**: el Censo 2022 nacional dio 46.044.703 → el porcentaje real es 38,1%. Los 45,5M citados están desactualizados (corresponden a una proyección pre-censal).
- **Fix**: actualizar a "46,0 millones" y "38,1%".

---

## 3. salud.md

Verificado contra `3- Salud/nacidos-vivos-peso-2005_2024.csv`:

Toda la serie de nacidos vivos coincide al dígito (262.786 / 280.318 / 288.831 / 294.329 / 272.471 / 227.596 / 191.474 / 190.096 / 174.074 / 162.380 / 147.081). Los 5 intervalos de bajo peso 2024 coinciden (42 / 646 / 1.104 / 2.166 / 7.289 → 11.247 ✓).

### 🟠 Error C1 — "-44% en 10 años" replicado en 3 informes

- **Ubicaciones**:
  - [public/reports/salud.md:16](public/reports/salud.md): "*un descenso del 44% en 10 años*"
  - [public/reports/poblacion/estructura.md:21](public/reports/poblacion/estructura.md): "*ver informe de Salud: -44% en 10 años*"
  - [public/reports/educacion.md:41](public/reports/educacion.md): "*la caída de natalidad (ver informe de Salud: -44% en 10 años)*"
  - [public/reports/educacion.md:536](public/reports/educacion.md): "*La caída de natalidad (-44% en 10 años)*"
- **Cálculo real**: 1 − (147.081 / 294.329) = **50,03%**.
- **Fix**: reemplazar "44%" por "50%" en los 4 sitios. El subtítulo "147.000 niños menos que en 2014" sigue siendo correcto (294.329 − 147.081 = 147.248).

---

## 4. educacion.md

Verificado contra `2- Educacion/establecimientos-educativos-30032026.csv`: 21.668 establecimientos ✓.

### 🟡 Hallazgo menor D1 — Total matrícula no cuadra

- **Ubicación**: [educacion.md:20](public/reports/educacion.md)
- **Total reportado**: 5.000.120
- **Suma de los 9 niveles del cuadro 1.2** (línea 31-39): 1.812.527 + 1.747.086 + 597.962 + 270.031 + 203.243 + 176.910 + 68.000 + 45.759 + 79.602 = **5.001.120**
- **Diferencia**: 1.000 (probablemente typo).
- **Fix**: armonizar (5.001.120 o ajustar uno de los componentes).

---

## 5. agricultura.md

Verificado contra `6- Agricultura y Ganaderia/estimaciones-agricolas-1969_2025.csv` (53.317 registros). Totales por campaña coinciden:

- 1969/70 8.823.985 ha / 13.797.141 tn ✓
- 2024/25 20.880.235 ha / 66.646.167 tn ✓
- 2018/19 68,26M tn ✓ / 2022/23 43,59M tn ✓ / 2023/24 64,45M tn ✓ / 2015/16 66,56M tn ✓
- Crecimiento producción +383% ✓ / superficie +137% ✓

### 🟠 Error E1 — Caída de la sequía 2022/23 mal calculada

- **Ubicación**: [agricultura.md:40](public/reports/agricultura.md)
- **Texto**: "*La producción cayó un **36%** en una sola campaña (de 61,77M a 43,59M tn) — una pérdida de 18 millones de toneladas*"
- **Cálculo real**: 1 − (43.590.110 / 61.772.723) = **29,4%**, no 36%.
- La pérdida absoluta (18M tn) sí es correcta.
- **Fix**: reemplazar "36%" por "29%" o "casi 30%".

---

## 6. industria.md

Verificado contra `7- Industria/empresas-segmento-2007_2023.csv` y `parques-industriales.csv`:

- PyMEs 2012: 196.616 ✓ (pico). Serie 2018-2021 (191.100 / 184.015 / 172.497 / 169.723) ✓
- PyMEs 2023: 177.474 ✓ / Total empresas 251.820 ✓
- Parques industriales: 612 filas en CSV ✓
- Crecimiento Sellos +1.942,6% (2021→2025) — no verificado por scope (requiere recaudacion-tributaria CSV).

**Sin hallazgos en industria.md** dentro del alcance verificado.

---

## 7. economia-fiscal.md

Verificado contra `5- Economía y Finanzas/*.csv` (recaudación, transferencias, exportaciones, PBG).

### ✅ Lo que coincide

- Serie de recaudación 2019–2025 al dígito ($366.005M / $467.016M / $791.478M / $1.408.769M / $3.040.410M / $8.678.957M / $13.006.204M).
- Composición 2025 al dígito: IB $9,91B (76,2%), Sellos $1,37B, Automotores $689,7M, Inmobiliario Edificado $446,1M, Planes $295,4M, etc.
- Crecimiento Sellos 2021→2025 +1.942,6% ✓ / IB +1.610,4% ✓.
- Top 10 transferencias 2025 (La Matanza $300,82B, La Plata $138,29B, Lomas $132,86B, Merlo $130,71B, Malvinas $129,87B, …) — 10 de 10 valores correctos.
- Bottom 10 transferencias ✓ (Tordillo $2,80B …).
- Composición conceptos: Coparticipación 77,3% / Fondo Educativo 9,7% / FFRM 4,4% / Fondo Inclusión 3,3% — exactos.
- Exportaciones serie 2010–2025 (USD 428M / 528M / 442M / 368M / 351M / 436M / 384M / 635M / 511M / 560M / 488M) — coinciden a la unidad con la sumatoria del CSV.

### 🟠 Hallazgo F1 — Nota "2025 parcial" inexacta

- **Ubicación**: [economia-fiscal.md:15-27](public/reports/economia-fiscal.md)
- **Texto**: "*La provincia recaudó $13,01 billones en 2025 (parcial), proyectando superar el cierre de 2024 ($8,68B)*" y nota "*2025 parcial (enero–marzo según datos disponibles)*".
- **Real**: el CSV tiene los **12 meses de 2025 completos** (`recaudacion-tributaria-011999_012026.csv`). $13,01B ya es el total anual final.
- **Fix**: eliminar "(parcial)" y la nota de pie "2025 parcial (enero–marzo)". El crecimiento +49,9% YoY también es definitivo.

### 🟠 Hallazgo F2 — PBG: valores absolutos inconsistentes con la fuente

- **Ubicación**: [economia-fiscal.md:236-249](public/reports/economia-fiscal.md), tabla "PBG (precios constantes 2004)".
- **Reportado**: 2004 = $170.000M, 2011 = $255.000M (máximo), 2023 = $258.000M.
- **Real (suma del CSV `Producto Bruto Geográfico (PBG).csv`, columna `valor_precios_constantes`)**: 2004 = **94.272**, 2011 = **144.232**, 2023 = **142.427**.
- **Ratio**: los valores del informe son ≈1,81× los del CSV. **Las variaciones interanuales sí coinciden** (+51,8% informe vs +51,1% real 2004→2023), por eso la narrativa sigue siendo correcta — pero el número absoluto que el lector ve es ~80% más alto que el real.
- **Causa probable**: el `.md` toma valores de otra serie (¿índice rebasado, INDEC nacional en lugar del provincial?). Verificar y reemplazar por los valores del CSV o documentar la fuente alternativa.

### 🟠 Hallazgo F3 — Crecimientos 2024→2025 de transferencias con desfase menor

- **Ubicación**: [economia-fiscal.md:148-152](public/reports/economia-fiscal.md), "Municipios con mayor crecimiento".
- **Reportado vs real**: Marcos Paz +49,1% (real +49,5%); Gral. Rodríguez +44,6% (real +45,1%); Escobar +43,0% (real +43,5%).
- **Magnitud**: <1 punto porcentual. Probable snapshot anterior del CSV. Bajo impacto.

---

## 8. poblacion/* (los 7 restantes)

Universos verificados directamente contra los xlsx del Censo 2022 (carpeta `1- Poblacion/`):

| Informe | KPI clave | Reportado (.md) | Crudo Censo 2022 | Estado |
|---|---|---|---|---|
| viviendas.md | Total viviendas | 6.749.094 | 6.749.094 ✓ | ✅ |
| viviendas.md | Viv. particulares / colectivas | 6.745.665 / 3.429 | idem ✓ | ✅ |
| habitacional-personas.md | Personas viv. particulares | 17.408.906 | 17.408.906 ✓ | ✅ |
| habitacional-hogares.md | Total hogares | 6.051.550 | (no verificado xlsx, sí en .md y procesador) | ⚠️ JSON divergente |
| salud-prevision.md | OS/Prepaga / Estatal / Sin | 10.839.210 / 458.303 / 6.111.393 | idem ✓ | ✅ |
| economia.md | Pob. 14+ / PEA / Ocupados / Desocup. | 13.857.399 / 8.942.700 / 8.120.465 / 822.235 | idem ✓ | ✅ |
| fecundidad.md | Mujeres 14-49 / promedio | 4.668.931 / 1,4 | idem ✓ | ✅ |
| educacion-censal.md | Pob. PBA / Asisten / Tasa | 17.408.906 / 5.926.948 / 34,0% | universo ✓; tasa = 34,046% ✓ | ✅ |

Tasas derivadas verificadas (todas correctas):
- salud-prevision.md: 62,3% (10.839.210/17.408.906) ✓ / 35,1% ✓ / 2,6% ✓
- economia.md: PEA 64,5% ✓ / desocupados 5,9% (sobre 14+) ✓
- educacion-censal.md: 34,0% ✓

**Sin hallazgos en los .md de los 7 informes restantes**. La inconsistencia mayor está en los JSON (ver sección 9).

---

## 9. Cruce sistémico `.md` ↔ `data/*.json` — DIVERGENCIAS GRAVES

Para cada informe se compararon los KPIs del texto Markdown contra los KPIs que el SPA inyecta arriba del informe (consumidos del JSON correspondiente). Resultado: **8 informes muestran KPIs distintos en el texto vs en el dashboard**.

### 🔴 G1 — poblacion/estructura.json contradice a estructura.md

| KPI | .md (Censo 2022) | JSON (SPA) | Δ |
|---|---|---|---|
| Población total PBA | 17.523.996 | **17.541.141** | +17.145 |
| Mujeres | 9.053.427 | **9.097.215** | +43.788 |
| Varones | 8.470.569 | **8.443.926** | -26.643 |
| Índice de masculinidad | 93,6 | **92,8** | -0,8 |

El `.md` cita Censo 2022 al pie de la letra; el JSON usa otra fuente (probablemente proyección INDEC o un archivo distinto). El usuario ve simultáneamente dos cifras de "Población total PBA" según mire la card o el texto.
**Fix**: alinear ambos al Censo 2022 (modificar `scripts/process-poblacion.cjs` o `generate-report-data.cjs`).

### 🔴 G2 — educacion.json: matrícula y desempeño Aprender contradicen al .md

| KPI | .md | JSON | Δ |
|---|---|---|---|
| Matrícula total | 5.000.120 (texto) / 5.001.120 (suma niveles) | **5.200.000** | +200.000 vs texto |
| Lengua Sec. (básico+debajo) | 22,4 + 20,3 = 42,7% | **53,5%** | +10,8 pp |
| Matemática Sec. (básico+debajo) | 55,2 + 27,9 = 83,1% | **78,4%** | -4,7 pp |
| Lengua Prim. (básico+debajo) | (no reportado, equivalente Niv. I+II = 28,4) | **34,2%** | — |
| Matemática Prim. | (no reportado) | **44,5%** | — |

El JSON parece usar un cálculo / fuente distinta al cuerpo del informe.
**Fix**: decidir cuál es la fuente correcta y unificar.

### 🔴 G3 — industria.json: parques industriales 238 vs .md 612

- **JSON**: `Parques industriales: 238`
- **MD ([industria.md:7](public/reports/industria.md))**: "612 parques industriales en 112 municipios"
- **Crudo (`7- Industria/parques-industriales.csv`)**: 612 filas ✓
- **El JSON KPI muestra el número incorrecto** — el lector ve "238" en el dashboard y "612" en el texto del informe.
**Fix**: corregir el cálculo en `process-industria.cjs` / `generate-report-data.cjs`.

### 🔴 G4 — seguridad.json: homicidios dolosos 1.597 vs .md 790

- **JSON**: `Homicidios dolosos: 1597`
- **MD**: `790` (verificado contra SNIC raw ✓)
- **Posible causa**: el JSON está sumando 2 años (2023 + 2024 = 805+790 = 1.595 ≈ 1.597) o sumando otra subcategoría.
**Fix**: corregir agregación en `process-seguridad.cjs`.

### 🔴 G5 — poblacion/salud-prevision.json: clasificación distinta

- **JSON**: Sin cobertura **36,5%** / Obra social **42,8%** / Prepaga **12,3%** / Jubilados 2.200.000
- **MD**: Sin cobertura **35,1%** / OS+Prepaga (incluye PAMI) **62,3%** / Programas estatales **2,6%**
- El Censo 2022 (xlsx) **no separa OS de Prepaga**: es una sola categoría "Obra social o prepaga (incluye PAMI)" = 10.839.210. El JSON está usando otra fuente o desagregación.
- También difiere "Sin cobertura": 36,5% vs 35,1%.
**Fix**: alinear a la clasificación del Censo (la del .md es la correcta).

### 🟠 G6 — poblacion/economia.json: tasa desocupación

- **JSON**: Tasa desocupación = **9,2%** (sobre PEA: 822.235/8.942.700 = 9,19%) ✓ — esta es la tasa **estándar de desocupación**.
- **MD**: 822.235 = "5,9% de la pob. 14+" — calcula sobre el total 14+, no sobre la PEA.
- Ambos están "correctos" matemáticamente, pero presentan denominadores distintos. El usuario ve 9,2% en la card y 5,9% en el texto.
**Fix**: estandarizar a la convención INDEC (sobre PEA) en ambos lados.

### 🟠 G7 — poblacion/viviendas.json: 6.738.041 vs .md 6.749.094

- Diferencia: **11.053 viviendas** (-0,16%). El JSON parece excluir las colectivas con condición ambigua o usa cuadro diferente.
- Bajo impacto pero detectable por el usuario.

### 🟠 G8 — poblacion/habitacional-hogares.json: 5.979.469 vs .md 6.051.550

- Diferencia: **72.081 hogares** (-1,2%). El JSON probablemente filtra hogares con datos completos solamente.

### 🟠 G9 — economia-fiscal.json: año 2026 vs .md año 2025

- KPIs JSON: "Recaudación total (**2026**): 1.313M" / "Mayor transfer.: La Matanza: 30.292M (**2026**)"
- MD habla de **2025**: "$13,01B en 2025" / "La Matanza $300,82B en 2025".
- Los charts JSON titulan "Top 15 — Transferencias (**2026**)" pero los datos parecen ser solo enero 2026 (parcial). El lector ve un ranking del primer mes mientras lee texto sobre el año cerrado.
**Fix**: el JSON debería mostrar el último año cerrado (2025) o etiquetar claramente "ene-2026 parcial".

---

## Apéndice: cómo reproducir los chequeos

Tabla canónica de población generada en esta auditoría:

```bash
node scripts/_canonical_pob_2022.json   # JSON con los 138 valores
```

Ejemplo de chequeo individual:

```js
const c = require('./scripts/_canonical_pob_2022.json');
console.log(c['La Matanza']); // 1841247
```

Cross-check de SNIC (seguridad.md, totales 2024):

```js
// Lee 4- Seguridad/.../estadísticas-criminales-…provincias-(panel)-(.csv).csv
// Filtra c[0]==='06' && c[2]==='2024', suma c[5] (hechos) y c[6] (víctimas).
// Resultado: 678.943 / 157.204 ✓
```

Cross-check de natalidad (salud.md, serie nacidos vivos):

```js
// Lee 3- Salud/nacidos-vivos-peso-2005_2024.csv
// Agrupa por anio sumando nacidos_cantidad. Coincide al dígito con la tabla.
```

---

## Próximos pasos sugeridos

### Fase 1 — fixes textuales en `.md` (rápido, sin tocar pipeline)

1. **A1, A2, A3** — corregir poblaciones en `seguridad.md` (La Matanza 1,84M, Mar Chiquita 33K, alinear todas al Censo 2022).
2. **B1** — `estructura.md`: 46,0M / 38,1% en lugar de 45,5M / 38,5%.
3. **C1** — reemplazar **-44%** por **-50%** en los 4 sitios (`salud.md:16`, `estructura.md:21`, `educacion.md:41`, `educacion.md:536`).
4. **D1** — `educacion.md:20`: armonizar matrícula 5.000.120 ↔ 5.001.120.
5. **E1** — `agricultura.md:40`: -36% → -29%.
6. **F1** — `economia-fiscal.md`: eliminar nota "(parcial)" sobre 2025.
7. **F2** — `economia-fiscal.md`: revisar serie PBG absoluta (≈80% sobreestimada vs CSV).

### Fase 2 — fixes de pipeline (corrigen los KPIs del SPA)

Editar los procesadores `scripts/process-*.cjs` y/o `generate-report-data.cjs` para que los KPIs del JSON consumido por el SPA coincidan con el `.md`:

8. **G1** — alinear `poblacion/estructura.json` al Censo 2022 (17.523.996 / 9.053.427 / 8.470.569 / IM 93,6).
9. **G2** — recalcular KPIs de `educacion.json` (matrícula y % de desempeño Aprender) para que coincidan con `educacion.md`.
10. **G3** — corregir `industria.json` parques industriales: 238 → 612.
11. **G4** — corregir `seguridad.json` homicidios dolosos: 1.597 → 790 (probable suma multi-año errónea).
12. **G5** — usar la clasificación del Censo 2022 (OS+prepaga combinada) en `poblacion/salud-prevision.json`.
13. **G6** — estandarizar tasa de desocupación a la convención INDEC (sobre PEA) en ambos lados.
14. **G7, G8** — investigar diferencias menores en viviendas y hogares JSON.
15. **G9** — `economia-fiscal.json`: usar 2025 cerrado en lugar de ene-2026 parcial.

### Fase 3 — proceso

16. **Política de citas**: cada informe que use población como divisor o contexto debe citar "Censo 2022, INDEC" para que la fuente sea auditable.
17. **Test de regresión**: agregar un script `scripts/audit-data.cjs` que reproduzca los chequeos automatizados (universo Censo, totales SNIC, totales agrícolas) y falle si los `.md` o los JSON divergen del crudo. Correrlo en `prebuild`.
