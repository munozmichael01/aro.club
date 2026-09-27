import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Velo } from '../diseno'

/**
 * Las fuentes van EMBEBIDAS en la app al compilar (plugin `expo-font` en
 * `app.json`): en la versión de tienda no se cargan de la red ni al arrancar.
 *
 * Aun así se registran aquí también, desde los mismos ficheros del paquete,
 * porque hay dos sitios donde ese plugin no actúa: el navegador (el catálogo
 * de desarrollo) y Expo Go (la prueba en un teléfono sin compilar). En una
 * build con las fuentes embebidas esto no descarga nada: son ficheros de la
 * propia app.
 */
const FUENTES = {
  'YoungSerif-Regular': require('../../assets/fuentes/YoungSerif-Regular.ttf'),
  'InterTight-Regular': require('../../assets/fuentes/InterTight-Regular.ttf'),
  'InterTight-Medium': require('../../assets/fuentes/InterTight-Medium.ttf'),
  'InterTight-SemiBold': require('../../assets/fuentes/InterTight-SemiBold.ttf'),
  'InterTight-Bold': require('../../assets/fuentes/InterTight-Bold.ttf'),
}

export default function Raiz() {
  const [listas] = useFonts(FUENTES)
  return (
    <SafeAreaProvider>
      {listas ? <Stack screenOptions={{ headerShown: false }} /> : <Velo />}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}
