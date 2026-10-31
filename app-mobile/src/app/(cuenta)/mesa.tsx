import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Linking } from 'react-native'

import { salir } from '../../cuenta/salir'
import { MiMesa } from '../../mesa/MiMesa'
import { crearServicioMesa } from '../../mesa/servicio'
import { crearServicioPasadas } from '../../pasadas/servicio'
import { api } from '../../sesion'

/** /mesa[?cena=<mesaId>|?pestana=pasadas]: la mesa de la fecha que toca, y las pasadas (31-10). */
export default function Pantalla() {
  const { cena, pestana } = useLocalSearchParams<{ cena?: string; pestana?: string }>()
  const servicio = useMemo(() => crearServicioMesa(api), [])
  const pasadas = useMemo(() => crearServicioPasadas(api), [])
  return (
    <MiMesa
      servicio={servicio}
      pasadas={pasadas}
      cena={cena ?? null}
      pestana={pestana ?? null}
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
