import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { preguntasDeEntrada } from '../entrada/preguntas'
import { Puerta } from '../puerta/Puerta'
import type { crearServicioPuerta } from '../puerta/servicio'
import { reglas } from '../reglas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * El alta de la app con un servidor SIMULADO: /catalogo-puerta[?sesion=1]
 * Las zonas son de ejemplo; las preguntas, las de `reglas.PUERTA`.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const ZONAS = [
  { slug: 'las-mercedes', nombre: 'Las Mercedes' },
  { slug: 'chacao', nombre: 'Chacao' },
  { slug: 'altamira', nombre: 'Altamira' },
]

function Pantalla() {
  const { sesion } = useLocalSearchParams<{ sesion?: string }>()
  const servicio = useMemo(
    (): ReturnType<typeof crearServicioPuerta> => ({
      guardar: async (envios) => (console.log('[catálogo] guardar', JSON.stringify(envios)), { ok: true, datos: true }),
      crearCuenta: async () => ({ ok: false, status: 409, error: 'Ese correo ya tiene cuenta.' }),
      estado: async () => ({ ok: true, datos: { estado: 'datos' } }),
      ciudades: async () => ({
        ok: true,
        datos: {
          ciudades: [
            { slug: 'caracas', nombre: 'Caracas', abierta: true },
            { slug: 'valencia', nombre: 'Valencia', abierta: false },
            { slug: 'maracaibo', nombre: 'Maracaibo', abierta: false },
            { slug: 'otra', nombre: 'Otra ciudad', abierta: false },
          ],
        },
      }),
      ponerCiudad: async () => ({ ok: true, datos: { ok: true } }),
    }),
    [],
  )
  return (
    <Puerta
      servicio={servicio}
      preguntas={async () => preguntasDeEntrada(reglas.PUERTA, reglas.ORDEN_PUERTA, ZONAS)}
      haySesion={async () => sesion === '1'}
      hayProveedor={() => true}
      conProveedor={async () => 'Simulado: en el catálogo no se entra con proveedores.'}
      entrarConClave={async () => false}
      alTerminar={(d) => console.log('[catálogo] a', d)}
      alEntrar={() => console.log('[catálogo] entrar')}
    />
  )
}

export default soloDesarrollo(Pantalla)
