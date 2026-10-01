import { useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'

import { Verificacion } from '../verificacion/Verificacion'
import type { DeServidor } from '../verificacion/maquina'
import type { crearServicioVerificacion } from '../verificacion/servicio'

/**
 * La verificación con un servidor SIMULADO y sin cámara, para ver cada fase
 * en el navegador: /catalogo-verificacion?estado=sin-empezar|cedula|revision|rechazada|aprobada.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio. Las respuestas
 * imitan las reales (pruebas/verificacion-contra-la-api.mjs).
 */
const ESTADOS: Record<string, DeServidor> = {
  'sin-empezar': { estado: 'sin-empezar', cedulaLista: false, selfieLista: false },
  cedula: { estado: 'sin-empezar', cedulaLista: true, selfieLista: false },
  revision: { estado: 'revision', cedulaLista: true, selfieLista: true },
  'revision-faltan': { estado: 'revision', cedulaLista: true, selfieLista: true },
  rechazada: {
    estado: 'rechazada',
    cedulaLista: false,
    selfieLista: true,
    motivo: { mensaje: 'La foto de la cédula salió borrosa y no se lee el número. Hazla otra vez con buena luz.', permiteReintento: true },
  },
  aprobada: { estado: 'aprobada', cedulaLista: true, selfieLista: true, revisadaEl: '3 de octubre de 2026', seBorraEl: '1 de enero de 2027' },
}

export default function Pantalla() {
  const { estado = 'sin-empezar' } = useLocalSearchParams<{ estado?: string }>()
  const simulado = useMemo((): ReturnType<typeof crearServicioVerificacion> => ({
    async estado() {
      return { ok: true, datos: ESTADOS[estado] ?? ESTADOS['sin-empezar'] }
    },
    async faltan() {
      return estado === 'revision-faltan' ? 12 : 0
    },
    async subir() {
      await new Promise((ok) => setTimeout(ok, 700))
      return { ok: true, datos: { estado: 'recibida' } }
    },
  }), [estado]) // estable: si no, la carga se relanzaría en cada render
  return <Verificacion key={estado} servicio={simulado} camara={false} alCuenta={() => router.push('/cuenta')} alPreguntas={() => router.push('/cuestionario')} alEntrar={() => router.push('/entrar')} />
}
