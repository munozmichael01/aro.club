import type { ReactNode } from 'react'
import { Text, View, type TextStyle, type ViewStyle } from 'react-native'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'

import { SUELO_INTERLINEADO, fuente } from '../diseno'
import type { Historia } from './maquina'

/**
 * La historia para compartir (entrega estas-dentro, `TarjetaHistoria.dc.html`).
 * Se dibuja en las medidas de la maqueta, 1080 × 1920, multiplicadas por
 * `k = ancho / 1080`: la misma tarjeta sirve de miniatura en el selector y,
 * a 1080 px reales, de imagen para la captura.
 *
 * El interlineado de la maqueta baja de lo que aguantan las fuentes (la cifra
 * de la 2 va a 0,78). En React Native eso recorta tildes, así que cada texto
 * lleva el suelo de su familia y devuelve la diferencia con márgenes
 * negativos: la caja ocupa lo mismo que en la maqueta y nada se corta.
 */

const VERDE = '#14342A'
const CREMA = '#FAF3E4'
const TERRACOTA = '#E39C63'
const SALVIA = '#9CBBA6'

/** Fondo y tinta de cada tarjeta, de la maqueta. */
const TEMAS: Record<number, [string, string]> = {
  1: [VERDE, CREMA],
  2: [CREMA, VERDE],
  3: [SALVIA, VERDE],
  4: [TERRACOTA, VERDE],
  5: ['#F6D9B4', VERDE],
  6: [VERDE, CREMA],
  7: [TERRACOTA, VERDE],
  8: [VERDE, CREMA],
}

/** El aro de seis: el tuyo en `tuyo`, los demás en `otros`. */
function Isotipo({ tam, anillo, grosor, r, tuyo, otros }: { tam: number; anillo: string; grosor: number; r: number; tuyo: string; otros: string }) {
  const puntos: [number, number][] = [[163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]]
  return (
    <Svg width={tam} height={tam} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={86} fill="none" stroke={anillo} strokeWidth={grosor} />
      <Circle cx={206} cy={120} r={r} fill={tuyo} />
      {puntos.map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={otros} />
      ))}
    </Svg>
  )
}

