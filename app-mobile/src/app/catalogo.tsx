import { Catalogo } from '../diseno/Catalogo'
import { soloDesarrollo } from '../util/soloDesarrollo'

/** El catálogo del sistema, en /catalogo. De desarrollo: no se enlaza desde ninguna pantalla. */
function Pantalla() {
  return <Catalogo />
}

export default soloDesarrollo(Pantalla)
