import { router, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'

import { Legal } from '../legal/Legal'
import * as M from '../legal/maquina'
import { api } from '../sesion'

/** /legal?doc=reglas|terminos|privacidad: el legal dentro de la app (18-10). Sin sesión: se llega también desde Entrar. */
export default function Pantalla() {
  const { doc } = useLocalSearchParams<{ doc?: string }>()
  const cargar = useCallback(async () => {
    const r = await api.pedir('/legal')
    if (!r.ok) return null
    const j = await r.json().catch(() => null)
    return M.completo(j) ? j : null
  }, [])
  return <Legal doc={M.doc(doc)} cargar={cargar} alVolver={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
}
