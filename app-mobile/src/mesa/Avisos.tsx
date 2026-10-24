import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconoCruz, Texto, fuente } from '../diseno'
import * as T from '../texto/mesa'
import * as M from './maquina'

/**
 * Lo que Mi mesa avisa encima de la mesa (16-10), calcado de `Mi mesa.dc.html`:
 * los ajustes de última hora, la pregunta de la grabación y la línea para
 * cambiar lo que contestó.
 */

// --- Hubo ajustes de última hora -------------------------------------------------

const CLAVE_AJUSTES = 'aro-ajustes-vistos'

/**
 * Se cierra con «Entendido» y se recuerda en este teléfono por mesa Y por lo
 * que decía: si después cambia algo, vuelve a salir. Un fallo del
 * almacenamiento no rompe nada: el aviso sale otra vez, y ya.
 */
export function AvisoAjustes({ d }: { d: M.DeServidor }) {
  const clave = M.claveAjustes(d)
  const [visto, setVisto] = useState<string | null>(null)
  const [leido, setLeido] = useState(false)
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_AJUSTES)
      .catch(() => null)
      .then((v) => {
        setVisto(v)
        setLeido(true)
      })
  }, [])
  if (!M.hayAjustes(d) || !leido || visto === clave) return null
  return (
    <View style={e.ajustes} accessibilityLiveRegion="polite">
      <Texto style={[semi(14, 1.35), { color: C.tinta }]}>{T.ajustes.titulo}</Texto>
      <Texto style={[texto(14, 1.5), { color: C.cuerpoFuerte, marginTop: 3 }]}>{M.textoAjustes(d)}</Texto>
      <Pressable
        onPress={() => {
          setVisto(clave)
          AsyncStorage.setItem(CLAVE_AJUSTES, clave).catch(() => {})
        }}
        accessibilityRole="button"
        style={({ pressed }) => [e.entendido, pressed && { backgroundColor: 'rgba(20,52,42,.06)' }]}
      >
        <Texto style={[media(13), { color: C.tinta }]}>{T.ajustes.entendido}</Texto>
      </Pressable>
    </View>
  )
}

// --- La grabación ----------------------------------------------------------------

/** «Dijiste que…» y «Cambiarlo». En la cena, tarjeta propia; en lo demás, una fila con raya encima. */
export function LineaGrabacion({ permiso, alCambiar, suelta }: { permiso: boolean | null; alCambiar: () => void; suelta?: boolean }) {
  return (
    <View style={suelta ? e.lineaTarjeta : e.lineaFila}>
      <Texto style={[texto(14, 1.5), { color: C.cuerpo, flexGrow: 1, flexShrink: 1, flexBasis: 220 }]}>
        {permiso ? T.grabacion.dijisteSi : T.grabacion.dijisteNo}
      </Texto>
      <Pressable onPress={alCambiar} accessibilityRole="button" style={({ pressed }) => [e.cambiarlo, pressed && { backgroundColor: 'rgba(20,52,42,.06)' }]}>
        <Texto style={[media(13), { color: C.tinta }]}>{T.grabacion.cambiarlo}</Texto>
      </Pressable>
    </View>
  )
}

/**
 * «¿Te podemos grabar?», desde abajo. Cerrar con la X no guarda nada: se
 * queda sin contestar, que no es ni un sí ni un no, y se vuelve a preguntar.
 */
export function PreguntaGrabacion(p: {
  visible: boolean
  guardando: boolean
  fallo: string
  alResponder: (permite: boolean) => void
  alCerrar: () => void
  /** La voz del formato: «Esta noche…» en la cena, «Hoy…» en el brunch. */
  voz: Record<string, string>
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.alCerrar} statusBarTranslucent>
      <View style={e.velo}>
        <View style={[e.hoja, { paddingBottom: Math.max(24, insets.bottom) }]} accessibilityViewIsModal>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texto style={[media(11), { letterSpacing: 1.76, color: C.terracota }]}>{T.grabacion.cinta}</Texto>
              <Texto accessibilityRole="header" style={[serif(28, 1.1, -0.02), { marginTop: 10 }]}>
                {T.grabacion.titulo}
              </Texto>
            </View>
            <Pressable onPress={p.alCerrar} accessibilityRole="button" accessibilityLabel={T.grabacion.cerrar} hitSlop={4} style={e.cruz}>
              <IconoCruz tam={14} color={C.cuerpoFuerte} />
            </Pressable>
          </View>
          <Texto style={[texto(16, 1.5), { color: C.cuerpoFuerte, marginTop: 12 }]}>{T.grabacion.cuerpo(p.voz)}</Texto>
          <View style={{ marginTop: 18, gap: 9 }}>
            <Pressable
              onPress={() => !p.guardando && p.alResponder(true)}
              accessibilityRole="button"
              aria-disabled={p.guardando || undefined}
              style={({ pressed }) => [e.boton, { backgroundColor: C.tinta }, pressed && { opacity: 0.88 }]}
            >
              <Texto style={[semi(16, 1), { color: C.crema }]}>{p.guardando ? T.grabacion.guardando : T.grabacion.si}</Texto>
            </Pressable>
            <Pressable
              onPress={() => !p.guardando && p.alResponder(false)}
              accessibilityRole="button"
              aria-disabled={p.guardando || undefined}
              style={({ pressed }) => [e.boton, e.botonNo, pressed && { backgroundColor: 'rgba(20,52,42,.06)' }]}
            >
              <Texto style={[semi(16, 1), { color: C.tinta }]}>{p.guardando ? T.grabacion.guardando : T.grabacion.no}</Texto>
            </Pressable>
          </View>
          {p.fallo ? <Texto style={[texto(13, 1.5), { color: C.terracota, marginTop: 12 }]}>{p.fallo}</Texto> : null}
          <Texto style={[texto(13, 1.5), { color: C.nota, marginTop: 12 }]}>{T.grabacion.pie(p.voz)}</Texto>
        </View>
      </View>
    </Modal>
  )
}

