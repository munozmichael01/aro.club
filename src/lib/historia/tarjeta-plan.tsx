import type { CSSProperties, ReactNode } from 'react'

import { REDES, type TarjetaPlanDatos } from '@/lib/reglas'

import { CREMA, Frase, Isotipo, SALVIA, SANS, SERIF, TERRACOTA, VERDE, caja, em, type Medidas } from './tarjeta'

/**
 * La tarjeta para historias de drinks y café, a 1080 × 1920.
 *
 * `TarjetaPlan.dc.html` de la entrega drinks-cafe (31-10, textos aprobados
 * por Michael): seis variantes por plan, sin mesa ni silla —copas y tazas—.
 * Mismo oficio que `Tarjeta` (la de cena y brunch): Satori, cajas con ancho,
 * frases palabra por palabra y el corte de línea medido.
 *
 * Los textos salen de `AroReglas.DENTRO.tarjetaPlan`.
 */

const TERRACOTA_OSCURO = '#8F4515'
const MELOCOTON = '#F6D9B4'

const TEMAS: Record<'drinks' | 'cafe', Record<number, [string, string]>> = {
  drinks: { 1: [VERDE, CREMA], 2: [CREMA, VERDE], 3: [SALVIA, VERDE], 4: [TERRACOTA, VERDE], 5: [TERRACOTA_OSCURO, CREMA], 6: [VERDE, CREMA] },
  cafe: { 1: [MELOCOTON, VERDE], 2: [CREMA, VERDE], 3: ['#C5D8CA', VERDE], 4: [TERRACOTA, VERDE], 5: [SALVIA, VERDE], 6: [CREMA, VERDE] },
}

