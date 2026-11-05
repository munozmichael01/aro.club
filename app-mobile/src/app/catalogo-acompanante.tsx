import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Invitacion, type DeInvitacion, type crearServicioInvitacion } from '../masuno/Invitacion'
import { reglas } from '../reglas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * La invitación de un +1 con un servidor simulado (entrega mas-uno, 5A–5C):
 * /catalogo-acompanante?estado=sin-cuenta|con-cuenta|verificada|usada|anulada|cerrada|propia|cargando|caido|lento
 * (la carga, entrega carga: cargando no contesta nunca, caido contesta 500, lento tarda 1,6 s y entra como con-cuenta)
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  const { estado = 'sin-cuenta' } = useLocalSearchParams<{ estado?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioInvitacion> => {
    const valida = ['sin-cuenta', 'con-cuenta', 'verificada', 'lento'].includes(estado)
    const inv: DeInvitacion = {
      estado: (valida ? 'valida' : estado) as DeInvitacion['estado'],
      invita: 'Ana',
      fecha: { id: 'e', empiezaEn: en(56), cierraEn: en(32), formato: 'dinner', zonas: ['Chacao', 'Los Palos Grandes'] },
      plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas'),
      zonaHoraria: 'America/Caracas',
    }
    return {
      ver: async () => {
        if (estado === 'cargando') return new Promise(() => {})
        if (estado === 'caido') return { inv: null, yo: null, caida: { servidor: true } }
        if (estado === 'lento') await new Promise((ok) => setTimeout(ok, 1600))
        return { inv, yo: estado === 'sin-cuenta' || !valida ? null : { nombre: 'Laura', verificada: estado === 'verificada' } }
      },
      aceptar: async () => ({ estado: estado === 'verificada' ? 'confirmada' : 'aceptada', error: null }),
    }
  }, [estado])
  return <Invitacion key={estado} token="abcdefghij_KLMNOPQRS-tu" servicio={servicio} ir={(x) => console.log('[catálogo] ir a', x)} />
}

export default soloDesarrollo(Pantalla)
