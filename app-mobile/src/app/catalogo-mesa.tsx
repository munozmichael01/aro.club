import { useMemo } from 'react'
import { Asset } from 'expo-asset'
import { router, useLocalSearchParams } from 'expo-router'

import { sabado } from '../util/sabados'

import { MiMesa } from '../mesa/MiMesa'
import type { DeServidor } from '../mesa/maquina'
import type { crearServicioMesa } from '../mesa/servicio'
import type { DeContacto, Persona } from '../contacto/maquina'
import type { DePasadas } from '../pasadas/maquina'
import type { crearServicioPasadas } from '../pasadas/servicio'
import { reglas } from '../reglas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Mi mesa con un servidor SIMULADO, para ver cada fase en el navegador:
 * /catalogo-mesa?estado=revision|sin-reserva|sin-mesa|sin-abono|cerrada|cerrada-tarde|abierta|antes|en-curso|sin-foto|terminada|segundo-antes|segundo-curso|segundo-sin-bar|segundo-bar|unica|guion|movimiento|pasada|valorada|fallo
 * Lo del 16-10: graba|grabado|grabado-movimiento (la grabación) y ajuste-cancelo|ajuste-suma|ajuste-ambos|ajuste-movido.
 * ?tope=1 en `pasada`: el veto del sitio no cabe (ya tiene dos).
 * +1 (01-11): ?estado=mas-uno|mas-uno-registrado|mas-uno-confirmado|mas-uno-cancelada|mas-uno-pendiente|mas-uno-dentro|mas-uno-abierta.
 * Pasadas (31-10): ?linea=contacto|encuesta (la línea de Próxima), ?pestana=pasadas[&vacia=1],
 * ?cena=c1&contacto=A|B|C|D|E|varias|varias-a|varias-m|nada (la vista de una cena, con su panel).
 * Carga (entrega carga, 05-11): ?estado=cargando (nunca contesta: esqueleto de la cerrada y, a los 8 s,
 * «Está tardando…»), caido (500: «Es cosa nuestra…»), lento (1,6 s y luego la abierta, con su fundido).
 * Con ?pestana=pasadas o ?cena=c1, el mismo estado vale para la lista y para la cena.
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
  { nombre: 'Bar Caracas', minutosAPie: 4, precio: '$', mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes' },
  { nombre: 'La Terraza de Juan', minutosAPie: 7, precio: '$$', mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes' },
  { nombre: 'Café Tostao', minutosAPie: null, mapa: null },
]
const ABIERTA: DeServidor = {
  fase: 'abierta', mesaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', numeroMesa: 4, formato: 'dinner', zonaHoraria: 'America/Caracas',
  empiezaEn: en(5), restaurante: 'Casa Bistró', direccion: 'Calle París con Av. Principal, Las Mercedes',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Las+Mercedes+Caracas', mapaApple: 'https://maps.apple.com/?q=Las+Mercedes+Caracas',
  companeros: CINCO, yaValoro: false, yaBloqueados: [], yaReporto: null,
}
// +1 acompañante (entrega mas-uno, 01-11): la cerrada de quien reserva, con su tarjeta en cada estado.
const CERRADA_MAS_UNO: DeServidor = { fase: 'cerrada', formato: 'dinner', zonaHoraria: 'America/Caracas', revelaEn: en(26), empiezaEn: en(34), zonas: ['Chacao', 'Los Palos Grandes'], reservaId: 'r' }
const masUno = (estado: 'sin-usar' | 'registrado' | 'confirmado' | 'cancelada', nombre: string | null = null) => ({
  enlace: 'https://aro.club/m/K7Q2MabcdefghijKLMNOp', estado, nombre, cierraEn: en(10), plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas'),
  mensaje: 'Te invito a una cena de Aro Club el viernes 6 a las 7:00 p.m., por Chacao o Los Palos Grandes. Vamos tú y yo, y otros dúos que no conocemos. Tu puesto ya está pagado: solo tienes que registrarte y verificarte antes del jueves 5 a las 7:00 p.m. https://aro.club/m/K7Q2MabcdefghijKLMNOp',
})
const DUOS = [
  { id: 'laura', nombre: 'Laura', sector: 'Diseño gráfico', vieneCon: 'yo' },
  { id: 'daniel', nombre: 'Daniel', sector: 'Música', vieneCon: 'luis' },
  { id: 'luis', nombre: 'Luis', sector: 'Ingeniería', vieneCon: 'daniel' },
  { id: 'sofia', nombre: 'Sofía', sector: 'Medicina', vieneCon: 'gabriela' },
  { id: 'gabriela', nombre: 'Gabriela', sector: 'Derecho', vieneCon: 'sofia' },
]
const ESTADOS: Record<string, DeServidor> = {
  revision: { fase: 'sin-reserva', estado: 'pending_verification' },
  'mas-uno': { ...CERRADA_MAS_UNO, masUno: masUno('sin-usar') },
  'mas-uno-registrado': { ...CERRADA_MAS_UNO, masUno: masUno('registrado', 'Laura') },
  'mas-uno-confirmado': { ...CERRADA_MAS_UNO, masUno: masUno('confirmado', 'Laura') },
  'mas-uno-cancelada': { fase: 'sin-reserva', estado: 'active', masUno: { ...masUno('cancelada', 'Laura'), cierraEn: en(-2), plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas') }, empiezaEn: en(22), zonaHoraria: 'America/Caracas', formato: 'dinner' },
  'mas-uno-pendiente': { fase: 'sin-reserva', estado: 'pending_verification', masUnoPendiente: { invita: 'Ana', eventoId: 'e', formato: 'dinner', empiezaEn: en(34), revelaEn: en(26), cierraEn: en(10), plazo: reglas.MAS_UNO.plazo(en(32), 'America/Caracas'), zonaHoraria: 'America/Caracas', zonas: ['Chacao', 'Los Palos Grandes'] } },
  'mas-uno-dentro': { ...CERRADA_MAS_UNO, vienesCon: 'Ana' },
  'mas-uno-abierta': { ...ABIERTA, companeros: DUOS },
  'sin-reserva': { fase: 'sin-reserva', estado: 'active' },
  'sin-mesa': { fase: 'sin-mesa', formato: 'dinner', empiezaEn: en(4), zonaHoraria: 'America/Caracas', creditoDevuelto: true },
  'sin-abono': { fase: 'sin-mesa', formato: 'dinner', empiezaEn: en(4), zonaHoraria: 'America/Caracas', creditoDevuelto: false },
  cerrada: { fase: 'cerrada', formato: 'dinner', zonaHoraria: 'America/Caracas', revelaEn: en(26), empiezaEn: en(34), zonas: ['Las Mercedes', 'Chacao', 'Altamira'], cambiarFecha: { puede: true, reservaId: 'r', destinos: [{ eventoId: 'b', empiezaEn: en(58), zonaHoraria: 'America/Caracas', formato: 'dinner', zonas: ['Chacao'] }] } },
  'cerrada-tarde': { fase: 'cerrada', formato: 'dinner', zonaHoraria: 'America/Caracas', revelaEn: en(6), empiezaEn: en(14), zonas: ['Las Mercedes'], cambiarFecha: { puede: false, motivo: 'tarde', reservaId: 'r', destinos: [] } },
  abierta: { ...ABIERTA, companeros: CINCO.map((c, i) => ({ ...c, arraigo: ['mismos', 'se-quedo', 'volvio', null, 'interior'][i] ?? null })) },
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
  // Segundo acto (entrega 03-11): al mediodía, durante la cena y desde la hora del bar (sin bar aún, y con él).
  'segundo-antes': { ...ABIERTA, fotoEntrada: FACHADA, paraSeguir: SITIOS, segundoActo: true },
  'segundo-curso': { ...ABIERTA, empiezaEn: en(-72 / 60), fotoEntrada: FACHADA, paraSeguir: SITIOS, segundoActo: true },
  'segundo-sin-bar': { ...ABIERTA, empiezaEn: en(-125 / 60), fotoEntrada: FACHADA, segundoActo: true },
  'segundo-bar': {
    ...ABIERTA, empiezaEn: en(-125 / 60), fotoEntrada: FACHADA, paraSeguir: SITIOS, segundoActo: true,
    bar: { nombre: 'El Patio', direccion: 'Avenida Francisco de Miranda con calle Páez, Chacao', minutosAPie: 6, mapa: 'https://www.google.com/maps/search/?api=1&query=El+Patio' },
  },
  unica: { ...ABIERTA, mesaUnica: true, fotoEntrada: FACHADA },
  // La grabación: sin contestar (sale a los 6 s), y ya contestada.
  graba: { ...ABIERTA, fotoEntrada: FACHADA, eventoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', grabamos: true, permisoGrabacion: null },
  grabado: { ...ABIERTA, fotoEntrada: FACHADA, eventoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', grabamos: true, permisoGrabacion: true },
  'grabado-movimiento': { ...ABIERTA, formato: 'walk', eventoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', grabamos: true, permisoGrabacion: false },
  // Los ajustes de última hora.
  'ajuste-cancelo': { ...ABIERTA, companeros: CINCO.slice(0, 4), ajustes: { alguienCancelo: true, sonCuantos: 5, caben: 6, teMovimos: false, seSumoAlguien: false } },
  'ajuste-suma': { ...ABIERTA, ajustes: { alguienCancelo: false, sonCuantos: 6, caben: 6, teMovimos: false, seSumoAlguien: true } },
  'ajuste-ambos': { ...ABIERTA, ajustes: { alguienCancelo: true, sonCuantos: 6, caben: 6, teMovimos: false, seSumoAlguien: true } },
  'ajuste-movido': { ...ABIERTA, ajustes: { alguienCancelo: false, sonCuantos: 6, caben: 6, teMovimos: true, seSumoAlguien: false } },
  pasada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10) },
  // La encuesta ya no caduca (8dc6b47): una cena de hace un mes lleva su fecha en el sello.
  'pasada-vieja': { ...ABIERTA, fase: 'pasada', empiezaEn: en(-24 * 30) },
  valorada: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-10), yaValoro: true, yaBloqueados: [CINCO[2].id], yaReporto: CINCO[2].id },
  // El brunch con la Mi mesa completa (24-10): juego sí, bares no, y su voz.
  brunch: { ...ABIERTA, formato: 'brunch', empiezaEn: en(-110 / 60), fotoEntrada: FACHADA, paraSeguir: [] },
  'brunch-antes': { ...ABIERTA, formato: 'brunch', fotoEntrada: FACHADA, paraSeguir: [] },
  'brunch-graba': { ...ABIERTA, formato: 'brunch', fotoEntrada: FACHADA, eventoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', grabamos: true, permisoGrabacion: null },
  'brunch-cancelo': { ...ABIERTA, formato: 'brunch', companeros: CINCO.slice(0, 4), ajustes: { alguienCancelo: true, sonCuantos: 5, caben: 6, teMovimos: false, seSumoAlguien: false } },
  'brunch-pasada': { ...ABIERTA, formato: 'brunch', fase: 'pasada', empiezaEn: en(-20) },
}

const DIA = 24 * 3600_000
const cierra = new Date(Date.now() + 6 * DIA + 3600_000).toISOString()
const persona = (id: string, nombre: string, estado: Persona['estado'], extra: Partial<Persona> = {}): Persona => ({ id, coincidencia: 'k' + id, nombre, estado, cierraEn: cierra, suyos: null, nuevo: false, ...extra })
const SUYOS = { telefono: '+58 414 555 0188', instagram: 'andrea.mv', tiktok: 'andreamv' }
const CONTACTOS: Record<string, Persona[]> = {
  nada: [],
  A: [persona('11111111-1111-1111-1111-111111111111', 'Andrea', 'A', { nuevo: true })],
  B: [persona('11111111-1111-1111-1111-111111111111', 'Andrea', 'B')],
  C: [persona('11111111-1111-1111-1111-111111111111', 'Andrea', 'C', { suyos: SUYOS })],
  D: [persona('11111111-1111-1111-1111-111111111111', 'Andrea', 'D')],
  E: [persona('11111111-1111-1111-1111-111111111111', 'Andrea', 'E')],
  varias: [persona('1', 'Andrea', 'A'), persona('2', 'Luis', 'A')],
  // Ya compartió con Andrea y a Luis le falta responder: «POR CONFIRMAR».
  'varias-a': [persona('1', 'Andrea', 'C', { suyos: { telefono: '+58 414 555 0188', instagram: 'andrea.mv', tiktok: null } }), persona('2', 'Luis', 'A')],
  'varias-m': [persona('1', 'Andrea', 'C', { suyos: { telefono: '+58 414 555 0188', instagram: 'andrea.mv', tiktok: null } }), persona('2', 'Luis', 'B'), persona('3', 'Carla', 'E')],
}
const PASADAS: DePasadas = {
  senal: true,
  linea: null,
  cenas: [
    { mesaId: 'c1', eventoId: 'e1', empiezaEn: en(-2 * 24 - 4), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: 'Cardenal', zona: 'Chacao', numeroMesa: 4, companeros: [], encuesta: { pendiente: false, contadaEn: en(-24) }, contacto: { porConfirmar: ['Andrea'], cierraEn: cierra, cruzadas: [], nuevo: null }, pendiente: 'contacto', nuevo: false },
    { mesaId: 'c2', eventoId: 'e2', empiezaEn: en(-6 * 24 - 20), zonaHoraria: 'America/Caracas', formato: 'brunch', sitio: 'Bruma', zona: 'Los Palos Grandes', numeroMesa: 2, companeros: [], encuesta: { pendiente: false, contadaEn: en(-5 * 24) }, contacto: { porConfirmar: [], cierraEn: cierra, cruzadas: ['Luis'], nuevo: { tipo: 'cruce', nombres: ['Luis'] } }, pendiente: null, nuevo: true },
    { estado: 'cancelada', mesaId: null, eventoId: 'e9', empiezaEn: en(-10 * 24), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: null, zona: null, numeroMesa: null, companeros: [], encuesta: { pendiente: false, contadaEn: null }, contacto: null, pendiente: null, nuevo: false },
    { estado: 'cancelada-ops', mesaId: null, eventoId: 'e9b', empiezaEn: en(-12 * 24), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: null, zona: null, numeroMesa: null, companeros: [], encuesta: { pendiente: false, contadaEn: null }, contacto: null, pendiente: null, nuevo: false },
    { mesaId: 'c3', eventoId: 'e3', empiezaEn: en(-15 * 24), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: 'Olivo', zona: 'Altamira', numeroMesa: 1, companeros: [], encuesta: { pendiente: false, contadaEn: en(-14 * 24) }, contacto: null, pendiente: null, nuevo: false, preguntarContacto: true },
    { estado: 'sin-mesa', mesaId: null, eventoId: 'e8', empiezaEn: en(-22 * 24), zonaHoraria: 'America/Caracas', formato: 'drinks', sitio: null, zona: null, numeroMesa: null, companeros: [], encuesta: { pendiente: false, contadaEn: null }, contacto: null, pendiente: null, nuevo: false },
    { estado: 'no-fue', mesaId: null, eventoId: 'e7', empiezaEn: en(-30 * 24), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: null, zona: null, numeroMesa: null, companeros: [], encuesta: { pendiente: false, contadaEn: null }, contacto: null, pendiente: null, nuevo: false },
  ],
}

function Pantalla() {
  const { estado = 'abierta', captura, tope, linea, pestana, vacia, cena, contacto = 'A' } = useLocalSearchParams<{ estado?: string; captura?: string; tope?: string; linea?: string; pestana?: string; vacia?: string; cena?: string; contacto?: string }>()
  const espera = () => new Promise((ok) => setTimeout(ok, 600))
  const servicio = useMemo((): ReturnType<typeof crearServicioMesa> => ({
    async mesa() {
      if (estado === 'fallo') return { ok: false, error: 'No pudimos cargar tu mesa. Revisa tu conexión e inténtalo otra vez.' }
      if (estado === 'cargando') return new Promise(() => {})
      if (estado === 'caido') return { ok: false, error: 'Error del servidor', status: 500 }
      if (estado === 'lento') await new Promise((ok) => setTimeout(ok, 1600))
      const base = ESTADOS[estado] ?? ABIERTA
      const d: DeServidor = linea
        ? { ...base, senalPasadas: true, pendiente: { tipo: linea === 'encuesta' ? 'encuesta' : 'contacto', mesaId: 'c1', empiezaEn: en(-2 * 24 - 4), zonaHoraria: 'America/Caracas', nombres: ['Andrea'], cierraEn: cierra } }
        : base
      // ?captura=1: el sábado a las 7 p.m., y los cinco con su sector, para las capturas de las tiendas.
      return { ok: true, datos: captura ? { ...d, empiezaEn: sabado(0), companeros: CINCO.map((c) => ({ ...c, sector: c.sector ?? 'Educación' })) } : d }
    },
    async tarde(minutos) {
      await espera()
      return { ok: true, datos: { avisado: true, minutos } }
    },
    async valorar(_mesa, v) {
      await espera()
      console.log('[catálogo] valorar', v)
      const avisoSitio = tope && v.noRepetirSitio ? 'Ya tienes 2 sitios marcados: La Ventana y Madre. Tu valoración sí quedó guardada. Si quieres marcar este, quita uno en tu perfil.' : null
      return { ok: true, datos: { avisoSitio } }
    },
    async contacto(_mesa, aQuien) {
      await espera()
      console.log('[catálogo] contacto suelto', aQuien)
      return { ok: true, datos: { ok: true } }
    },
    async saltar() {
      await espera()
      console.log('[catálogo] saltar')
      return { ok: true, datos: { estado: 'saltada' } }
    },
    async grabacion(_evento, permite) {
      await espera()
      return { ok: true, datos: { estado: 'guardado', permite } }
    },
    async reportar() {
      await espera()
      return { ok: true, datos: { ok: true } }
    },
    async cambiarAcompanante() {
      await espera()
      return { ok: true, datos: { masUno: masUno('sin-usar') } }
    },
  }), [estado, captura, tope, linea]) // estable: si no, la carga se relanzaría en cada render
  const pasadas = useMemo((): ReturnType<typeof crearServicioPasadas> => {
    let personas = CONTACTOS[contacto] ?? CONTACTOS.A
    const misDatos = { telefono: '+58 412 555 0123', instagram: personas.some((x) => x.estado !== 'A') ? 'vale.gm' : null, tiktok: null, guardados: personas.some((x) => x.estado !== 'A') }
    const objeto = (): DeContacto => ({ mesaId: 'c1', eventoId: 'e1', cena: { empiezaEn: en(-2 * 24 - 4), zonaHoraria: 'America/Caracas', formato: 'dinner', zona: 'Chacao' }, misDatos, personas })
    return {
      async lista() {
        if (estado === 'cargando') return new Promise(() => {})
        if (estado === 'caido') return { ok: false, error: 'Error del servidor', status: 500 }
        if (estado === 'fallo') return { ok: false, error: 'No pudimos cargar tus cenas.' }
        await (estado === 'lento' ? new Promise((ok) => setTimeout(ok, 1600)) : espera())
        return { ok: true, datos: vacia ? { cenas: [], linea: null, senal: false } : PASADAS }
      },
      async cena() {
        if (estado === 'cargando') return new Promise(() => {})
        if (estado === 'caido') return { ok: false, error: 'Error del servidor', status: 500 }
        await (estado === 'lento' ? new Promise((ok) => setTimeout(ok, 1600)) : espera())
        return { ok: true, datos: { ...ABIERTA, fase: 'pasada', empiezaEn: en(-2 * 24 - 4), restaurante: 'Cardenal', zonas: ['Chacao'], yaValoro: contacto !== 'nada' } }
      },
      async contacto() {
        await espera()
        return { ok: true, datos: objeto() }
      },
      async accion(_mesa, a) {
        await espera()
        console.log('[catálogo] contacto', a)
        // Lo que haría el servidor, a grandes rasgos, para ver el siguiente estado.
        if (a.accion === 'compartir') personas = personas.map((x) => (a.con.includes(x.id) ? { ...x, estado: 'B' } : a.sin?.includes(x.id) ? { ...x, estado: 'E' } : x))
        if (a.accion === 'no') personas = personas.map((x) => (!a.con || a.con.includes(x.id) ? { ...x, estado: 'E' } : x))
        if (a.accion === 'reabrir') personas = personas.map((x) => (a.con.includes(x.id) ? { ...x, estado: 'A' } : x))
        if (a.accion === 'compartir') Object.assign(misDatos, { telefono: a.telefono, instagram: a.instagram ?? null, tiktok: a.tiktok ?? null, guardados: true })
        return { ok: true, datos: objeto() }
      },
    }
  }, [contacto, vacia, estado])
  return (
    <MiMesa
      key={estado + (cena ?? '') + (pestana ?? '')}
      servicio={servicio}
      pasadas={pasadas}
      cena={cena ?? null}
      pestana={pestana ?? null}
      // El juego se abre de verdad (entrega 20); lo demás solo se anota.
      ir={(d) => (d.startsWith('/juego') ? router.push(d.replace('/juego', '/catalogo-juego') as never) : console.log('[catálogo] ir a', d))}
      alEntrar={() => router.push('/entrar')}
      alSalir={async () => router.push('/')}
    />
  )
}

export default soloDesarrollo(Pantalla)
