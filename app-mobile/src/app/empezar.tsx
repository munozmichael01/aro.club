import { router } from 'expo-router'
import { useMemo } from 'react'

import { Entrada } from '../entrada/Entrada'
import { crearServicio } from '../entrada/servicio'
import { api } from '../sesion'

/** El alta: el correo y las cuatro preguntas de la puerta. Se llega desde «Empezar». */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicio(api), [])
  return <Entrada servicio={servicio} onEntrar={() => router.push('/entrar')} onCompletar={() => router.push('/datos')} />
}
