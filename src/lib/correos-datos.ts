import 'server-only'

import type { Correo } from '@/lib/correos'
import { firmarBaja } from '@/lib/baja-token'
import { firmar } from '@/lib/lead-token'
import { SITIO } from '@/lib/remitente'
import { vozDe } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Valores } from '@/lib/plantillas'

/**
 * De una fila de la cola a los datos que pinta la plantilla.
 *
 * El payload guarda lo que solo sabía quien encoló —el motivo de un rechazo,
 * si la cancelación lleva cortesía—, pero lo demás se vuelve a leer de la
 * base al mandar y no se copia al encolar. La razón es que entre encolar y
 * mandar pueden pasar días: el correo de la mesa se programa al publicar y
 * sale el jueves a mediodía, y si el sitio cambió por el camino, el correo
 * tiene que decir el sitio nuevo. Un payload con todo dentro es una foto
 * vieja que se manda como si fuera de hoy.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const EN_LETRA = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once']

/** Caracas, cuatro horas por detrás. Todo lo que lee una persona va en su hora. */
function enCaracas(iso: string): Date {
  return new Date(new Date(iso).getTime() - 4 * 3600_000)
}

function diaTexto(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = enCaracas(iso)
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`
}

function horaTexto(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = enCaracas(iso)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

function horaEnLetra(iso: string | null | undefined): string {
  if (!iso) return ''
  return EN_LETRA[enCaracas(iso).getUTCHours() % 12] ?? ''
}

const bs = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`

const usd = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

export type FilaDeCola = {
  id: string
  profile_id: string | null
  email: string | null
  kind: Correo
  event_id: string | null
  payload: Record<string, unknown> | null
}

export type Preparado = { a: string; datos: Valores } | { error: string }

export async function prepararCorreo(fila: FilaDeCola): Promise<Preparado> {
  const admin = createAdminClient()
  const p = (fila.payload ?? {}) as Record<string, unknown>

  // A quién. Un perfil borrado no recibe nada: `deleted_at` es una baja, y
  // escribir a quien se dio de baja es justo lo que pidió que no pasara.
  let a = fila.email ?? ''
  let trato = ''

  if (fila.profile_id) {
    const { data: perfil } = await admin
      .from('profiles')
      .select('email, contact_email, display_name, full_name, deleted_at')
      .eq('id', fila.profile_id)
      .maybeSingle()

    if (!perfil) return { error: 'ese perfil ya no existe' }
    if (perfil.deleted_at) return { error: 'se dio de baja' }

    a = perfil.contact_email || perfil.email || a
    trato = perfil.display_name || perfil.full_name?.split(' ')[0] || ''
  }

  if (!a) return { error: 'sin dirección a la que escribir' }

  // La fecha, si el correo cuelga de una.
  let evento: {
    starts_at: string
    format: string
    zone_slug: string | null
  } | null = null

  if (fila.event_id) {
    const { data } = await admin
      .from('events')
      .select('starts_at, format, zone_slug')
      .eq('id', fila.event_id)
      .maybeSingle()
    evento = data ?? null
  }

  // Hay correos que NO se entienden sin su fecha: «El {{cuando}} no sale» sin
  // fecha sale como «El no sale». Antes de pintar una frase rota, no se
  // manda: un correo raro se lee peor que uno que no llega, y este se puede
  // reencolar cuando el dato esté.
  //
  // Los dos del pago —`pago_confirmado` y `pago_no_cuadra`— NO están aquí, y
  // es a propósito. Sus plantillas también nombran la fecha, y el panel los
  // encolaba sin evento: de ahí la frase coja «Tu reserva del pasa de
  // pendiente a confirmada». Eso se arregla pasando el evento al encolar, que
  // es donde estaba el fallo.
  //
  // Meterlos en esta lista habría sido peor: un correo que no se puede armar
  // se CIERRA ahí abajo y no se reintenta nunca. Para un acuse de dinero, no
  // llegar es peor que llegar con una frase fea — la persona se queda sin el
  // comprobante que le pedimos que guarde y nadie se entera.
  const NECESITAN_FECHA: Correo[] = [
    'mesa_asignada', 'recordatorio', 'cancelacion', 'fecha_cancelada', 'abrimos_zona',
  ]
  if (NECESITAN_FECHA.includes(fila.kind) && !evento) {
    return { error: 'ese correo necesita su fecha y no la tiene' }
  }

  const voz = vozDe(evento?.format ?? (p.formato as string) ?? null)

  // «Ajustes de correo» del pie, con dos destinos según quién abra.
  //
  // Los trece correos apuntaban a `/cuenta`, que exige sesión. Y quien recibe
  // la bienvenida NO tiene cuenta: dejó su dirección y se quedó a medias, así
  // que para esa persona el enlace no llevaba a ningún sitio. Un enlace de
  // baja que no funciona no es solo feo; en varias jurisdicciones no es legal.
  //
  // Con cuenta va a sus ajustes, donde hay un interruptor por tipo de aviso.
  // Sin cuenta va a la pantalla de baja, con el token firmado en la URL: sin
  // sesión, la firma es lo único que impide dar de baja a cualquiera poniendo
  // su dirección a mano.
  const enlaceAjustes = fila.profile_id
    ? `${SITIO}/cuenta`
    : `${SITIO}/baja?correo=${encodeURIComponent(a)}&token=${encodeURIComponent(firmarBaja(a))}`

  const base: Valores = {
    trato,
    correo: a,
    enlaceAjustes,
    ciudad: 'Caracas',
    cuando: diaTexto(evento?.starts_at),
    hora: horaTexto(evento?.starts_at),
    horaEnLetra: horaEnLetra(evento?.starts_at),
    unidad: voz.unidad,
    Unidad: voz.Unidad,
    art: voz.art,
    TU: voz.TU,
    conQuien: voz.unidad === 'mesa' ? 'CON QUIÉN CENAS' : 'CON QUIÉN VAS',
    alGrupo: voz.unidad === 'mesa' ? ' la mesa' : 'l grupo',
  }

  switch (fila.kind) {
    // --- el embudo ------------------------------------------------------
    case 'bienvenida': {
      // Las zonas que dijo que acepta, para no prometerle mesa en un sitio
      // al que no puede ir.
      const zonas = await nombresDeZonas(admin, (p.zonas as string[]) ?? [], fila.profile_id)
      return {
        a,
        datos: {
          ...base,
          zonaPrincipal: zonas[0] ?? 'tu zona',
          zonas: zonas.length ? unirCon(zonas, ' o ') : 'tu zona',
          // El pie de la tarjeta. En minúscula, como lo diseñó Design, pero
          // con la zona de verdad y no con «las mercedes» escrito a mano.
          pieDeZona: zonas.length ? `jueves · ${zonas[0].toLowerCase()}` : 'jueves',
          // El botón. NO puede ser `/cuestionario` a secas.
          //
          // Este correo lo recibe quien dejó su correo y se quedó a medias: no
          // tiene cuenta, así que al pulsar no continuaría nada, empezaría de
          // cero. El token firmado es justo el mecanismo que ya existe para
          // seguir el alta desde otro dispositivo, y este es su caso exacto.
          //
          // Y para quien SÍ tiene cuenta —el empujón de «te falta verificar»—
          // el botón lleva a verificación, que es su siguiente paso de verdad.
          enlaceSeguir: fila.profile_id
            ? `${SITIO}/verificacion`
            : `${SITIO}/cuestionario?t=${encodeURIComponent(firmar(a))}`,
        },
      }
    }

    case 'cuenta_lista':
      return { a, datos: { ...base, correo: a } }

    case 'verificacion': {
      // Las dos próximas fechas abiertas, que es la razón del correo: ya
      // puede reservar, y esto es lo que hay.
      const proximas = await proximasFechas(admin)
      return {
        a,
        datos: { ...base, proxima1: proximas[0] ?? 'Te avisamos en cuanto abramos una', proxima2: proximas[1] ?? '' },
      }
    }

    case 'verificacion_rechazada': {
      const motivo = await textoDelMotivo(admin, p.motivo as string)
      return { a, datos: { ...base, motivo } }
    }

    case 'restablecer_clave':
      return { a, datos: { ...base, enlace: (p.enlace as string) ?? '' } }

    // --- la mesa --------------------------------------------------------
    case 'mesa_asignada':
    case 'recordatorio': {
      if (!fila.event_id) return { error: 'sin fecha' }
      const mesa = await laMesaDe(admin, fila.event_id, fila.profile_id)
      if (!mesa) return { error: 'sin mesa asignada' }
      return { a, datos: { ...base, ...mesa } }
    }

    // --- el dinero ------------------------------------------------------
    case 'pago_en_revision':
    case 'pago_confirmado':
    case 'pago_no_cuadra': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return { a, datos: { ...base, ...pago, motivo: (p.motivo as string) ?? '' } }
    }

    // --- lo que se cae --------------------------------------------------
    case 'cancelacion': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return {
        a,
        datos: {
          ...base,
          queEra: nombreDelFormato(evento?.format),
          zona: (await nombresDeZonas(admin, evento?.zone_slug ? [evento.zone_slug] : []))[0] ?? '',
          referencia: pago.referencia,
        },
      }
    }

    case 'fecha_cancelada': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return { a, datos: { ...base, conCortesia: p.conCortesia === true, referencia: pago.referencia } }
    }

    case 'abrimos_zona': {
      const zonas = await nombresDeZonas(admin, (p.zonas as string[]) ?? [])
      return {
        a,
        datos: {
          ...base,
          zona: zonas[0] ?? '',
          cuandoFrase: evento?.starts_at ? `El primero es el ${diaTexto(evento.starts_at)}.` : '',
          horaFrase: evento?.starts_at ? `A las ${horaEnLetra(evento.starts_at)}` : '',
        },
      }
    }
  }

  return { error: 'tipo desconocido' }
}

