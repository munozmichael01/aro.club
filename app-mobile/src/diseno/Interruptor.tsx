import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet } from 'react-native'

import { color, tinta } from './tokens'

/**
 * El interruptor de la hoja (Perfil, «Cómo te escribimos»): 52 × 31, verde
 * encendido, bolita crema. Propio y no el `Switch` del sistema, que en cada
 * plataforma pinta su color. `fijo`: se ve y no se mueve (los dos avisos que
 * no se pueden apagar).
 */
export function Interruptor({ encendido, fijo, onCambio, etiqueta }: { encendido: boolean; fijo?: boolean; onCambio: () => void; etiqueta: string }) {
  const x = useRef(new Animated.Value(encendido ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(x, { toValue: encendido ? 1 : 0, duration: 200, useNativeDriver: false }).start()
  }, [encendido, x])
  return (
    <Pressable
      onPress={fijo ? undefined : onCambio}
      accessibilityRole="switch"
      aria-checked={encendido}
      aria-disabled={fijo || undefined}
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={[estilos.pista, { backgroundColor: encendido ? color.verde : tinta(0.22), opacity: fijo ? 0.45 : 1 }]}
    >
      <Animated.View style={[estilos.bolita, { left: x.interpolate({ inputRange: [0, 1], outputRange: [3, 24] }) }]} />
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  pista: { width: 52, height: 31, borderRadius: 16, marginTop: 2 },
  bolita: { position: 'absolute', top: 3, width: 25, height: 25, borderRadius: 13, backgroundColor: color.cremaElevada },
})
