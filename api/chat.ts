import { streamText, convertToModelMessages, UIMessage } from 'ai';

// Resumen de informes para el contexto del asistente
const INFORMES_RESUMEN = `
## Informes disponibles en el Dashboard PBA

### Población (8 informes)
1. **Estructura por Sexo y Edad** - Pirámides poblacionales, distribución demográfica por municipio
2. **Condiciones Habitacionales de la Población** - Hacinamiento, acceso a servicios básicos
3. **Salud y Previsión Social** - Cobertura médica, jubilaciones
4. **Condiciones Habitacionales de los Hogares** - Calidad constructiva, déficit habitacional
5. **Stock Habitacional y Viviendas** - Cantidad de viviendas, tipos de construcción
6. **Asistencia Educativa de la Población** - Tasas de escolarización por edad
7. **Características Económicas de la Población** - Empleo, desempleo, ocupación
8. **Fecundidad** - Tasas de natalidad, fecundidad por municipio

### Sectoriales (6 informes)
9. **Sistema Educativo Provincial** - Matrícula, trayectoria escolar, indicadores educativos
10. **Salud Materno-Infantil** - Mortalidad infantil, neonatal, nacidos vivos
11. **Seguridad Ciudadana** - Hechos delictivos por tipo y municipio
12. **Economía y Finanzas Provinciales** - Recaudación tributaria (76.2% de Ingresos Brutos), transferencias a municipios, PBG, exportaciones
13. **Sector Agropecuario y Pesquero** - Estimaciones agrícolas, stock bovino, capturas pesqueras
14. **Sector Industrial** - Parques industriales, empresas, empleo industrial
`;

const DATASETS_RESUMEN = `
## Bases de datos disponibles (13 datasets, +82,000 registros)

### Agricultura
- **Estimaciones Agrícolas**: 53,317 registros (112 municipios) - Superficie sembrada, cosechada, producción por cultivo
- **Stock Bovino**: 1,987 registros (135 municipios) - Cabezas de ganado por categoría
- **Capturas Pesqueras**: 445 registros - Toneladas desembarcadas por especie

### Economía
- **Recaudación Tributaria**: 3,074 registros (1999-2026) - Por concepto impositivo
- **Transferencias a Municipios**: 2,294 registros (135 municipios) - Coparticipación, fondos especiales
- **Exportaciones**: 9,741 registros - Por rubro (MOI 36.6%, MOA 31.1%, Primarios 21.8%)
- **PBG**: 340 registros (2004-2023) - Por sector económico

### Educación
- **Trayectoria Escolar**: 1,485 registros (135 municipios) - Promoción, repitencia, abandono

### Industria
- **Parques Industriales**: 238 registros (112 municipios) - Ubicación, empresas, empleo
- **Empresas Industriales**: 44 registros - Por rama de actividad

### Salud
- **Nacidos Vivos**: 2,714 registros (135 municipios) - Por año y municipio
- **Defunciones Neonatales**: 3,346 registros - Mortalidad infantil por causa

### Seguridad
- **Hechos Delictivos**: 3,390 registros (135 municipios) - Por tipo de delito y año
`;

const DATOS_CLAVE = `
## Datos clave actualizados (2025)

### Economía y Finanzas
- Recaudación total 2025: $13.01 billones
- Ingresos Brutos: 76.2% de la recaudación
- Transferencias a municipios 2025: $4.35 billones
- La Matanza recibe 6.92% del total ($300.82B)
- Exportaciones: USD 488M (Material de transporte terrestre lidera con 10.5%)

### Municipios con más transferencias (2025)
1. La Matanza: $300.82B
2. La Plata: $138.29B
3. Lomas de Zamora: $132.86B
4. Merlo: $130.71B
5. Malvinas Argentinas: $129.87B

### Crecimiento de transferencias 2024→2025
- Marcos Paz: +49.1%
- General Rodríguez: +44.6%
- Escobar: +43.0%

### PBG (Producto Bruto Geográfico)
- Industria Manufacturera: 21% del PBG
- Comercio: 16%
- Construcción: creció +165.8% (2004-2023)
- PBG 2022: máximo histórico $261,000M (precios constantes 2004)

### Seguridad (últimos datos disponibles)
- La Matanza: ~50,858 hechos delictivos
- La Plata: ~23,060 hechos
- Quilmes: ~18,598 hechos

### Educación
- 135 municipios con datos de trayectoria escolar
- Indicadores: promoción efectiva, repitencia, abandono

### Salud
- Datos de nacidos vivos y defunciones neonatales por municipio
- Cobertura de 135 municipios
`;

