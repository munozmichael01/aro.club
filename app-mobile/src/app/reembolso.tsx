import { router } from 'expo-router'
import { useMemo } from 'react'

import { Reembolso } from '../reembolso/Reembolso'
import { crearServicioReembolso } from '../reembolso/servicio'
import { api } from '../sesion'

/** /reembolso: pedir que te devuelvan el crédito por lista de espera (21-10). Fuera de las pestañas, como Pago. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioReembolso(api), [])
  return <Reembolso servicio={servicio} alVolver={() => (router.canGoBack() ? router.back() : router.replace('/cuenta'))} alEntrar={() => router.replace('/entrar')} />
}
