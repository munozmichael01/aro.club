import { router } from 'expo-router'
import { useMemo } from 'react'
import { Linking } from 'react-native'

import { salir } from '../../cuenta/salir'
import { MiMesa } from '../../mesa/MiMesa'
import { crearServicioMesa } from '../../mesa/servicio'
import { api } from '../../sesion'

/** /mesa: la mesa de la fecha que toca, en la fase que diga el servidor. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioMesa(api), [])
  return (
    <MiMesa
      servicio={servicio}
      ir={(destino) => {
        // El mapa abre la app de mapas del teléfono.
        if (destino.startsWith('externo:')) return void Linking.openURL(destino.slice(8))
        // «/cuenta#agenda»: el ancla no viaja entre pestañas; se va al Inicio.
        router.navigate(destino.split('#')[0] as never)
      }}
      alEntrar={() => router.replace('/entrar')}
      alSalir={salir}
    />
  )
}
