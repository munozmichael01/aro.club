import { router } from 'expo-router'

import { supabase } from '../sesion'
import { borrarLead } from '../sesion/lead'

/** Cerrar sesión, igual desde las tres pestañas: la sesión, el lead guardado, y a la bienvenida. */
export async function salir() {
  await supabase.auth.signOut()
  await borrarLead()
  router.replace('/')
}
