import { router } from 'expo-router'
import { useMemo } from 'react'

import { CambiarFecha } from '../cambiar/CambiarFecha'
import { crearServicioCambiar } from '../cambiar/servicio'
import { api } from '../sesion'

/** /cambiar-fecha: mover la reserva viva a otra fecha abierta, con lo pagado dentro. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioCambiar(api), [])
  return <CambiarFecha servicio={servicio} ir={(d) => router.navigate(d as never)} alEntrar={() => router.replace('/entrar')} />
}
