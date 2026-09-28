import { Tabs } from 'expo-router/js-tabs'

import { Pestanas } from '../../cuenta/Pestanas'

/** La cuenta: tres pestañas abajo, las mismas siempre. Las rutas no cambian: /cuenta, /mesa, /perfil. */
export default function Cuenta() {
  return (
    <Tabs tabBar={(p) => <Pestanas {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="cuenta" />
      <Tabs.Screen name="mesa" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  )
}
