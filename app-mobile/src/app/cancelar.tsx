import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Cancelar } from '../cancelar/Cancelar'
import { crearServicioCancelar } from '../cancelar/servicio'
import { api } from '../sesion'

/** /cancelar[?reserva=<id>]: soltar el puesto. Sin id, la próxima reserva viva, como la web. */
export default function Pantalla() {
  const { reserva } = useLocalSearchParams<{ reserva?: string }>()
  const servicio = useMemo(() => crearServicioCancelar(api), [])
  return <Cancelar reserva={reserva ?? null} servicio={servicio} ir={(d) => router.navigate(d as never)} alEntrar={() => router.replace('/entrar')} />
}
