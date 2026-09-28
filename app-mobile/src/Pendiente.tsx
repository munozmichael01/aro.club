import { router } from 'expo-router'
import { View } from 'react-native'

import { Boton, Texto, color } from './diseno'

/**
 * Andamio de desarrollo para las pantallas que aún no están. No es copy de
 * producto y no se publica: la app no sale a tienda con ninguna de estas.
 *
 * `onSalir`: en /cuenta, para poder cerrar la sesión mientras Inicio no
 * existe —con sesión, la app va directa aquí y no había forma de volver a
 * probar la bienvenida y el alta—.
 */
export function Pendiente({ ruta, onSalir }: { ruta: string; onSalir?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.crema, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Texto variante="etiqueta">{ruta}</Texto>
      <Texto variante="titulo">Esta pantalla todavía no está hecha.</Texto>
      {onSalir ? (
        <Boton texto="Cerrar sesión (prueba)" onPress={onSalir} />
      ) : (
        <Boton tipo="secundario" texto="Volver" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      )}
    </View>
  )
}
