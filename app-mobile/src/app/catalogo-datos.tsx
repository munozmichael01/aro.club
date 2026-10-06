import { router } from 'expo-router'

import { Datos } from '../datos/Datos'
import type { crearServicioDatos } from '../datos/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Los datos personales con un servidor SIMULADO, para recorrer la pantalla de
 * verdad en el navegador (que no puede llamar a aro.club/api). Es catálogo
 * de desarrollo: no se enlaza desde ningún sitio. Las respuestas imitan las
 * del servidor real, comprobadas en `pruebas/datos-contra-la-api.mjs`.
 */
let guardado: Record<string, unknown> | null = null
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

const simulado: ReturnType<typeof crearServicioDatos> = {
  async cargar(lead) {
    await espera(120)
    if (!lead) return { ok: false, error: 'Sin sesión.', status: 401 }
    return { ok: true, datos: { ...(guardado ?? {}), puedeCuenta: true } as never }
  },
  async dejarCorreo(correo) {
    await espera(120)
    if (correo.startsWith('ya@')) return { ok: true, datos: { estado: 'repetido' } }
    return { ok: true, datos: { estado: 'nuevo', token: 'simulado' } }
  },
  async guardar(_lead, cuerpo) {
    await espera(150)
    guardado = cuerpo as Record<string, unknown>
    return { ok: true, datos: { ok: true } }
  },
  async crearCuenta() {
    await espera(150)
    return { ok: false, error: 'Te faltan 14 preguntas del cuestionario.', status: 409 }
  },
  async proxima() {
    return { ok: true, datos: { hay: true, empiezaEn: '2026-10-04T00:00:00+00:00' } }
  },
  async catalogo() {
    return {
      ok: true,
      datos: {
        version: 'v3',
        preguntas: [
          {
            clave: 'genero',
            enunciado: '',
            ayuda: null,
            tipo: 'single',
            min: null,
            max: null,
            opciones: [
              { valor: 'mujer', label: 'Mujer' },
              { valor: 'hombre', label: 'Hombre' },
              { valor: 'no-binario', label: 'No binario' },
              { valor: 'sin-decir', label: 'Prefiero no decirlo' },
            ],
          },
        ],
      },
    }
  },
}

function Pantalla() {
  return (
    <Datos
      servicio={simulado}
      entrar={async () => false}
      alVolver={() => router.back()}
      alCuestionario={() => router.push('/cuestionario')}
      alCuenta={() => router.push('/cuenta')}
      alVerificar={() => router.push('/verificacion')}
      alEntrar={() => router.push('/entrar')}
    />
  )
}

export default soloDesarrollo(Pantalla)
