import { router, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'

import { Legal } from '../legal/Legal'
import * as M from '../legal/maquina'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * El legal con una copia REAL de `/api/legal` (pruebas/datos/legal.json): en
 * el navegador de desarrollo el CORS no deja pedirlo a aro.club. Catálogo de
 * desarrollo: /catalogo-legal?doc=reglas|terminos|privacidad.
 * La carga (entrega carga): &estado=cargando|caido|lento.
 */
const REAL = require('../../pruebas/datos/legal.json') as M.DeServidor

function Pantalla() {
  const { doc, estado } = useLocalSearchParams<{ doc?: string; estado?: string }>()
  const cargar = useCallback(async (): Promise<M.DeServidor | null> => {
    if (estado === 'cargando') return new Promise(() => {})
    if (estado === 'caido') return null
    if (estado === 'lento') await new Promise((ok) => setTimeout(ok, 1600))
    return REAL
  }, [estado])
  return <Legal key={estado} doc={M.doc(doc)} cargar={cargar} alVolver={() => router.back()} />
}

export default soloDesarrollo(Pantalla)