// ---------------------------------------------------------------------
// Los pedazos, cada uno con una sola consulta
// ---------------------------------------------------------------------

type Admin = ReturnType<typeof createAdminClient>

const FORMATOS: Record<string, string> = {
  dinner: 'Cena', foodie_dinner: 'Cena foodie', women_dinner: 'Cena de mujeres',
  drinks: 'Drinks', coffee: 'Coffee', walk: 'Caminata', hike: 'Senderismo',
  run: 'Correr', padel: 'Pádel', pilates: 'Pilates', cycling: 'Ciclismo',
}

function nombreDelFormato(f: string | null | undefined): string {
  return FORMATOS[f ?? ''] ?? 'Cena'
}

function unirCon(xs: string[], y: string): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')}${y}${xs[xs.length - 1]}`
}

async function nombresDeZonas(admin: Admin, slugs: string[], perfilId?: string | null): Promise<string[]> {
  let lista = slugs
  // Sin slugs en el payload se miran las suyas: es el caso de la bienvenida,
  // que se encola sin saber todavía qué contestó.
  if (!lista.length && perfilId) {
    const { data } = await admin
      .from('profile_traits')
      .select('zones')
      .eq('profile_id', perfilId)
      .maybeSingle()
    lista = (data?.zones ?? []) as string[]
  }
  if (!lista.length) return []

  const { data } = await admin.from('zones').select('slug, name').in('slug', lista)
  // En el orden en que venían, no en el que devuelva la base.
  return lista.map((s) => (data ?? []).find((z) => z.slug === s)?.name ?? s).filter(Boolean)
}

