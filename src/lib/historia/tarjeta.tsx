import type { CSSProperties, ReactNode } from 'react'

import { REDES, type Historia } from '@/lib/reglas'

import { anchoEquilibrado, type Medida } from './medir'

/**
 * La tarjeta para historias, a 1080 × 1920, para pintarla en el servidor.
 *
 * Es `TarjetaHistoria.dc.html` de la entrega estas-dentro (29-10), variante
 * por variante, con sus medidas, colores y textos. La app la pinta en React
 * Native (`app-mobile/src/dentro/TarjetaHistoria.tsx`); la web, aquí, para que
 * la vista previa, la imagen que se descarga y la que se comparte sean el
 * MISMO fichero.
 *
 * Lo pinta Satori (`next/og`), que solo sabe flexbox —y una caja absoluta
 * con `left` y `right` no se estira: lleva su ancho— y no sabe de texto en
 * línea: una frase con una palabra de otro color —«… que no conozco.
 * Todavía.»— se arma palabra por palabra (`Frase`). Y el texto dentro de un
 * SVG no se pinta: el «yo» y los «?» del aro van encima, en cajas.
 *
 * Los textos salen de `AroReglas.DENTRO.historia`; aquí no hay ni una frase.
 */

export const VERDE = '#14342A'
export const CREMA = '#FAF3E4'
export const TERRACOTA = '#E39C63'
export const SALVIA = '#9CBBA6'

const TEMAS: Record<number, [string, string]> = {
  1: [VERDE, CREMA], 2: [CREMA, VERDE], 3: [SALVIA, VERDE], 4: [TERRACOTA, VERDE],
  5: ['#F6D9B4', VERDE], 6: [VERDE, CREMA], 7: [TERRACOTA, VERDE], 8: [VERDE, CREMA],
}

export const SERIF = 'Young Serif'
export const SANS = 'Inter Tight'

/** El `letter-spacing` de la maqueta va en em; Satori lo quiere en píxeles. */
export const em = (n: number, tam: number) => n * tam

export const caja = (s: CSSProperties): CSSProperties => ({ display: 'flex', ...s })

/**
 * Una frase que fluye como texto, con trozos de otro color. Cada palabra es
 * una caja y el espacio, su margen: es lo que Satori sabe hacer.
 *
 * Con `medida`, además, el `text-wrap: balance` de la maqueta: el ancho más
 * estrecho con las mismas líneas. Sin él, «El viernes ceno con / gente que no
 * conozco. / Todavía.» corta donde no corta Design.
 */
export function Frase(p: { partes: { t: string; color?: string }[]; estilo: CSSProperties; centrada?: boolean; medida?: Medida; maximo?: number }) {
  const tam = Number(p.estilo.fontSize ?? 40)
  const ls = Number(p.estilo.letterSpacing ?? 0)
  const palabras = p.partes.flatMap((x) => x.t.split(/\s+/).filter(Boolean).map((w) => ({ w, color: x.color })))
  const espacio = p.medida ? p.medida(' ', tam) + ls : tam * 0.22
  const ancho = p.medida && p.maximo
    ? anchoEquilibrado(palabras.map((x) => p.medida!(x.w, tam, ls)), espacio, p.maximo)
    : undefined
  return (
    <div style={caja({ ...p.estilo, ...(ancho ? { width: ancho } : {}), flexWrap: 'wrap', justifyContent: p.centrada ? 'center' : 'flex-start' })}>
      {palabras.map((x, i) => (
        <span key={i} style={{ color: x.color, marginRight: i === palabras.length - 1 ? 0 : espacio }}>{x.w}</span>
      ))}
    </div>
  )
}

/** El isotipo: el aro y los seis puntos, el tuyo en otro color. */
export function Isotipo(p: { tam: number; aro: string; tuyo: string; otros: string }) {
  const otros: [number, number][] = [[163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]]
  return (
    <svg viewBox="0 0 240 240" width={p.tam} height={p.tam}>
      <circle cx="120" cy="120" r="86" fill="none" stroke={p.aro} strokeWidth="20" />
      <circle cx="206" cy="120" r="25" fill={p.tuyo} />
      {otros.map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="25" fill={p.otros} />)}
    </svg>
  )
}

