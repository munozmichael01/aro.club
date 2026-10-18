import { useState } from 'react'

import { Normas } from '../normas/Normas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * La puerta de las normas de después de entrar (18-10), con un servidor
 * simulado: /catalogo-normas. Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
function Pantalla() {
  const [aceptando, setAceptando] = useState(false)
  const [hecho, setHecho] = useState(false)
  if (hecho) return null
  return (
    <Normas
      aceptar={{
        aceptando,
        fallo: '',
        alAceptar: () => {
          setAceptando(true)
          setTimeout(() => setHecho(true), 600)
        },
      }}
    />
  )
}

export default soloDesarrollo(Pantalla)
