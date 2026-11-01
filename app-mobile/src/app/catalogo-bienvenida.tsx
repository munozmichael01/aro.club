import { useLocalSearchParams } from 'expo-router'

import { Bienvenida } from '../entrada/Bienvenida'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * La bienvenida sin la marca de «ya vista», para verla en el navegador:
 * /catalogo-bienvenida[?invitacion=1|sin-nombre]. Catálogo de desarrollo.
 */
function Pantalla() {
  const q = useLocalSearchParams<{ invitacion?: string }>()
  const inv = q.invitacion === '1' ? { codigo: 'ANDREA7KQ', nombre: 'Andrea', pct: 20 } : q.invitacion === 'sin-nombre' ? { codigo: 'X', nombre: null, pct: null } : null
  return <Bienvenida invitacion={inv} onEmpezar={() => console.log('[catálogo] empezar')} onEntrar={() => console.log('[catálogo] entrar')} />
}

export default soloDesarrollo(Pantalla)
