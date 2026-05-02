import type { School, RadioCensal } from '../../../lib/conurbano/educacion/types';

export default function SchoolDetail({
  school,
  radio,
  otrosEnRadio,
  onClose,
}: {
  school: School;
  radio: RadioCensal | null;
  otrosEnRadio: School[];
  onClose: () => void;
}) {
  return (
    <div className="conu-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="conu-eyebrow">
            Colegio · {school.sector} · {school.ambito}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
            }}
          >
            {school.nombre}
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {school.domicilio} — {school.localidad}, {school.partido}
          </div>
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {school.niveles.map((n) => (
              <span key={n} className="conu-chip">
                {n}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
            CUE {school.cue} · Geo: {school.geocode_quality}
          </div>
        </div>
        <button onClick={onClose} className="conu-btn-ghost" style={{ flexShrink: 0 }}>
          Cerrar
        </button>
      </div>

      {school.confianza !== 'alta' && (
        <div
          className="conu-alert"
          data-severity={school.confianza === 'baja' ? 'high' : 'medium'}
        >
          {school.confianza === 'baja' ? (
            <>
              <strong>Confianza baja:</strong> la dirección no se pudo geocodificar con
              precisión y se usó el centroide de la localidad. <strong>Los indicadores
              del radio no son confiables</strong> — este colegio queda fuera del ranking.
            </>
          ) : (
            <>
              <strong>Confianza media:</strong> el geocoding fue por intersección o calle
              aproximada, o el radio asignado tiene baja muestra. Los indicadores son
              indicativos pero conviene chequear caso por caso.
            </>
          )}
        </div>
      )}

      {!radio ? (
        <div className="conu-alert" data-severity="medium">
          Este colegio no tiene radio censal asignado, por lo que no se muestran indicadores.
        </div>
      ) : (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <Block
            title={`Indicadores del radio ${radio.radio_id}`}
            subtitle={`Decil de vulnerabilidad: ${radio.vulnerability_decile} / 10`}
          >
            <Row label="Población (5+, con MNI)">
              {radio.poblacion_total.toLocaleString('es-AR')}
            </Row>
            <Row label="Hogares">{radio.hogares_total.toLocaleString('es-AR')}</Row>
            <Row label="% NBI" emphasis>
              {pct(radio.nbi_pct)}
            </Row>
            <Row label="% privación material">{pct(radio.privacion_material_pct)}</Row>
            <Row label="% sin instrucción" emphasis>
              {pct(radio.pct_sin_instruccion)}
            </Row>
            <Row label="% nunca asistió">{pct(radio.tasa_nunca_asistio, 2)}</Row>
            <Row label="% hacinamiento">{pct(radio.hacinamiento_pct)}</Row>
            <Row label="% secundario completo+">{pct(radio.pct_secundario_completo)}</Row>
            <Row label="% superior completo">{pct(radio.pct_superior_completo)}</Row>
          </Block>

          <Block
            title="Otros colegios en este radio"
            subtitle={`${otrosEnRadio.length} establecimiento(s)`}
          >
            {otrosEnRadio.length === 0 ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                Ningún otro colegio del padrón cae en este radio censal.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {otrosEnRadio.slice(0, 12).map((s) => (
                  <li
                    key={s.cue}
                    style={{
                      padding: '6px 0',
                      fontSize: 11.5,
                      borderBottom: '1px solid var(--border-glass)',
                    }}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {s.nombre}
                    </div>
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 10.5,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {s.sector} · {s.localidad}
                    </div>
                  </li>
                ))}
                {otrosEnRadio.length > 12 && (
                  <li
                    style={{
                      padding: '6px 0',
                      textAlign: 'center',
                      fontSize: 10.5,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    +{otrosEnRadio.length - 12} más
                  </li>
                )}
              </ul>
            )}
          </Block>
        </div>
      )}
    </div>
  );
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-secondary)',
        padding: 12,
      }}
    >
      <div className="conu-eyebrow">{title}</div>
      {subtitle && (
        <div
          style={{
            marginTop: 2,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {subtitle}
        </div>
      )}
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4, fontSize: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  emphasis,
  children,
}: {
  label: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span
        style={{
          fontWeight: emphasis ? 600 : 400,
          color: emphasis ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {children}
      </span>
    </div>
  );
}

const pct = (n: number | null | undefined, decimals = 1) =>
  n == null ? '—' : `${Number(n).toFixed(decimals)}%`;
