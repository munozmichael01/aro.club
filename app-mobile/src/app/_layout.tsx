import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Velo } from '../diseno'

/**
 * Las fuentes van EMBEBIDAS en la app al compilar (plugin `expo-font` en
 * `app.json`): no se cargan de la red ni al arrancar. En el navegador ese
 * plugin no existe, así que allí —solo para el catálogo de desarrollo— se
 * cargan con `useFonts`, desde los mismos ficheros.
 */
const FUENTES_WEB =
  Platform.OS === 'web'
    ? {
        'YoungSerif-Regular': require('../../assets/fuentes/YoungSerif-Regular.ttf'),
        'InterTight-Regular': require('../../assets/fuentes/InterTight-Regular.ttf'),
        'InterTight-Medium': require('../../assets/fuentes/InterTight-Medium.ttf'),
        'InterTight-SemiBold': require('../../assets/fuentes/InterTight-SemiBold.ttf'),
        'InterTight-Bold': require('../../assets/fuentes/InterTight-Bold.ttf'),
      }
    : {}

export default function Raiz() {
  const [listas] = useFonts(FUENTES_WEB)
  return (
    <SafeAreaProvider>
      {listas ? <Stack screenOptions={{ headerShown: false }} /> : <Velo />}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}
