import { Tabs } from 'expo-router/js-tabs'
import { useEffect } from 'react'

import { refrescarAvisos } from '../../avisos/push'
import { Pestanas } from '../../cuenta/Pestanas'

/** La cuenta: tres pestañas abajo, las mismas siempre. Las rutas no cambian: /cuenta, /mesa, /perfil. */
export default function Cuenta() {
  // Al entrar a la cuenta, el teléfono se registra para ESTA cuenta. Antes solo
  // se hacía al arrancar la app: quien cerraba sesión y entraba con otra cuenta
  // sin cerrar la app se quedaba sin push hasta el siguiente arranque (09-10,
  // el día de la primera cena: «sin_token» en la cuenta de la mesa).
  useEffect(() => {
    refrescarAvisos()
  }, [])
  return (
    <Tabs tabBar={(p) => <Pestanas {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="cuenta" />
      <Tabs.Screen name="mesa" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  )
}
