import { useCallback, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Boton, IconoCampana, Texto, color, medida, radio, verdeAlfa } from '../diseno'
import * as T from '../texto/avisos'
import type { Momento } from './maquina'
import { pedirAvisos, tocaPreguntar } from './push'

/**
 * La pregunta previa al permiso del sistema: una hoja desde abajo, con lo
 * que se avisa y dos botones. Solo «Sí, avísame» abre la del sistema.
 *
 * Se usa con `usePreguntaAvisos()`: `preguntar(momento)` resuelve cuando la
 * hoja se cierra (o al momento, si no toca preguntar), para que la pantalla
 * siga después —el alta navega cuando se ha contestado, no por debajo—.
 */
export function PreguntaAvisos(p: { momento: Momento | null; zona?: string | null; alCerrar: () => void }) {
  const insets = useSafeAreaInsets()
  const [pidiendo, setPidiendo] = useState(false)
  const m = p.momento
  if (!m) return null
  const titulo = m === 'alta' ? T.pregunta.alta.titulo(p.zona ?? null) : T.pregunta[m].titulo
  const si = async () => {
    setPidiendo(true)
    await pedirAvisos()
    setPidiendo(false)
    p.alCerrar()
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={p.alCerrar} statusBarTranslucent>
      <View style={estilos.fondo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={p.alCerrar} accessibilityLabel={T.pregunta.no} />
        <View style={[estilos.hoja, { paddingBottom: insets.bottom + 22 }]} accessibilityViewIsModal>
          <View style={estilos.campana}>
            <IconoCampana color={color.verde} />
          </View>
          <Texto variante="titulo" style={{ marginTop: 16 }}>
            {titulo}
          </Texto>
          <Texto variante="cuerpo" style={{ marginTop: 10 }}>
            {T.pregunta[m].cuerpo}
          </Texto>
          <View style={estilos.botones}>
            <Boton ancho texto={T.pregunta.si} onPress={si} disabled={pidiendo} />
            <Boton ancho tipo="fantasma" texto={T.pregunta.no} onPress={p.alCerrar} disabled={pidiendo} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

/** La hoja y la función que la abre en un momento. */
export function usePreguntaAvisos(zona?: string | null) {
  const [momento, setMomento] = useState<Momento | null>(null)
  const cerrar = useRef<(() => void) | null>(null)
  const preguntar = useCallback(async (m: Momento) => {
    if (!(await tocaPreguntar(m))) return
    await new Promise<void>((listo) => {
      cerrar.current = listo
      setMomento(m)
    })
  }, [])
  const alCerrar = useCallback(() => {
    setMomento(null)
    cerrar.current?.()
    cerrar.current = null
  }, [])
  return { preguntar, hoja: <PreguntaAvisos momento={momento} zona={zona} alCerrar={alCerrar} /> }
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,52,42,0.45)' },
  hoja: {
    backgroundColor: color.crema,
    borderTopLeftRadius: radio.tarjeta,
    borderTopRightRadius: radio.tarjeta,
    paddingHorizontal: medida.margenLateral,
    paddingTop: 26,
  },
  campana: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: verdeAlfa(0.1) },
  botones: { gap: 10, marginTop: 24 },
})
