import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'

import { Velo } from '../diseno'
import { Bienvenida } from '../entrada/Bienvenida'
import { listo, supabase } from '../sesion'

/**
 * La puerta: con sesión, a la cuenta; sin ella, la bienvenida, con sus dos
 * salidas: Empezar (el alta) y Entrar (quien ya tiene cuenta o reinstala).
 */
export default function Inicio() {
  const [conSesion, setConSesion] = useState<boolean | null>(null)

  useEffect(() => {
    listo.then(() => supabase.auth.getSession()).then(({ data }) => setConSesion(!!data.session))
  }, [])

  if (conSesion === null) return <Velo sobreVerde />
  if (conSesion) return <Redirect href="/cuenta" />
  return <Bienvenida onEmpezar={() => router.push('/empezar')} onEntrar={() => router.push('/entrar')} />
}
