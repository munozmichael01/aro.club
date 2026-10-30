import Constants from 'expo-constants'
import * as Sharing from 'expo-sharing'
import { useRef, useState } from 'react'
import { Modal, PixelRatio, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { captureRef } from 'react-native-view-shot'

import { IconoComparteCon, IconoCruz, Texto, color, fuente, tinta } from '../diseno'
import * as T from '../texto/dentro'
import { variantesDe, type Historia } from './maquina'
import { TarjetaHistoria } from './TarjetaHistoria'

const ANCHO = 200
const ALTO = 356
const PASO = ANCHO + 12

type Con = 'guardar' | 'historias' | 'tiktok' | 'whatsapp' | 'mas'
// Los cuatro de la maqueta y TikTok, que pidió Michael el 30-10.
const BOTONES: { con: Con; texto: string; fondo: string; tinta: string }[] = [
  { con: 'guardar', texto: T.compartir.guardar, fondo: color.verdeProfundo, tinta: color.crema },
  { con: 'historias', texto: T.compartir.historias, fondo: '#E39C63', tinta: color.verdeProfundo },
  { con: 'tiktok', texto: T.compartir.tiktok, fondo: '#F6D9B4', tinta: color.verdeProfundo },
  { con: 'whatsapp', texto: T.compartir.whatsapp, fondo: '#9CBBA6', tinta: color.verdeProfundo },
  { con: 'mas', texto: T.compartir.mas, fondo: tinta(0.08), tinta: color.verdeProfundo },
]

/** El identificador de la app de Meta: sin él, Instagram no acepta la historia ya puesta. */
const META_APP_ID = (Constants.expoConfig?.extra as { meta?: { appId?: string } } | undefined)?.meta?.appId

/** Cerrar la hoja de otra app sin compartir no es un fallo. */
const cancelado = (e: unknown) => /did not share|cancel/i.test(String((e as Error)?.message ?? e))

/**
 * «Comparte tu plan» (entrega estas-dentro, C1): la hoja con las tarjetas
 * para historias, que se deslizan de lado, y los cuatro botones.
 *
 * La imagen sale de la misma tarjeta pintada a 1080 × 1920 fuera de la
 * pantalla y capturada. Qué hace cada botón:
 * - Guardar imagen y TikTok: la hoja del sistema con la imagen sola; ahí
 *   están «Guardar imagen» y TikTok. Ir directo a TikTok pide su kit de
 *   desarrollador, con una app aprobada por ellos.
 * - Historias: Instagram abierto con la tarjeta ya puesta de fondo (con el
 *   App ID de Meta). Si no tiene Instagram, la hoja del sistema.
 * - WhatsApp: en Android, directo con imagen y mensaje. En iPhone, WhatsApp
 *   solo recibe imagen o texto por separado si se le abre directo, así que va
 *   por la hoja del sistema, que manda los dos.
 * - Más: la hoja del sistema con imagen y mensaje.
 */
export function HojaCompartir(p: { h: Historia; mensaje: string; alCerrar: () => void }) {
  const insets = useSafeAreaInsets()
  const variantes = variantesDe(p.h)
  const [i, setI] = useState(0)
  const [fallo, setFallo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const lienzo = useRef<View>(null)
  const carrusel = useRef<ScrollView>(null)

  const elegir = (k: number) => {
    setI(k)
    carrusel.current?.scrollTo({ x: k * PASO, animated: true })
  }

  async function mandar(con: Con) {
    if (ocupado) return
    setOcupado(true)
    setFallo('')
    try {
      const uri = await captureRef(lienzo, { format: 'png', quality: 1, result: 'tmpfile' })
      const imagen = () => Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' })
      // Se carga al tocar: en la web (el catálogo) el módulo nativo no existe y revienta al importarse.
      const { default: RNShare, Social } = await import('react-native-share')
      const conMensaje = () =>
        Platform.OS === 'ios' ? Share.share({ url: uri, message: p.mensaje }) : RNShare.open({ url: uri, type: 'image/png', message: p.mensaje, failOnCancel: false })
      if (con === 'historias') {
        try {
          if (!META_APP_ID) throw new Error('sin App ID')
          await RNShare.shareSingle({ social: Social.InstagramStories, appId: META_APP_ID, backgroundImage: uri, attributionURL: 'https://aro.club' })
        } catch (e) {
          if (!cancelado(e)) await imagen()
        }
      } else if (con === 'whatsapp' && Platform.OS === 'android') {
        try {
          await RNShare.shareSingle({ social: Social.Whatsapp, url: uri, type: 'image/png', message: p.mensaje })
        } catch (e) {
          if (!cancelado(e)) await conMensaje()
        }
      } else if (con === 'whatsapp' || con === 'mas') {
        await conMensaje()
      } else {
        await imagen()
      }
    } catch (e) {
      if (!cancelado(e)) setFallo(T.compartir.fallo)
    } finally {
      setOcupado(false)
    }
  }

  const real = 1080 / PixelRatio.get()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={p.alCerrar} statusBarTranslucent>
      <View style={e.fondo}>
        {/* La que se captura: la tarjeta elegida a 1080 px reales, fuera de la vista. */}
        <View style={{ position: 'absolute', left: -real - 100, top: 0 }} pointerEvents="none" collapsable={false}>
          <View ref={lienzo} collapsable={false}>
            <TarjetaHistoria variante={variantes[i]} h={p.h} ancho={real} />
          </View>
        </View>
        <Pressable style={StyleSheet.absoluteFill} onPress={p.alCerrar} accessibilityLabel="Cerrar" />
        <View style={[e.hoja, { paddingBottom: insets.bottom + 26 }]} accessibilityViewIsModal>
          <View style={e.asa} />
          <View style={e.cabecera}>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto style={{ fontFamily: fuente.titular, fontSize: 26, lineHeight: 37, letterSpacing: -0.5, color: color.verdeProfundo }} accessibilityRole="header">
                {T.compartir.titulo}
              </Texto>
              <Texto variante="cuerpoChico" tono="cuerpo">{T.compartir.bajada(!!p.h.codigo)}</Texto>
            </View>
            <Pressable onPress={p.alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={e.cerrar}>
              <IconoCruz tam={16} color={color.verdeProfundo} />
            </Pressable>
          </View>

          <ScrollView
            ref={carrusel}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PASO}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}
            onMomentumScrollEnd={(ev) => setI(Math.max(0, Math.min(variantes.length - 1, Math.round(ev.nativeEvent.contentOffset.x / PASO))))}
          >
            {variantes.map((v, k) => (
              <Pressable
                key={v}
                onPress={() => elegir(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: k === i }}
                accessibilityLabel={T.compartir.tarjeta(k + 1, variantes.length)}
                style={[e.miniatura, k === i && e.elegida]}
              >
                <View style={e.carta} pointerEvents="none">
                  <TarjetaHistoria variante={v} h={p.h} ancho={ANCHO} />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {variantes.map((v, k) => (
              <View key={v} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k === i ? color.verdeProfundo : tinta(0.22) }} />
            ))}
          </View>
          <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 14, lineHeight: 18, color: color.cuerpo, textAlign: 'center', marginTop: 14 }}>
            {T.compartir.etiqueta[0]}
            <Texto style={{ fontFamily: fuente.textoNegrita, color: color.verdeProfundo }}>{T.compartir.etiqueta[1]}</Texto>
            {T.compartir.etiqueta[2]}
          </Texto>

          {fallo ? (
            <Texto variante="cuerpoChico" tono="terracota" style={{ textAlign: 'center', marginTop: 10 }}>
              {fallo}
            </Texto>
          ) : null}

          <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 18, opacity: ocupado ? 0.5 : 1 }}>
            {BOTONES.map((b) => (
              <Pressable key={b.con} onPress={() => mandar(b.con)} disabled={ocupado} accessibilityRole="button" accessibilityLabel={b.texto} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                <View style={[e.redondo, { backgroundColor: b.fondo }]}>
                  <IconoComparteCon con={b.con} color={b.tinta} />
                </View>
                <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 12, lineHeight: 15, color: color.verdeProfundo, textAlign: 'center' }}>{b.texto}</Texto>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const e = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,52,42,0.6)' },
  hoja: { backgroundColor: color.crema, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10 },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: tinta(0.2), marginBottom: 14 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 6 },
  cerrar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tinta(0.07) },
  // El borde de la elegida va 3 px fuera de la tarjeta, como el `outline-offset` de la maqueta.
  miniatura: { width: PASO, padding: 3, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  carta: { width: ANCHO, height: ALTO, borderRadius: 16, overflow: 'hidden', boxShadow: '0px 8px 22px rgba(20,52,42,0.18), 0px 0px 0px 1px rgba(20,52,42,0.1)' },
  elegida: { borderColor: '#E39C63' },
  redondo: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
})