const SYSTEM_PROMPT = `Eres el Asistente de Inteligencia Estratégica de la Provincia de Buenos Aires. Tu rol es ayudar a funcionarios, analistas y ciudadanos a comprender los datos e informes del Dashboard PBA.

${INFORMES_RESUMEN}

${DATASETS_RESUMEN}

${DATOS_CLAVE}

## Tu comportamiento:

1. **Responde siempre en español** usando un tono profesional pero accesible.

2. **Cita fuentes**: Cuando menciones datos, indica de qué informe o dataset provienen.

3. **Sé específico**: Proporciona números concretos, porcentajes y tendencias cuando sea posible.

4. **Contextualiza**: Explica el significado e implicancias de los datos para la toma de decisiones.

5. **Reconoce limitaciones**: Si no tienes datos sobre algo específico, indícalo claramente y sugiere dónde podría encontrarse.

6. **Formato**: Usa markdown para estructurar respuestas largas (títulos, listas, tablas cuando sea apropiado).

7. **Análisis cruzado**: Cuando sea relevante, relaciona datos de diferentes áreas (ej: transferencias vs seguridad, economía vs educación).

8. **Recomendaciones**: Puedes sugerir políticas o líneas de acción basadas en los datos, pero aclara que son sugerencias analíticas.

Ejemplos de preguntas que puedes responder:
- "¿Cuánto recauda la provincia por Ingresos Brutos?"
- "¿Qué municipio recibe más transferencias?"
- "¿Cómo evolucionó el PBG en los últimos años?"
- "¿Cuáles son los principales cultivos de la provincia?"
- "Compara la seguridad de La Matanza con La Plata"
- "¿Qué municipios tienen mayor crecimiento de transferencias?"
`;

// Sistema simple de rate limiting (en memoria por instancia)
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10; // 10 peticiones por minuto por IP para permitir un chat fluido pero evitar spam

function checkRateLimit(ip: string): boolean {
  if (ip === 'unknown') return true;
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  record.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // 1. Protección CORS - Verificar Origin / Referer
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('dashboard-pba') || origin.includes('colossus-lab.github.io');
    
    // Bloquear si no viene de orígenes permitidos
    if (process.env.NODE_ENV === 'production' && origin !== '' && !isLocalhost && !isVercel) {
      console.warn('Petición bloqueada por CORS origin:', origin);
      return new Response(JSON.stringify({ error: 'Acceso denegado (CORS origin inválido).' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. IP Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      console.warn('Rate limit superado para IP:', ip);
      return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Por favor, espera un momento.' }), { 
        status: 429, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { messages }: { messages: UIMessage[] } = await request.json();

    // 3. Protección de Payload Size y formato
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload de mensajes inválido.' }), { status: 400 });
    }
    
    // Limitar "memoria" a los últimos 10 mensajes para ahorrar tokens y prevenir inyecciones masivas de contexto
    const MAX_MESSAGES = 10;
    const truncatedMessages = messages.slice(-MAX_MESSAGES);
    
    // Limitar longitud de los mensajes (max 350 caracteres por mensaje para prevenir prompt injection)
    const MAX_CHAR_LENGTH = 350;
    const hasOversizedMessage = truncatedMessages.some(m => m.content && m.content.length > MAX_CHAR_LENGTH);
    if (hasOversizedMessage) {
      return new Response(JSON.stringify({ error: 'El mensaje supera la longitud máxima permitida.' }), { status: 400 });
    }

    const result = streamText({
      model: 'google/gemini-2.0-flash',
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(truncatedMessages),
      maxOutputTokens: 2048,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[API Chat Error]', error);
    return new Response(
      JSON.stringify({ error: 'Error al procesar la solicitud' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
