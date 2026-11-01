import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'

import { fuente } from '../diseno'
import { reglas, type DatosPlan } from '../reglas'
import { lienzo } from './lienzo'

/**
 * La historia de drinks y café (entrega drinks-cafe, `TarjetaPlan.dc.html`,
 * aprobada por Michael el 31-10). Seis tarjetas, sin mesa ni silla: copas
 * vistas desde arriba o una taza, que no dejan contar personas. Los textos
 * salen de `AroReglas.DENTRO.tarjetaPlan`, los mismos que pinta la web.
 */

const VERDE = '#14342A'
const CREMA = '#FAF3E4'
const TERRACOTA = '#E39C63'
const SALVIA = '#9CBBA6'
const OXIDO = '#8F4515'

/** Fondo y tinta de cada tarjeta, de la maqueta. */
const TEMAS: Record<'drinks' | 'cafe', Record<number, [string, string]>> = {
  cafe: { 1: ['#F6D9B4', VERDE], 2: [CREMA, VERDE], 3: ['#C5D8CA', VERDE], 4: [TERRACOTA, VERDE], 5: [SALVIA, VERDE], 6: [CREMA, VERDE] },
  drinks: { 1: [VERDE, CREMA], 2: [CREMA, VERDE], 3: [SALVIA, VERDE], 4: [TERRACOTA, VERDE], 5: [OXIDO, CREMA], 6: [VERDE, CREMA] },
}

/** Las copas de la 1 de drinks: dos filas que se salen por los bordes, y la tuya. */
const COPAS: [number, number, boolean?][] = [
  [-95, 990], [165, 990], [425, 990], [685, 990], [945, 990],
  [35, 1130], [295, 1130, true], [555, 1130], [815, 1130], [1075, 1130],
]

