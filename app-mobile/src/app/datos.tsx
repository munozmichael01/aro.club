import { router } from 'expo-router'
import { useMemo } from 'react'

import { Datos } from '../datos/Datos'
import { crearServicioDatos } from '../datos/servicio'
import { api, supabase } from '../sesion'

/** /datos, como en la web: los cuatro datos, y la cuenta cuando el servidor lo permite. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioDatos(api), [])
  return (
    <Datos
      servicio={servicio}
      entrar={async (correo, clave) => !(await supabase.auth.signInWithPassword({ email: correo, password: clave })).error}
      alVolver={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      alCuestionario={() => router.push('/cuestionario')}
      alCuenta={() => router.replace('/cuenta')}
      alVerificar={() => router.replace('/verificacion')}
      alEntrar={() => router.push('/entrar')}
    />
  )
}
