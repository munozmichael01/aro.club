import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import * as C from '../cuestionario/maquina'
import { IconoCruz, Texto, fuente } from '../diseno'
import * as T from '../texto/cuenta'
import * as M from './maquina'

/**
 * Las preguntas nuevas, encima de Mi cuenta (18-10), calcadas de
 * `Mi cuenta.dc.html`. Salen a quien ya reservó y tiene preguntas del
 * catálogo sin contestar, y se contestan aquí mismo. Ninguna pregunta está
 * escrita aquí: la que se añada mañana aparece sola.
 *
 * Cerrar sin contestar es una respuesta válida, y no vuelve a salir por esta
 * reserva. Las respuestas se mandan UNA DETRÁS DE OTRA: cada una reconstruye
 * los rasgos enteros y, a la vez, la segunda pisa a la primera sin error.
 */
export function PreguntasNuevas(p: {
  preguntas: M.PreguntaNueva[]
  visible: boolean
  responder: (clave: string, valor: unknown) => Promise<unknown>
  vistas: () => Promise<unknown>
  alTerminar: () => void
}) {
  const insets = useSafeAreaInsets()
  const [elegidas, setElegidas] = useState<M.Elegidas>({})
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    p.vistas().catch(() => {})
    p.alTerminar()
  }

  const guardar = async () => {
    if (guardando) return
    const lista = M.paraMandar(elegidas)
    if (!lista.length) return cerrar()
    setGuardando(true)
    for (const [clave, valor] of lista) await p.responder(clave, valor).catch(() => {})
    await p.vistas().catch(() => {})
    setGuardando(false)
    setElegidas({})
    p.alTerminar()
  }

  return (
    <Modal visible={p.visible && p.preguntas.length > 0} transparent animationType="fade" onRequestClose={cerrar} statusBarTranslucent>
      {/* Contenida: con margen arriba y abajo (fuera de la barra de estado), cabecera y botones fijos, y el scroll solo en las preguntas. */}
      <View style={[e.velo, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <View style={e.hoja} accessibilityViewIsModal>
          <View style={e.cabeza}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texto style={[media(11), { letterSpacing: 1.76, color: K.terracota }]}>{T.preguntasNuevas.cinta}</Texto>
                <Texto accessibilityRole="header" style={[serif(27, 1.1, -0.02), { marginTop: 10 }]}>
                  {T.preguntasNuevas.titulo(p.preguntas.length)}
                </Texto>
              </View>
              <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel={T.preguntasNuevas.ahoraNo} hitSlop={4} style={e.cruz}>
                <IconoCruz tam={14} color={K.cuerpoFuerte} />
              </Pressable>
            </View>
            <Texto style={[texto(15, 1.5), { color: K.cuerpoFuerte, marginTop: 12 }]}>{T.preguntasNuevas.bajada}</Texto>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            {p.preguntas.map((q) => {
              const atada = q.clave === C.ATADURA.atada && C.atada(elegidas)
              const ayuda = atada ? T.preguntasNuevas.sinAlcohol : q.ayuda
              return (
                <View key={q.clave} style={e.pregunta}>
                  <Texto style={[semi(15, 1.35), { color: K.tinta }]}>{q.enunciado}</Texto>
                  {ayuda ? <Texto style={[texto(13, 1.5), { color: K.nota, marginTop: 6 }]}>{ayuda}</Texto> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {(q.opciones ?? []).map((o) => {
                      const bloqueada = atada && o.value !== C.ATADURA.sin
                      const on = M.marcadaNueva(elegidas, q.clave, o.value)
                      return (
                        <Pressable
                          key={o.value}
                          onPress={bloqueada ? undefined : () => setElegidas((x) => M.marcarNueva(x, q, o.value))}
                          accessibilityRole={q.tipo === 'multi' ? 'checkbox' : 'radio'}
                          aria-checked={on}
                          aria-disabled={bloqueada || undefined}
                          style={[e.ficha, { opacity: bloqueada ? 0.4 : 1 }, on ? e.fichaMarcada : null]}
                        >
                          <Texto style={[media(14), { color: K.tinta }]}>{o.label}</Texto>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </ScrollView>

          <View style={e.pie}>
            <Pressable onPress={guardar} accessibilityRole="button" style={({ pressed }) => [e.guardar, pressed && { opacity: 0.88 }]}>
              <Texto style={[semi(16), { color: K.crema }]}>{T.preguntasNuevas.guardar(guardando)}</Texto>
            </Pressable>
            <Pressable onPress={cerrar} accessibilityRole="button" style={e.ahoraNo}>
              <Texto style={[media(15), { color: K.nota }]}>{T.preguntasNuevas.ahoraNo}</Texto>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Estilos: los de la web, tal cual ---------------------------------------------

const K = { tinta: '#14342A', verde: '#1B5138', crema: '#FAF3E4', hoja: '#FFFBF0', cuerpoFuerte: '#2C4A38', nota: '#566A5D', terracota: '#8F4515' }

/** Interlineado con el suelo de cada fuente (Young Serif 1,42; Inter Tight 1,21), que recorta tildes por debajo. */
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const serif = (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: K.tinta })
const texto = (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })
const media = (tam: number): TextStyle => ({ fontFamily: fuente.textoMedia, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })
const semi = (tam: number, alto = 1): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })

const e = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(20,52,42,.72)', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16 },
  hoja: { width: '100%', maxWidth: 460, maxHeight: '100%', backgroundColor: K.hoja, borderRadius: 28, overflow: 'hidden' },
  cabeza: { paddingTop: 24, paddingHorizontal: 22, paddingBottom: 4 },
  pie: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 14, gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.1)' },
  cruz: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(20,52,42,.18)', alignItems: 'center', justifyContent: 'center' },
  pregunta: { marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.12)' },
  ficha: { minHeight: 44, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,52,42,.18)', justifyContent: 'center' },
  fichaMarcada: { backgroundColor: 'rgba(143,69,21,.1)', borderColor: K.terracota },
  guardar: { minHeight: 54, borderRadius: 999, backgroundColor: K.verde, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  ahoraNo: { minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
})
