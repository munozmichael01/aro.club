import { type ReactNode } from 'react'
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconoCruz } from './Iconos'
import { color, tinta } from './tokens'

/**
 * Una hoja que sube desde abajo (la de reservar, «Cómo funciona»).
 *
 * En iPhone es la hoja NATIVA del sistema (`presentationStyle="pageSheet"`),
 * la de Mapas o Mensajes: se cierra deslizando hacia abajo desde cualquier
 * parte, la pantalla de atrás se encoge y el gesto lo lleva iOS. La que
 * armamos a mano solo respondía desde la franja de arriba y se sentía torpe,
 * y antes de eso el velo subía con la hoja como un bloque verde (Michael,
 * 03-11). En Android se abre a pantalla completa y se cierra con la X o con
 * atrás: el gesto de arrastrar llegará con una librería nativa, en una build.
 *
 * La X va en las dos, arriba a la derecha: siempre hay una forma clara de
 * cerrar. `cabecera` queda fija arriba, `children` se desplaza y `pie` queda
 * fijo abajo. Cada una puede ser una función que recibe `cerrar`.
 */
type Pieza = ReactNode | ((cerrar: () => void) => ReactNode)

export function HojaAbajo(p: { alCerrar: () => void; cabecera?: Pieza; children: Pieza; pie?: Pieza; etiquetaCerrar?: string }) {
  const insets = useSafeAreaInsets()
  const ios = Platform.OS === 'ios'
  const cerrar = () => p.alCerrar()
  const pintar = (x: Pieza | undefined) => (typeof x === 'function' ? x(cerrar) : x)

  return (
    <Modal visible animationType="slide" presentationStyle={ios ? 'pageSheet' : 'fullScreen'} onRequestClose={cerrar} statusBarTranslucent={!ios}>
      <View style={[e.hoja, { paddingTop: ios ? 8 : insets.top + 8, paddingBottom: insets.bottom + 14 }]}>
        {/* El asa: en iPhone dice que se puede bajar; en Android no hay gesto, así que no se pinta. */}
        {ios ? <View style={e.asa} /> : null}
        {/* La cabecera deja sitio a la X en su primera fila (`marginRight: 52`), no en todas. */}
        {pintar(p.cabecera)}
        <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel={p.etiquetaCerrar ?? 'Cerrar'} hitSlop={8} style={[e.cerrar, { top: ios ? 22 : insets.top + 20 }]}>
          <IconoCruz tam={16} color={color.verdeProfundo} />
        </Pressable>
        <View style={{ flex: 1 }}>{pintar(p.children)}</View>
        {pintar(p.pie)}
      </View>
    </Modal>
  )
}

const e = StyleSheet.create({
  hoja: { flex: 1, backgroundColor: color.crema },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: tinta(0.2), marginTop: 4 },
  cerrar: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tinta(0.07) },
})
