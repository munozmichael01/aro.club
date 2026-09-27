import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewProps } from 'react-native'

import { color, radio } from './tokens'

/**
 * Tarjeta sobre el fondo: crema elevada y **sin sombra** («Tarjetas y campos
 * sobre el fondo. Sin sombra», hoja del sistema). La separación es el tono,
 * no una sombra.
 */
export function Tarjeta({ style, children, ...resto }: ViewProps & { children: ReactNode }) {
  return (
    <View {...resto} style={[estilos.tarjeta, style]}>
      {children}
    </View>
  )
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: color.cremaElevada, borderRadius: radio.tarjeta, padding: 18 },
})
