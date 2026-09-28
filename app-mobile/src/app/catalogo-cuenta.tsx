import { router, useLocalSearchParams } from 'expo-router'

import { Inicio } from '../cuenta/Inicio'
import type { MiCuenta, MiMesa } from '../cuenta/maquina'
import type { crearServicioCuenta } from '../cuenta/servicio'
import type { EstadoCuenta } from '../texto/cuenta'

/**
 * El Inicio con un servidor SIMULADO, para ver cada estado en el navegador:
 * /catalogo-cuenta?estado=perfil|datos|verificar|revision|reservar|porconfirmar|reservada|abierta|cargando|fallo
 * Catálogo de desarrollo: no se enlaza desde ningún sitio. La forma imita la
 * real (pruebas/cuenta-contra-la-api.mjs); las fechas se cuentan desde hoy.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function simulada(estado: EstadoCuenta): MiCuenta {
  const conReserva = estado === 'porconfirmar' || estado === 'reservada' || estado === 'abierta'
  const cena = estado === 'abierta' ? en(6) : en(5 * 24 + 8)
  return {
    nombre: 'Andrea',
    esOps: false,
    porValorar: estado === 'reservar' ? { cuando: en(-20), sitio: 'Casa Bistró' } : null,
    planes: [
      ...(conReserva ? [{ empiezaEn: cena, formato: 'dinner', estado: estado === 'porconfirmar' ? 'pending_payment' : 'confirmed', cancelada: false, pasada: false, restaurante: estado === 'abierta' ? 'Casa Bistró' : null, numeroMesa: estado === 'abierta' ? 4 : null }] : []),
      { empiezaEn: en(-24 * 30), formato: 'dinner', estado: 'attended', cancelada: false, pasada: true, restaurante: 'Lima', numeroMesa: 2 },
    ],
    agenda: [
      { id: 'a', formato: 'dinner', empiezaEn: en(5 * 24 + 8), cierraEn: en(3 * 24), creditos: 1, zonas: ['Las Mercedes', 'Chacao'], apuntados: 8, cerrada: false, mia: conReserva && estado !== 'abierta' },
      { id: 'b', formato: 'dinner', empiezaEn: en(11 * 24 + 8), cierraEn: en(9 * 24), creditos: 1, zonas: ['Altamira'], apuntados: 4, cerrada: false, mia: false },
      { id: 'c', formato: 'drinks', empiezaEn: en(12 * 24 + 6), cierraEn: en(10 * 24), creditos: 1, zonas: [], apuntados: 1, cerrada: false, mia: false },
      { id: 'd', formato: 'dinner', empiezaEn: en(20), cierraEn: en(-28), creditos: 1, zonas: ['Chacao'], apuntados: 14, cerrada: true, mia: false },
    ],
    proximaFecha: { empiezaEn: en(5 * 24 + 8), cierraEn: en(3 * 24), revelaEn: en(5 * 24), zona: 'Las Mercedes', apuntados: 8 },
    estado,
    verif: estado === 'revision' ? 'revision' : ['perfil', 'datos', 'verificar'].includes(estado) ? 'sin' : 'ok',
    motivoRechazo: null,
    respuestas: { faltan: estado === 'perfil' ? 6 : 0, total: 14 },
    creditos: estado === 'reservar' ? 1 : 0,
    reserva: conReserva ? { id: 'r', formato: 'dinner', empiezaEn: cena, revelaEn: estado === 'abierta' ? en(-2) : en(5 * 24), revelado: estado === 'abierta' } : null,
  }
}

const MESA: MiMesa = {
  mesaId: 'm',
  numeroMesa: 4,
  empiezaEn: en(6),
  restaurante: 'Casa Bistró',
  direccion: 'Calle París, Las Mercedes',
  companeros: [
    { id: '1', nombre: 'Luis', sector: 'Salud' },
    { id: '2', nombre: 'Mariana', sector: 'Diseño' },
    { id: '3', nombre: 'José Manuel', sector: 'Finanzas' },
    { id: '4', nombre: 'Gabriela', sector: 'Educación' },
    { id: '5', nombre: 'Andrés', sector: 'Tecnología' },
  ],
}

export default function Pantalla() {
  const { estado = 'reservar' } = useLocalSearchParams<{ estado?: string }>()
  const servicio: ReturnType<typeof crearServicioCuenta> = {
    async cuenta() {
      if (estado === 'cargando') return new Promise(() => {})
      if (estado === 'fallo') return { ok: false, error: 'No pudimos cargar tu cuenta. Revisa tu conexión e inténtalo otra vez.' }
      return { ok: true, datos: simulada(estado as EstadoCuenta) }
    },
    async mesa() {
      return { ok: true, datos: estado === 'abierta' ? MESA : {} }
    },
    async exclusiones() {
      return { ok: true, datos: { exclusiones: [] } }
    },
    async reservar() {
      await new Promise((ok) => setTimeout(ok, 700))
      return { ok: false, error: 'No te quedan encuentros.' }
    },
  }
  return (
    <Inicio
      key={estado}
      servicio={servicio}
      ir={(d) => console.log('[catálogo] ir a', d)}
      alEntrar={() => router.push('/entrar')}
      alSalir={async () => router.push('/')}
    />
  )
}
