import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { PantallaDentro } from '../dentro/Pantalla'
import { crearServicioDentro } from '../dentro/servicio'
import { api } from '../sesion'

/** /estas-dentro[?via=credito|confirmado]: después de reservar (entrega estas-dentro). */
export default function Pantalla() {
  const { via } = useLocalSearchParams<{ via?: string }>()
  const servicio = useMemo(() => crearServicioDentro(api), [])
  const v = via === 'credito' || via === 'confirmado' ? via : null
  return <PantallaDentro servicio={servicio} via={v} preguntarAvisos={v === 'credito'} ir={(d) => router.navigate(d as never)} alEntrar={() => router.replace('/entrar')} />
}
