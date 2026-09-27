import { router } from 'expo-router'
import { View } from 'react-native'

import { Boton, Texto, color } from './diseno'

/**
 * Andamio de desarrollo para las pantallas que aún no están. No es copy de
 * producto y no se publica: la app no sale a tienda con ninguna de estas.
 */
export function Pendiente({ ruta }: { ruta: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.crema, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Texto variante="etiqueta">{ruta}</Texto>
      <Texto variante="titulo">Esta pantalla todavía no está hecha.</Texto>
      <Boton tipo="secundario" texto="Volver" onPress={() => router.back()} />
    </View>
  )
}
