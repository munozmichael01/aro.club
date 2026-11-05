import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Cancelar } from '../cancelar/Cancelar'
import type { DeServidor } from '../cancelar/maquina'
import type { crearServicioCancelar } from '../cancelar/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Cancelar con un servidor SIMULADO: /catalogo-cancelar?estado=margen|tarde|revelada|fallo|cargando|caido|lento
 * (la carga, entrega carga: cargando no contesta nunca, caido contesta 500, lento tarda 1,6 s)
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  const { estado = 'margen' } = useLocalSearchParams<{ estado?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioCancelar> => {
    const tarde = estado !== 'margen' && estado !== 'lento' && estado !== 'cargando' && estado !== 'caido'
    const d: DeServidor = {
      reservaId: 'r', empiezaEn: en(tarde ? 10 : 80), formato: 'dinner', zona: 'Las Mercedes',
      restaurante: estado === 'revelada' ? 'Casa Bistró' : null, horasQueFaltan: tarde ? 10 : 80, conMargen: !tarde, yaTieneMesa: estado === 'revelada',
    }
    return {
      leer: async () => {
        if (estado === 'cargando') return new Promise(() => {})
        if (estado === 'caido') return { ok: false, error: 'Error del servidor', status: 500 }
        if (estado === 'lento') await new Promise((ok) => setTimeout(ok, 1600))
        return { ok: true, datos: d }
      },
      cancelar: async () => {
        await new Promise((ok) => setTimeout(ok, 600))
        return estado === 'fallo' ? { ok: false, error: 'Esa reserva ya está cancelada.' } : { ok: true, datos: { estado: 'cancelada', creditoDevuelto: !tarde, horasQueFaltaban: d.horasQueFaltan } }
      },
      creditos: async () => (tarde ? 0 : 1),
    }
  }, [estado])
  return <Cancelar key={estado} servicio={servicio} ir={(x) => console.log('[catálogo] ir a', x)} alEntrar={() => router.push('/entrar')} />
}

export default soloDesarrollo(Pantalla)
