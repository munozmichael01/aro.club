import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'

import { Cuestionario } from '../cuestionario/Cuestionario'
import { crearServicioCuestionario } from '../cuestionario/servicio'
import { api, listo, supabase } from '../sesion'

/** /cuestionario, como en la web: las diecisiete (hoy veinte, tres opcionales), guardadas una a una. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioCuestionario(api), [])
  const [tieneCuenta, setTieneCuenta] = useState(false)
  useEffect(() => {
    listo.then(() => supabase.auth.getSession()).then(({ data }) => setTieneCuenta(!!data.session))
  }, [])
  return (
    <Cuestionario
      servicio={servicio}
      tieneCuenta={tieneCuenta}
      alVolver={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      alDatos={() => router.push('/datos')}
      alEntrar={() => router.push('/entrar')}
      alCuenta={() => router.replace('/cuenta')}
    />
  )
}
