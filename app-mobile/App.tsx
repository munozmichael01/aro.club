import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'

import { Catalogo } from './src/Catalogo'
import { Velo } from './src/diseno'

/**
 * Las fuentes van EMBEBIDAS en la app al compilar (plugin `expo-font` en
 * `app.json`): no se cargan de la red ni al arrancar. En el navegador ese
 * plugin no existe, así que allí se cargan con `useFonts`, desde los mismos
 * ficheros.
 */
const FUENTES_WEB =
  Platform.OS === 'web'
    ? {
        'YoungSerif-Regular': require('./assets/fuentes/YoungSerif-Regular.ttf'),
        'InterTight-Regular': require('./assets/fuentes/InterTight-Regular.ttf'),
        'InterTight-Medium': require('./assets/fuentes/InterTight-Medium.ttf'),
        'InterTight-SemiBold': require('./assets/fuentes/InterTight-SemiBold.ttf'),
        'InterTight-Bold': require('./assets/fuentes/InterTight-Bold.ttf'),
      }
    : {}

/** Provisional: el catálogo del sistema. El recorrido llega encima. */
export default function App() {
  const [listas] = useFonts(FUENTES_WEB)
  if (!listas) return <Velo />
  return (
    <>
      <Catalogo />
      <StatusBar style="dark" />
    </>
  )
}