/**
 * El estado de la grabación para una mesa abierta: la pregunta sale sola a
 * los 6 s de llegar los datos (encima de la revelación tapa lo que la persona
 * vino a ver) y cada vez que vuelven a llegar sin contestar.
 */
export function useGrabacion(d: M.DeServidor, guardar: (eventoId: string, permite: boolean) => Promise<{ ok: boolean; error?: string }>) {
  const [permiso, setPermiso] = useState<boolean | null>(d.permisoGrabacion ?? null)
  const [abierta, setAbierta] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')
  // Mi mesa sigue montada debajo del juego: la pregunta no sale encima de otra pantalla.
  const [enfocada, setEnfocada] = useState(true)
  useFocusEffect(
    useCallback(() => {
      setEnfocada(true)
      return () => setEnfocada(false)
    }, []),
  )

  useEffect(() => {
    const p = d.permisoGrabacion ?? null
    setPermiso(p)
    if (!M.preguntarGrabacion(d, p)) return
    const t = setTimeout(() => setAbierta(true), M.ESPERA_GRABACION)
    return () => clearTimeout(t)
  }, [d])

  const responder = async (permite: boolean) => {
    if (guardando || !d.eventoId) return
    setGuardando(true)
    setFallo('')
    const r = await guardar(d.eventoId, permite)
    setGuardando(false)
    if (!r.ok) return setFallo(r.error || T.grabacion.noGuardado)
    setPermiso(permite)
    setAbierta(false)
  }

  return {
    permiso,
    linea: M.lineaGrabacion(d, permiso),
    pregunta: {
      visible: abierta && enfocada,
      guardando,
      fallo,
      alResponder: responder,
      alCerrar: () => (setAbierta(false), setFallo('')),
      voz: M.voz(d),
    },
    cambiar: () => (setFallo(''), setAbierta(true)),
  }
}

// --- Estilos: los de la web, tal cual ---------------------------------------------

const C = {
  tinta: '#14342A',
  crema: '#FAF3E4',
  hoja: '#FFFBF0',
  papel: '#FFF8EA',
  cuerpo: '#33513F',
  cuerpoFuerte: '#2C4A38',
  nota: '#566A5D',
  terracota: '#8F4515',
}

/** Interlineado con el suelo de cada fuente (Young Serif 1,42; Inter Tight 1,21), que recorta tildes por debajo. */
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const serif = (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: C.tinta })
const texto = (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })
const media = (tam: number): TextStyle => ({ fontFamily: fuente.textoMedia, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })
const semi = (tam: number, alto = 1): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })

const e = StyleSheet.create({
  ajustes: { borderRadius: 20, backgroundColor: '#FFF1E4', borderWidth: 1, borderColor: '#E7C9AC', paddingVertical: 14, paddingHorizontal: 16 },
  entendido: { alignSelf: 'flex-start', marginTop: 10, minHeight: 38, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,52,42,.22)', justifyContent: 'center' },
  lineaTarjeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 12,
    borderRadius: 22,
    backgroundColor: C.papel,
    borderWidth: 1,
    borderColor: 'rgba(20,52,42,.12)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  lineaFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8, columnGap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.12)' },
  cambiarlo: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,52,42,.22)', justifyContent: 'center' },
  velo: { flex: 1, backgroundColor: 'rgba(20,52,42,.72)', justifyContent: 'flex-end', alignItems: 'center', padding: 16 },
  hoja: { width: '100%', maxWidth: 430, backgroundColor: C.hoja, borderRadius: 28, paddingTop: 24, paddingHorizontal: 22 },
  cruz: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(20,52,42,.18)', alignItems: 'center', justifyContent: 'center' },
  boton: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  botonNo: { borderWidth: 1, borderColor: 'rgba(20,52,42,.25)' },
})
