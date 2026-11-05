import { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, View } from 'react-native'

import { reglas } from '../reglas'
import { Boton } from './Boton'
import { IconoSinRed } from './Iconos'
import { Texto } from './Texto'
import { color, fuente, terracotaAlfa, tiempo, tinta } from './tokens'

/**
 * «No pudimos cargar» (entrega carga, 03-11): un solo estado, con dos caras,
 * que sustituye a cada Aviso + Reintentar que había.
 *
 * - **Sin nada guardado** (`SinRespuesta`): el esqueleto se cambia por un
 *   bloque en el mismo sitio. El título dice qué no llegó («tu mesa», «el
 *   pago», «tus cenas»); la segunda línea cambia si el fallo es nuestro.
 * - **Con lo último que viste** (`FranjaSinRed`): lo guardado se queda en
 *   pantalla y arriba sale una franja que dice de cuándo es. La hora es la
 *   de los últimos datos, no la de ahora.
 *
 * En los dos, «Reintentar», y se reintenta solo: al volver a la app y cada
 * 15 s mientras siga a la vista. Escuchar el regreso de la red pide un módulo
 * nativo (expo-network) y llegará con la próxima build; hasta entonces, esto
 * hace lo mismo sin que nadie tenga que tocar nada.
 */
const C = reglas.CARGA.texto
const CADA = 15000

function useReintentoSolo(alReintentar: () => void) {
  const f = useRef(alReintentar)
  f.current = alReintentar
  useEffect(() => {
    const t = setInterval(() => f.current(), CADA)
    const s = AppState.addEventListener('change', (e) => e === 'active' && f.current())
    return () => {
      clearInterval(t)
      s.remove()
    }
  }, [])
}

export function SinRespuesta({
  que,
  servidor,
  alReintentar,
  reintentando,
  boton = C.reintentar,
}: {
  /** Lo que no llegó, con su artículo: «tu mesa», «el pago», «tus cenas». */
  que: string
  /** El servidor contestó con error: «Es cosa nuestra, no tuya…». */
  servidor?: boolean
  alReintentar: () => void
  reintentando?: boolean
  /** Pasadas deja «Volver a intentar». */
  boton?: string
}) {
  useReintentoSolo(alReintentar)
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={estilos.bloque}>
      <View style={estilos.icono}>
        <IconoSinRed tam={22} color={color.terracota} />
      </View>
      <Texto variante="subtitulo" style={{ marginTop: 4 }}>
        {C.noPudimos(que)}
      </Texto>
      <Texto variante="cuerpo">{servidor ? C.esNuestro : C.sinRed}</Texto>
      <View style={{ marginTop: 6 }}>
        <Boton tipo="secundario" texto={boton} onPress={alReintentar} trabajando={reintentando} />
      </View>
    </View>
  )
}

/**
 * La franja de lo último que viste. `cuando` lo arma quien llama, en la zona
 * de la fecha: «las 3:40 p.m.» o, si es de otro día, «el lunes 2».
 */
export function FranjaSinRed({ cuando, alReintentar, reintentando }: { cuando: string; alReintentar: () => void; reintentando?: boolean }) {
  useReintentoSolo(alReintentar)
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={estilos.franja}>
      <IconoSinRed tam={18} color={color.terracota} grosor={2} />
      <Texto style={estilos.franjaTexto}>{C.franja(cuando)}</Texto>
      <Pressable onPress={alReintentar} disabled={reintentando} accessibilityRole="button" aria-busy={!!reintentando} hitSlop={6} style={estilos.franjaBoton}>
        <Texto style={[estilos.enlace, reintentando && { opacity: 0.5 }]}>{C.reintentar}</Texto>
      </Pressable>
    </View>
  )
}

/**
 * Pasados 8 s sin respuesta, se dice lo único que sabemos: «Está tardando más
 * de lo normal.», con «Reintentar». Va encima del esqueleto, que sigue ahí.
 */
export function useTarda(esperando: boolean) {
  const [tarda, setTarda] = useState(false)
  useEffect(() => {
    if (!esperando) {
      setTarda(false)
      return
    }
    const t = setTimeout(() => setTarda(true), tiempo.tarda)
    return () => clearTimeout(t)
  }, [esperando])
  return tarda
}

export function Tarda({ alReintentar, sobreVerde }: { alReintentar: () => void; sobreVerde?: boolean }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={estilos.tarda}>
      <Texto variante="cuerpoChico" tono={sobreVerde ? 'cuerpoSobreVerde' : 'cuerpo'} style={{ flex: 1 }}>
        {C.tarda}
      </Texto>
      <Pressable onPress={alReintentar} accessibilityRole="button" hitSlop={6} style={estilos.franjaBoton}>
        <Texto style={[estilos.enlace, sobreVerde && { color: color.crema }]}>{C.reintentar}</Texto>
      </Pressable>
    </View>
  )
}

const estilos = StyleSheet.create({
  bloque: { backgroundColor: color.cremaElevada, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 22, gap: 12 },
  icono: { width: 44, height: 44, borderRadius: 22, backgroundColor: terracotaAlfa(0.1), alignItems: 'center', justifyContent: 'center' },
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.cremaFria,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tinta(0.08),
  },
  franjaTexto: { flex: 1, fontFamily: fuente.textoMedia, fontSize: 13.5, lineHeight: 18, color: color.verdeProfundo },
  franjaBoton: { minHeight: 44, justifyContent: 'center' },
  enlace: { fontFamily: fuente.textoSemi, fontSize: 13.5, lineHeight: 18, color: color.verde, textDecorationLine: 'underline' },
  tarda: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
})