export function TarjetaPlan({ variante, d, ancho }: { variante: number; d: DatosPlan; ancho: number }) {
  const [bg, ink] = TEMAS[d.cafe ? 'cafe' : 'drinks'][variante] ?? TEMAS.drinks[1]
  const { n, T, abs } = lienzo(ancho, ink)

  let cuerpo: ReactNode = null
  if (variante === 1 && !d.cafe) {
    cuerpo = (
      <>
        {/* La frase y el día van uno debajo del otro y no en su `top` de la maqueta: en el
            teléfono cada línea de la frase lleva el interlineado mínimo de la fuente (si no,
            se cortan las tildes), y en cuatro líneas eso empuja unos 95 px. Las copas bajan 40. */}
        <View style={abs({ left: 90, right: 90, top: 270 })}>
          <T f={fuente.titular} s={84} lh={1.04} ls={-0.025}>
            {d.frase1} <Text style={{ color: TERRACOTA }}>Todavía.</Text>
          </T>
          <View style={{ gap: n(18), marginTop: n(70) }}>
            <T f={fuente.textoNegrita} s={26} lh={1} ls={0.18} c={SALVIA}>TENGO DRINKS</T>
            <T f={fuente.titular} s={120} lh={0.95} ls={-0.03} lineas={1}>{d.dia}</T>
            <T f={fuente.textoMedia} s={48} lh={1.2}>{`${d.hora} · ${d.zona}`}</T>
          </View>
        </View>
        {COPAS.map(([x, y, yo]) => (
          // El aro de la copa es un borde y no una sombra interior: así sale igual en la captura.
          <View
            key={`${x}-${y}`}
            style={[
              abs({ left: x, top: y + 40, width: 190, height: 190 }),
              { borderRadius: n(95), backgroundColor: yo ? TERRACOTA : '#1B5138', borderWidth: n(10), borderColor: yo ? CREMA : SALVIA, alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <T f={fuente.titular} s={yo ? 64 : 80} lh={1} c={yo ? VERDE : SALVIA}>{yo ? 'yo' : '?'}</T>
          </View>
        ))}
      </>
    )
  } else if (variante === 1) {
    cuerpo = (
      <>
        <View style={abs({ left: 90, right: 90, top: 270 })}>
          <T f={fuente.titular} s={84} lh={1.04} ls={-0.025}>
            {d.frase1} <Text style={{ color: OXIDO }}>Todavía.</Text>
          </T>
        </View>
        {/* El plato, el asa y la taza, en ese orden: la taza va encima del asa. */}
        <View style={[abs({ left: 150, top: 660, width: 740, height: 740 }), { borderRadius: n(370), backgroundColor: CREMA, boxShadow: `0px ${n(24)}px ${n(50)}px rgba(20,52,42,0.18)` }]} />
        <View style={[abs({ left: 740, top: 965, width: 140, height: 130 }), { borderRadius: n(65), backgroundColor: VERDE }]} />
        <View
          style={[
            abs({ left: 260, top: 770, width: 520, height: 520 }),
            { borderRadius: n(260), backgroundColor: VERDE, borderWidth: n(22), borderColor: OXIDO, alignItems: 'center', justifyContent: 'center', gap: n(14) },
          ]}
        >
          <T f={fuente.textoNegrita} s={24} lh={1} ls={0.18} c={TERRACOTA}>TENGO CAFÉ</T>
          <T f={fuente.titular} s={92} lh={0.95} ls={-0.03} c={CREMA} lineas={1}>{d.dia}</T>
          <T f={fuente.textoMedia} s={40} lh={1.2} c={CREMA} lineas={1}>{d.hora}</T>
          <T f={fuente.textoMedia} s={30} lh={1.2} c="#C5D8CA" lineas={1}>{d.zona}</T>
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
            <T f={fuente.textoNegrita} s={28} lh={1} ls={0.18} c={SALVIA}>{`ARO CLUB · ${d.plan.toUpperCase()}`}</T>
            <Svg width={n(84)} height={n(84)} viewBox="0 0 240 240">
              <Circle cx={120} cy={120} r={86} fill="none" stroke={CREMA} strokeWidth={20} />
              <Circle cx={206} cy={120} r={25} fill={TERRACOTA} />
              {[[163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]].map(([x, y]) => (
                <Circle key={`${x}-${y}`} cx={x} cy={y} r={25} fill={CREMA} />
              ))}
            </Svg>
          </View>
          <T f={fuente.titular} s={500} lh={0.78} ls={-0.05} c={TERRACOTA} lineas={1} arriba={56} style={{ marginLeft: n(-16) }}>
            {d.numero}
          </T>
          <T f={fuente.textoSemi} s={52} lh={1.1} c={CREMA} arriba={70}>{`${d.diaSemana} · ${d.hora}`}</T>
          <T f={fuente.textoMedia} s={38} lh={1.2} c={SALVIA} arriba={14}>{d.zona}</T>
        </View>
        <View style={{ marginTop: n(36), paddingTop: n(44), paddingBottom: n(52), paddingHorizontal: n(64), flexDirection: 'row', gap: n(30) }}>
          {/* La línea de corte, punteada: un borde punteado de un solo lado no lo pinta iOS. */}
          <Svg width={n(900)} height={n(5)} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Line x1={0} y1={n(2.5)} x2={n(900)} y2={n(2.5)} stroke="rgba(250,243,228,0.3)" strokeWidth={n(5)} strokeDasharray={[n(15), n(10)]} />
          </Svg>
          <View style={[abs({ left: -38, top: -40, width: 76, height: 76 }), { borderRadius: n(38), backgroundColor: bg }]} />
          <View style={[abs({ right: -38, top: -40, width: 76, height: 76 }), { borderRadius: n(38), backgroundColor: bg }]} />
          {titulo(d.sitioMayus)}
          {titulo('CON QUIÉN')}
        </View>
      </View>
    )
  } else if (variante === 3) {
    const datos = [
      { k: 'DÍA', v: `${d.dia} · ${d.hora}` },
      { k: 'ZONA', v: d.zona },
      { k: d.sitioMayus, w: [300, 220] },
      { k: 'CON QUIÉN', w: [180, 380] },
    ]
    cuerpo = (
      <View style={[abs({ left: 90, right: 90, top: 280 }), { gap: n(64) }]}>
        <T f={fuente.titular} s={118} lh={1} ls={-0.03}>{d.frase3}</T>
        <View>
          {datos.map((x) => (
            <View key={x.k} style={{ gap: n(14), paddingVertical: n(30), borderTopWidth: n(3), borderTopColor: 'rgba(20,52,42,0.25)' }}>
              <T f={fuente.textoNegrita} s={24} lh={1} ls={0.18}>{x.k}</T>
              {x.w ? (
                <View style={{ flexDirection: 'row', gap: n(18) }}>
                  {x.w.map((w) => (
                    <View key={w} style={{ height: n(62), width: n(w), borderRadius: n(10), backgroundColor: VERDE }} />
                  ))}
                </View>
              ) : (
                <T f={fuente.titular} s={60} lh={1.05}>{x.v}</T>
              )}
            </View>
          ))}
        </View>
        <T f={fuente.textoMedia} s={44} lh={1.25} arriba={-20}>{d.cierre3}</T>
      </View>
    )
  } else if (variante === 4) {
    cuerpo = (
      <>
        <View
          style={[
            abs({ left: 600, top: 60, width: 620, height: 620 }),
            { borderRadius: n(310), backgroundColor: CREMA, borderWidth: n(8), borderStyle: 'dashed', borderColor: VERDE, justifyContent: 'center', paddingLeft: n(170) },
          ]}
        >
          <T f={fuente.titular} s={110} lh={1} c={VERDE}>tú</T>
        </View>
        <View style={abs({ left: 90, top: 300, width: 420 })}>
          <T f={fuente.textoNegrita} s={26} lh={1.5} ls={0.18}>{d.sello}</T>
        </View>
        <View style={[abs({ left: 90, right: 90, top: 740 }), { gap: n(40) }]}>
          <T f={fuente.titular} s={140} lh={0.96} ls={-0.035}>{d.titulo4}</T>
          <T f={fuente.textoMedia} s={44} lh={1.28} style={{ maxWidth: n(860) }}>{d.cuerpo4}</T>
          <View style={{ alignSelf: 'flex-start', backgroundColor: CREMA, borderRadius: n(32), paddingVertical: n(30), paddingHorizontal: n(44), flexDirection: 'row', alignItems: 'center', gap: n(30), borderWidth: n(4), borderStyle: 'dashed', borderColor: VERDE }}>
            <T f={fuente.textoSemi} s={24} lh={1} ls={0.16} c={OXIDO}>CÓDIGO</T>
            <T f={fuente.textoNegrita} s={72} lh={1} ls={0.04} c={VERDE}>{d.codigo ?? ''}</T>
          </View>
        </View>
      </>
    )
  } else if (variante === 5) {
    cuerpo = (
      <>
        <View style={abs({ left: 160, top: 400 })}>
          <Svg width={n(760)} height={n(760)} viewBox="0 0 240 240">
            <Circle cx={120} cy={120} r={100} fill="none" stroke={ink} strokeWidth={1.6} strokeDasharray={[1.6, 13.1]} />
          </Svg>
        </View>
        <View style={abs({ left: 90, right: 90, top: 290 })}>
          <T f={fuente.textoNegrita} s={30} lh={1} ls={0.18}>{(d.revelaDia || d.dia).toUpperCase()}</T>
        </View>
        <View style={abs({ left: 0, right: 0, top: 620 })}>
          <T f={fuente.titular} s={330} lh={0.9} ls={-0.05} c={d.cafe ? VERDE : '#F6D9B4'} lineas={1} style={{ textAlign: 'center' }}>{d.revelaNum}</T>
        </View>
        <View style={abs({ left: 0, right: 0, top: 950 })}>
          <T f={fuente.textoNegrita} s={30} lh={1} ls={0.18} style={{ textAlign: 'center' }}>{d.revelaSufijo}</T>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1110 })}>
          <T f={fuente.titular} s={66} lh={1.08} ls={-0.02} style={{ textAlign: 'center' }}>{d.frase5}</T>
        </View>
        <View style={abs({ left: 90, right: 90, top: 1330 })}>
          <T f={fuente.textoMedia} s={32} lh={1.3} style={{ textAlign: 'center' }}>{`${d.plan} · ${d.dia} a las ${d.hora} · ${d.zona}`}</T>
        </View>
      </>
    )
  } else {
    const fs = d.cafe ? 236 : 212
    const [a, b, c] = d.cafe ? [VERDE, OXIDO, '#1B5138'] : [CREMA, TERRACOTA, SALVIA]
    cuerpo = (
      <>
        {/* «¿Qué bar?» se parte en dos en la maqueta («¿Qué / bar?»). Cada palabra va en su línea, como
            «¿Con / quién?»: así cada caja mide lo de la maqueta y el interlineado mínimo del teléfono
            no empuja «Ni idea» encima de la franja. «¿Dónde?» es una sola. */}
        <View style={abs({ left: 70, right: 40, top: 300 })}>
          {d.pregunta6.split(' ').map((w) => (
            <T key={w} f={fuente.titular} s={fs} lh={0.9} ls={-0.05} c={a} lineas={1}>{w}</T>
          ))}
          <T f={fuente.titular} s={fs} lh={0.9} ls={-0.05} c={b} arriba={10}>¿Con</T>
          <T f={fuente.titular} s={fs} lh={0.9} ls={-0.05} c={b}>quién?</T>
          <T f={fuente.titular} s={84} lh={1.05} ls={-0.02} c={c} arriba={56}>Ni idea. Y así me gusta.</T>
        </View>
        <View style={[abs({ left: 0, right: 0, top: 1290 }), { backgroundColor: ink, paddingVertical: n(28), paddingHorizontal: n(90), transform: [{ rotate: '-2deg' }] }]}>
          <T f={fuente.textoNegrita} s={24} lh={1.3} ls={0.12} c={bg} lineas={1}>{`${d.sello} · ${d.zona.toUpperCase()}`}</T>
        </View>
      </>
    )
  }

  // La 4 lleva el código en grande; las demás, abajo y solo si hay código.
  const codigoPie = variante !== 4 && d.codigo
  return (
    <View style={{ width: n(1080), height: n(1920), backgroundColor: bg, overflow: 'hidden' }} collapsable={false}>
      {cuerpo}
      <View style={[abs({ left: 90, right: 90, bottom: 390 }), { flexDirection: 'row', alignItems: 'flex-end', gap: n(40) }]}>
        {codigoPie ? (
          <View style={{ gap: n(12) }}>
            <T f={fuente.textoSemi} s={24} lh={1} ls={0.16}>MI CÓDIGO</T>
            <T f={fuente.textoNegrita} s={54} lh={1} ls={0.05}>{d.codigo}</T>
          </View>
        ) : null}
        <View style={{ marginLeft: 'auto', alignItems: 'flex-end', gap: n(12) }}>
          <T f={fuente.titular} s={50} lh={1}>aro.club</T>
          <T f={fuente.textoSemi} s={30} lh={1}>{reglas.REDES.arroba}</T>
        </View>
      </View>
    </View>
  )
}
