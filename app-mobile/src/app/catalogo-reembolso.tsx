import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Reembolso } from '../reembolso/Reembolso'
import type { crearServicioReembolso } from '../reembolso/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * El reembolso con un servidor simulado: /catalogo-reembolso?estado=pedir|pendiente|hecho&tasa=1
 * (tasa=1: el primer envío vuelve con `tasa-cambio`). Catálogo de desarrollo.
 */
function Pantalla() {
  const { estado = 'pedir', tasa } = useLocalSearchParams<{ estado?: string; tasa?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioReembolso> => {
    let primera = true
    const base = { puede: true, estado: null, hasta: new Date(Date.now() + 2 * 86400_000).toISOString(), precio: 10, montoBs: 9931.76, tasa: 993.176 }
    const r = estado === 'pendiente' ? { ...base, puede: false, estado: 'pendiente' } : estado === 'hecho' ? { ...base, puede: false, estado: 'reembolsado', referencia: '004512' } : base
    return {
      leer: async () => ({ ok: true, datos: { reembolso: r } }),
      pedir: async (c) => {
        console.log('[catálogo] reembolso', c)
        await new Promise((ok) => setTimeout(ok, 600))
        if (tasa && primera) {
          primera = false
          return { ok: false, error: 'La tasa cambió mientras lo pedías. Revisa el monto y vuelve a confirmarlo.', status: 409, motivo: 'tasa-cambio', tasa: 998.5, montoBs: 9985 }
        }
        return { ok: true, datos: { estado: 'pendiente', montoBs: 9931.76, tasa: 993.176, hasta: base.hasta } }
      },
    }
  }, [estado, tasa])
  return <Reembolso key={estado} servicio={servicio} alVolver={() => router.back()} alEntrar={() => router.push('/entrar')} />
}

export default soloDesarrollo(Pantalla)
