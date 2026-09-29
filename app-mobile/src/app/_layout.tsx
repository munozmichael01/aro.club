import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
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

/**
 * El splash (1a de «Bienvenida app»: el isologo y el nombre sobre verde
 * profundo) lo pinta el sistema desde `app.json`, y se queda hasta que están
 * las fuentes: menos de un segundo, porque van embebidas. Expo Go enseña el
 * icono en su lugar; el de verdad solo se ve en una build.
 */
SplashScreen.preventAutoHideAsync().catch(() => {})
SplashScreen.setOptions({ duration: 250, fade: true })

export default function Raiz() {
  const [listas] = useFonts(FUENTES)
  useEffect(() => {
    if (listas) SplashScreen.hideAsync().catch(() => {})
  }, [listas])
  return (
    <SafeAreaProvider>
      {listas ? <Stack screenOptions={{ headerShown: false }} /> : <Velo />}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}
