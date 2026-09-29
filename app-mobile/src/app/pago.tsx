import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Pago } from '../pago/Pago'
import { crearServicioPago } from '../pago/servicio'
import { api } from '../sesion'

/**
 * /pago?evento=<id>: pagar el puesto de una fecha. Fuera de las pestañas a
 * propósito, como en la web: es un flujo con principio y final, y una barra
 * invita a irse a mitad.
 */
export default function Pantalla() {
  const { evento } = useLocalSearchParams<{ evento?: string }>()
  const servicio = useMemo(() => crearServicioPago(api), [])
  return (
    <Pago
      evento={evento ?? null}
      servicio={servicio}
      ir={(destino) => (destino === '/cuenta' || destino === '/mesa' ? router.navigate(destino) : router.push(destino as never))}
      alEntrar={() => router.replace('/entrar')}
    />
  )
}