export function TarjetaPlan({ v, h, m }: { v: number; h: TarjetaPlanDatos; m: Medidas }) {
  const [bg, ink] = TEMAS[h.cafe ? 'cafe' : 'drinks'][v] ?? TEMAS.drinks[1]
  const zonaMayus = h.zona.toUpperCase()
  let cuerpo: ReactNode = null

  if (v === 1 && !h.cafe) {
    // Las copas vistas desde arriba, que se salen del borde: no dejan contar personas.
    const C = (x: number, y: number, yo = false) => ({ x, y, yo })
    const copas = [C(-95, 990), C(165, 990), C(425, 990), C(685, 990), C(945, 990), C(35, 1130), C(295, 1130, true), C(555, 1130), C(815, 1130), C(1075, 1130)]
    cuerpo = (
      <>
        <Frase
          medida={m.serif}
          maximo={900}
          partes={[{ t: h.frase1 }, { t: 'Todavía.', color: TERRACOTA }]}
          estilo={{ position: 'absolute', left: 90, top: 270, fontFamily: SERIF, fontSize: 84, lineHeight: 1.04, letterSpacing: em(-0.025, 84) }}
        />
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 690, flexDirection: 'column' })}>
          <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: em(0.18, 26), color: SALVIA, marginBottom: 18 })}>TENGO DRINKS</div>
          <div style={caja({ fontFamily: SERIF, fontSize: 120, lineHeight: 0.95, letterSpacing: em(-0.03, 120), marginBottom: 18 })}>{h.dia}</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 48, lineHeight: 1.2 })}>{[h.hora, h.zona].filter(Boolean).join(' · ')}</div>
        </div>
        {copas.map((c, i) => (
          // El aro de la maqueta es una sombra interior; aquí, un borde del mismo grosor.
          <div key={i} style={caja({ position: 'absolute', left: c.x, top: c.y, width: 190, height: 190, borderRadius: 95, background: c.yo ? TERRACOTA : '#1B5138', border: '10px solid ' + (c.yo ? CREMA : SALVIA), alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: c.yo ? 64 : 80, lineHeight: 1, color: c.yo ? VERDE : SALVIA })}>{c.yo ? 'yo' : '?'}</div>
        ))}
      </>
    )
  }

  if (v === 1 && h.cafe) {
    // La taza vista desde arriba, con el plato y el asa.
    cuerpo = (
      <>
        <Frase
          medida={m.serif}
          maximo={900}
          partes={[{ t: h.frase1 }, { t: 'Todavía.', color: TERRACOTA_OSCURO }]}
          estilo={{ position: 'absolute', left: 90, top: 270, fontFamily: SERIF, fontSize: 84, lineHeight: 1.04, letterSpacing: em(-0.025, 84) }}
        />
        <div style={caja({ position: 'absolute', left: 150, top: 660, width: 740, height: 740, borderRadius: 370, background: CREMA, boxShadow: '0 24px 50px rgba(20,52,42,.18)' })} />
        <div style={caja({ position: 'absolute', left: 740, top: 965, width: 140, height: 130, borderRadius: 65, background: VERDE })} />
        <div style={caja({ position: 'absolute', left: 260, top: 770, width: 520, height: 520, borderRadius: 260, background: VERDE, border: '22px solid ' + TERRACOTA_OSCURO, color: CREMA, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' })}>
          <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: em(0.18, 24), color: TERRACOTA, marginBottom: 14 })}>TENGO CAFÉ</div>
          <div style={caja({ fontFamily: SERIF, fontSize: 92, lineHeight: 0.95, letterSpacing: em(-0.03, 92), marginBottom: 14 })}>{h.dia}</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 40, lineHeight: 1.2, marginBottom: 14 })}>{h.hora}</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 30, lineHeight: 1.2, color: '#C5D8CA' })}>{h.zona}</div>
        </div>
      </>
    )
  }

  if (v === 2) {
    const columna = (k: string) => (
      <div style={caja({ flex: 1, flexDirection: 'column' })}>
        <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: em(0.16, 24), color: SALVIA, marginBottom: 14 })}>{k}</div>
        <div style={caja({ fontFamily: SERIF, fontSize: 54, lineHeight: 1, color: TERRACOTA })}>Sorpresa.</div>
      </div>
    )
    cuerpo = (
      <div style={caja({ position: 'absolute', left: 90, width: 900, top: 260, height: 1140, borderRadius: 56, background: VERDE, color: CREMA, flexDirection: 'column', overflow: 'hidden' })}>
        <div style={caja({ padding: '60px 64px 0', flexDirection: 'column', flex: 1 })}>
          <div style={caja({ alignItems: 'center', justifyContent: 'space-between' })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 28, letterSpacing: em(0.18, 28), color: SALVIA })}>{'ARO CLUB · ' + h.plan.toUpperCase()}</div>
            <Isotipo tam={84} aro={CREMA} tuyo={TERRACOTA} otros={CREMA} />
          </div>
          <div style={caja({ fontFamily: SERIF, fontSize: 500, lineHeight: 0.78, letterSpacing: em(-0.05, 500), color: TERRACOTA, margin: '56px 0 0 -16px' })}>{h.numero}</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 52, lineHeight: 1.1, marginTop: 70 })}>{h.diaSemana + ' · ' + h.hora}</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 38, lineHeight: 1.2, color: SALVIA, marginTop: 14 })}>{h.zona}</div>
        </div>
        <div style={caja({ position: 'relative', borderTop: '5px dashed rgba(250,243,228,.3)', padding: '44px 64px 52px', marginTop: 36, gap: 30 })}>
          <div style={caja({ position: 'absolute', left: -38, top: -40, width: 76, height: 76, borderRadius: 38, background: bg })} />
          <div style={caja({ position: 'absolute', left: 862, top: -40, width: 76, height: 76, borderRadius: 38, background: bg })} />
          {columna(h.sitioMayus)}
          {columna('CON QUIÉN')}
        </div>
      </div>
    )
  }

  if (v === 3) {
    const datos: { k: string; v?: string; w?: [number, number] }[] = [
      { k: 'DÍA', v: h.dia + ' · ' + h.hora },
      { k: 'ZONA', v: h.zona },
      { k: h.sitioMayus, w: [300, 220] },
      { k: 'CON QUIÉN', w: [180, 380] },
    ]
    cuerpo = (
      <div style={caja({ position: 'absolute', left: 90, width: 900, top: 280, flexDirection: 'column' })}>
        <Frase medida={m.serif} maximo={900} partes={[{ t: h.frase3 }]} estilo={{ fontFamily: SERIF, fontSize: 118, lineHeight: 1, letterSpacing: em(-0.03, 118), marginBottom: 64 }} />
        <div style={caja({ flexDirection: 'column', marginBottom: 44 })}>
          {datos.map((d) => (
            <div key={d.k} style={caja({ flexDirection: 'column', padding: '30px 0', borderTop: '3px solid rgba(20,52,42,.25)' })}>
              <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: em(0.18, 24), marginBottom: 14 })}>{d.k}</div>
              {d.w ? (
                <div style={caja({ gap: 18 })}>
                  <div style={caja({ height: 62, width: d.w[0], borderRadius: 10, background: VERDE })} />
                  <div style={caja({ height: 62, width: d.w[1], borderRadius: 10, background: VERDE })} />
                </div>
              ) : (
                <div style={caja({ fontFamily: SERIF, fontSize: 60, lineHeight: 1.05 })}>{d.v}</div>
              )}
            </div>
          ))}
        </div>
        <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.25 })}>{h.cierre3}</div>
      </div>
    )
  }

  if (v === 4) {
    // «Hay una copa / un café para ti»: el sitio libre, con «tú». Solo con código.
    cuerpo = (
      <>
        <div style={caja({ position: 'absolute', left: 600, top: 60, width: 620, height: 620, borderRadius: 310, background: CREMA, border: '8px dashed ' + VERDE, alignItems: 'center', paddingLeft: 170, fontFamily: SERIF, fontSize: 110, lineHeight: 1, color: VERDE })}>tú</div>
        <div style={caja({ position: 'absolute', left: 90, top: 300, width: 420, fontFamily: SANS, fontWeight: 700, fontSize: 26, lineHeight: 1.5, letterSpacing: em(0.18, 26) })}>{h.sello}</div>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 740, flexDirection: 'column' })}>
          <Frase medida={m.serif} maximo={900} partes={[{ t: h.titulo4 }]} estilo={{ fontFamily: SERIF, fontSize: 140, lineHeight: 0.96, letterSpacing: em(-0.035, 140), marginBottom: 40 }} />
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.28, maxWidth: 860, marginBottom: 40 })}>{h.cuerpo4}</div>
          <div style={caja({ alignSelf: 'flex-start', background: CREMA, borderRadius: 32, padding: '30px 44px', alignItems: 'center', gap: 30, border: '4px dashed ' + VERDE })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: em(0.16, 24), color: TERRACOTA_OSCURO })}>CÓDIGO</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 72, lineHeight: 1, letterSpacing: em(0.04, 72) })}>{h.codigo ?? ''}</div>
          </div>
        </div>
      </>
    )
  }

  if (v === 5) {
    cuerpo = (
      <>
        <svg viewBox="0 0 240 240" width="760" height="760" style={{ position: 'absolute', left: 160, top: 400 }}>
          <circle cx="120" cy="120" r="100" fill="none" stroke={ink} strokeWidth="1.6" strokeDasharray="1.6 13.1" />
        </svg>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 290, fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: em(0.18, 30) })}>{(h.revelaDia || h.dia).toUpperCase()}</div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 620, justifyContent: 'center', fontFamily: SERIF, fontSize: 330, lineHeight: 0.9, letterSpacing: em(-0.05, 330), color: h.cafe ? VERDE : MELOCOTON })}>{h.revelaNum}</div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 950, justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: em(0.18, 30) })}>{h.revelaSufijo}</div>
        <Frase centrada medida={m.serif} maximo={900} partes={[{ t: h.frase5 }]} estilo={{ position: 'absolute', left: 90, top: 1110, fontFamily: SERIF, fontSize: 66, lineHeight: 1.08, letterSpacing: em(-0.02, 66) }} />
        <Frase centrada partes={[{ t: h.plan + ' · ' + h.dia + ' a las ' + h.hora + (h.zona ? ' · ' + h.zona : '') }]} estilo={{ position: 'absolute', left: 90, width: 900, top: 1330, fontFamily: SANS, fontWeight: 500, fontSize: 32, lineHeight: 1.3 }} />
      </>
    )
  }

  if (v === 6) {
    const tam = h.cafe ? 236 : 212
    const grande = (color: string, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: SERIF, fontSize: tam, lineHeight: 0.9, letterSpacing: em(-0.05, tam), color, ...extra })
    cuerpo = (
      <>
        <div style={caja({ position: 'absolute', left: 70, width: 970, top: 300, flexDirection: 'column' })}>
          <div style={caja(grande(h.cafe ? VERDE : CREMA))}>{h.pregunta6}</div>
          <div style={caja(grande(h.cafe ? TERRACOTA_OSCURO : TERRACOTA, { marginTop: 10 }))}>¿Con</div>
          <div style={caja(grande(h.cafe ? TERRACOTA_OSCURO : TERRACOTA))}>quién?</div>
          <div style={caja({ fontFamily: SERIF, fontSize: 84, lineHeight: 1.05, letterSpacing: em(-0.02, 84), color: h.cafe ? '#1B5138' : SALVIA, marginTop: 56 })}>Ni idea. Y así me gusta.</div>
        </div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 1290, background: ink, color: bg, padding: '28px 90px', fontFamily: SANS, fontWeight: 700, fontSize: 24, lineHeight: 1.3, letterSpacing: em(0.12, 24), whiteSpace: 'nowrap', transform: 'rotate(-2deg)' })}>{h.sello + ' · ' + zonaMayus}</div>
      </>
    )
  }

  return (
    <div style={caja({ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: bg, color: ink, fontFamily: SANS })}>
      {cuerpo}
      <div style={caja({ position: 'absolute', left: 90, width: 900, bottom: 390, alignItems: 'flex-end', gap: 40 })}>
        {v !== 4 && h.codigo ? (
          <div style={caja({ flexDirection: 'column' })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: em(0.16, 24), marginBottom: 12 })}>MI CÓDIGO</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 54, lineHeight: 1, letterSpacing: em(0.05, 54) })}>{h.codigo}</div>
          </div>
        ) : null}
        <div style={caja({ marginLeft: 'auto', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' })}>
          <div style={caja({ fontFamily: SERIF, fontSize: 50, lineHeight: 1, marginBottom: 12 })}>aro.club</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 30, lineHeight: 1 })}>{REDES.arroba}</div>
        </div>
      </div>
    </div>
  )
}
