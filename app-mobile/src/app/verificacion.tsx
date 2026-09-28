import { router } from 'expo-router'
import { useMemo } from 'react'

import { api } from '../sesion'
import { Verificacion } from '../verificacion/Verificacion'
import { crearServicioVerificacion } from '../verificacion/servicio'

/** /verificacion, como en la web: cédula y selfie, que revisa una persona. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioVerificacion(api), [])
  return <Verificacion servicio={servicio} alCuenta={() => router.replace('/cuenta')} alEntrar={() => router.replace('/entrar')} />
}
