import { router, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'

import { Legal } from '../legal/Legal'
import * as M from '../legal/maquina'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * El legal con una copia REAL de `/api/legal` (pruebas/datos/legal.json): en
 * el navegador de desarrollo el CORS no deja pedirlo a aro.club. Catálogo de
 * desarrollo: /catalogo-legal?doc=reglas|terminos|privacidad.
 */
const REAL = require('../../pruebas/datos/legal.json') as M.DeServidor

function Pantalla() {
  const { doc } = useLocalSearchParams<{ doc?: string }>()
  const cargar = useCallback(async () => REAL, [])
  return <Legal doc={M.doc(doc)} cargar={cargar} alVolver={() => router.back()} />
}

export default soloDesarrollo(Pantalla)
