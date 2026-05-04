import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// Subset of REPORTS data duplicated here to avoid pulling client bundle into edge
const REPORTS_SUBSET: Record<string, { title: string; category: string; color: string; order: number }> = {
  'poblacion/estructura': { title: 'Estructura por Sexo y Edad', category: 'Población', color: '#00d4ff', order: 1 },
  'poblacion/habitacional-personas': { title: 'Condiciones Habitacionales de la Población', category: 'Población', color: '#f59e0b', order: 2 },
  'poblacion/salud-prevision': { title: 'Salud y Previsión Social', category: 'Población', color: '#10b981', order: 3 },
  'poblacion/habitacional-hogares': { title: 'Condiciones Habitacionales de los Hogares', category: 'Población', color: '#f97316', order: 4 },
  'poblacion/viviendas': { title: 'Stock Habitacional y Viviendas', category: 'Población', color: '#8b5cf6', order: 5 },
  'poblacion/educacion-censal': { title: 'Asistencia Educativa de la Población', category: 'Población', color: '#06b6d4', order: 6 },
  'poblacion/economia': { title: 'Características Económicas de la Población', category: 'Población', color: '#eab308', order: 7 },
  'poblacion/fecundidad': { title: 'Fecundidad', category: 'Población', color: '#ec4899', order: 8 },
  'educacion': { title: 'Sistema Educativo Provincial', category: 'Educación', color: '#3b82f6', order: 9 },
  'salud': { title: 'Salud Materno-Infantil', category: 'Salud', color: '#ef4444', order: 10 },
  'seguridad': { title: 'Seguridad Ciudadana', category: 'Seguridad', color: '#6366f1', order: 11 },
  'economia-fiscal': { title: 'Economía y Finanzas Provinciales', category: 'Economía', color: '#14b8a6', order: 12 },
  'agricultura': { title: 'Sector Agropecuario y Pesquero', category: 'Agricultura', color: '#84cc16', order: 13 },
  'industria': { title: 'Sector Industrial', category: 'Industria', color: '#a855f7', order: 14 },
  'conurbano/educacion': { title: 'Vulnerabilidad Escolar en el Conurbano', category: 'Conurbano', color: '#10b981', order: 15 },
  'conurbano/seguridad': { title: 'Inseguridad en el Conurbano (SNIC 2000-2024)', category: 'Conurbano', color: '#ef4444', order: 16 },
};

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') || '';
    const report = REPORTS_SUBSET[slug];

    if (!report) {
      // Fallback: home OG
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #0a0f1c 0%, #1e293b 100%)',
              color: '#f1f5f9',
              padding: 80,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ fontSize: 28, color: '#00d4ff', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 30 }}>
              Plataforma de Datos Abiertos
            </div>
            <div style={{ fontSize: 76, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
              Dashboard PBA
            </div>
            <div style={{ fontSize: 32, marginTop: 20, opacity: 0.85 }}>
              Inteligencia Estratégica · Provincia de Buenos Aires
            </div>
            <div style={{ marginTop: 'auto', fontSize: 22, opacity: 0.6 }}>
              pba.openarg.org
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0a0f1c 0%, #1e293b 100%)',
            padding: 80,
            color: '#f1f5f9',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 30,
              color: report.color,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {String(report.order).padStart(2, '0')} · {report.category}
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              marginTop: 40,
              lineHeight: 1.1,
              maxWidth: 1040,
            }}
          >
            {report.title}
          </div>
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 24,
              opacity: 0.75,
            }}
          >
            <span>Dashboard PBA</span>
            <span>pba.openarg.org</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    return new Response(`Failed to generate image: ${(e as Error).message}`, { status: 500 });
  }
}
