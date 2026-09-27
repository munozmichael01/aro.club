import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { listo, supabase } from './src/sesion'

/**
 * Provisional: solo arranca la sesión y dice si hay alguien dentro. Las
 * pantallas del recorrido —y el sistema de diseño— llegan encima de esto.
 */
export default function App() {
  const [estado, setEstado] = useState('…')

  useEffect(() => {
    listo
      .then(() => supabase.auth.getSession())
      .then(({ data }) => setEstado(data.session ? 'con sesión' : 'sin sesión'))
  }, [])

  return (
    <View style={estilos.fondo}>
      <Text style={estilos.texto}>Aro Club · {estado}</Text>
      <StatusBar style="dark" />
    </View>
  )
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FAF3E4', alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#14342A' },
})
