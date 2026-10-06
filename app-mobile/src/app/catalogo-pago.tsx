import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import type { DeServidor } from '../pago/maquina'
import { Pago } from '../pago/Pago'
import type { crearServicioPago } from '../pago/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Pago con un servidor SIMULADO, para verlo en el navegador:
 * /catalogo-pago?estado=elegir|sin-verificar|pendiente|listo|fallo|prueba
 * La respuesta es la REAL de GET /api/pago con la cuenta del banco, con los
 * datos de la cuenta que recibe cambiados por inventados. Reportar y el
 * código «REGALO» salen bien; cualquier otro código, no.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const REAL = require('../../pruebas/datos/pago.json') as DeServidor

function Pantalla() {
  const { estado = 'elegir' } = useLocalSearchParams<{ estado?: string }>()
  const servicio = useMemo((): ReturnType<typeof crearServicioPago> => {
    const espera = () => new Promise((ok) => setTimeout(ok, 700))
    const pago = { reportadoEn: new Date().toISOString(), metodo: 'pm' }
    const datos: DeServidor = {
      ...REAL,
      verificada: estado !== 'sin-verificar',
      pago: estado === 'pendiente' ? { ...pago, estado: 'under_review' } : estado === 'listo' ? { ...pago, estado: 'confirmed' } : estado === 'fallo' ? { ...pago, estado: 'rejected' } : null,
      metodos: estado === 'prueba' ? REAL.metodos.map((m) => (m.id === 'pm' ? { ...m, datosDePrueba: true } : m)) : REAL.metodos,
    }
    return {
      cargar: async () => ({ ok: true, datos }),
      reportar: async () => (await espera(), { ok: true, datos: { estado: 'reportado' } }),
      cupon: async (_e, codigo) => (await espera(), codigo === 'REGALO' ? { ok: true, datos: { ok: true } } : { ok: false, error: 'Ese código no vale.' }),
      captura: async () => (await espera(), { ok: true, datos: { ruta: 'banco/captura.jpg' } }),
    }
  }, [estado])
  return <Pago key={estado} evento={REAL.evento.id} servicio={servicio} ir={(d) => console.log('[catálogo] ir a', d)} alEntrar={() => router.push('/entrar')} />
}

export default soloDesarrollo(Pantalla)
