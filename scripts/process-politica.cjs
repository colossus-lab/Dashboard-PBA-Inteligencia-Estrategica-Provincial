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

  // Guard: las CSVs fuente viven fuera del repo (Pipeline OpenArg/datos_pba).
  // En entornos de build (Vercel, CI) ese directorio no existe — entonces no
  // regeneramos los outputs y dejamos los archivos commiteados intactos.
  const sources = [F_PROV_GEN, F_PROV_PASO, F_NACIONALES, F_BALLOTAGE, F_SECCIONES_GEOJSON];
  const missing = sources.filter((p) => !fs.existsSync(p));
  if (missing.length > 0) {
    console.warn(
      `  ⚠ Fuentes electorales no disponibles (${missing.length}/${sources.length}). ` +
        `Se mantienen los outputs commiteados en public/data/politica*.\n` +
        `  Para regenerar localmente: clonar Pipeline OpenArg/datos_pba como ` +
        `directorio hermano del repo.`
    );
    return;
  }

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

  // ═══════════════════════════════════════════════════════════════════════
  // ANÁLISIS AVANZADOS (Batches A, B, C, D)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\nCalculando análisis avanzados...");

  const PERONISMO_RX =
    /uni(o|ó)n por la patria|frente de todos|frente para la victoria|fuerza patria|frente patria/i;
  const LLA_RX = /libertad avanza/i;
  const JXC_RX =
    /juntos por el cambio|cambiemos|propuesta republicana|union civica radical|juntos|alianza propuesta|alianza cambia bs/i;
  const SECCIONES_ORDEN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  // Mapeo "familia política" para que el índice de Pedersen no marque como
  // cambios totales lo que en realidad es renombre de coaliciones.
  // (LLA se trata aparte; en 2007-2019 no existía y ese delta neto SÍ es real.)
  const familiaPolitica = (s) => {
    if (PERONISMO_RX.test(s)) return "Peronismo";
    if (LLA_RX.test(s)) return "LLA";
    if (JXC_RX.test(s)) return "Cambiemos/JxC/UCR";
    if (/frente de izquierda|izquierda|fit|partido obrero|mst|partido de los trabajadores/i.test(s))
      return "Izquierda";
    if (/socialista|gen|progresista|libres del sur/i.test(s))
      return "Progresismo/Socialismo";
    if (/peronismo federal|consenso|alternativa federal|massa|frente renovador|tercera posicion/i.test(s))
      return "Peronismo Federal/Renovador";
    return "Otros";
  };

  function aggsByYear(rowsAggMuni, useFamilia = false) {
    const m = new Map();
    for (const r of rowsAggMuni) {
      if (!r.año) continue;
      if (!m.has(r.año)) m.set(r.año, new Map());
      const inner = m.get(r.año);
      const key = useFamilia ? familiaPolitica(r.agrupacion || "") : r.agrupacion;
      inner.set(key, (inner.get(key) || 0) + (r.votos || 0));
    }
    const out = new Map();
    for (const [year, inner] of m) {
      out.set(
        year,
        [...inner.entries()].map(([a, v]) => ({ agrupacion: a, votos: v }))
      );
    }
    return out;
  }

  function aggsBySeccionYear(rowsAggMuni, year, useFamilia = false) {
    const bySec = new Map();
    for (const r of rowsAggMuni) {
      if (r.año !== year) continue;
      const sec = muniToSeccion[normalizeName(r.municipio || "")];
      if (!sec) continue;
      if (!bySec.has(sec)) bySec.set(sec, new Map());
      const inner = bySec.get(sec);
      const key = useFamilia ? familiaPolitica(r.agrupacion || "") : r.agrupacion;
      inner.set(key, (inner.get(key) || 0) + (r.votos || 0));
    }
    const out = new Map();
    for (const [sec, inner] of bySec) {
      out.set(
        sec,
        [...inner.entries()].map(([a, v]) => ({ agrupacion: a, votos: v }))
      );
    }
    return out;
  }

  // ─── A1. PEDERSEN ──────────────────────────────────────────────────────
  function pedersen(aggs1, aggs2) {
    const sum1 = aggs1.reduce((s, x) => s + (x.votos || 0), 0) || 1;
    const sum2 = aggs2.reduce((s, x) => s + (x.votos || 0), 0) || 1;
    const p1 = new Map(
      aggs1.map((x) => [prettyAgrupacion(x.agrupacion), (x.votos || 0) / sum1])
    );
    const p2 = new Map(
      aggs2.map((x) => [prettyAgrupacion(x.agrupacion), (x.votos || 0) / sum2])
    );
    const keys = new Set([...p1.keys(), ...p2.keys()]);
    let v = 0;
    for (const k of keys) v += Math.abs((p1.get(k) || 0) - (p2.get(k) || 0));
    return Math.round(v * 50 * 10) / 10; // (1/2 * v) * 100 → puntos porcentuales
  }

  // Para Pedersen usamos agregación por FAMILIA (Peronismo, JxC, LLA, etc.)
  // para no contar como "cambios" los renombres de coaliciones.
  // Para NEP mantenemos la agregación cruda — refleja la fragmentación que
  // ve el votante en la boleta.
  const presAggsByYearFamilia = aggsByYear(presPrimeraAggMuni, true);
  const gobAggsByYearFamilia = aggsByYear(gobAggMuni, true);
  const presAggsByYear = aggsByYear(presPrimeraAggMuni);
  const gobAggsByYear = aggsByYear(gobAggMuni);

  const presYears = [...presAggsByYearFamilia.keys()].sort();
  const gobYears = [...gobAggsByYearFamilia.keys()].sort();

  const pedersenSerie = []; // [{transicion, Presidente?, Gobernador?}]
  {
    const transiciones = new Set();
    for (let i = 1; i < presYears.length; i++)
      transiciones.add(`${presYears[i - 1]}→${presYears[i]}`);
    for (let i = 1; i < gobYears.length; i++)
      transiciones.add(`${gobYears[i - 1]}→${gobYears[i]}`);
    const all = [...transiciones].sort();
    for (const t of all) {
      const [y1, y2] = t.split("→").map((s) => parseInt(s, 10));
      const row = { transicion: t };
      if (presAggsByYearFamilia.has(y1) && presAggsByYearFamilia.has(y2)) {
        row.Presidente = pedersen(
          presAggsByYearFamilia.get(y1),
          presAggsByYearFamilia.get(y2)
        );
      }
      if (gobAggsByYearFamilia.has(y1) && gobAggsByYearFamilia.has(y2)) {
        row.Gobernador = pedersen(
          gobAggsByYearFamilia.get(y1),
          gobAggsByYearFamilia.get(y2)
        );
      }
      pedersenSerie.push(row);
    }
  }

  const pedersenSeccionGob = []; // [{seccion, Volatilidad}]
  {
    const sec19 = aggsBySeccionYear(gobAggMuni, 2019, true);
    const sec23 = aggsBySeccionYear(gobAggMuni, 2023, true);
    for (const sec of SECCIONES_ORDEN) {
      const a = sec19.get(sec), b = sec23.get(sec);
      if (a && b && a.length && b.length) {
        pedersenSeccionGob.push({
          seccion: sec,
          Volatilidad: pedersen(a, b),
        });
      }
    }
  }

  const pedersenPres1923 =
    presAggsByYearFamilia.has(2019) && presAggsByYearFamilia.has(2023)
      ? pedersen(
          presAggsByYearFamilia.get(2019),
          presAggsByYearFamilia.get(2023)
        )
      : null;

  // ─── A2. NEP (Laakso-Taagepera) ────────────────────────────────────────
  function nep(aggs) {
    const total = aggs.reduce((s, x) => s + (x.votos || 0), 0) || 1;
    const sumSq = aggs.reduce(
      (s, x) => s + Math.pow((x.votos || 0) / total, 2),
      0
    );
    return Math.round((1 / sumSq) * 100) / 100;
  }

  const nepEvolucion = [];
  {
    const allYrs = [...new Set([...presYears, ...gobYears])].sort();
    for (const año of allYrs) {
      const row = { año };
      if (presAggsByYear.has(año))
        row.Presidente = nep(presAggsByYear.get(año));
      if (gobAggsByYear.has(año))
        row.Gobernador = nep(gobAggsByYear.get(año));
      nepEvolucion.push(row);
    }
  }

  const nepBySeccion2023 = [];
  {
    const sec23 = aggsBySeccionYear(gobAggMuni, 2023);
    for (const sec of SECCIONES_ORDEN) {
      if (sec23.has(sec))
        nepBySeccion2023.push({ seccion: sec, NEP: nep(sec23.get(sec)) });
    }
  }

  const nep2023Gob =
    gobAggsByYear.has(2023) ? nep(gobAggsByYear.get(2023)) : null;

  // ─── A3. MARGEN DE VICTORIA ────────────────────────────────────────────
  function marginByMuni(rowsAggMuni, year) {
    const byMuni = new Map();
    for (const r of rowsAggMuni) {
      if (r.año !== year || !r.municipio) continue;
      if (!byMuni.has(r.municipio)) byMuni.set(r.municipio, []);
      byMuni
        .get(r.municipio)
        .push({ agrupacion: r.agrupacion, votos: r.votos });
    }
    const out = [];
    for (const [muni, lst] of byMuni) {
      const total = lst.reduce((s, x) => s + (x.votos || 0), 0);
      if (!total) continue;
      const sorted = lst.sort((a, b) => b.votos - a.votos);
      const first = sorted[0];
      const second = sorted[1] || { votos: 0, agrupacion: "" };
      const margen = pct(first.votos - second.votos, total);
      out.push({
        municipio: muni,
        ganador: prettyAgrupacion(first.agrupacion),
        segundo: prettyAgrupacion(second.agrupacion || ""),
        margen,
        pctGanador: pct(first.votos, total),
      });
    }
    return out;
  }

  const margenGob2023 = marginByMuni(gobAggMuni, 2023);
  const competitivos2023 = margenGob2023.filter((r) => r.margen < 5).length;

  const mapDataMargen = margenGob2023.map((r) => ({
    municipioId: normalizeName(r.municipio),
    municipioNombre: r.municipio,
    value: r.margen,
    label: `${r.ganador} vs ${r.segundo} · margen ${r.margen}pp`,
  }));

  const margenCategorias = (() => {
    const counts = { "Muy competitivo (<5pp)": 0, "Competitivo (5–15pp)": 0, "Holgado (15–30pp)": 0, "Abrumador (>30pp)": 0 };
    for (const r of margenGob2023) {
      if (r.margen < 5) counts["Muy competitivo (<5pp)"]++;
      else if (r.margen < 15) counts["Competitivo (5–15pp)"]++;
      else if (r.margen < 30) counts["Holgado (15–30pp)"]++;
      else counts["Abrumador (>30pp)"]++;
    }
    return Object.entries(counts).map(([cat, n]) => ({ id: cat, value: n }));
  })();

  // ─── A4. SWING 2019→2023 (Peronismo) ───────────────────────────────────
  function pctByMuniFuerzaYear(rowsAggMuni, fuerzaRegex, year) {
    const byMuni = new Map();
    for (const r of rowsAggMuni) {
      if (year != null && r.año !== year) continue;
      const muniNorm = normalizeName(r.municipio || "");
      if (!muniNorm) continue;
      if (!byMuni.has(muniNorm))
        byMuni.set(muniNorm, { name: r.municipio, total: 0, ours: 0 });
      const e = byMuni.get(muniNorm);
      e.total += r.votos || 0;
      if (fuerzaRegex.test(r.agrupacion || "")) e.ours += r.votos || 0;
    }
    const out = new Map();
    for (const [m, e] of byMuni) {
      if (e.total > 0)
        out.set(m, { name: e.name, pct: pct(e.ours, e.total), votos: e.ours, total: e.total });
    }
    return out;
  }

  const uxpGob2019 = pctByMuniFuerzaYear(gobAggMuni, PERONISMO_RX, 2019);
  const uxpGob2023 = pctByMuniFuerzaYear(gobAggMuni, PERONISMO_RX, 2023);

  const swingMapData = [];
  const swingScatter = [];
  let swingPositivo = 0, swingNegativo = 0;
  for (const [muni, e23] of uxpGob2023) {
    const e19 = uxpGob2019.get(muni);
    if (!e19) continue;
    const sw = Math.round((e23.pct - e19.pct) * 10) / 10;
    swingMapData.push({
      municipioId: muni,
      municipioNombre: e23.name,
      value: sw,
      label: `Peronismo · 2019: ${e19.pct}% → 2023: ${e23.pct}% (Δ ${sw > 0 ? "+" : ""}${sw}pp)`,
    });
    swingScatter.push({
      municipio: e23.name,
      "2019 (% peronismo)": e19.pct,
      "2023 (% peronismo)": e23.pct,
    });
    if (sw > 0) swingPositivo++;
    else if (sw < 0) swingNegativo++;
  }

  // ─── B5. CORTE DE BOLETA 2023 ──────────────────────────────────────────
  const corteUxPPres = pctByMuniFuerzaYear(
    presPrimeraAggMuni,
    PERONISMO_RX,
    2023
  );
  const corteUxPGob = pctByMuniFuerzaYear(gobAggMuni, PERONISMO_RX, 2023);

  const corteData = [];
  for (const [muni, ePres] of corteUxPPres) {
    const eGob = corteUxPGob.get(muni);
    if (!eGob) continue;
    const dif = Math.round(Math.abs(ePres.pct - eGob.pct) * 10) / 10;
    corteData.push({
      municipioId: muni,
      municipioNombre: ePres.name,
      value: dif,
      label: `Peronismo · Presidente ${ePres.pct}% vs Gobernador ${eGob.pct}% (|Δ| ${dif}pp)`,
      presPct: ePres.pct,
      gobPct: eGob.pct,
    });
  }
  const corteMayor5 = corteData.filter((r) => r.value > 5).length;
  const corteTop10 = [...corteData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((r) => ({
      name: r.municipioNombre,
      value: r.value,
      meta: `Pres ${r.presPct}% · Gob ${r.gobPct}%`,
    }));

  // ─── B6. BRECHA PASO → GENERALES 2023 (PRESIDENCIAL) ───────────────────
  const presPaso = nacionales.filter(
    (r) =>
      /presidente/i.test(r.cargo) && /^ELECCIONES PASO$/i.test(r.eleccion)
  );
  const presPaso2023Agg = aggregate(
    presPaso.filter((r) => r.año === 2023),
    ["agrupacion"]
  );
  const presGen2023Agg = aggregate(
    presPrimera.filter((r) => r.año === 2023),
    ["agrupacion"]
  );

  function pctList(aggs, n) {
    const tot = aggs.reduce((s, x) => s + (x.votos || 0), 0) || 1;
    return aggs
      .map((a) => ({
        agrupacion: prettyAgrupacion(a.agrupacion),
        pct: pct(a.votos, tot),
        votos: a.votos,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, n || 5);
  }

  const presPaso2023Pcts = pctList(presPaso2023Agg, 5);
  const presGen2023Pcts = pctList(presGen2023Agg, 5);

  const brechaChart = [];
  {
    const allF = new Set([
      ...presPaso2023Pcts.map((x) => x.agrupacion),
      ...presGen2023Pcts.map((x) => x.agrupacion),
    ]);
    const pasoMap = new Map(presPaso2023Pcts.map((x) => [x.agrupacion, x.pct]));
    const genMap = new Map(presGen2023Pcts.map((x) => [x.agrupacion, x.pct]));
    for (const f of allF) {
      brechaChart.push({
        agrupacion: f,
        PASO: pasoMap.get(f) || 0,
        Generales: genMap.get(f) || 0,
      });
    }
    brechaChart.sort(
      (a, b) =>
        Math.max(b.PASO, b.Generales) - Math.max(a.PASO, a.Generales)
    );
  }

  // ─── B7. PESO ELECTORAL POR SECCIÓN ────────────────────────────────────
  const habByMuni2023 = new Map();
  {
    const raw = provGen.filter((r) => /gobernador/i.test(r.cargo) && r.año === 2023);
    for (const r of raw) {
      const m = normalizeName(r.municipio || "");
      if (r.habilitados)
        habByMuni2023.set(m, Math.max(habByMuni2023.get(m) || 0, r.habilitados));
    }
  }
  const padronPorSec = new Map();
  const munisPorSec = new Map();
  for (const [muniNorm, sec] of Object.entries(muniToSeccion)) {
    munisPorSec.set(sec, (munisPorSec.get(sec) || 0) + 1);
  }
  for (const [muniNorm, h] of habByMuni2023) {
    const sec = muniToSeccion[muniNorm];
    if (!sec) continue;
    padronPorSec.set(sec, (padronPorSec.get(sec) || 0) + h);
  }
  const padronTot =
    [...padronPorSec.values()].reduce((s, x) => s + x, 0) || 1;
  const pesoData = SECCIONES_ORDEN.filter((s) => padronPorSec.has(s)).map(
    (sec) => ({
      seccion: `Sección ${sec}`,
      municipios: munisPorSec.get(sec) || 0,
      padron: padronPorSec.get(sec),
      "% del padrón": Math.round((padronPorSec.get(sec) / padronTot) * 1000) / 10,
    })
  );

  // ─── B15. PERSISTENCIA DE INTENDENTES ──────────────────────────────────
  const intendentesRows = provGen.filter((r) => /intendente/i.test(r.cargo));
  const familia = (s) => {
    if (PERONISMO_RX.test(s)) return "Peronismo";
    if (LLA_RX.test(s)) return "LLA";
    if (JXC_RX.test(s)) return "Cambiemos/JxC/UCR";
    if (/frente de izquierda|izquierda|fit|partido obrero/i.test(s))
      return "Izquierda";
    if (/vecinal|vecinos|frente vecinal|comunitario/i.test(s)) return "Vecinales";
    return "Otros";
  };

  const intendByMuni = new Map(); // muniNorm → [{año, familiaGanadora, label}]
  {
    const byKey = new Map();
    for (const r of intendentesRows) {
      if (!r.municipio || !r.año) continue;
      const key = `${r.municipio}|${r.año}`;
      if (!byKey.has(key)) byKey.set(key, new Map());
      byKey.get(key).set(r.agrupacion, (byKey.get(key).get(r.agrupacion) || 0) + (r.votos || 0));
    }
    for (const [key, inner] of byKey) {
      const [muni, añoStr] = key.split("|");
      const año = parseInt(añoStr, 10);
      const sorted = [...inner.entries()].sort((a, b) => b[1] - a[1]);
      const ganador = sorted[0]?.[0] || "";
      const muniNorm = normalizeName(muni);
      if (!intendByMuni.has(muniNorm))
        intendByMuni.set(muniNorm, { name: muni, list: [] });
      intendByMuni.get(muniNorm).list.push({
        año,
        ganador,
        familia: familia(ganador),
      });
    }
  }
  const persistData = [];
  for (const [muniNorm, e] of intendByMuni) {
    e.list.sort((a, b) => a.año - b.año);
    const familias = e.list.map((x) => x.familia);
    let maxRacha = 1, cur = 1;
    for (let i = 1; i < familias.length; i++) {
      if (familias[i] === familias[i - 1]) {
        cur++;
        maxRacha = Math.max(maxRacha, cur);
      } else cur = 1;
    }
    persistData.push({
      municipioId: muniNorm,
      municipioNombre: e.name,
      value: maxRacha,
      label: `${maxRacha} elecc. consecutivas (de ${e.list.length}) · familias: ${[
        ...new Set(familias),
      ].join(", ")}`,
      elecciones: e.list.length,
    });
  }
  const persistRacha5 = persistData.filter((r) => r.value >= 5).length;

  // ─── C8-C11. CRUCES SOCIOECONÓMICOS ────────────────────────────────────
  function safeRead(p) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch (e) {
      console.warn(`  ⚠ no se pudo leer ${p}: ${e.message}`);
      return null;
    }
  }

  function regression(points) {
    if (points.length < 3) return { r2: 0, slope: 0, intercept: 0, n: points.length };
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumYY = points.reduce((s, p) => s + p.y * p.y, 0);
    const denomX = n * sumXX - sumX * sumX;
    const slope = denomX === 0 ? 0 : (n * sumXY - sumX * sumY) / denomX;
    const intercept = (sumY - slope * sumX) / n;
    const ssTot = sumYY - (sumY * sumY) / n;
    const ssRes = points.reduce((s, p) => {
      const yhat = slope * p.x + intercept;
      return s + (p.y - yhat) * (p.y - yhat);
    }, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return {
      r2: Math.round(r2 * 1000) / 1000,
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      n,
    };
  }

  function buildScatter(yData /* Map muni → {name, pct} */, xByMuni /* Map muni → number */, xLabel, yLabel) {
    const points = [];
    for (const [muni, e] of yData) {
      const v = xByMuni.get(muni);
      if (v != null && isFinite(v)) {
        points.push({ x: v, y: e.pct, municipio: e.name });
      }
    }
    const reg = regression(points);
    return {
      points: points.map((p) => ({
        x: p.x,
        y: p.y,
        id: p.municipio,
      })),
      regression: reg,
      xLabel,
      yLabel,
    };
  }

  // C8. Voto vs producción agrícola (stock bovino per cápita 2023 last available)
  const stockBov = safeRead(
    path.join(DASHBOARD_ROOT, "public", "data", "agricultura", "stock_bovino.json")
  ) || [];
  const stockByMuni = new Map();
  {
    const byMuni = new Map();
    for (const r of stockBov) {
      if (!r.municipio_nombre) continue;
      const k = normalizeName(r.municipio_nombre);
      if (!byMuni.has(k) || (r.anio || 0) > byMuni.get(k).anio) {
        byMuni.set(k, { anio: r.anio, val: r.stock || 0, name: r.municipio_nombre });
      }
    }
    for (const [k, v] of byMuni) {
      const padron = habByMuni2023.get(k);
      if (padron && padron > 0) stockByMuni.set(k, v.val / padron);
    }
  }
  const llaPres2023 = pctByMuniFuerzaYear(presPrimeraAggMuni, LLA_RX, 2023);
  const scatterAgro = buildScatter(
    llaPres2023,
    new Map([...stockByMuni].map(([k, v]) => [k, Math.log10(v + 0.01)])),
    "Stock bovino per cápita (log₁₀)",
    "% LLA · Presidente 2023"
  );

  // C9. Voto vs trayectoria escolar (sobreedad secundaria — último año disponible)
  const trayectoria =
    safeRead(
      path.join(DASHBOARD_ROOT, "public", "data", "educacion", "trayectoria.json")
    ) || [];
  const trayBymuni = new Map();
  {
    const byMuni = new Map();
    for (const r of trayectoria) {
      if (!r.municipio_nombre || r.sobreedad_secundaria == null) continue;
      const k = normalizeName(r.municipio_nombre);
      const a = r.anio || 0;
      if (!byMuni.has(k) || a > byMuni.get(k).anio)
        byMuni.set(k, {
          anio: a,
          val: r.sobreedad_secundaria,
          name: r.municipio_nombre,
        });
    }
    for (const [k, v] of byMuni) trayBymuni.set(k, v.val);
  }
  const uxpGob23ForCross = pctByMuniFuerzaYear(gobAggMuni, PERONISMO_RX, 2023);
  const scatterEdu = buildScatter(
    uxpGob23ForCross,
    trayBymuni,
    "% Sobreedad secundaria",
    "% Peronismo · Gobernador 2023"
  );

  // C10. Voto vs seguridad — usar tasa_hechos del mapData de seguridad.json
  const seguridadJson = safeRead(
    path.join(DASHBOARD_ROOT, "public", "data", "seguridad.json")
  );
  const tasaByMuni = new Map();
  if (seguridadJson && Array.isArray(seguridadJson.mapData)) {
    for (const m of seguridadJson.mapData) {
      tasaByMuni.set(normalizeName(m.municipioNombre || m.municipioId || ""), m.value);
    }
  }
  const scatterSeg = buildScatter(
    llaPres2023,
    tasaByMuni,
    "Tasa hechos delictivos /100k (2024)",
    "% LLA · Presidente 2023"
  );

  // C11. Voto vs transferencias per cápita 2023
  const transferencias =
    safeRead(
      path.join(DASHBOARD_ROOT, "public", "data", "economia", "transferencias.json")
    ) || [];
  const transByMuni = new Map();
  {
    const byMuni = new Map();
    for (const r of transferencias) {
      if (!r.municipio_nombre || r.anio !== 2023) continue;
      const k = normalizeName(r.municipio_nombre);
      byMuni.set(k, (byMuni.get(k) || 0) + (r.monto || 0));
    }
    for (const [k, monto] of byMuni) {
      const padron = habByMuni2023.get(k);
      if (padron && padron > 0) transByMuni.set(k, monto / padron / 1000); // miles de $ per elector
    }
  }
  const scatterTrans = buildScatter(
    uxpGob23ForCross,
    transByMuni,
    "Transferencias 2023 / elector (miles $)",
    "% Peronismo · Gobernador 2023"
  );

  // ─── D12. HEATMAP PARTICIPACIÓN MUNICIPIOS × AÑOS ──────────────────────
  const heatmapData = []; // formato Nivo: [{id, data:[{x,y}]}]
  {
    const raw = provGen.filter((r) => /gobernador/i.test(r.cargo));
    const tmpHab = new Map();
    const tmpVot = new Map();
    for (const r of raw) {
      if (!r.municipio || !r.año) continue;
      const k = `${normalizeName(r.municipio)}|${r.año}`;
      if (r.habilitados)
        tmpHab.set(k, Math.max(tmpHab.get(k) || 0, r.habilitados));
      if (r.votantes)
        tmpVot.set(k, Math.max(tmpVot.get(k) || 0, r.votantes));
    }
    const munis = new Map(); // muniNorm → name
    const years = new Set();
    for (const [muniNorm, _] of Object.entries(muniToSeccion)) {
      munis.set(muniNorm, muniNorm);
    }
    for (const r of raw) {
      if (!r.municipio) continue;
      munis.set(normalizeName(r.municipio), r.municipio);
    }
    for (const k of tmpHab.keys()) years.add(parseInt(k.split("|")[1], 10));
    const yearList = [...years].sort();
    const muniList = [...munis.entries()].sort((a, b) => {
      const sa = muniToSeccion[a[0]] || "Z";
      const sb = muniToSeccion[b[0]] || "Z";
      const ia = SECCIONES_ORDEN.indexOf(sa);
      const ib = SECCIONES_ORDEN.indexOf(sb);
      if (ia !== ib) return ia - ib;
      return a[1].localeCompare(b[1]);
    });
    for (const [muniNorm, name] of muniList) {
      const sec = muniToSeccion[muniNorm] || "?";
      const dataRow = [];
      for (const y of yearList) {
        const k = `${muniNorm}|${y}`;
        const h = tmpHab.get(k), v = tmpVot.get(k);
        const p = h && v ? pct(v, h) : null;
        dataRow.push({ x: String(y), y: p });
      }
      heatmapData.push({
        id: `${sec}·${name}`,
        municipio: name,
        seccion: sec,
        data: dataRow,
      });
    }
  }

  // ─── D13. MAPA MUNICIPAL TIMELINE (ganador gobernador por año) ──────────
  const timelineMuniGob = {}; // {año: [mapData items]}
  {
    for (const año of gobYears) {
      const items = ganadorPorMunicipio(
        gobAggMuni.filter((r) => r.año === año)
      );
      const allWinners = [...new Set(items.map((x) => prettyAgrupacion(x.ganador)))];
      const winnerCode = new Map(allWinners.map((w, i) => [w, i + 1]));
      timelineMuniGob[String(año)] = items.map((it) => ({
        municipioId: normalizeName(it.municipio),
        municipioNombre: it.municipio,
        value: winnerCode.get(prettyAgrupacion(it.ganador)) || 0,
        label: `${prettyAgrupacion(it.ganador)} · ${it.porcentaje}%`,
        winner: prettyAgrupacion(it.ganador),
      }));
    }
  }

  // ─── D14. SANKEY PASO → GENERALES 2023 (PRESIDENTE) ────────────────────
  // Modelo simple: para cada fuerza top-5 común a PASO y Generales, el flujo
  // mismo→mismo = min(votosPaso, votosGen). El "residual" (la fuerza creció)
  // se asigna desde un nodo "Otros · PASO". Si decreció, va a "Otros · Gen".
  const sankeyNodes = [];
  const sankeyLinks = [];
  {
    const allFs = new Set([
      ...presPaso2023Pcts.map((x) => x.agrupacion),
      ...presGen2023Pcts.map((x) => x.agrupacion),
    ]);
    const pasoVotos = new Map(
      presPaso2023Agg.map((a) => [prettyAgrupacion(a.agrupacion), a.votos])
    );
    const genVotos = new Map(
      presGen2023Agg.map((a) => [prettyAgrupacion(a.agrupacion), a.votos])
    );

    sankeyNodes.push({ id: "PASO · Otros / no votó" });
    for (const f of allFs) sankeyNodes.push({ id: `PASO · ${f}` });
    for (const f of allFs) sankeyNodes.push({ id: `Gen · ${f}` });
    sankeyNodes.push({ id: "Gen · Otros / no votó" });

    for (const f of allFs) {
      const pv = pasoVotos.get(f) || 0;
      const gv = genVotos.get(f) || 0;
      const stay = Math.min(pv, gv);
      if (stay > 1000)
        sankeyLinks.push({
          source: `PASO · ${f}`,
          target: `Gen · ${f}`,
          value: stay,
        });
      if (gv > pv) {
        // creció: viene desde "Otros · PASO"
        sankeyLinks.push({
          source: "PASO · Otros / no votó",
          target: `Gen · ${f}`,
          value: gv - pv,
        });
      } else if (pv > gv) {
        // decreció: va hacia "Otros · Gen"
        sankeyLinks.push({
          source: `PASO · ${f}`,
          target: "Gen · Otros / no votó",
          value: pv - gv,
        });
      }
    }
    // dedupe nodes
    const seen = new Set();
    const uniqueNodes = [];
    for (const n of sankeyNodes) {
      if (!seen.has(n.id)) {
        uniqueNodes.push(n);
        seen.add(n.id);
      }
    }
    sankeyNodes.length = 0;
    sankeyNodes.push(...uniqueNodes);
  }

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
    // KPIs avanzados
    pedersenPres1923 != null && {
      id: "volatilidad-pres-1923",
      label: "Volatilidad Pedersen presidente 2019→2023",
      value: pedersenPres1923,
      formatted: `${pedersenPres1923}`,
      unit: "puntos porcentuales",
      status: pedersenPres1923 > 10 ? "warning" : undefined,
    },
    nep2023Gob != null && {
      id: "nep-gob-2023",
      label: "Número Efectivo de Partidos (gobernador 2023)",
      value: nep2023Gob,
      formatted: `${nep2023Gob}`,
      unit: "partidos efectivos",
    },
    {
      id: "competitivos-2023",
      label: "Municipios competitivos 2023 (margen <5pp)",
      value: competitivos2023,
      formatted: String(competitivos2023),
      unit: "municipios",
    },
    {
      id: "corte-boleta",
      label: "Municipios con corte de boleta >5pp (2023)",
      value: corteMayor5,
      formatted: String(corteMayor5),
      unit: "municipios",
    },
    {
      id: "persist-intendentes",
      label: "Municipios con misma familia política ≥5 elecciones consecutivas",
      value: persistRacha5,
      formatted: String(persistRacha5),
      unit: "municipios",
    },
  ].filter(Boolean);

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

  // ─── A1. Volatilidad / Pedersen ───────────────────────────────────────
  if (pedersenSerie.length) {
    charts.push({
      id: "pedersen-evolucion",
      type: "line",
      title:
        "Volatilidad electoral (Índice de Pedersen) entre elecciones consecutivas",
      sectionId: "volatilidad",
      data: pedersenSerie,
      config: { xAxis: "transicion" },
    });
  }
  if (pedersenSeccionGob.length) {
    charts.push({
      id: "pedersen-seccion-gob-1923",
      type: "bar",
      title:
        "Volatilidad gobernador 2019→2023 por sección electoral (puntos porcentuales)",
      sectionId: "volatilidad",
      data: pedersenSeccionGob,
      config: { xAxis: "seccion", layout: "horizontal" },
    });
  }

  // ─── A2. NEP ──────────────────────────────────────────────────────────
  if (nepEvolucion.length) {
    charts.push({
      id: "nep-evolucion",
      type: "line",
      title:
        "Número Efectivo de Partidos · Laakso-Taagepera (PBA, presidente vs gobernador)",
      sectionId: "fragmentacion",
      data: nepEvolucion,
      config: { xAxis: "año" },
    });
  }
  if (nepBySeccion2023.length) {
    charts.push({
      id: "nep-seccion-2023",
      type: "bar",
      title: "Fragmentación por sección · NEP gobernador 2023",
      sectionId: "fragmentacion",
      data: nepBySeccion2023,
      config: { xAxis: "seccion", layout: "horizontal" },
    });
  }

  // ─── A3. Margen de victoria ───────────────────────────────────────────
  if (mapDataMargen.length) {
    charts.push({
      id: "mapa-margen-gob-2023",
      type: "map",
      title: "Competitividad · margen de victoria gobernador 2023 (pp)",
      sectionId: "competitividad",
      data: mapDataMargen,
    });
  }
  if (margenCategorias.length) {
    charts.push({
      id: "margen-categorias-2023",
      type: "pie",
      title:
        "Distribución de municipios por nivel de competitividad (gobernador 2023)",
      sectionId: "competitividad",
      data: margenCategorias,
    });
  }

  // ─── A4. Swing 2019→2023 ──────────────────────────────────────────────
  if (swingMapData.length) {
    charts.push({
      id: "mapa-swing-uxp-1923",
      type: "map",
      title:
        "Swing 2019→2023 del peronismo a gobernador (Δ pp) — divergente",
      sectionId: "swing",
      data: swingMapData,
    });
  }
  if (swingScatter.length) {
    charts.push({
      id: "scatter-swing-uxp",
      type: "scatter",
      title:
        "Peronismo · 2019 vs 2023 (gobernador) — cada punto un municipio",
      sectionId: "swing",
      data: swingScatter,
      config: {
        xAxis: "2019 (% peronismo)",
        yAxis: "2023 (% peronismo)",
        diagonal: true,
      },
    });
  }

  // ─── B5. Corte de boleta ──────────────────────────────────────────────
  if (corteData.length) {
    charts.push({
      id: "mapa-corte-boleta-2023",
      type: "map",
      title:
        "Corte de boleta 2023 · |% peronismo presidente − % peronismo gobernador| por municipio (pp)",
      sectionId: "corte",
      data: corteData,
    });
  }

  // ─── B6. Brecha PASO → Generales ──────────────────────────────────────
  if (brechaChart.length) {
    charts.push({
      id: "brecha-paso-generales-2023",
      type: "bar",
      title: "Brecha PASO → Generales 2023 (presidente, top 5 fuerzas)",
      sectionId: "brecha",
      data: brechaChart,
      config: { xAxis: "agrupacion", layout: "horizontal", grouped: true },
    });
  }

  // ─── B7. Peso por sección ─────────────────────────────────────────────
  if (pesoData.length) {
    charts.push({
      id: "peso-secciones",
      type: "bar",
      title: "Peso del padrón por sección electoral (2023)",
      sectionId: "peso",
      data: pesoData,
      config: { xAxis: "seccion", layout: "horizontal" },
    });
    charts.push({
      id: "peso-pie",
      type: "pie",
      title: "% del padrón provincial por sección (2023)",
      sectionId: "peso",
      data: pesoData.map((d) => ({
        id: d.seccion,
        value: d["% del padrón"],
      })),
    });
  }

  // ─── B15. Persistencia de intendentes ─────────────────────────────────
  if (persistData.length) {
    charts.push({
      id: "mapa-persistencia-intendentes",
      type: "map",
      title:
        "Persistencia de intendentes · cantidad máxima de elecciones consecutivas con la misma familia política (2007–2023)",
      sectionId: "intendentes",
      data: persistData,
    });
  }

  // ─── C8-C11. Cruces socioeconómicos ───────────────────────────────────
  const scatterDefs = [
    {
      id: "scatter-voto-agro",
      title:
        "¿Voto rural distintivo? · Stock bovino per cápita vs % LLA en presidente 2023",
      sec: "agro",
      payload: scatterAgro,
    },
    {
      id: "scatter-voto-edu",
      title:
        "Voto vs trayectoria escolar · % sobreedad secundaria vs % peronismo a gobernador 2023",
      sec: "trayectoria",
      payload: scatterEdu,
    },
    {
      id: "scatter-voto-seg",
      title:
        "Voto vs seguridad · tasa hechos delictivos 2024 vs % LLA en presidente 2023",
      sec: "inseguridad",
      payload: scatterSeg,
    },
    {
      id: "scatter-voto-trans",
      title:
        "Voto vs dependencia fiscal · transferencias 2023/elector vs % peronismo a gobernador 2023",
      sec: "transferencias",
      payload: scatterTrans,
    },
  ];
  for (const s of scatterDefs) {
    if (s.payload.points.length >= 5) {
      charts.push({
        id: s.id,
        type: "scatter",
        title: s.title,
        sectionId: s.sec,
        data: s.payload.points,
        config: {
          xAxis: s.payload.xLabel,
          yAxis: s.payload.yLabel,
          regression: s.payload.regression,
        },
      });
    }
  }

  // ─── D12. Heatmap participación ───────────────────────────────────────
  if (heatmapData.length) {
    charts.push({
      id: "heatmap-participacion",
      type: "heatmap",
      title:
        "Participación electoral por municipio × año (gobernador, % votantes / habilitados)",
      sectionId: "heatmap",
      data: heatmapData,
    });
  }

  // ─── D13. Timeline mapa municipal gobernador ──────────────────────────
  if (Object.keys(timelineMuniGob).length) {
    charts.push({
      id: "timeline-municipal-gob",
      type: "mapa-timeline",
      title: "Recorrido 2007→2023 · ganador a gobernador por municipio",
      sectionId: "timeline",
      data: timelineMuniGob, // {año: [items]}
    });
  }

  // ─── D14. Sankey PASO → Generales ─────────────────────────────────────
  if (sankeyLinks.length) {
    charts.push({
      id: "sankey-paso-gen-2023",
      type: "sankey",
      title:
        "Transferencia de votos PASO → Generales 2023 (presidente, modelo agregado)",
      sectionId: "sankey",
      data: { nodes: sankeyNodes, links: sankeyLinks },
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
      {
        id: "ranking-corte-boleta-2023",
        title:
          "Top 10 municipios — mayor corte de boleta peronismo presidente vs gobernador 2023",
        sectionId: "corte",
        items: corteTop10,
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
