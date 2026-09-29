import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'

import { Velo } from '../diseno'
import { Bienvenida } from '../entrada/Bienvenida'
import { listo, supabase } from '../sesion'

/** Ya vio la bienvenida en este celular. No es un secreto: va en el almacén normal, y al reinstalar se borra solo. */
const VISTA = 'aro.bienvenida.vista'

/**
 * La puerta. Con sesión, a la cuenta. Sin ella, la bienvenida, pero SOLO LA
 * PRIMERA VEZ (nota de Design): quien ya la vio —cerró sesión, o se fue
 * sin terminar el alta— abre en Entrar, que tiene su «Empezar» para quien
 * aún no tiene cuenta.
 */
export default function Inicio() {
  const [destino, setDestino] = useState<'cuenta' | 'entrar' | 'bienvenida' | null>(null)

  useEffect(() => {
    ;(async () => {
      await listo
      const { data } = await supabase.auth.getSession()
      if (data.session) return setDestino('cuenta')
      const vista = await AsyncStorage.getItem(VISTA).catch(() => null)
      setDestino(vista ? 'entrar' : 'bienvenida')
      if (!vista) AsyncStorage.setItem(VISTA, '1').catch(() => {})
    })()
  }, [])

  if (destino === null) return <Velo sobreVerde />
  if (destino === 'cuenta') return <Redirect href="/cuenta" />
  if (destino === 'entrar') return <Redirect href="/entrar" />
  return <Bienvenida onEmpezar={() => router.push('/empezar')} onEntrar={() => router.push('/entrar')} />
}
