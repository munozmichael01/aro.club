import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Invitacion, crearServicioInvitacion } from '../masuno/Invitacion'
import { api } from '../sesion'

/** /acompanante?t=<token>: la invitación de un +1 (entrega mas-uno, 5A–5C). Llega desde aro.club/m/<token>. */
export default function Pantalla() {
  const { t } = useLocalSearchParams<{ t?: string }>()
  const servicio = useMemo(() => crearServicioInvitacion(api), [])
  if (!t) return null
  return <Invitacion token={t} servicio={servicio} ir={(d) => router.replace(d as never)} />
}
