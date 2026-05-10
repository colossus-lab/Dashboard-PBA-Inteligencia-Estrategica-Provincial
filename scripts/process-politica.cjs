/**
 * process-politica.cjs
 *
 * Genera la sección "Política y Elecciones" del dashboard a partir de los
 * datasets de Datos Abiertos PBA (CSVs de resultados electorales 2005–2023)
 * y la cartografía de secciones electorales.
 *
 * Output:
 *   - public/data/politica.json                (KPIs + charts del scrolly)
 *   - public/data/politica/secciones-mapping.json
 *   - public/data/explorer/politica.json
 *   - public/data/explorer/index.json (regenerado para incluir politica)
 *
 * Uso:  node scripts/process-politica.cjs
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DASHBOARD_ROOT = path.join(__dirname, "..");
const DATOS_PBA = path.resolve(
  DASHBOARD_ROOT,
  "..",
  "Pipeline OpenArg",
  "datos_pba"
);

const OUT_DATA = path.join(DASHBOARD_ROOT, "public", "data");
const OUT_POLITICA = path.join(OUT_DATA, "politica");
const OUT_EXPLORER = path.join(OUT_DATA, "explorer");

const F_NACIONALES = path.join(
  DATOS_PBA,
  "resultados-electorales-nacionales",
  "elecciones-nacionales-2015-2023.csv"
);
const F_BALLOTAGE = path.join(
  DATOS_PBA,
  "resultados-electorales-nacionales",
  "ballotage-2015-2023-csv_extracted",
  "ballotage-2015-2023.csv"
);
const F_PROV_GEN = path.join(
  DATOS_PBA,
  "resultados-electorales-provinciales",
  "elecciones-generales-2005-2023.csv"
);
const F_PROV_PASO = path.join(
  DATOS_PBA,
  "resultados-electorales-provinciales",
  "elecciones-paso-2011-2021.csv"
);
const F_SECCIONES_GEOJSON = path.join(
  DATOS_PBA,
  "secciones-electorales",
  "secciones-electorales-pba_extracted",
  "secciones-electorales-pba.geojson"
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeJSON(file, data, label) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ✓ ${label || path.basename(file)} — ${kb} KB`);
}

function num(v) {
  if (v === null || v === undefined || v === "" || v === "-") return 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function normalizeName(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCSV(file, delimiter = ",") {
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠ no existe: ${file}`);
    return [];
  }
  const raw = fs.readFileSync(file, "utf-8");
  const r = Papa.parse(raw, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return r.data;
}

// Title-case respetando palabras cortas y siglas habituales (PJ, UCR, etc.)
function prettyAgrupacion(s) {
  const raw = String(s || "").trim();
  if (!raw) return "Sin identificar";
  const lower = raw.toLowerCase();
  return lower
    .split(/\s+/)
    .map((w, i) => {
      if (w.length <= 3 && i > 0) return w; // de, la, y, etc.
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function topByValue(rows, key, n = 5) {
  return [...rows].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, n);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// ─── SECCIONES ELECTORALES ────────────────────────────────────────────────────
// El geojson tiene 1 feature por sección (8 polígonos). Lo simplificamos para
// servirlo al front (~800KB con 3 decimales). Y derivamos el mapping
// municipio→sección a partir de la columna `seccion_electoral` del CSV
// provincial (los 135 partidos están cubiertos ahí).

const SECCION_WORD_TO_ROMAN = {
  PRIMERA: "I",
  SEGUNDA: "II",
  TERCERA: "III",
  CUARTA: "IV",
  QUINTA: "V",
  SEXTA: "VI",
  SEPTIMA: "VII",
  OCTAVA: "VIII",
  CAPITAL: "VIII",
};

function seccionToRoman(s) {
  const k = normalizeName(s);
  return SECCION_WORD_TO_ROMAN[k] || s;
}

function simplifyGeometryCoords(coords, decimals) {
  function round(n) {
    const f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
  }
  if (typeof coords[0] === "number") return [round(coords[0]), round(coords[1])];
  const arr = coords.map((c) => simplifyGeometryCoords(c, decimals));
  if (typeof arr[0]?.[0] === "number") {
    const out = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      if (
        arr[i][0] !== out[out.length - 1][0] ||
        arr[i][1] !== out[out.length - 1][1]
      )
        out.push(arr[i]);
    }
    return out;
  }
  return arr;
}

function writeSimplifiedSeccionesGeojson() {
  console.log("\nSimplificando secciones-electorales geojson...");
  if (!fs.existsSync(F_SECCIONES_GEOJSON)) {
    console.warn(`  ⚠ geojson no encontrado: ${F_SECCIONES_GEOJSON}`);
    return;
  }
  const gj = JSON.parse(fs.readFileSync(F_SECCIONES_GEOJSON, "utf-8"));
  const out = {
    type: "FeatureCollection",
    name: "secciones-electorales-pba",
    features: (gj.features || []).map((f) => ({
      type: "Feature",
      properties: {
        seccion: f.properties?.seccion || "",
        fna: f.properties?.fna || "",
      },
      geometry: {
        type: f.geometry.type,
        coordinates: simplifyGeometryCoords(f.geometry.coordinates, 3),
      },
    })),
  };
  const dest = path.join(OUT_DATA, "pba-secciones-electorales.geojson");
  fs.writeFileSync(dest, JSON.stringify(out), "utf-8");
  const kb = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(
    `  ✓ pba-secciones-electorales.geojson — ${out.features.length} secciones — ${kb} KB`
  );
}

function buildSeccionesMappingFromCSV(provGenRows) {
  console.log("\nDerivando mapping municipio→sección desde CSV provincial...");
  const byMuni = {};
  const byMuniDisplay = {};
  const seccionCounts = {};
  for (const r of provGenRows) {
    const muni = (r.municipio || "").trim();
    const sec = (r.seccionElectoral || "").trim();
    if (!muni || !sec) continue;
    const key = normalizeName(muni);
    if (byMuni[key]) continue;
    const roman = seccionToRoman(sec);
    byMuni[key] = roman;
    byMuniDisplay[muni] = roman;
    seccionCounts[roman] = (seccionCounts[roman] || 0) + 1;
  }
  console.log(
    `  → ${Object.keys(byMuni).length} municipios mapeados a ${
      Object.keys(seccionCounts).length
    } secciones`
  );
  console.log(`  → distribución:`, seccionCounts);
  return { byMuni, byMuniDisplay, seccionCounts };
}

// ─── PROCESAMIENTOS ───────────────────────────────────────────────────────────

// Normaliza fila genérica de CSV electoral a un schema común.
function normalizeRow(r, source) {
  // Toma el campo más razonable según el archivo origen
  const año =
    parseInt(r["año"] || r["anio"] || r["eleccion"], 10) || null;
  const eleccion = String(
    r["eleccion"] || r["eleccion_tipo"] || ""
  ).trim();
  const cargo = String(r["cargo"] || r["cargo_nombre"] || "").trim();
  const municipio = String(
    r["municipio_nombre"] ||
      r["distrito"] ||
      r["seccion_nombre"] || // ballotage: seccion_nombre = municipio
      ""
  ).trim();
  const seccionElectoral = String(
    r["seccion_electoral"] ||
      r["seccion"] ||
      r["seccionprovincial_nombre"] ||
      ""
  ).trim();
  const agrupacion = String(
    r["agrupacion_nombre"] || r["lista"] || ""
  ).trim();
  const votos = num(r["votos"] || r["votos_cantidad"] || 0);
  const habilitados = num(
    r["votantes_habilitados"] ||
      r["electores_habilitados"] ||
      r["mesa_electores"] ||
      0
  );
  const votantes = num(r["votantes"] || 0);
  const votosTipo = String(r["votos_tipo"] || "").trim();
  return {
    source,
    año,
    eleccion,
    cargo,
    municipio,
    seccionElectoral,
    agrupacion,
    votos,
    habilitados,
    votantes,
    votosTipo,
  };
}

// Aggregation generic: groupBy fields => sum votos
function aggregate(rows, groupKeys, opts = {}) {
  const { onlyPositive = true } = opts;
  const map = new Map();
  for (const r of rows) {
    if (onlyPositive && r.votosTipo && r.votosTipo !== "POSITIVO") {
      // ballotage trae blancos/nulos; los excluimos para totales por lista
      // pero los sumamos por separado bajo otra key
    }
    const key = groupKeys.map((k) => r[k] ?? "").join("|");
    if (!map.has(key)) {
      const obj = {};
      for (const k of groupKeys) obj[k] = r[k];
      obj.votos = 0;
      obj.habilitados = 0;
      obj.votantes = 0;
      map.set(key, obj);
    }
    const o = map.get(key);
    o.votos += r.votos || 0;
    if (r.habilitados) o.habilitados = Math.max(o.habilitados, r.habilitados);
    if (r.votantes) o.votantes = Math.max(o.votantes, r.votantes);
  }
  return [...map.values()];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-politica.cjs ===");
  ensureDir(OUT_DATA);
  ensureDir(OUT_POLITICA);
  ensureDir(OUT_EXPLORER);

  // 1) Cargar y normalizar todos los CSVs
  console.log("\nCargando CSVs electorales...");
  const provGen = parseCSV(F_PROV_GEN).map((r) => normalizeRow(r, "prov-gen"));
  console.log(`  prov-gen: ${provGen.length} filas`);
  const provPaso = parseCSV(F_PROV_PASO).map((r) =>
    normalizeRow(r, "prov-paso")
  );
  console.log(`  prov-paso: ${provPaso.length} filas`);
  const nacionales = parseCSV(F_NACIONALES).map((r) =>
    normalizeRow(r, "nac")
  );
  console.log(`  nacionales: ${nacionales.length} filas`);
  const ballotageRaw = parseCSV(F_BALLOTAGE).map((r) =>
    normalizeRow(r, "ballotage")
  );
  console.log(`  ballotage (mesa): ${ballotageRaw.length} filas`);

  // 1.5) Mapping municipio→seccion + simplificar geojson
  const { byMuni: muniToSeccion, seccionCounts } =
    buildSeccionesMappingFromCSV(provGen);
  writeJSON(
    path.join(OUT_POLITICA, "secciones-mapping.json"),
    { byMuni: muniToSeccion, seccionCounts },
    "secciones-mapping.json"
  );
  writeSimplifiedSeccionesGeojson();

  // 2.1) Pre-agregar ballotage de mesa a municipio×agrupacion×año
  const ballotageMuni = aggregate(
    ballotageRaw.filter((r) => r.votosTipo === "POSITIVO"),
    ["año", "municipio", "agrupacion"]
  );
  console.log(
    `  ballotage agregado a municipio: ${ballotageMuni.length} filas`
  );

  // ─── PARTICIPACIÓN HISTÓRICA ─────────────────────────────────────────────
  // Estimamos participación = max(votantes) / max(habilitados) por elección
  // a nivel provincial. Tomamos los archivos provinciales (cargo Gobernador o
  // DIPUTADOS PROVINCIALES) y nacionales (PRESIDENTE) cuando disponibles.
  console.log("\nCalculando participación histórica...");

  function partFor(rows, label) {
    // Habilitados es por (año, muni) y se repite en cada fila → tomamos UN valor
    // por muni y luego sumamos. Lo mismo para votantes. Votos sí los sumamos
    // (cada fila es una lista distinta).
    const habByMuni = new Map(); // key: año|muni → habilitados
    const votByMuni = new Map(); // key: año|muni → votantes (declarados)
    const votosTot = new Map(); // key: año → total votos (positivos)
    for (const r of rows) {
      if (!r.año) continue;
      const muniKey = `${r.año}|${normalizeName(r.municipio || "_")}`;
      if (r.habilitados) {
        const cur = habByMuni.get(muniKey) || 0;
        habByMuni.set(muniKey, Math.max(cur, r.habilitados));
      }
      if (r.votantes) {
        const cur = votByMuni.get(muniKey) || 0;
        votByMuni.set(muniKey, Math.max(cur, r.votantes));
      }
      votosTot.set(r.año, (votosTot.get(r.año) || 0) + (r.votos || 0));
    }
    // Sumar habilitados y votantes por año
    const habByYear = new Map();
    for (const [k, v] of habByMuni) {
      const year = parseInt(k.split("|")[0], 10);
      habByYear.set(year, (habByYear.get(year) || 0) + v);
    }
    const votByYear = new Map();
    for (const [k, v] of votByMuni) {
      const year = parseInt(k.split("|")[0], 10);
      votByYear.set(year, (votByYear.get(year) || 0) + v);
    }
    const out = [];
    const allYears = new Set([
      ...habByYear.keys(),
      ...votByYear.keys(),
      ...votosTot.keys(),
    ]);
    for (const año of allYears) {
      out.push({
        año,
        label,
        votos: votosTot.get(año) || 0,
        votantes: votByYear.get(año) || 0,
        habilitados: habByYear.get(año) || 0,
      });
    }
    return out;
  }

  // Para participación usamos el cargo más completo de cada archivo (todos los
  // cargos de una misma fecha tienen los mismos habilitados); con elegir uno
  // alcanza para no duplicar.
  const partGen = partFor(
    provGen.filter((r) => /gobernador/i.test(r.cargo)),
    "Generales Provinciales"
  );
  const partPaso = partFor(
    provPaso.filter((r) => /gobernador/i.test(r.cargo)),
    "PASO Provinciales"
  );
  const partNacGen = partFor(
    nacionales.filter(
      (r) =>
        /presidente/i.test(r.cargo) &&
        /^ELECCIONES GENERALES$/i.test(r.eleccion)
    ),
    "Generales Nacionales"
  );

  // Serie unificada participación generales (provincial+nacional cuando coexisten)
  // Preferimos `votantes` (declarados) sobre `votos` (suma de todas las listas),
  // ya que `votos` puede sobre-contar cuando la elección reporta múltiples cargos.
  const partAll = [...partGen, ...partNacGen, ...partPaso].map((p) => {
    const numerador = p.votantes || p.votos;
    return {
      año: p.año,
      label: p.label,
      participacion: p.habilitados ? pct(numerador, p.habilitados) : null,
      votos: p.votos,
      votantes: p.votantes,
      habilitados: p.habilitados,
    };
  });

  // Para el chart de evolución, una serie por año combinando:
  // - tipo Generales (provincial preferido, sino nacional)
  // - tipo PASO
  const partByYear = new Map();
  for (const r of partAll) {
    if (r.participacion === null) continue;
    if (!partByYear.has(r.año))
      partByYear.set(r.año, { año: r.año, Generales: null, PASO: null });
    const o = partByYear.get(r.año);
    if (/PASO/i.test(r.label)) {
      o.PASO = o.PASO == null ? r.participacion : Math.max(o.PASO, r.participacion);
    } else {
      o.Generales =
        o.Generales == null
          ? r.participacion
          : Math.max(o.Generales, r.participacion);
    }
  }
  const participacionChart = [...partByYear.values()]
    .filter((r) => r.Generales !== null || r.PASO !== null)
    .sort((a, b) => a.año - b.año);

  // ─── PRESIDENTE — PRIMERA VUELTA (2015–2023) y BALLOTAGE (2015,2023) ────
  console.log("\nProcesando elecciones presidenciales...");
  const presPrimera = nacionales.filter(
    (r) =>
      /presidente/i.test(r.cargo) &&
      /^ELECCIONES GENERALES$/i.test(r.eleccion)
  );
  const presPrimeraAggMuni = aggregate(presPrimera, [
    "año",
    "municipio",
    "agrupacion",
  ]);
  const presBallotageMuni = ballotageMuni; // ya agregado

  // Top 5 fuerzas presidenciales por año (suma PBA)
  function topFuerzasPorAño(rows) {
    const byYearAgg = new Map();
    for (const r of rows) {
      if (!r.año || !r.agrupacion) continue;
      const key = `${r.año}|${r.agrupacion}`;
      if (!byYearAgg.has(key))
        byYearAgg.set(key, { año: r.año, agrupacion: r.agrupacion, votos: 0 });
      byYearAgg.get(key).votos += r.votos || 0;
    }
    // Por año, top 5 fuerzas
    const byYear = new Map();
    for (const r of byYearAgg.values()) {
      if (!byYear.has(r.año)) byYear.set(r.año, []);
      byYear.get(r.año).push(r);
    }
    const result = [];
    for (const [año, items] of byYear) {
      const top = topByValue(items, "votos", 5);
      const total = items.reduce((s, x) => s + x.votos, 0);
      for (const t of top) {
        result.push({
          año,
          agrupacion: t.agrupacion,
          votos: t.votos,
          porcentaje: pct(t.votos, total),
        });
      }
    }
    return result.sort((a, b) => a.año - b.año || b.votos - a.votos);
  }

  const topPresPrimera = topFuerzasPorAño(presPrimeraAggMuni);
  const topBallotage = topFuerzasPorAño(presBallotageMuni);

  // Datos para chart bar: presidencial 2023 ballotage por agrupación (top 5)
  const ballotage2023 = topBallotage.filter((r) => r.año === 2023);
  const ballotage2015 = topBallotage.filter((r) => r.año === 2015);
  const presPrimera2023 = topPresPrimera.filter((r) => r.año === 2023);

  // ─── GOBERNADOR (provinciales generales) ──────────────────────────────────
  console.log("\nProcesando elecciones a Gobernador...");
  const gob = provGen.filter(
    (r) => /gobernador/i.test(r.cargo) && r.eleccion
  );
  const gobAggMuni = aggregate(gob, ["año", "municipio", "agrupacion"]);
  const topGob = topFuerzasPorAño(gobAggMuni);
  const gob2023 = topGob.filter((r) => r.año === 2023);

  // ─── DIPUTADOS NACIONALES (última: 2023) ──────────────────────────────────
  console.log("\nProcesando diputados nacionales...");
  const dipNac = nacionales.filter(
    (r) =>
      /diputado nacional/i.test(r.cargo) &&
      /^ELECCIONES GENERALES$/i.test(r.eleccion)
  );
  const dipNacAgg = aggregate(dipNac, ["año", "municipio", "agrupacion"]);
  const topDipNac = topFuerzasPorAño(dipNacAgg);
  const dipNac2023 = topDipNac.filter((r) => r.año === 2023);

  // ─── EVOLUCIÓN TOP FUERZAS (line chart) ───────────────────────────────────
  // Para presidencial primera vuelta y gobernador, armamos una serie por año
  // con las top 5 fuerzas históricas (las que aparecen en ≥2 elecciones)
  function evolutionSeries(rowsAggByYear, years) {
    // rowsAggByYear: salida de topFuerzasPorAño
    // Queremos {año, fuerza1: %, fuerza2: %, ...}
    const allFuerzas = new Map();
    for (const r of rowsAggByYear) {
      const k = r.agrupacion;
      allFuerzas.set(k, (allFuerzas.get(k) || 0) + r.porcentaje);
    }
    // Top 5 fuerzas globales
    const topGlobal = [...allFuerzas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((x) => x[0]);
    const byYear = new Map(years.map((y) => [y, { año: y }]));
    for (const r of rowsAggByYear) {
      if (!byYear.has(r.año)) continue;
      if (topGlobal.includes(r.agrupacion)) {
        const obj = byYear.get(r.año);
        const label = prettyAgrupacion(r.agrupacion);
        obj[label] = (obj[label] || 0) + r.porcentaje;
      }
    }
    return [...byYear.values()].sort((a, b) => a.año - b.año);
  }

  const yearsPres = [...new Set(topPresPrimera.map((r) => r.año))].sort();
  const yearsGob = [...new Set(topGob.map((r) => r.año))].sort();
  const evolPres = evolutionSeries(topPresPrimera, yearsPres);
  const evolGob = evolutionSeries(topGob, yearsGob);

  // ─── MAPA MUNICIPAL — GANADOR PRESIDENCIAL 2023 BALLOTAGE ─────────────────
  console.log("\nGenerando mapas (municipal y por sección)...");
  function ganadorPorMunicipio(rowsAggMuni) {
    // rowsAggMuni: [{año, municipio, agrupacion, votos}] ya agregado
    const byMuni = new Map();
    for (const r of rowsAggMuni) {
      if (!r.municipio) continue;
      const key = r.municipio;
      if (!byMuni.has(key)) byMuni.set(key, []);
      byMuni.get(key).push(r);
    }
    const result = [];
    for (const [muni, list] of byMuni) {
      const total = list.reduce((s, x) => s + x.votos, 0);
      const winner = list.sort((a, b) => b.votos - a.votos)[0];
      result.push({
        municipio: muni,
        ganador: winner.agrupacion,
        votos_ganador: winner.votos,
        porcentaje: pct(winner.votos, total),
        total_votos: total,
      });
    }
    return result;
  }

  const mapaPresBallotage2023 = ganadorPorMunicipio(
    ballotageMuni.filter((r) => r.año === 2023)
  );
  const mapaGob2023 = ganadorPorMunicipio(
    gobAggMuni.filter((r) => r.año === 2023)
  );

  // Encode "ganador" por nombre normalizado para color in MapaPBA
  // Mapeamos cada agrupación ganadora a un color discreto (0,1,2...) usando
  // un orden determinístico
  function buildMapData(items, comuni) {
    // items: [{municipio, ganador, ...}], comuni: array of normalized names
    const allWinners = [
      ...new Set(items.map((x) => prettyAgrupacion(x.ganador))),
    ];
    const winnerToCode = new Map(allWinners.map((w, i) => [w, i + 1]));
    const muniData = [];
    for (const it of items) {
      const muniNorm = normalizeName(it.municipio);
      const winner = prettyAgrupacion(it.ganador);
      const code = winnerToCode.get(winner) || 0;
      muniData.push({
        municipioId: muniNorm, // será matcheado por nombre en MapaPBA
        municipioNombre: it.municipio,
        value: code,
        label: `${winner} — ${it.porcentaje}% (${(
          it.votos_ganador / 1000
        ).toFixed(1)}k votos)`,
      });
    }
    return {
      data: muniData,
      legend: [...winnerToCode.entries()].map(([w, c]) => ({
        agrupacion: w,
        code: c,
      })),
    };
  }

  const mapPresMuni = buildMapData(mapaPresBallotage2023);

  // Mapa por sección electoral: agregar votos por sección y determinar ganador
  function ganadorPorSeccion(rowsAggMuni) {
    const bySec = new Map();
    for (const r of rowsAggMuni) {
      const muniNorm = normalizeName(r.municipio);
      const sec = muniToSeccion[muniNorm];
      if (!sec) continue;
      const key = `${sec}|${r.agrupacion}`;
      if (!bySec.has(key))
        bySec.set(key, {
          seccion: sec,
          agrupacion: r.agrupacion,
          votos: 0,
        });
      bySec.get(key).votos += r.votos || 0;
    }
    // group by seccion, pick winner
    const grouped = new Map();
    for (const r of bySec.values()) {
      if (!grouped.has(r.seccion)) grouped.set(r.seccion, []);
      grouped.get(r.seccion).push(r);
    }
    const out = [];
    for (const [sec, list] of grouped) {
      const total = list.reduce((s, x) => s + x.votos, 0);
      const winner = list.sort((a, b) => b.votos - a.votos)[0];
      out.push({
        seccion: sec,
        ganador: prettyAgrupacion(winner.agrupacion),
        porcentaje: pct(winner.votos, total),
        votos_total: total,
      });
    }
    return out;
  }

  const seccionesPres2023 = ganadorPorSeccion(
    ballotageMuni.filter((r) => r.año === 2023)
  );
  const seccionesGob2023 = ganadorPorSeccion(
    gobAggMuni.filter((r) => r.año === 2023)
  );

  // ─── ARMADO DEL JSON FINAL ────────────────────────────────────────────────
  console.log("\nArmando politica.json...");

  // KPIs
  const eleccionesCubiertas =
    new Set(provGen.map((r) => r.año)).size +
    new Set(nacionales.map((r) => r.año)).size; // número simple
  const padron2023 = Math.max(
    ...partAll.filter((r) => r.año === 2023).map((r) => r.habilitados || 0),
    0
  );
  const partPromUltDecada = (() => {
    const recientes = partAll.filter(
      (r) =>
        r.año >= 2013 && r.participacion !== null && !/PASO/i.test(r.label)
    );
    if (!recientes.length) return null;
    const avg =
      recientes.reduce((s, x) => s + (x.participacion || 0), 0) /
      recientes.length;
    return Math.round(avg * 10) / 10;
  })();
  const fuerzasRel = new Set(
    [...topPresPrimera, ...topGob, ...topBallotage].map((r) =>
      prettyAgrupacion(r.agrupacion)
    )
  ).size;

  const kpis = [
    {
      id: "elecciones-cubiertas",
      label: "Años con datos",
      value: new Set([
        ...provGen.map((r) => r.año),
        ...nacionales.map((r) => r.año),
        ...provPaso.map((r) => r.año),
      ]).size,
      formatted: String(
        new Set([
          ...provGen.map((r) => r.año),
          ...nacionales.map((r) => r.año),
          ...provPaso.map((r) => r.año),
        ]).size
      ),
      unit: "años electorales",
    },
    {
      id: "padron-2023",
      label: "Padrón electoral PBA (2023)",
      value: padron2023,
      formatted: padron2023.toLocaleString("es-AR"),
      unit: "electores habilitados",
    },
    {
      id: "participacion-prom",
      label: "Participación promedio (2013–2023)",
      value: partPromUltDecada || 0,
      formatted: partPromUltDecada
        ? `${partPromUltDecada}%`
        : "—",
      unit: "votos / habilitados",
    },
    {
      id: "fuerzas-relevantes",
      label: "Fuerzas con presencia top-5",
      value: fuerzasRel,
      formatted: String(fuerzasRel),
      unit: "agrupaciones",
    },
    {
      id: "secciones-electorales",
      label: "Secciones electorales PBA",
      value: Object.keys(seccionCounts).length,
      formatted: String(Object.keys(seccionCounts).length),
      unit: "secciones",
    },
    {
      id: "municipios-mapeados",
      label: "Municipios con sección asignada",
      value: Object.keys(muniToSeccion).length,
      formatted: String(Object.keys(muniToSeccion).length),
      unit: "municipios",
    },
  ];

  // Charts
  const charts = [];

  charts.push({
    id: "participacion-historica",
    type: "line",
    title: "Participación electoral PBA · 2005–2023",
    sectionId: "participacion",
    data: participacionChart,
    config: { xAxis: "año" },
  });

  if (presPrimera2023.length) {
    charts.push({
      id: "pres-primera-2023",
      type: "bar",
      title: "Presidente — Primera vuelta 2023 (% sobre top 5)",
      sectionId: "presidente",
      data: presPrimera2023.map((r) => ({
        agrupacion: prettyAgrupacion(r.agrupacion),
        "% votos": r.porcentaje,
      })),
      config: { xAxis: "agrupacion", layout: "horizontal" },
    });
  }
  if (ballotage2023.length) {
    charts.push({
      id: "pres-ballotage-2023",
      type: "bar",
      title: "Presidente — Ballotage 2023 (% sobre positivos)",
      sectionId: "presidente",
      data: ballotage2023.map((r) => ({
        agrupacion: prettyAgrupacion(r.agrupacion),
        "% votos": r.porcentaje,
      })),
      config: { xAxis: "agrupacion", layout: "horizontal" },
    });
  }
  if (ballotage2015.length) {
    charts.push({
      id: "pres-ballotage-2015",
      type: "bar",
      title: "Presidente — Ballotage 2015 (% sobre positivos)",
      sectionId: "presidente",
      data: ballotage2015.map((r) => ({
        agrupacion: prettyAgrupacion(r.agrupacion),
        "% votos": r.porcentaje,
      })),
      config: { xAxis: "agrupacion", layout: "horizontal" },
    });
  }
  if (evolPres.length) {
    charts.push({
      id: "evol-presidencial",
      type: "line",
      title: "Evolución del voto presidencial (primera vuelta) · top 5 fuerzas",
      sectionId: "presidente",
      data: evolPres,
      config: { xAxis: "año" },
    });
  }
  if (gob2023.length) {
    charts.push({
      id: "gob-2023",
      type: "bar",
      title: "Gobernador 2023 (% sobre top 5)",
      sectionId: "gobernador",
      data: gob2023.map((r) => ({
        agrupacion: prettyAgrupacion(r.agrupacion),
        "% votos": r.porcentaje,
      })),
      config: { xAxis: "agrupacion", layout: "horizontal" },
    });
  }
  if (evolGob.length) {
    charts.push({
      id: "evol-gobernador",
      type: "line",
      title: "Evolución del voto a Gobernador · top 5 fuerzas",
      sectionId: "gobernador",
      data: evolGob,
      config: { xAxis: "año" },
    });
  }
  if (dipNac2023.length) {
    charts.push({
      id: "dip-nac-2023",
      type: "bar",
      title: "Diputados nacionales por PBA — Generales 2023 (top 5)",
      sectionId: "legislativas",
      data: dipNac2023.map((r) => ({
        agrupacion: prettyAgrupacion(r.agrupacion),
        "% votos": r.porcentaje,
      })),
      config: { xAxis: "agrupacion", layout: "horizontal" },
    });
  }

  // Mapa por sección — chart custom 'mapa-secciones'
  if (seccionesGob2023.length) {
    charts.push({
      id: "mapa-secciones-gob-2023",
      type: "mapa-secciones",
      title: "Geografía electoral · Gobernador 2023 por sección",
      sectionId: "geografia",
      data: seccionesGob2023.map((r) => ({
        seccion: r.seccion,
        ganador: r.ganador,
        porcentaje: r.porcentaje,
        votos_total: r.votos_total,
      })),
    });
  }
  if (seccionesPres2023.length) {
    charts.push({
      id: "mapa-secciones-pres-2023",
      type: "mapa-secciones",
      title: "Geografía electoral · Ballotage 2023 por sección",
      sectionId: "geografia",
      data: seccionesPres2023.map((r) => ({
        seccion: r.seccion,
        ganador: r.ganador,
        porcentaje: r.porcentaje,
        votos_total: r.votos_total,
      })),
    });
  }

  // Rankings: municipios por porcentaje del ganador en ballotage 2023
  const ranking = mapaPresBallotage2023
    .map((r) => ({
      name: r.municipio,
      value: r.porcentaje,
      meta: `${prettyAgrupacion(r.ganador)} · ${(
        r.votos_ganador / 1000
      ).toFixed(1)}k votos`,
    }))
    .sort((a, b) => b.value - a.value);

  // mapData (mapa coroplético principal): ganador en ballotage 2023
  const mapData = mapPresMuni.data.map((d) => ({
    municipioId: d.municipioId,
    municipioNombre: d.municipioNombre,
    value: d.value,
    label: d.label,
  }));

  const finalJson = {
    meta: {
      id: "politica",
      title: "Política y Elecciones",
      category: "politica",
      source:
        "Junta Electoral PBA · Cámara Nacional Electoral · Datos Abiertos PBA",
      date: "2023",
    },
    kpis,
    charts,
    rankings: [
      {
        id: "ranking-ballotage-2023",
        title:
          "Municipios — % del ganador en el ballotage 2023 (de mayor a menor)",
        sectionId: "geografia",
        items: ranking,
        order: "desc",
      },
    ],
    mapData,
    legend: {
      mapaPresBallotage2023: mapPresMuni.legend,
    },
  };

  writeJSON(path.join(OUT_DATA, "politica.json"), finalJson, "politica.json");

  // ─── EXPLORER (tabla descargable) ─────────────────────────────────────────
  // Una tabla larga con columnas: año, eleccion, cargo, municipio, seccion_electoral, agrupacion, votos
  console.log("\nGenerando explorer/politica.json...");
  const allElec = [
    ...provGen,
    ...provPaso,
    ...nacionales.filter(
      (r) =>
        /^ELECCIONES GENERALES$/i.test(r.eleccion) ||
        /^SEGUNDA VUELTA/i.test(r.eleccion) ||
        /^ELECCIONES PASO$/i.test(r.eleccion)
    ),
  ].filter((r) => r.año && r.cargo);
  // Agregamos por (año, eleccion, cargo, municipio, agrupacion) para limitar tamaño
  const aggExp = aggregate(allElec, [
    "año",
    "eleccion",
    "cargo",
    "municipio",
    "agrupacion",
  ]);
  const explorerRows = aggExp.slice(0, 5000).map((r) => ({
    anio: r.año,
    eleccion: r.eleccion,
    cargo: r.cargo,
    municipio: r.municipio,
    agrupacion: prettyAgrupacion(r.agrupacion),
    votos: Math.round(r.votos),
  }));
  const explorerJson = {
    id: "politica",
    title: "Resultados Electorales por Municipio",
    source:
      "Junta Electoral PBA · Cámara Nacional Electoral · Datos Abiertos PBA",
    columns: [
      { name: "anio", type: "number", label: "Año" },
      { name: "eleccion", type: "string", label: "Elección" },
      { name: "cargo", type: "string", label: "Cargo" },
      { name: "municipio", type: "string", label: "Municipio" },
      { name: "agrupacion", type: "string", label: "Agrupación" },
      { name: "votos", type: "number", label: "Votos" },
    ],
    rows: explorerRows,
    municipios: [
      ...new Set(explorerRows.map((r) => r.municipio).filter(Boolean)),
    ].sort(),
    totalRows: aggExp.length,
  };
  writeJSON(
    path.join(OUT_EXPLORER, "politica.json"),
    explorerJson,
    "explorer/politica.json"
  );

  // 2.6) Regenerar explorer/index.json
  console.log("\nRegenerando explorer/index.json...");
  const indexFiles = fs
    .readdirSync(OUT_EXPLORER)
    .filter((f) => f.endsWith(".json") && f !== "index.json");
  const index = indexFiles.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(OUT_EXPLORER, f), "utf-8"));
    return {
      id: d.id,
      title: d.title,
      source: d.source,
      rows: d.totalRows || (d.rows ? d.rows.length : 0),
      columns: (d.columns || []).length,
      municipios: (d.municipios || []).length,
      file: f,
    };
  });
  fs.writeFileSync(
    path.join(OUT_EXPLORER, "index.json"),
    JSON.stringify(index, null, 2),
    "utf-8"
  );
  console.log(`  ✓ index.json — ${index.length} datasets`);

  console.log("\n✓ Done.");
}

main();
