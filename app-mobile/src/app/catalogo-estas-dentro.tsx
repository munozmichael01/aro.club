import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { EstasDentro } from '../dentro/EstasDentro'
import * as M from '../dentro/maquina'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * «Estás dentro» con datos de ejemplo: /catalogo-estas-dentro?estado=A|reportado|B1|B2|brunch|sin-saber
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  const { estado = 'A' } = useLocalSearchParams<{ estado?: string }>()
  const [cal, setCal] = useState(false)
  const brunch = estado === 'brunch'
  const plan: M.Plan = { empiezaEn: en(brunch ? 80 : 56), revelaEn: en(brunch ? 77 : 50), zonaHoraria: 'America/Caracas', formato: brunch ? 'brunch' : 'dinner', zonas: brunch ? ['Altamira'] : ['Chacao', 'Los Palos Grandes'] }
  const momento: M.Momento = estado === 'A' ? 'A' : 'B'
  const via: M.Via = estado === 'B1' || brunch ? 'credito' : estado === 'B2' ? 'confirmado' : estado === 'reportado' ? 'reportado' : null
  return (
    <EstasDentro
      key={estado}
      v={M.vista(plan, momento, via)}
      enCalendario={cal}
      alCalendario={() => setCal((x) => !x)}
      alCompartir={() => console.log('[catálogo] compartir')}
      ir={(x) => console.log('[catálogo] ir a', x)}
    />
  )
}

export default soloDesarrollo(Pantalla)
