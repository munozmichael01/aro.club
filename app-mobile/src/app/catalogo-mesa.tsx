import { useMemo } from 'react'
import { router, useLocalSearchParams } from 'expo-router'

import { sabado } from '../util/sabados'

import { MiMesa } from '../mesa/MiMesa'
import type { DeServidor } from '../mesa/maquina'
import type { crearServicioMesa } from '../mesa/servicio'

/**
 * Mi mesa con un servidor SIMULADO, para ver cada fase en el navegador:
 * /catalogo-mesa?estado=revision|sin-reserva|sin-mesa|cerrada|abierta|movimiento|pasada|valorada|fallo
 * Catálogo de desarrollo: no se enlaza desde ningún sitio. La forma imita la
 * real (pruebas/mesa-contra-la-api.mjs); las fechas se cuentan desde ahora.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()
const CINCO = [
  { id: '11111111-1111-1111-1111-111111111111', nombre: 'Luis', sector: 'Salud' },
  { id: '22222222-2222-2222-2222-222222222222', nombre: 'Mariana', sector: 'Diseño' },
  { id: '33333333-3333-3333-3333-333333333333', nombre: 'José Manuel', sector: 'Finanzas' },
  { id: '44444444-4444-4444-4444-444444444444', nombre: 'Gabriela', sector: null },
  { id: '55555555-5555-5555-5555-555555555555', nombre: 'Andrés', sector: 'Tecnología' },
]
const ABIERTA: DeServidor = {
  fase: 'abierta', mesaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', numeroMesa: 4, formato: 'dinner', zonaHoraria: 'America/Caracas',
  empiezaEn: en(5), restaurante: 'Casa Bistró', direccion: 'Calle París con Av. Principal, Las Mercedes',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes+Caracas', mapaApple: 'https://maps.apple.com/?q=Las+Mercedes+Caracas',
  companeros: CINCO, yaValoro: false, yaBloqueados: [], yaReporto: null,
}
const ESTADOS: Record<string, DeServidor> = {
  revision: { fase: 'sin-reserva', estado: 'pending_verification' },
  'sin-reserva': { fase: 'sin-reserva', estado: 'active' },
  'sin-mesa': { fase: 'sin-mesa', formato: 'dinner', empiezaEn: en(4), zonaHoraria: 'America/Caracas' },
  cerrada: { fase: 'cerrada', formato: 'dinner', zonaHoraria: 'America/Caracas', revelaEn: en(26), empiezaEn: en(34), zonas: ['Las Mercedes', 'Chacao', 'Altamira'] },
  abierta: ABIERTA,
  movimiento: { ...ABIERTA, formato: 'walk', restaurante: 'Entrada de Sabas Nieves', direccion: 'Av. Boyacá, Altamira', actividad: { ruta: 'Sabas Nieves → La Silla', km: 7, minutos: 150, nivel: 'medio' } },
  pasada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10) },
  valorada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10), yaValoro: true, yaBloqueados: [CINCO[2].id], yaReporto: CINCO[2].id },
}

export default function Pantalla() {
  const { estado = 'abierta', captura } = useLocalSearchParams<{ estado?: string; captura?: string }>()
  const espera = () => new Promise((ok) => setTimeout(ok, 600))
  const servicio = useMemo((): ReturnType<typeof crearServicioMesa> => ({
    async mesa() {
      if (estado === 'fallo') return { ok: false, error: 'No pudimos cargar tu mesa. Revisa tu conexión e inténtalo otra vez.' }
      const d = ESTADOS[estado] ?? ABIERTA
      // ?captura=1: el sábado a las 7 p.m., y los cinco con su sector, para las capturas de las tiendas.
      return { ok: true, datos: captura ? { ...d, empiezaEn: sabado(0), companeros: CINCO.map((c) => ({ ...c, sector: c.sector ?? 'Educación' })) } : d }
    },
    async tarde(minutos) {
      await espera()
      return { ok: true, datos: { avisado: true, minutos } }
    },
    async valorar() {
      await espera()
      return { ok: true, datos: true }
    },
    async reportar() {
      await espera()
      return { ok: true, datos: { ok: true } }
    },
  }), [estado, captura]) // estable: si no, la carga se relanzaría en cada render
  return (
    <MiMesa
      key={estado}
      servicio={servicio}
      ir={(d) => console.log('[catálogo] ir a', d)}
      alEntrar={() => router.push('/entrar')}
      alSalir={async () => router.push('/')}
    />
  )
}