async function proximasFechas(admin: Admin): Promise<string[]> {
  const { data } = await admin
    .from('events')
    .select('starts_at, format, event_venues(zones(name))')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date().toISOString())
    .order('starts_at')
    .limit(2)

  return (data ?? []).map((e) => {
    const zonas = ((e.event_venues ?? []) as unknown as { zones: { name: string } | null }[])
      .map((v) => v.zones?.name)
      .filter(Boolean)
    return [nombreDelFormato(e.format), diaTexto(e.starts_at), zonas.join(' y ')].filter(Boolean).join(' · ')
  })
}

async function textoDelMotivo(admin: Admin, codigo: string | undefined): Promise<string> {
  if (!codigo) return 'hay que repetir la foto.'
  const { data } = await admin
    .from('verification_rejection_reasons')
    .select('message')
    .eq('code', codigo)
    .maybeSingle()
  return data?.message ?? 'hay que repetir la foto.'
}

async function laMesaDe(admin: Admin, eventoId: string, perfilId: string | null) {
  if (!perfilId) return null

  const { data: fila } = await admin
    .from('table_members')
    .select('table_id, dinner_tables!inner(table_number, event_id, restaurants(name, address, maps_url, zone_slug))')
    .eq('profile_id', perfilId)
    .eq('dinner_tables.event_id', eventoId)
    .maybeSingle()

  if (!fila) return null

  const mesa = fila.dinner_tables as unknown as {
    table_number: number
    restaurants: { name: string; address: string; maps_url: string | null; zone_slug: string | null } | null
  }

  const { data: otros } = await admin
    .from('table_members')
    .select('profile_id, seat_order, profiles(display_name, full_name)')
    .eq('table_id', fila.table_id)
    .neq('profile_id', perfilId)
    .order('seat_order')

  const { data: rasgos } = await admin
    .from('profile_traits')
    .select('profile_id, industry')
    .in('profile_id', (otros ?? []).map((o) => o.profile_id))

  // El sector se guarda con su código estable —`construccion`, `diseno`— que
  // no es lo que se lee. La etiqueta vive en las opciones de la pregunta, y
  // se resuelve ahí igual que en Mi mesa y en el panel: un mapa escrito aquí
  // sería un tercer catálogo desincronizándose a su ritmo.
  const { data: pregunta } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiqueta = new Map(
    ((pregunta?.options ?? []) as { value: string; label: string }[]).map((o) => [o.value, o.label]),
  )

  const sector = new Map(
    (rasgos ?? []).map((r) => [r.profile_id, r.industry ? (etiqueta.get(r.industry) ?? r.industry) : '']),
  )
  const zonas = mesa.restaurants?.zone_slug
    ? await nombresDeZonas(admin, [mesa.restaurants.zone_slug])
    : []

  const numero = String(mesa.table_number).padStart(2, '0')
  const direccion = mesa.restaurants?.address ?? ''

  return {
    numero,
    sitio: mesa.restaurants?.name ?? '',
    direccion,
    zona: zonas[0] ?? '',
    // El de la ficha si lo tiene; si no, uno construido, que es mejor que un
    // botón que no lleva a ningún sitio.
    mapa: mesa.restaurants?.maps_url ||
      `https://maps.google.com/?q=${encodeURIComponent(`${mesa.restaurants?.name ?? ''} ${direccion}`)}`,
    comoLlegar: `la mesa de Aro, la ${numero}`,
    gente: (otros ?? []).map((o) => {
      const quien = o.profiles as unknown as { display_name: string | null; full_name: string | null } | null
      const nombre = quien?.display_name || quien?.full_name?.split(' ')[0] || '—'
      return { nombre, inicial: nombre.charAt(0), sector: sector.get(o.profile_id) ?? '' }
    }),
  }
}

