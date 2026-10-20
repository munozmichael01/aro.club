import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Texto, fuente } from '../diseno'
import { api } from '../sesion'
import * as T from '../texto/idioma'

/**
 * «¿Hablas inglés?», cuando el servidor dice `falta-idioma` (20-10). El sí
 * AÑADE el idioma a la respuesta del cuestionario (`POST /api/idioma`) y
 * reintenta lo que la persona estaba haciendo, sin que tenga que pulsar otra
 * vez. El no cierra.
 */
export function PreguntaIdioma(p: { idioma: string | null; alCerrar: () => void; alAnadir: () => void }) {
  const insets = useSafeAreaInsets()
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')

  const si = async () => {
    if (guardando || !p.idioma) return
    setGuardando(true)
    setFallo('')
    try {
      const r = await api.pedir('/idioma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idioma: p.idioma }) })
      if (!r.ok) throw new Error(String(r.status))
      p.alAnadir()
    } catch {
      setFallo(T.pregunta.noGuardado)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal visible={!!p.idioma} transparent animationType="fade" onRequestClose={p.alCerrar} statusBarTranslucent>
      <View style={e.velo}>
        <View style={[e.hoja, { paddingBottom: Math.max(24, insets.bottom) }]} accessibilityViewIsModal>
          <Texto accessibilityRole="header" style={serif(28, 1.1, -0.02)}>
            {T.pregunta.titulo}
          </Texto>
          <Texto style={[texto(16, 1.5), { color: C.cuerpoFuerte, marginTop: 12 }]}>{T.pregunta.cuerpo}</Texto>
          <View style={{ marginTop: 18, gap: 9 }}>
            <Pressable onPress={si} accessibilityRole="button" style={({ pressed }) => [e.boton, { backgroundColor: C.tinta }, pressed && { opacity: 0.88 }]}>
              <Texto style={[semi(16), { color: C.crema }]}>{guardando ? T.pregunta.guardando : T.pregunta.si}</Texto>
            </Pressable>
            <Pressable onPress={p.alCerrar} accessibilityRole="button" style={({ pressed }) => [e.boton, e.botonNo, pressed && { backgroundColor: 'rgba(20,52,42,.06)' }]}>
              <Texto style={[semi(16), { color: C.tinta }]}>{T.pregunta.no}</Texto>
            </Pressable>
          </View>
          {fallo ? <Texto style={[texto(13, 1.5), { color: C.terracota, marginTop: 12 }]}>{fallo}</Texto> : null}
        </View>
      </View>
    </Modal>
  )
}

const C = { tinta: '#14342A', crema: '#FAF3E4', hoja: '#FFFBF0', cuerpoFuerte: '#2C4A38', terracota: '#8F4515' }
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const serif = (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: C.tinta })
const texto = (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })
const semi = (tam: number): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })

const e = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(20,52,42,.72)', justifyContent: 'flex-end', alignItems: 'center', padding: 16 },
  hoja: { width: '100%', maxWidth: 430, backgroundColor: C.hoja, borderRadius: 28, paddingTop: 24, paddingHorizontal: 22 },
  boton: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  botonNo: { borderWidth: 1, borderColor: 'rgba(20,52,42,.25)' },
})
