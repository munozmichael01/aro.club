import { type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { IconoCalendario, IconoCheck, IconoCompartir, IconoCruz, IconoReloj, Texto, color, cremaAlfa, fuente, medida, radio, tinta } from '../diseno'
import * as T from '../texto/dentro'
import type { vista } from './maquina'

type Vista = ReturnType<typeof vista>

/**
 * «Estás dentro» (entrega estas-dentro de Design, 29-10). A, en crema: el
 * puesto apartado y el pago en revisión, con calendario y sin compartir. B,
 * en verde profundo: «Estás dentro», compartir y calendario. El isotipo
 * cuenta la historia: en A tu punto va punteado; en B, lleno.
 */
export function EstasDentro(p: {
  v: Vista
  enCalendario: boolean
  alCalendario: () => void
  alCompartir: () => void
  ir: (d: string) => void
  /** Lo que va debajo (en Pago, el comprobante de siempre). */
  extra?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { v } = p
  const b = v.momento === 'B'
  const tinta1 = b ? color.crema : color.verdeProfundo
  const tinta2 = b ? color.cuerpoSobreVerde : color.cuerpo

  const calendario = p.enCalendario ? (
    <Pressable onPress={p.alCalendario} accessibilityRole="button" style={[e.boton, { borderWidth: 1.5, borderColor: b ? cremaAlfa(0.5) : color.verdeProfundo }]}>
      <IconoCheck tam={16} color={b ? color.sobreVerdeSecundario : color.verdeProfundo} />
      <Texto style={[e.textoBoton, { color: tinta1 }]}>{T.calendario.yaEsta}</Texto>
    </Pressable>
  ) : (
    <Pressable onPress={p.alCalendario} accessibilityRole="button" style={[e.boton, { backgroundColor: b ? color.crema : color.verdeProfundo }]}>
      <IconoCalendario color={b ? color.verdeProfundo : color.crema} />
      <Texto style={[e.textoBoton, { color: b ? color.verdeProfundo : color.crema }]}>{T.calendario.anadir}</Texto>
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: b ? color.verdeProfundo : color.crema }}>
      <ScrollView contentContainerStyle={[e.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={() => p.ir('/cuenta')} accessibilityRole="button" accessibilityLabel="Cerrar" style={[e.cerrar, { backgroundColor: b ? cremaAlfa(0.1) : tinta(0.07) }]}>
            <IconoCruz tam={16} color={tinta1} />
          </Pressable>
        </View>
        <View style={{ gap: 18 }}>
          <Isotipo lleno={b} />
          <View style={[e.sello, { backgroundColor: b ? color.terracotaSobreVerde : '#C5D8CA' }]}>
            <Texto style={e.textoSello}>{v.sello}</Texto>
          </View>
          <Texto style={[e.titular, { color: tinta1, fontSize: b ? 50 : 40, lineHeight: b ? 72 : 58 }]} accessibilityRole="header">
            {b ? T.B.titulo : T.A.titulo}
          </Texto>
          {b ? (
            <>
              <View style={{ gap: 6 }}>
                <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 19, lineHeight: 25, color: tinta1 }}>{[v.plan, v.dia, v.hora].filter(Boolean).join(' · ')}</Texto>
                {v.zona ? <Texto style={{ fontSize: 15, lineHeight: 20, color: color.sobreVerdeSecundario }}>{v.zona}</Texto> : null}
              </View>
              {v.bajada ? <Texto style={{ fontSize: 14, lineHeight: 20, color: tinta2 }}>{v.bajada}</Texto> : null}
              <View style={[e.caja, { backgroundColor: color.verde }]}>
                {v.seAbre ? <Texto style={[e.etiqueta, { color: color.terracotaSobreVerde }]}>{v.seAbre}</Texto> : null}
                <Texto style={{ fontSize: 15, lineHeight: 22, color: color.crema }}>{v.revela}</Texto>
              </View>
            </>
          ) : (
            <>
              <Texto style={{ fontSize: 16, lineHeight: 23, color: tinta2 }}>{v.bajada}</Texto>
              <View style={[e.caja, { backgroundColor: color.cremaElevada, borderWidth: 1, borderColor: tinta(0.12) }]}>
                <Texto style={[e.etiqueta, { color: color.terracota }]}>{v.PLAN}</Texto>
                <Texto variante="subtitulo" style={{ fontSize: 21 }}>
                  {[v.dia, v.hora].filter(Boolean).join(' · ')}
                </Texto>
                {v.zona ? <Texto style={{ fontSize: 14, lineHeight: 19, color: color.cuerpo }}>{v.zona}</Texto> : null}
              </View>
              <View>
                {T.A.pasos.map((x, i) => (
                  <View key={x.t} style={e.paso}>
                    <View style={[e.puntoPaso, i === 0 ? { backgroundColor: color.verdeProfundo } : i === 1 ? { backgroundColor: color.terracotaSobreVerde } : { borderWidth: 1.5, borderColor: tinta(0.35) }]}>
                      {i === 0 ? <IconoCheck tam={11} color={color.crema} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 20 }}>{x.t}</Texto>
                      <Texto style={{ fontSize: 13, lineHeight: 18, color: color.cuerpo }}>{x.d}</Texto>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ gap: 10, marginTop: 6 }}>
            {b ? (
              <Pressable onPress={p.alCompartir} accessibilityRole="button" style={[e.boton, { backgroundColor: color.terracotaSobreVerde }]}>
                <IconoCompartir color={color.verdeProfundo} />
                <Texto style={[e.textoBoton, { color: color.verdeProfundo }]}>{T.B.compartir}</Texto>
              </Pressable>
            ) : null}
            {calendario}
            <Pressable onPress={() => p.ir('/mesa')} accessibilityRole="link" style={[e.boton, { minHeight: 44 }]}>
              <Texto style={[e.textoBoton, { color: tinta1 }]}>{T.verMesa}</Texto>
            </Pressable>
            {b ? null : <Texto style={{ fontSize: 13, lineHeight: 19, color: color.cuerpo, textAlign: 'center' }}>{T.A.luego}</Texto>}
          </View>

          <View style={[e.nota, { borderTopColor: b ? cremaAlfa(0.15) : tinta(0.12) }]}>
            <View style={{ marginTop: 2 }}>
              <IconoReloj color={b ? color.sobreVerdeSecundario : color.cuerpo} />
            </View>
            <Texto style={{ flex: 1, fontSize: 13, lineHeight: 19, color: tinta2 }}>{v.cancela}</Texto>
          </View>
          {p.extra}
        </View>
      </ScrollView>
    </View>
  )
}

/** El aro con los seis: el tuyo en terracota, punteado mientras el pago se revisa. */
function Isotipo({ lleno }: { lleno: boolean }) {
  const t = lleno ? color.crema : color.verdeProfundo
  const otros: [number, number][] = [[163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]]
  return (
    <Svg width={64} height={64} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={86} fill="none" stroke={t} strokeWidth={20} />
      {lleno ? (
        <Circle cx={206} cy={120} r={25} fill={color.terracotaSobreVerde} />
      ) : (
        <Circle cx={206} cy={120} r={23} fill={color.crema} stroke={color.terracotaClara} strokeWidth={8} strokeDasharray="12 9" />
      )}
      {otros.map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={25} fill={t} />
      ))}
    </Svg>
  )
}

const e = StyleSheet.create({
  pagina: { paddingHorizontal: 22, maxWidth: 480, width: '100%', alignSelf: 'center' },
  cerrar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sello: { alignSelf: 'flex-start', minHeight: 26, justifyContent: 'center', paddingHorizontal: 11, borderRadius: radio.capsula },
  textoSello: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.5, color: color.verdeProfundo },
  titular: { fontFamily: fuente.titular, letterSpacing: -1 },
  caja: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, gap: 6 },
  etiqueta: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.5 },
  paso: { flexDirection: 'row', gap: 10, paddingVertical: 9 },
  puntoPaso: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: medida.toqueMinimo + 8, borderRadius: radio.capsula, paddingHorizontal: 20 },
  textoBoton: { fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 20 },
  nota: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 1, paddingTop: 14 },
})
