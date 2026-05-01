// ─────────────────────────────────────────────────────────────────────────────
// Municipios costeros con fuerte estacionalidad turística (PBA).
//
// Por qué existe esta tabla:
// La métrica `tasa_hechos` del SNIC usa población residente del Censo 2022 como
// denominador. En estos municipios la población de hecho se multiplica varias
// veces durante el verano (dic–mar), lo que infla artificialmente la tasa de
// delitos por 100k hab. y los ubica injustamente al tope del ranking provincial.
//
// `factorEstival` = estimación del cociente (población anual promedio de hecho)
//                   / (población residente censal). Se usa para:
//   1. Excluir estos municipios del ranking principal "peor tasa".
//   2. Mostrar una "tasa ajustada" referencial en una sección aparte.
//
// IDs verificados contra public/data/seguridad/departamentos_panel.json.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  COASTAL_TOURIST_MUNICIPIOS: {
    '06420': { nombre: 'La Costa',           factorEstival: 2.0,  fuente: 'Sec. Turismo La Costa (~6M turistas/año) + Censo 2022 (100.700 hab.)' },
    '06644': { nombre: 'Pinamar',            factorEstival: 1.8,  fuente: '1.6–2M arribos dic–mar / Censo 2022 (40.300 hab.)' },
    '06868': { nombre: 'Villa Gesell',       factorEstival: 2.0,  fuente: 'Municipio (~250k peak estival) / Censo 2022 (38.600 hab.)' },
    '06553': { nombre: 'Monte Hermoso',      factorEstival: 2.2,  fuente: 'Municipio (~70–100k peak) / Censo 2022 (8.800 hab.)' },
    '06357': { nombre: 'General Pueyrredón', factorEstival: 1.20, fuente: 'Emturyc MDP (~8M turistas/año) / Censo 2022 (~650.000 hab.)' },
    '06518': { nombre: 'Mar Chiquita',       factorEstival: 1.3,  fuente: 'Estimación (turismo moderado costero)' },
    '06280': { nombre: 'General Alvarado',   factorEstival: 1.3,  fuente: 'Estimación (Miramar — turismo moderado)' },
    '06581': { nombre: 'Necochea',           factorEstival: 1.2,  fuente: 'Estimación (turismo moderado costero)' },
  },
};
