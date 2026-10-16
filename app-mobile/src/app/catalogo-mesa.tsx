import { useMemo } from 'react'
import { Asset } from 'expo-asset'
import { router, useLocalSearchParams } from 'expo-router'

import { sabado } from '../util/sabados'

import { MiMesa } from '../mesa/MiMesa'
import type { DeServidor } from '../mesa/maquina'
import type { crearServicioMesa } from '../mesa/servicio'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Mi mesa con un servidor SIMULADO, para ver cada fase en el navegador:
 * /catalogo-mesa?estado=revision|sin-reserva|sin-mesa|cerrada|abierta|antes|en-curso|sin-foto|terminada|unica|guion|movimiento|pasada|valorada|fallo
 * Catálogo de desarrollo: no se enlaza desde ningún sitio. La forma imita la
 * real (pruebas/mesa-contra-la-api.mjs); las fechas se cuentan desde ahora.
 */
/** La foto de ejemplo de la entrega 20, solo para el catálogo. */
const FACHADA = Asset.fromModule(require('../../assets/catalogo/fachada-ejemplo.jpg')).uri
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()
const CINCO = [
  { id: '11111111-1111-1111-1111-111111111111', nombre: 'Luis', sector: 'Salud' },
  { id: '22222222-2222-2222-2222-222222222222', nombre: 'Mariana', sector: 'Diseño' },
  { id: '33333333-3333-3333-3333-333333333333', nombre: 'José Manuel', sector: 'Finanzas' },
  { id: '44444444-4444-4444-4444-444444444444', nombre: 'Gabriela', sector: null },
  // Se sumó después de la revelación (16-10).
  { id: '55555555-5555-5555-5555-555555555555', nombre: 'Andrés', sector: 'Tecnología', seUnioDespues: true },
]
const SITIOS = [
  { nombre: 'Bar Caracas', minutosAPie: 4, precio: 'Barato', mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes' },
  { nombre: 'La Terraza de Juan', minutosAPie: 7, precio: 'Precio medio', mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes' },
  { nombre: 'Café Tostao', minutosAPie: null, mapa: null },
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
  // El juego de la mesa: cerrado (la cena es en 5 h) y abierto (empezó hace 10 min).
  'juego-abierto': { ...ABIERTA, empiezaEn: en(-1 / 6) },
  // Entrega 20: la cena antes, en curso, con el juego a medias y terminada.
  guion: {
    ...ABIERTA, empiezaEn: en(-50 / 60), fotoEntrada: FACHADA,
    paraSeguir: SITIOS,
  },
  antes: { ...ABIERTA, fotoEntrada: FACHADA, paraSeguir: SITIOS },
  'en-curso': { ...ABIERTA, empiezaEn: en(-37 / 60), fotoEntrada: FACHADA, paraSeguir: SITIOS },
  'sin-foto': { ...ABIERTA, empiezaEn: en(-37 / 60), paraSeguir: [] },
  terminada: { ...ABIERTA, empiezaEn: en(-125 / 60), fotoEntrada: FACHADA, paraSeguir: SITIOS },
  unica: { ...ABIERTA, mesaUnica: true, fotoEntrada: FACHADA },
  pasada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10) },
  valorada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10), yaValoro: true, yaBloqueados: [CINCO[2].id], yaReporto: CINCO[2].id },
}

function Pantalla() {
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
      // El juego se abre de verdad (entrega 20); lo demás solo se anota.
      ir={(d) => (d.startsWith('/juego') ? router.push(d.replace('/juego', '/catalogo-juego') as never) : console.log('[catálogo] ir a', d))}
      alEntrar={() => router.push('/entrar')}
      alSalir={async () => router.push('/')}
    />
  )
}

export default soloDesarrollo(Pantalla)
