import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import * as M from '../pago/maquina'
import type { DeServidor } from '../pago/maquina'
import { Pago } from '../pago/Pago'
import type { crearServicioPago } from '../pago/servicio'
import { reglas } from '../reglas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Pago con un servidor SIMULADO, para verlo en el navegador:
 * /catalogo-pago?estado=elegir|sin-verificar|pendiente|listo|fallo|prueba|cargando|caido|lento
 * (la carga, entrega carga: cargando no contesta nunca, caido contesta 500, lento tarda 1,6 s)
 * La respuesta es la REAL de GET /api/pago con la cuenta del banco, con los
 * datos de la cuenta que recibe cambiados por inventados. Reportar y el
 * código «REGALO» salen bien; «ANDREA7KQ» es un descuento del 20%
 * (98b3728); cualquier otro código, no.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const REAL = require('../../pruebas/datos/pago.json') as DeServidor

const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  // ?graba=1: la fecha se graba entera (18-10), y el permiso va encima del botón de reportar.
  const { estado = 'elegir', graba, masuno } = useLocalSearchParams<{ estado?: string; graba?: string; masuno?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioPago> => {
    const espera = () => new Promise((ok) => setTimeout(ok, 700))
    const pago = { reportadoEn: new Date().toISOString(), metodo: 'pm' }
    const datos: DeServidor = {
      ...REAL,
      // Las fechas del fichero ya pasaron: se mueven a dentro de tres días para que la fecha siga abierta.
      evento: { ...REAL.evento, empiezaEn: new Date(Date.now() + 72 * 3600_000).toISOString(), cierraEn: new Date(Date.now() + 48 * 3600_000).toISOString(), grabamos: !!graba, permisoObligatorio: !!graba, masUno: !!masuno },
      // +1: el precio de la fecha ya es el de los dos puestos.
      ...(masuno ? { montoUsd: REAL.montoUsd * 2, montoLocal: REAL.montoLocal ? REAL.montoLocal * 2 : null } : {}),
      verificada: estado !== 'sin-verificar',
      pago: estado === 'pendiente' ? { ...pago, estado: 'under_review' } : estado === 'listo' ? { ...pago, estado: 'confirmed' } : estado === 'fallo' ? { ...pago, estado: 'rejected' } : null,
      metodos: estado === 'prueba' ? REAL.metodos.map((m) => (m.id === 'pm' ? { ...m, datosDePrueba: true } : m)) : REAL.metodos,
    }
    return {
      cargar: async () => {
        if (estado === 'cargando') return new Promise(() => {})
        if (estado === 'caido') return { ok: false, error: 'Error del servidor', status: 500 }
        if (estado === 'lento') await new Promise((ok) => setTimeout(ok, 1600))
        return { ok: true, datos }
      },
      marcarDentro: async () => (masuno ? { enlace: 'https://aro.club/m/K7Q2MabcdefghijKLMNOp', estado: 'sin-usar', nombre: null, cierraEn: null, plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas'), mensaje: 'Te invito…' } : null),
      reportar: async (cuerpo) => (console.log('[catálogo] reportar', cuerpo), await espera(), { ok: true, datos: { estado: 'reportado' } }),
      cupon: async (_e, codigo) => {
        await espera()
        if (codigo === 'REGALO') return { ok: true, datos: { estado: 'confirmado', puestoApartado: true } }
        if (codigo !== 'ANDREA7KQ') return { ok: false, error: 'Ese código no vale.' }
        // El 20%: los importes rebajados y los datos de cada método, solo de los encendidos.
        const f = 0.8
        const rebaja = (v: string) => v.replace(/[\d.]+,\d{2}/, (n) => M.dinero(Number(n.replace(/\./g, '').replace(',', '.')) * f, '').trim())
        return {
          ok: true,
          datos: {
            estado: 'descuento',
            codigo,
            pct: 20,
            nombre: 'Andrea',
            montoPleno: datos.montoUsd,
            montoUsd: datos.montoUsd * f,
            tasa: datos.tasa,
            tasaDe: datos.tasaDe,
            montoLocal: datos.montoLocal != null ? datos.montoLocal * f : null,
            metodos: datos.metodos.filter((m) => m.activo).map((m) => ({ id: m.id, datos: m.datos.map((x) => ({ ...x, valor: rebaja(x.valor), copiar: rebaja(x.copiar) })) })),
            puestoApartado: false,
          },
        }
      },
      captura: async () => (await espera(), { ok: true, datos: { ruta: 'banco/captura.jpg' } }),
    }
  }, [estado, graba, masuno])
  return <Pago key={estado} evento={REAL.evento.id} servicio={servicio} ir={(d) => console.log('[catálogo] ir a', d)} alEntrar={() => router.push('/entrar')} />
}

export default soloDesarrollo(Pantalla)
