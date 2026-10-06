import { Pressable, StyleSheet, View } from 'react-native'

import { IconoCandado, Texto, color, fuente } from '../diseno'
import * as T from '../texto/juego'
import type { Ventana } from './maquina'

/**
 * La entrada al juego en Mi mesa (entrega 18, 1b y 1c): al final, debajo de
 * «Con quién cenas». Tarjeta secundaria (#F2E9D5) y botón con borde, nunca
 * verde oscuro: la tarjeta de la mesa sigue siendo lo principal. Cerrada,
 * con candado y sin botón. Pasada su ventana, no se pinta.
 */
export function TarjetaJuego(p: { ventana: Ventana; horaAbre: string; alAbrir: () => void }) {
  if (p.ventana === 'cerrado') return null
  if (p.ventana === 'antes')
    return (
      <View style={[estilos.tarjeta, { flexDirection: 'row', gap: 14, alignItems: 'flex-start' }]}>
        <View style={{ marginTop: 3 }}>
          <IconoCandado color={GRIS} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Texto style={estilos.titulo}>{T.tarjeta.titulo}</Texto>
          <Texto style={[estilos.cuerpo, { color: GRIS }]}>{T.tarjeta.cerrado(p.horaAbre)}</Texto>
        </View>
      </View>
    )
  return (
    <View style={[estilos.tarjeta, { gap: 14 }]}>
      <View style={{ gap: 6 }}>
        <Texto style={estilos.titulo}>{T.tarjeta.titulo}</Texto>
        <Texto style={estilos.cuerpo}>{T.tarjeta.abierto}</Texto>
      </View>
      <Pressable onPress={p.alAbrir} accessibilityRole="button" style={({ pressed }) => [estilos.boton, pressed && { backgroundColor: color.verde }]}>
        {({ pressed }) => <Texto style={[estilos.botonTexto, pressed && { color: color.crema }]}>{T.tarjeta.abrir}</Texto>}
      </Pressable>
    </View>
  )
}

/** Los dos tonos propios de la tarjeta en la maqueta. */
const FONDO = '#F2E9D5'
const GRIS = '#456352'

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: FONDO, borderRadius: 20, padding: 20, marginTop: 28 },
  titulo: { fontFamily: fuente.titular, fontSize: 22, lineHeight: 32, color: color.verdeProfundo },
  cuerpo: { fontFamily: fuente.texto, fontSize: 15, lineHeight: 22, color: color.cuerpo },
  boton: { minHeight: 48, borderWidth: 1.5, borderColor: color.verde, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontFamily: fuente.textoSemi, fontSize: 16, lineHeight: 20, color: color.verde },
})