/** `serif` y `sans` (500) miden los titulares que la maqueta equilibra. */
export type Medidas = { serif: Medida; sans: Medida }

export function Tarjeta({ v, h, m }: { v: number; h: Historia; m: Medidas }) {
  const [bg, ink] = TEMAS[v] ?? TEMAS[1]
  const zonaMayus = h.zona.toUpperCase()

  let cuerpo: ReactNode = null

  if (v === 1) {
    // El aro de la mesa: el tuyo en terracota y cinco «?».
    const E = 780 / 240
    const puntos: [number, number, string][] = [[206, 120, 'yo'], [163, 194.5, '?'], [77, 194.5, '?'], [34, 120, '?'], [77, 45.5, '?'], [163, 45.5, '?']]
    cuerpo = (
      <>
        <Frase
          medida={m.serif}
          maximo={900}
          partes={[{ t: h.frase1 }, { t: 'Todavía.', color: TERRACOTA }]}
          estilo={{ position: 'absolute', left: 90, top: 270, fontFamily: SERIF, fontSize: 84, lineHeight: 1.04, letterSpacing: em(-0.025, 84) }}
        />
        <div style={caja({ position: 'absolute', left: 150, top: 580, width: 780, height: 780 })}>
          <svg viewBox="0 0 240 240" width="780" height="780" style={{ position: 'absolute', left: 0, top: 0 }}>
            <circle cx="120" cy="120" r="86" fill="none" stroke={CREMA} strokeWidth="7" />
            {puntos.map(([x, y, t]) => (
              <circle key={x + '-' + y} cx={x} cy={y} r="18" fill={t === 'yo' ? TERRACOTA : '#1B5138'} stroke={t === 'yo' ? 'none' : SALVIA} strokeWidth={t === 'yo' ? 0 : 2.5} />
            ))}
          </svg>
          {puntos.map(([x, y, t]) => (
            <div key={'t' + x + '-' + y} style={caja({ position: 'absolute', left: x * E - 60, top: y * E - 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: (t === 'yo' ? 14 : 17) * E, color: t === 'yo' ? VERDE : SALVIA })}>{t}</div>
          ))}
          <div style={caja({ position: 'absolute', left: 130, width: 520, top: 160, height: 460, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: em(0.18, 24), color: SALVIA, marginBottom: 16 })}>TENGO PLAN</div>
            <div style={caja({ fontFamily: SERIF, fontSize: h.brunch ? 100 : 128, lineHeight: 0.95, letterSpacing: em(-0.03, h.brunch ? 100 : 128), marginBottom: 16 })}>{h.plan}</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 40, lineHeight: 1.2, marginBottom: 16 })}>{h.dia}</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 40, lineHeight: 1.2, marginBottom: 16 })}>{h.hora}</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 30, lineHeight: 1.2, color: SALVIA, justifyContent: 'center', textAlign: 'center' })}>{h.zona}</div>
          </div>
        </div>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 1385, justifyContent: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 34, lineHeight: 1.2, color: SALVIA })}>El sitio, sorpresa hasta el mismo día.</div>
      </>
    )
  }

  if (v === 2) {
    // El boleto.
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
          <div style={caja({ position: 'absolute', left: -38, top: -40, width: 76, height: 76, borderRadius: 38, background: CREMA })} />
          <div style={caja({ position: 'absolute', left: 862, top: -40, width: 76, height: 76, borderRadius: 38, background: CREMA })} />
          {columna('EL SITIO')}
          {columna('CON QUIÉN')}
        </div>
      </div>
    )
  }

  if (v === 3) {
    // Lo que sé: día y zona a la vista, el sitio y con quién tapados.
    const datos: { k: string; v?: string; w?: [number, number] }[] = [
      { k: 'DÍA', v: h.dia + ' · ' + h.hora },
      { k: 'ZONA', v: h.zona },
      { k: 'EL SITIO', w: [300, 220] },
      { k: 'CON QUIÉN', w: [180, 380] },
    ]
    cuerpo = (
      <div style={caja({ position: 'absolute', left: 90, width: 900, top: 280, flexDirection: 'column' })}>
        <Frase medida={m.serif} maximo={900} partes={[{ t: h.frase3 }]} estilo={{ fontFamily: SERIF, fontSize: 118, lineHeight: 1, letterSpacing: em(-0.03, 118), marginBottom: 64 }} />
        <div style={caja({ flexDirection: 'column', marginBottom: 44 })}>
          {datos.map((d) => (
            <div key={d.k} style={caja({ flexDirection: 'column', padding: '30px 0', borderTop: '3px solid rgba(20,52,42,.25)' })}>
              <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: em(0.18, 24), opacity: 0.7, marginBottom: 14 })}>{d.k}</div>
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
        <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.25 })}>El resto me lo dicen el mismo día.</div>
      </div>
    )
  }

  if (v === 4) {
    // «Hay una silla para ti»: entera el código. Solo sale con código.
    cuerpo = (
      <>
        <svg viewBox="0 0 240 240" width="900" height="900" style={{ position: 'absolute', left: 580, top: -40 }}>
          <circle cx="120" cy="120" r="86" fill="none" stroke={VERDE} strokeWidth="16" />
          <circle cx="206" cy="120" r="22" fill={CREMA} />
          <circle cx="163" cy="194.5" r="22" fill={VERDE} />
          <circle cx="77" cy="194.5" r="22" fill={VERDE} />
          <circle cx="34" cy="120" r="21" fill={TERRACOTA} stroke={VERDE} strokeWidth="4" strokeDasharray="8 6" />
          <circle cx="77" cy="45.5" r="22" fill={VERDE} />
          <circle cx="163" cy="45.5" r="22" fill={VERDE} />
        </svg>
        <div style={caja({ position: 'absolute', left: 90, top: 300, width: 520, fontFamily: SANS, fontWeight: 700, fontSize: 26, lineHeight: 1.5, letterSpacing: em(0.18, 26) })}>{h.sello}</div>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 720, flexDirection: 'column' })}>
          <Frase medida={m.serif} maximo={900} partes={[{ t: 'Hay una silla para ti.' }]} estilo={{ fontFamily: SERIF, fontSize: 150, lineHeight: 0.96, letterSpacing: em(-0.035, 150), marginBottom: 40 }} />
          <div style={caja({ fontFamily: SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.28, maxWidth: 860, marginBottom: 40 })}>Yo tampoco sé dónde ni con quién. Con mi código, tu primera fecha en Aro te sale mejor.</div>
          <div style={caja({ alignSelf: 'flex-start', background: CREMA, borderRadius: 32, padding: '30px 44px', alignItems: 'center', gap: 30, border: '4px dashed ' + VERDE })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: em(0.16, 24), color: '#8F4515' })}>CÓDIGO</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 72, lineHeight: 1, letterSpacing: em(0.04, 72) })}>{h.codigo ?? ''}</div>
          </div>
        </div>
      </>
    )
  }

  if (v === 5) {
    // Mesa puesta: nueve platos, el tuyo con «yo».
    const P = (x: number, y: number, t?: string) => ({ x, y, t: t || '?', bg: t ? TERRACOTA : CREMA, aro: t ? CREMA : '#F6D9B4', fs: t ? 64 : 88 })
    const platos = [P(-40, 790), P(250, 790), P(540, 790, 'yo'), P(830, 790), P(1040, 790), P(105, 1090), P(395, 1090), P(685, 1090), P(975, 1090)]
    cuerpo = (
      <>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 270, flexDirection: 'column' })}>
          <div style={caja({ fontFamily: SERIF, fontSize: 160, lineHeight: 0.92, letterSpacing: em(-0.04, 160), marginBottom: 28 })}>Mesa puesta.</div>
          <Frase medida={m.sans} maximo={860} partes={[{ t: 'Me falta saber dónde es y con quién me siento.' }]} estilo={{ fontFamily: SANS, fontWeight: 500, fontSize: 48, lineHeight: 1.22 }} />
        </div>
        <div style={caja({ position: 'absolute', left: -120, width: 1320, top: 1000, height: 250, borderRadius: 125, background: VERDE })} />
        {platos.map((p, i) => (
          // El aro de 14 px de la maqueta es una sombra sin desenfoque; aquí, un borde.
          <div key={i} style={caja({ position: 'absolute', left: p.x - 14, top: p.y - 14, width: 208, height: 208, borderRadius: 104, border: '14px solid ' + p.aro, background: p.bg, boxShadow: '0 14px 30px rgba(20,52,42,.25)', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: p.fs, lineHeight: 1, color: VERDE })}>{p.t}</div>
        ))}
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 1335, fontFamily: SANS, fontWeight: 700, fontSize: 26, lineHeight: 1.4, letterSpacing: em(0.16, 26) })}>{h.sello + ' · ' + zonaMayus}</div>
      </>
    )
  }

  if (v === 6) {
    // El sobre cerrado, con el lacre del isotipo.
    cuerpo = (
      <>
        <Frase medida={m.serif} maximo={900} partes={[{ t: h.frase6 }]} estilo={{ position: 'absolute', left: 90, top: 270, fontFamily: SERIF, fontSize: 96, lineHeight: 1.02, letterSpacing: em(-0.03, 96) }} />
        <div style={caja({ position: 'absolute', left: 90, top: 640, width: 900, height: 620, transform: 'rotate(-3deg)' })}>
          <div style={caja({ position: 'absolute', left: 0, top: 0, width: 900, height: 620, borderRadius: 26, background: CREMA, boxShadow: '0 24px 40px rgba(0,0,0,.35)' })} />
          <svg viewBox="0 0 900 620" width="900" height="620" style={{ position: 'absolute', left: 0, top: 0 }}>
            <path d="M0 620 L380 330 M900 620 L520 330" stroke="#E4D6BA" strokeWidth="4" fill="none" />
            <path d="M10 12 L450 350 L890 12" stroke="#D9C8A6" strokeWidth="5" fill="#F3E8D2" />
          </svg>
          <div style={caja({ position: 'absolute', left: 356, top: 256, width: 188, height: 188, borderRadius: 94, background: TERRACOTA, border: '10px solid #D58A50', boxShadow: '0 8px 18px rgba(20,52,42,.25)', alignItems: 'center', justifyContent: 'center' })}>
            <Isotipo tam={110} aro={VERDE} tuyo={CREMA} otros={VERDE} />
          </div>
          <div style={caja({ position: 'absolute', left: 56, bottom: 44, flexDirection: 'column', color: VERDE })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 22, letterSpacing: em(0.18, 22), color: '#8F4515', marginBottom: 10 })}>SE ABRE</div>
            <div style={caja({ fontFamily: SERIF, fontSize: 44, lineHeight: 1 })}>{h.dia + (h.revela ? ' · ' + h.revela : '')}</div>
          </div>
        </div>
        <Frase
          partes={[{ t: 'Dentro: el sitio y quiénes van.' }, { t: 'Ni yo lo sé.', color: CREMA }]}
          estilo={{ position: 'absolute', left: 90, width: 900, top: 1350, fontFamily: SANS, fontWeight: 500, fontSize: 44, lineHeight: 1.28, color: '#C5D8CA' }}
        />
      </>
    )
  }

  if (v === 7) {
    // La hora de la revelación, enorme.
    cuerpo = (
      <>
        <svg viewBox="0 0 240 240" width="760" height="760" style={{ position: 'absolute', left: 160, top: 400, opacity: 0.9 }}>
          <circle cx="120" cy="120" r="100" fill="none" stroke={VERDE} strokeWidth="1.6" strokeDasharray="1.6 13.1" />
        </svg>
        <div style={caja({ position: 'absolute', left: 90, width: 900, top: 290, fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: em(0.18, 30) })}>{h.dia.toUpperCase()}</div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 620, justifyContent: 'center', fontFamily: SERIF, fontSize: 330, lineHeight: 0.9, letterSpacing: em(-0.05, 330), color: VERDE })}>{h.revelaNum}</div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 950, justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: em(0.18, 30) })}>{h.revelaSufijo}</div>
        <Frase
          centrada
          medida={m.serif}
          maximo={900}
          partes={[{ t: 'A esta hora me dicen dónde es mi ' + h.plan.toLowerCase() + ' y con quién.' }]}
          estilo={{ position: 'absolute', left: 90, width: 900, top: 1110, fontFamily: SERIF, fontSize: 66, lineHeight: 1.08, letterSpacing: em(-0.02, 66) }}
        />
        <Frase
          centrada
          partes={[{ t: h.plan + ' a las ' + h.hora + (h.zona ? ' · ' + h.zona : '') }]}
          estilo={{ position: 'absolute', left: 90, width: 900, top: 1330, fontFamily: SANS, fontWeight: 500, fontSize: 32, lineHeight: 1.3 }}
        />
      </>
    )
  }

  if (v === 8) {
    // ¿Dónde? ¿Con quién?
    const grande: CSSProperties = { fontFamily: SERIF, fontSize: 236, lineHeight: 0.9, letterSpacing: em(-0.05, 236) }
    cuerpo = (
      <>
        <div style={caja({ position: 'absolute', left: 70, width: 970, top: 300, flexDirection: 'column' })}>
          <div style={caja({ ...grande, color: CREMA })}>¿Dónde?</div>
          <div style={caja({ ...grande, color: TERRACOTA, marginTop: 10 })}>¿Con</div>
          <div style={caja({ ...grande, color: TERRACOTA })}>quién?</div>
          <div style={caja({ fontFamily: SERIF, fontSize: 84, lineHeight: 1.05, letterSpacing: em(-0.02, 84), color: SALVIA, marginTop: 56 })}>Ni idea. Y así me gusta.</div>
        </div>
        <div style={caja({ position: 'absolute', left: 0, width: 1080, top: 1290, background: CREMA, color: VERDE, padding: '28px 90px', fontFamily: SANS, fontWeight: 700, fontSize: 24, lineHeight: 1.3, letterSpacing: em(0.12, 24), whiteSpace: 'nowrap', transform: 'rotate(-2deg)' })}>{h.sello + ' · ' + zonaMayus}</div>
      </>
    )
  }

  return (
    <div style={caja({ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: bg, color: ink, fontFamily: SANS })}>
      {cuerpo}
      <div style={caja({ position: 'absolute', left: 90, width: 900, bottom: 390, alignItems: 'flex-end', gap: 40 })}>
        {v !== 4 && h.codigo ? (
          <div style={caja({ flexDirection: 'column' })}>
            <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: em(0.16, 24), opacity: 0.75, marginBottom: 12 })}>MI CÓDIGO</div>
            <div style={caja({ fontFamily: SANS, fontWeight: 700, fontSize: 54, lineHeight: 1, letterSpacing: em(0.05, 54) })}>{h.codigo}</div>
          </div>
        ) : null}
        <div style={caja({ marginLeft: 'auto', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' })}>
          <div style={caja({ fontFamily: SERIF, fontSize: 50, lineHeight: 1, marginBottom: 12 })}>aro.club</div>
          <div style={caja({ fontFamily: SANS, fontWeight: 600, fontSize: 30, lineHeight: 1, opacity: 0.8 })}>{REDES.arroba}</div>
        </div>
      </div>
    </div>
  )
}
