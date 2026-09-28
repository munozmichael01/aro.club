import Constants from 'expo-constants'
import { router } from 'expo-router'
import { openBrowserAsync } from 'expo-web-browser'
import { useMemo } from 'react'

import { Inicio } from '../../cuenta/Inicio'
import { crearServicioCuenta } from '../../cuenta/servicio'
import { api, supabase } from '../../sesion'
import { borrarLead } from '../../sesion/lead'

const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

/** /cuenta: el Inicio de quien ya tiene cuenta. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioCuenta(api), [])
  return (
    <Inicio
      servicio={servicio}
      ir={(destino, params) => {
        // Las páginas de la web (términos, reglas, el panel) se abren en el navegador de la app.
        if (destino.startsWith('web:')) return void openBrowserAsync(SITIO + destino.slice(4))
        router.push({ pathname: destino as never, params })
      }}
      alEntrar={() => router.replace('/entrar')}
      alSalir={async () => {
        await supabase.auth.signOut()
        await borrarLead()
        router.replace('/')
      }}
    />
  )
}
