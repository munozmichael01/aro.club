import { Bienvenida } from '../entrada/Bienvenida'
import { soloDesarrollo } from '../util/soloDesarrollo'

/** La bienvenida sin la marca de «ya vista», para verla en el navegador: /catalogo-bienvenida. Catálogo de desarrollo. */
function Pantalla() {
  return <Bienvenida onEmpezar={() => console.log('[catálogo] empezar')} onEntrar={() => console.log('[catálogo] entrar')} />
}

export default soloDesarrollo(Pantalla)
