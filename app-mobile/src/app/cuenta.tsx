import { router } from 'expo-router'

import { Pendiente } from '../Pendiente'
import { supabase } from '../sesion'
import { borrarLead } from '../sesion/lead'

export default function Pantalla() {
  return (
    <Pendiente
      ruta="/cuenta"
      enlaces={[{ texto: 'Ir a la verificación (prueba)', ruta: '/verificacion' }]}
      onSalir={async () => {
        await supabase.auth.signOut()
        await borrarLead()
        router.replace('/')
      }}
    />
  )
}
