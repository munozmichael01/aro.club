import { router } from 'expo-router'

import { olvidarAvisos } from '../avisos/push'
import { supabase } from '../sesion'
import { borrarLead } from '../sesion/lead'

/** Cerrar sesión, igual desde las tres pestañas: la sesión, el lead guardado, y a la bienvenida. */
export async function salir() {
  // Antes de cerrar: el servidor necesita la sesión para saber de quién era el token.
  await olvidarAvisos()
  await supabase.auth.signOut()
  await borrarLead()
  router.replace('/')
}