export function TarjetaHistoria({ variante, h, ancho }: { variante: number; h: Historia; ancho: number }) {
  const k = ancho / 1080
  const n = (x: number) => x * k
  const [bg, ink] = TEMAS[variante] ?? TEMAS[1]

  /** Un texto con las medidas de la maqueta: familia, tamaño, interlineado y espaciado en em. */
  function T(p: { f: string; s: number; lh?: number; ls?: number; c?: string; o?: number; style?: TextStyle; lineas?: number; children: ReactNode }) {
    const lh = p.lh ?? 1.2
    const suelo = Math.max(lh, SUELO_INTERLINEADO[p.f] ?? 1.21)
    const sobra = ((suelo - lh) * p.s) / 2
    return (
      <Text
        allowFontScaling={false}
        numberOfLines={p.lineas}
        ellipsizeMode="clip"
        style={[
          {
            fontFamily: p.f,
            fontSize: n(p.s),
            lineHeight: n(p.s * suelo),
            letterSpacing: n((p.ls ?? 0) * p.s),
            color: p.c ?? ink,
            opacity: p.o,
            marginVertical: n(-sobra),
          },
          p.style,
        ]}
      >
        {p.children}
      </Text>
    )
  }
  const abs = (s: ViewStyle): ViewStyle => {
    const o: ViewStyle = { position: 'absolute' }
    for (const [key, val] of Object.entries(s)) (o as Record<string, unknown>)[key] = typeof val === 'number' ? n(val) : val
    return o
  }

  const brunch = h.plan === 'Brunch'
  const dd = h.diaSemana.toLowerCase()
  const sello = `${h.plan} · ${h.dia} · ${h.hora}`.toUpperCase()

  let cuerpo: ReactNode = null
  if (variante === 1) {
    const otros: [number, number, number][] = [[163, 200.5, 194.5], [77, 200.5, 194.5], [34, 126, 120], [77, 51.5, 45.5], [163, 51.5, 45.5]]
    cuerpo = (
      <>
        <View style={abs({ left: 90, right: 90, top: 270 })}>
          <T f={fuente.titular} s={84} lh={1.04} ls={-0.025}>
            {brunch ? `El ${dd} voy de brunch con gente que no conozco.` : `El ${dd} ceno con gente que no conozco.`} <Text style={{ color: TERRACOTA }}>Todavía.</Text>
          </T>
        </View>
        <View style={abs({ left: 150, top: 580, width: 780, height: 780 })}>
          <Svg width={n(780)} height={n(780)} viewBox="0 0 240 240" style={{ position: 'absolute' }}>
            <Circle cx={120} cy={120} r={86} fill="none" stroke={CREMA} strokeWidth={7} />
            <Circle cx={206} cy={120} r={18} fill={TERRACOTA} />
            {otros.map(([x, , y]) => (
              <Circle key={`c${x}-${y}`} cx={x} cy={y} r={18} fill="#1B5138" stroke={SALVIA} strokeWidth={2.5} />
            ))}
            <SvgText x={206} y={125.5} textAnchor="middle" fontFamily={fuente.titular} fontSize={14} fill={VERDE}>
              yo
            </SvgText>
            {otros.map(([x, ty]) => (
              <SvgText key={`t${x}-${ty}`} x={x} y={ty} textAnchor="middle" fontFamily={fuente.titular} fontSize={17} fill={SALVIA}>
                ?
              </SvgText>
            ))}
          </Svg>
          <View style={abs({ left: 130, right: 130, top: 160, bottom: 160 })}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: n(16) }}>
              <T f={fuente.textoNegrita} s={24} lh={1} ls={0.18} c={SALVIA}>TENGO PLAN</T>
              <T f={fuente.titular} s={brunch ? 100 : 128} lh={0.95} ls={-0.03} lineas={1}>{h.plan}</T>
              <T f={fuente.textoMedia} s={40} lineas={1}>{h.dia}</T>
              <T f={fuente.textoMedia} s={40} lineas={1}>{h.hora}</T>
              <T f={fuente.textoMedia} s={30} c={SALVIA} lineas={1}>{h.zona}</T>
            </View>
          </View>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1385 })}>
          <T f={fuente.textoMedia} s={34} c={SALVIA} style={{ textAlign: 'center' }}>El sitio, sorpresa hasta el mismo día.</T>
        </View>
      </>
    )
  } else if (variante === 2) {
    const titulo = (t: string) => (
      <View style={{ flex: 1, gap: n(14) }}>
        <T f={fuente.textoSemi} s={24} lh={1} ls={0.16} c={SALVIA}>{t}</T>
        <T f={fuente.titular} s={54} lh={1} c={TERRACOTA}>Sorpresa.</T>
      </View>
    )
    cuerpo = (
      <View style={[abs({ left: 90, right: 90, top: 260, bottom: 520 }), { borderRadius: n(56), backgroundColor: VERDE, overflow: 'hidden' }]}>
        <View style={{ flex: 1, paddingTop: n(60), paddingHorizontal: n(64) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T f={fuente.textoNegrita} s={28} lh={1} ls={0.18} c={SALVIA}>{`ARO CLUB · ${h.plan.toUpperCase()}`}</T>
            <Isotipo tam={n(84)} anillo={CREMA} grosor={20} r={25} tuyo={TERRACOTA} otros={CREMA} />
          </View>
          <T f={fuente.titular} s={500} lh={0.78} ls={-0.05} c={TERRACOTA} lineas={1} style={{ marginTop: n(56 - ((1.42 - 0.78) * 500) / 2), marginLeft: n(-16) }}>
            {h.numero}
          </T>
          <T f={fuente.textoSemi} s={52} lh={1.1} c={CREMA} style={{ marginTop: n(70 - ((1.21 - 1.1) * 52) / 2) }}>{`${h.diaSemana} · ${h.hora}`}</T>
          <T f={fuente.textoMedia} s={38} c={SALVIA} style={{ marginTop: n(14) }}>{h.zona}</T>
        </View>
        <View style={{ marginTop: n(36), paddingTop: n(44), paddingBottom: n(52), paddingHorizontal: n(64), flexDirection: 'row', gap: n(30) }}>
          {/* La línea de corte, punteada: un borde punteado de un solo lado no lo pinta iOS. */}
          <Svg width={n(900)} height={n(5)} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Line x1={0} y1={n(2.5)} x2={n(900)} y2={n(2.5)} stroke="rgba(250,243,228,0.3)" strokeWidth={n(5)} strokeDasharray={[n(15), n(10)]} />
          </Svg>
          <View style={[abs({ left: -38, top: -40, width: 76, height: 76 }), { borderRadius: n(38), backgroundColor: CREMA }]} />
          <View style={[abs({ right: -38, top: -40, width: 76, height: 76 }), { borderRadius: n(38), backgroundColor: CREMA }]} />
          {titulo('EL SITIO')}
          {titulo('CON QUIÉN')}
        </View>
      </View>
    )
  } else if (variante === 3) {
    const datos = [
      { k: 'DÍA', v: `${h.dia} · ${h.hora}` },
      { k: 'ZONA', v: h.zona },
      { k: 'EL SITIO', w: [300, 220] },
      { k: 'CON QUIÉN', w: [180, 380] },
    ]
    cuerpo = (
      <View style={[abs({ left: 90, right: 90, top: 280 }), { gap: n(64) }]}>
        <T f={fuente.titular} s={118} lh={1} ls={-0.03}>{brunch ? 'Lo que sé de mi brunch.' : 'Lo que sé de mi cena.'}</T>
        <View>
          {datos.map((d) => (
            <View key={d.k} style={{ gap: n(14), paddingVertical: n(30), borderTopWidth: n(3), borderTopColor: 'rgba(20,52,42,0.25)' }}>
              <T f={fuente.textoNegrita} s={24} lh={1} ls={0.18} o={0.7}>{d.k}</T>
              {d.w ? (
                <View style={{ flexDirection: 'row', gap: n(18) }}>
                  {d.w.map((w) => (
                    <View key={w} style={{ height: n(62), width: n(w), borderRadius: n(10), backgroundColor: VERDE }} />
                  ))}
                </View>
              ) : (
                <T f={fuente.titular} s={60} lh={1.05}>{d.v}</T>
              )}
            </View>
          ))}
        </View>
        <T f={fuente.textoMedia} s={44} lh={1.25} style={{ marginTop: n(-20) }}>El resto me lo dicen el mismo día.</T>
      </View>
    )
  } else if (variante === 4) {
    cuerpo = (
      <>
        <View style={abs({ right: -400, top: -40 })}>
          <Svg width={n(900)} height={n(900)} viewBox="0 0 240 240">
            <Circle cx={120} cy={120} r={86} fill="none" stroke={VERDE} strokeWidth={16} />
            <Circle cx={206} cy={120} r={22} fill={CREMA} />
            {[[163, 194.5], [77, 194.5], [77, 45.5], [163, 45.5]].map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={22} fill={VERDE} />
            ))}
            <Circle cx={34} cy={120} r={21} fill={TERRACOTA} stroke={VERDE} strokeWidth={4} strokeDasharray={[8, 6]} />
          </Svg>
        </View>
        <View style={abs({ left: 90, top: 300, width: 520 })}>
          <T f={fuente.textoNegrita} s={26} lh={1.5} ls={0.18}>{sello}</T>
        </View>
        <View style={[abs({ left: 90, right: 90, top: 720 }), { gap: n(40) }]}>
          <T f={fuente.titular} s={150} lh={0.96} ls={-0.035}>Hay una silla para ti.</T>
          <T f={fuente.textoMedia} s={44} lh={1.28} style={{ maxWidth: n(860) }}>Yo tampoco sé dónde ni con quién. Con mi código, tu primera fecha en Aro te sale mejor.</T>
          <View style={{ alignSelf: 'flex-start', backgroundColor: CREMA, borderRadius: n(32), paddingVertical: n(30), paddingHorizontal: n(44), flexDirection: 'row', alignItems: 'center', gap: n(30), borderWidth: n(4), borderStyle: 'dashed', borderColor: VERDE }}>
            <T f={fuente.textoSemi} s={24} lh={1} ls={0.16} c="#8F4515">CÓDIGO</T>
            <T f={fuente.textoNegrita} s={72} lh={1} ls={0.04}>{h.codigo ?? ''}</T>
          </View>
        </View>
      </>
    )
  } else if (variante === 5) {
    const P = (x: number, y: number, t?: string) => ({ x, y, t: t ?? '?', bg: t ? TERRACOTA : CREMA, aro: t ? CREMA : '#F6D9B4', fs: t ? 64 : 88 })
    const platos = [P(-40, 790), P(250, 790), P(540, 790, 'yo'), P(830, 790), P(1040, 790), P(105, 1090), P(395, 1090), P(685, 1090), P(975, 1090)]
    cuerpo = (
      <>
        <View style={[abs({ left: 90, right: 90, top: 270 }), { gap: n(28) }]}>
          <T f={fuente.titular} s={160} lh={0.92} ls={-0.04}>Mesa puesta.</T>
          <T f={fuente.textoMedia} s={48} lh={1.22} style={{ maxWidth: n(860) }}>Me falta saber dónde es y con quién me siento.</T>
        </View>
        <View style={[abs({ left: -120, width: 1320, top: 1000, height: 250 }), { borderRadius: n(125), backgroundColor: VERDE }]} />
        {platos.map((p) => (
          // El aro del plato es un borde y no una sombra extendida: así sale igual en la captura.
          <View
            key={`${p.x}-${p.y}`}
            style={[
              abs({ left: p.x - 14, top: p.y - 14, width: 208, height: 208 }),
              { borderRadius: n(104), backgroundColor: p.aro, padding: n(14), boxShadow: `0px ${n(14)}px ${n(30)}px rgba(20,52,42,0.25)` },
            ]}
          >
            <View style={{ flex: 1, borderRadius: n(90), backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
              <T f={fuente.titular} s={p.fs} lh={1} c={VERDE}>{p.t}</T>
            </View>
          </View>
        ))}
        <View style={abs({ left: 90, right: 90, top: 1335 })}>
          <T f={fuente.textoNegrita} s={26} lh={1.4} ls={0.16}>{`${sello} · ${h.zona.toUpperCase()}`}</T>
        </View>
      </>
    )
  } else if (variante === 6) {
    cuerpo = (
      <>
        <View style={abs({ left: 90, right: 90, top: 270 })}>
          <T f={fuente.titular} s={96} lh={1.02} ls={-0.03}>{brunch ? `Mi brunch del ${dd} viene en sobre cerrado.` : `Mi cena del ${dd} viene en sobre cerrado.`}</T>
        </View>
        <View style={[abs({ left: 90, top: 640, width: 900, height: 620 }), { transform: [{ rotate: '-3deg' }], borderRadius: n(26), boxShadow: `0px ${n(24)}px ${n(40)}px rgba(0,0,0,0.35)` }]}>
          <Svg width={n(900)} height={n(620)} viewBox="0 0 900 620" style={{ position: 'absolute' }}>
            <Rect x={0} y={0} width={900} height={620} rx={26} fill={CREMA} />
            <Path d="M0 620 L380 330 M900 620 L520 330" stroke="#E4D6BA" strokeWidth={4} fill="none" />
            <Path d="M10 12 L450 350 L890 12" stroke="#D9C8A6" strokeWidth={5} fill="#F3E8D2" />
          </Svg>
          <View style={[abs({ left: 356, top: 256, width: 188, height: 188 }), { borderRadius: n(94), backgroundColor: TERRACOTA, borderWidth: n(10), borderColor: '#D58A50', alignItems: 'center', justifyContent: 'center', boxShadow: `0px ${n(8)}px ${n(18)}px rgba(20,52,42,0.25)` }]}>
            <Isotipo tam={n(110)} anillo={VERDE} grosor={20} r={25} tuyo={CREMA} otros={VERDE} />
          </View>
          <View style={[abs({ left: 56, bottom: 44 }), { gap: n(10) }]}>
            <T f={fuente.textoNegrita} s={22} lh={1} ls={0.18} c="#8F4515">SE ABRE</T>
            <T f={fuente.titular} s={44} lh={1} c={VERDE} lineas={1}>{`${h.dia} · ${h.revela}`}</T>
          </View>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1350 })}>
          <T f={fuente.textoMedia} s={44} lh={1.28} c="#C5D8CA">
            {'Dentro: el sitio y quiénes van. '}
            <Text style={{ color: CREMA }}>Ni yo lo sé.</Text>
          </T>
        </View>
      </>
    )
  } else if (variante === 7) {
    cuerpo = (
      <>
        <View style={[abs({ left: 160, top: 400 }), { opacity: 0.9 }]}>
          <Svg width={n(760)} height={n(760)} viewBox="0 0 240 240">
            <Circle cx={120} cy={120} r={100} fill="none" stroke={VERDE} strokeWidth={1.6} strokeDasharray={[1.6, 13.1]} />
          </Svg>
        </View>
        <View style={abs({ left: 90, right: 90, top: 290 })}>
          <T f={fuente.textoNegrita} s={30} lh={1} ls={0.18}>{h.dia.toUpperCase()}</T>
        </View>
        <View style={abs({ left: 0, right: 0, top: 620 })}>
          <T f={fuente.titular} s={330} lh={0.9} ls={-0.05} c={VERDE} lineas={1} style={{ textAlign: 'center' }}>{h.revelaNum}</T>
        </View>
        <View style={abs({ left: 0, right: 0, top: 950 })}>
          <T f={fuente.textoNegrita} s={30} lh={1} ls={0.18} style={{ textAlign: 'center' }}>{h.revelaSufijo}</T>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1110 })}>
          <T f={fuente.titular} s={66} lh={1.08} ls={-0.02} style={{ textAlign: 'center' }}>{`A esta hora me dicen dónde es mi ${h.plan.toLowerCase()} y con quién.`}</T>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1330 })}>
          <T f={fuente.textoMedia} s={32} lh={1.3} style={{ textAlign: 'center' }}>{`${h.plan} a las ${h.hora} · ${h.zona}`}</T>
        </View>
      </>
    )
  } else {
    cuerpo = (
      <>
        <View style={abs({ left: 70, right: 40, top: 300 })}>
          <T f={fuente.titular} s={236} lh={0.9} ls={-0.05} c={CREMA}>¿Dónde?</T>
          <T f={fuente.titular} s={236} lh={0.9} ls={-0.05} c={TERRACOTA} style={{ marginTop: n(10 - ((1.42 - 0.9) * 236) / 2) }}>¿Con</T>
          <T f={fuente.titular} s={236} lh={0.9} ls={-0.05} c={TERRACOTA}>quién?</T>
          <T f={fuente.titular} s={84} lh={1.05} ls={-0.02} c={SALVIA} style={{ marginTop: n(56 - ((1.42 - 1.05) * 84) / 2) }}>Ni idea. Y así me gusta.</T>
        </View>
        <View style={[abs({ left: 0, right: 0, top: 1290 }), { backgroundColor: CREMA, paddingVertical: n(28), paddingHorizontal: n(90), transform: [{ rotate: '-2deg' }] }]}>
          <T f={fuente.textoNegrita} s={24} lh={1.3} ls={0.12} c={VERDE} lineas={1}>{`${sello} · ${h.zona.toUpperCase()}`}</T>
        </View>
      </>
    )
  }

  // La 4 lleva el código en grande; las demás, abajo y solo si hay código.
  const codigoPie = variante !== 4 && h.codigo
  return (
    <View style={{ width: n(1080), height: n(1920), backgroundColor: bg, overflow: 'hidden' }} collapsable={false}>
      {cuerpo}
      <View style={[abs({ left: 90, right: 90, bottom: 390 }), { flexDirection: 'row', alignItems: 'flex-end', gap: n(40) }]}>
        {codigoPie ? (
          <View style={{ gap: n(12) }}>
            <T f={fuente.textoSemi} s={24} lh={1} ls={0.16} o={0.75}>MI CÓDIGO</T>
            <T f={fuente.textoNegrita} s={54} lh={1} ls={0.05}>{h.codigo}</T>
          </View>
        ) : null}
        <View style={{ marginLeft: 'auto', alignItems: 'flex-end', gap: n(12) }}>
          <T f={fuente.titular} s={50} lh={1}>aro.club</T>
          <T f={fuente.textoSemi} s={30} lh={1} o={0.8}>@aroclub</T>
        </View>
      </View>
    </View>
  )
}