async function elPagoDe(admin: Admin, perfilId: string | null, eventoId: string | null) {
  const vacio = { referencia: '—', montoLocal: '—', montoUsd: '—', tasa: '—' }
  if (!perfilId) return vacio

  let consulta = admin
    .from('payments')
    .select('amount_usd, amount_local, fx_rate, datos, reference_code, booking_id, bookings(event_id)')
    .eq('profile_id', perfilId)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data } = await consulta
  const pago = (data ?? [])[0]
  if (!pago) return vacio

  // Si el correo es de una fecha concreta y el último pago es de otra, no se
  // enseña: un importe que no es el suyo es peor que un guión.
  if (eventoId) {
    const dela = (pago.bookings as unknown as { event_id: string } | null)?.event_id
    if (dela && dela !== eventoId) return vacio
  }

  const datos = (pago.datos ?? {}) as Record<string, unknown>
  // De su columna, con respaldo en `datos.ref` para los pagos de antes de que
  // se empezara a escribir. Buscaba `datos.referencia`, `datos.codigo` y
  // `datos.telefono`, tres claves que NINGÚN método usa —los campos se llaman
  // `ref`, `tel` y `banco`—, así que el comprobante decía «Referencia: —»
  // siempre. Y dos líneas más abajo el mismo correo le pide que lo guarde
  // «por si algo no cuadra»: le pedíamos guardar el comprobante sin el único
  // dato con el que se cuadra algo.
  const ref = pago.reference_code ?? datos.ref

  return {
    referencia: ref != null ? String(ref) : '—',
    montoLocal: bs(pago.amount_local),
    montoUsd: usd(pago.amount_usd),
    tasa: pago.fx_rate != null ? Number(pago.fx_rate).toLocaleString('es-VE', { maximumFractionDigits: 2 }) : '—',
  }
}
