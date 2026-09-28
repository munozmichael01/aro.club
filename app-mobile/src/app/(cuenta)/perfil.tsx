import Constants from 'expo-constants'
import { router } from 'expo-router'
import { openBrowserAsync } from 'expo-web-browser'
import { useMemo } from 'react'

import { salir } from '../../cuenta/salir'
import { Perfil } from '../../perfil/Perfil'
import { crearServicioPerfil } from '../../perfil/servicio'
import { api } from '../../sesion'

const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

/** /perfil: los datos, las respuestas, las exclusiones, las cenas, los avisos y la baja. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioPerfil(api), [])
  return (
    <Perfil
      servicio={servicio}
      ir={(destino) => {
        if (destino.startsWith('web:')) return void openBrowserAsync(SITIO + destino.slice(4))
        router.push(destino as never)
      }}
      alEntrar={() => router.replace('/entrar')}
      alSalir={salir}
      // La cuenta ya no existe en el servidor: se cierra la sesión del celular.
      alBaja={salir}
    />
  )
}
