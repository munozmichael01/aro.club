import { Redirect, router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'

import { Velo } from '../diseno'
import { Entrada } from '../entrada/Entrada'
import { crearServicio } from '../entrada/servicio'
import { api, listo, supabase } from '../sesion'

/**
 * La puerta: con sesión, a la cuenta (como la web, que no le enseña la
 * portada a quien ya está dentro); sin ella, la entrada.
 */
export default function Inicio() {
  const [conSesion, setConSesion] = useState<boolean | null>(null)
  const servicio = useMemo(() => crearServicio(api), [])

  useEffect(() => {
    listo.then(() => supabase.auth.getSession()).then(({ data }) => setConSesion(!!data.session))
  }, [])

  if (conSesion === null) return <Velo sobreVerde />
  if (conSesion) return <Redirect href="/cuenta" />
  return <Entrada servicio={servicio} onEntrar={() => router.push('/entrar')} onCompletar={() => router.push('/datos')} />
}
