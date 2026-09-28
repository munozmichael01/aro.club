import { useMemo } from 'react'
import { router } from 'expo-router'

import { Perfil } from '../perfil/Perfil'
import type { Aviso, DeServidor } from '../perfil/maquina'
import type { crearServicioPerfil } from '../perfil/servicio'

/**
 * Perfil con un servidor SIMULADO, para verlo en el navegador: /catalogo-perfil.
 * La respuesta es la REAL de /api/mi-perfil con la cuenta del banco
 * (`GUARDAR=pruebas/datos/mi-perfil.json npm run prueba:perfil`): el
 * catálogo de preguntas es el de verdad; los datos, los del banco.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const REAL = require('../../pruebas/datos/mi-perfil.json') as DeServidor

// Los de /api/mis-avisos (el primero, sin la hora que el servidor escribe a mano).
let avisos: Aviso[] = [
  { clave: 'mesa_jueves', titulo: 'Tu mesa, al abrirse', cuerpo: 'El sitio, la hora y con quién cenas, en cuanto se abre.', encendido: true, fijo: true },
  { clave: 'dia_cena', titulo: 'El día de la cena', cuerpo: 'Un recordatorio con la dirección unas horas antes.', encendido: true, fijo: true },
  { clave: 'pago_ok', titulo: 'Tu pago', cuerpo: 'Cuando lo confirmamos, o si no cuadra y hay que corregir algo.', encendido: true, fijo: false },
  { clave: 'apertura_zona', titulo: 'Fechas nuevas en tus zonas', cuerpo: 'Cuando abrimos una fecha donde tú puedes llegar.', encendido: true, fijo: false },
  { clave: 'whatsapp', titulo: 'Avisarte por WhatsApp', cuerpo: 'Además del correo. Solo lo de arriba, nunca nada más.', encendido: false, fijo: false },
]

export default function Pantalla() {
  const espera = () => new Promise((ok) => setTimeout(ok, 500))
  const servicio = useMemo((): ReturnType<typeof crearServicioPerfil> => ({
    perfil: async () => ({ ok: true, datos: REAL }),
    guardar: async () => (await espera(), { ok: false, error: 'Simulado: en el catálogo no se guarda nada.' }),
    avisos: async () => ({ ok: true, datos: { avisos, whatsappDesde: null } }),
    aviso: async (clave, valor) => {
      await espera()
      avisos = avisos.map((a) => (a.clave === clave ? { ...a, encendido: valor } : a))
      return { ok: true, datos: { estado: 'guardado' } }
    },
    exclusiones: async () => ({
      ok: true,
      datos: { exclusiones: [
        { id: 'a', nombre: 'Luis', porQue: 'La bloqueaste tú', sePuedeQuitar: true },
        { id: 'b', nombre: 'Carla', porQue: 'Viene de un reporte', sePuedeQuitar: false },
      ] },
    }),
    quitarExclusion: async () => (await espera(), { ok: false, error: 'No pudimos quitarlo.' }),
    baja: async () => (await espera(), { ok: false, error: 'Simulado: en el catálogo no se da de baja a nadie.' }),
  }), []) // estable: si no, la carga se relanzaría en cada render
  return (
    <Perfil
      servicio={servicio}
      ir={(d) => console.log('[catálogo] ir a', d)}
      alEntrar={() => router.push('/entrar')}
      alSalir={async () => router.push('/')}
      alBaja={async () => router.push('/')}
    />
  )
}
