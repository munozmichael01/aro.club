import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { EstasDentro } from '../dentro/EstasDentro'
import * as M from '../dentro/maquina'
import { reglas } from '../reglas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * «Estás dentro» con datos de ejemplo: /catalogo-estas-dentro?estado=A|reportado|B1|B2|brunch|sin-saber[&masuno=1]
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  const { estado = 'A', masuno } = useLocalSearchParams<{ estado?: string; masuno?: string }>()
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
      masUno={masuno ? { enlace: 'https://aro.club/m/K7Q2MabcdefghijKLMNOp', estado: 'sin-usar', nombre: null, cierraEn: null, plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas'), mensaje: 'Te invito…' } : null}
    />
  )
}

export default soloDesarrollo(Pantalla)
