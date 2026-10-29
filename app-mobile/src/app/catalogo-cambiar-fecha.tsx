import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { CambiarFecha } from '../cambiar/CambiarFecha'
import type { Bloque } from '../cambiar/maquina'
import type { crearServicioCambiar } from '../cambiar/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Cambiar de fecha con un servidor SIMULADO: /catalogo-cambiar-fecha?estado=elegir|tarde|sin-destinos|fallo
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()
const Z = 'America/Caracas'

function Pantalla() {
  const { estado = 'elegir' } = useLocalSearchParams<{ estado?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioCambiar> => {
    const bloque: Bloque =
      estado === 'tarde' || estado === 'sin-destinos'
        ? { puede: false, motivo: estado, destinos: [] }
        : {
            puede: true,
            reservaId: 'r',
            destinos: [
              { eventoId: 'a', empiezaEn: en(96), zonaHoraria: Z, formato: 'dinner', idioma: null, zonas: ['Chacao', 'Los Palos Grandes'] },
              { eventoId: 'b', empiezaEn: en(100), zonaHoraria: Z, formato: 'dinner', idioma: 'en', zonas: ['Las Mercedes'] },
              { eventoId: 'c', empiezaEn: en(115), zonaHoraria: Z, formato: 'brunch', idioma: null, zonas: ['Altamira'] },
            ],
          }
    return {
      leer: async () => ({ ok: true, datos: { bloque, reservaId: 'r', empiezaEn: en(72), zonaHoraria: Z, formato: 'dinner', zonas: ['Las Mercedes', 'Chacao'] } }),
      cambiar: async () => {
        await new Promise((ok) => setTimeout(ok, 600))
        return estado === 'fallo'
          ? { ok: false, error: 'Esa fecha ya cerró. Elige otra.', status: 409, motivo: 'destino-cerrado' }
          : { ok: true, datos: { estado: 'cambiada', aEventoId: 'a' } }
      },
    }
  }, [estado])
  return <CambiarFecha key={estado} servicio={servicio} ir={(x) => console.log('[catálogo] ir a', x)} alEntrar={() => router.push('/entrar')} />
}

export default soloDesarrollo(Pantalla)
