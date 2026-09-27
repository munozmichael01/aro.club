import { StyleSheet, View } from 'react-native'

import { color, cremaAlfa } from './tokens'

/**
 * Los puntos de progreso del registro: el actual se alarga, los hechos y el
 * actual van en terracota sobre verde. Como la web.
 */
export function Puntos({ total, actual }: { total: number; actual: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: actual + 1 }}
      style={estilos.fila}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            estilos.punto,
            { width: i === actual ? 26 : 8, backgroundColor: i <= actual ? color.terracotaSobreVerde : cremaAlfa(0.24) },
          ]}
        />
      ))}
    </View>
  )
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 6 },
  punto: { height: 8, borderRadius: 4 },
})
