import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { cabeEnLaFecha } from '@/lib/edad'
import { hablaElIdioma, nombreDeIdioma } from '@/lib/idioma'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Mover una reserva de una fecha a otra. Un solo sitio.
 *
 * Lo piden dos: operación desde el panel —Michael, 20-10, y el 28-10 para
 * cambiar también de DÍA— y la propia persona desde Mi mesa —29-10, lo que
 * hoy obliga a cancelar y volver a reservar—. Es la misma máquina con dos
 * conductores, y escrita dos veces acabaría siendo dos ideas distintas de
 * qué es mover una reserva: el día que una aprenda un candado y la otra no,
 * se rompe por el lado que nadie mira.
 *
 * LO QUE HACE ES UN UPDATE, no un cancelar y crear.
 *
 * Es la decisión que sostiene todo lo demás. La fila es la misma, así que
 * el id de la reserva no cambia y el pago viaja solo: está atado a la
 * reserva, no a la fecha. Si estaba en revisión, sigue en revisión. No se
 * cobra nada, no se devuelve nada y no se toca el crédito.
 *
 * Y por lo mismo no sale ningún correo de cancelación ni hay ninguna fila
 * cancelada: no se pasa por ahí. El índice único de los correos que
 * anuncian una vez —`(profile_id, kind, event_id)`— funciona en la fecha
 * nueva porque el `event_id` es otro.
 *
 * LO QUE NO HACE, a propósito:
 *
 *  · No avisa a nadie. Quien llama decide si hay que escribir y qué. Dentro
 *    de la misma noche no hace falta; cambiar de DÍA sí, y eso lo sabe la
 *    ruta, no esto.
 *  · No reparte. Las propuestas guardadas de las dos fechas se quedan
 *    viejas en el momento en que alguien se va de una a otra, y por eso
 *    devuelve `hayQueRepartir`.
 */

/** Las que ocupan sitio. Una cancelada no ocupa nada. */
const VIVAS = ['pending_payment', 'confirmed'] as const

/** Caracas va cuatro horas por detrás de UTC y no cambia con la estación. */
const CARACAS = 4
const diaDe = (iso: string) =>
  new Date(Date.parse(iso) - CARACAS * 3600_000).toISOString().slice(0, 10)

/**
 * Las reglas las pone QUIEN LLAMA, y van juntas en un objeto.
 *
 * Escrito como `if (quienLoPide === 'operacion')` repartido por dentro, cada
 * candado nuevo habría que acordarse de ponerlo en las dos ramas. Así cada
 * ruta declara su política de una vez y aquí solo se obedece: lo que no
 * esté escrito en su objeto, no pasa.
 */
export type Reglas = {
  /** Qué estados del destino se aceptan. */
  destinoAdmite: readonly ('open' | 'locked')[]
  /** Si el destino tiene que seguir abierto al público: sin cerrar y sin ser de prueba. */
  exigirDestinoAbiertoAlPublico: boolean
  /** Si se permite cambiar de DÍA, no solo de fecha dentro de la misma noche. */
  permitirOtroDia: boolean
  /** Horas mínimas hasta la fecha de ORIGEN. `null` es sin mínimo. */
  horasMinimasHastaElOrigen: number | null
  /** Si se prohíbe mover cuando la fecha de origen ya se reveló. */
  prohibirSiYaSeRevelo: boolean
  /** Saltarse edad e idioma. Solo operación, y solo pidiéndolo. */
  forzarEncaje: boolean
  /** Si se exige que las dos fechas valgan lo mismo. */
  exigirMismoPrecio: boolean
}

export type MotivoDeNo =
  | 'misma-fecha'
  | 'no-existe'
  | 'destino-no-admite'
  | 'destino-cerrado'
  | 'otro-dia'
  | 'no-encaja'
  | 'otro-precio'
  | 'sin-reserva'
  | 'tarde'
  | 'revelada'
  | 'mesa-publicada'
  | 'ya-apuntada'
  | 'fallo'

export type Movida =
  | {
    ok: true
    reservaId: string
    /** Dónde reservó originalmente, o `null` si volvió ahí. */
    reservoEn: string | null
    /** Si el cambio le cambia el DÍA, que es cuando hay que avisarle. */
    cambioDeDia: boolean
    /** Las dos propuestas se quedaron viejas. */
    hayQueRepartir: true
    /** Dónde estaba y con qué rastro, por si hay que deshacerlo. */
    deshacerCon: {
      volverA: string
      movida_de: string | null
      movida_at: string | null
      movida_por: string | null
    }
  }
  | { ok: false; motivo: MotivoDeNo; error: string }

export async function moverReserva(
  admin: SupabaseClient<Database>,
  datos: {
    perfilId: string
    desdeEventoId: string
    aEventoId: string
    /** Quién la mueve, para el rastro. La propia persona es su propio id. */
    movidaPor: string
    reglas: Reglas
  },
): Promise<Movida> {
  const { perfilId, desdeEventoId, aEventoId, movidaPor, reglas } = datos

  if (desdeEventoId === aEventoId) {
    return { ok: false, motivo: 'misma-fecha', error: 'Esa reserva ya está en esa fecha.' }
  }

  const { data: fechas } = await admin
    .from('events')
    .select('id, starts_at, reveal_at, booking_closes_at, status, idioma, es_prueba, price_usd, age_band_min, age_band_max')
    .in('id', [desdeEventoId, aEventoId])

  const desde = (fechas ?? []).find((e) => e.id === desdeEventoId)
  const a = (fechas ?? []).find((e) => e.id === aEventoId)
  if (!desde || !a) return { ok: false, motivo: 'no-existe', error: 'Esa fecha no existe.' }

  if (!(reglas.destinoAdmite as readonly string[]).includes(a.status)) {
    return {
      ok: false,
      motivo: 'destino-no-admite',
      error: 'Esa fecha no admite gente: está ' + a.status + '.',
    }
  }

  /**
   * Abierta al público es tres cosas, no una.
   *
   * Que el estado diga `open` no basta: una fecha de prueba también lo dice
   * y no la ve ningún miembro, y una fecha cuyo cierre ya pasó es una
   * puerta cerrada que el panel todavía no ha cerrado. Mandar a alguien
   * contra cualquiera de las dos es mandarlo a un sitio que no existe para
   * él.
   */
  if (reglas.exigirDestinoAbiertoAlPublico) {
    if (a.es_prueba) {
      return { ok: false, motivo: 'destino-cerrado', error: 'Esa fecha no existe.' }
    }
    if (a.booking_closes_at && Date.parse(a.booking_closes_at) <= Date.now()) {
      return { ok: false, motivo: 'destino-cerrado', error: 'Esa fecha ya cerró.' }
    }
    if (Date.parse(a.starts_at) <= Date.now()) {
      return { ok: false, motivo: 'destino-cerrado', error: 'Esa fecha ya pasó.' }
    }
  }

  const cambioDeDia = diaDe(desde.starts_at) !== diaDe(a.starts_at)
  if (cambioDeDia && !reglas.permitirOtroDia) {
    return {
      ok: false,
      motivo: 'otro-dia',
      error: 'Las dos fechas tienen que ser de la misma noche.',
    }
  }

  /**
   * ¿ENCAJA en la fecha de destino?
   *
   * La misma comprobación que hace `/api/reservar` cuando se apunta
   * alguien, leída desde el mismo sitio: dos ideas de quién cabe serían dos
   * respuestas distintas a la misma pregunta. La cena de +45 la eligieron
   * sus ocho personas porque era de +45, y meter ahí a alguien de 35 sin
   * que nadie lo diga rompe lo único que esa fecha prometía.
   */
  if (!reglas.forzarEncaje) {
    const { data: quien } = await admin
      .from('profiles')
      .select('birthdate')
      .eq('id', perfilId)
      .maybeSingle()

    const laBanda = a.age_band_min != null && a.age_band_max != null
      ? 'es para gente de ' + a.age_band_min + ' a ' + a.age_band_max + ' años'
      : a.age_band_min != null
        ? 'es para mayores de ' + a.age_band_min
        : 'es para menores de ' + a.age_band_max

    const estorbos: string[] = []
    if (!cabeEnLaFecha(quien?.birthdate, a)) estorbos.push('esa cena ' + laBanda)
    if (a.idioma && !(await hablaElIdioma(admin, perfilId, a.idioma))) {
      estorbos.push('esa mesa se habla en ' + nombreDeIdioma(a.idioma))
    }

    if (estorbos.length) {
      return {
        ok: false,
        motivo: 'no-encaja',
        error: 'Esa fecha no es para esta reserva: ' + estorbos.join(', y ') + '.',
      }
    }
  }

  /**
   * Y que las dos valgan lo mismo.
   *
   * El pago viaja con la fila y nadie recalcula nada, así que mover a una
   * fecha más cara deja a esa persona dentro habiendo pagado de menos, y a
   * una más barata, pagando de más sin que nadie le devuelva la diferencia.
   * Las fechas han valido 6,9, 7, 8 y 10 ref en distintos momentos, así que
   * no es hipotético.
   */
  if (reglas.exigirMismoPrecio && Number(desde.price_usd ?? 0) !== Number(a.price_usd ?? 0)) {
    return {
      ok: false,
      motivo: 'otro-precio',
      error: 'Esa fecha no vale lo mismo, y lo pagado viaja con la reserva.',
    }
  }

  const { data: suya } = await admin
    .from('bookings')
    .select('id, status, movida_de, movida_at, movida_por')
    .eq('profile_id', perfilId)
    .eq('event_id', desdeEventoId)
    .in('status', [...VIVAS])
    .maybeSingle()

  if (!suya) {
    return { ok: false, motivo: 'sin-reserva', error: 'No hay reserva viva en esa fecha.' }
  }

  /**
   * El margen se mide contra la fecha de ORIGEN, no la de destino.
   *
   * Es la misma frontera que cancelar con crédito: lo que protege es al
   * restaurante de la noche que se deja, que es el que tiene la mesa
   * apartada. Medirlo contra el destino dejaría irse de una cena que
   * empieza en una hora.
   */
  if (reglas.horasMinimasHastaElOrigen != null) {
    const faltan = (Date.parse(desde.starts_at) - Date.now()) / 3600_000
    if (faltan < reglas.horasMinimasHastaElOrigen) {
      return {
        ok: false,
        motivo: 'tarde',
        error: `Ya no se puede cambiar: faltan menos de ${reglas.horasMinimasHastaElOrigen} horas.`,
      }
    }
  }

  if (reglas.prohibirSiYaSeRevelo && desde.reveal_at && Date.parse(desde.reveal_at) <= Date.now()) {
    return {
      ok: false,
      motivo: 'revelada',
      error: 'Esa mesa ya está revelada: hay cinco personas que cuentan contigo.',
    }
  }

  /**
   * Y si ya está sentada en una mesa PUBLICADA, no se mueve.
   *
   * Publicar manda seis correos con la mesa dentro. Cambiarle la fecha
   * después dejaría su pantalla diciendo una cosa y la base otra. Se
   * despublica a propósito y luego se mueve.
   */
  const { data: sentada } = await admin
    .from('table_members')
    .select('table_id, dinner_tables!inner(event_id)')
    .eq('profile_id', perfilId)
    .eq('dinner_tables.event_id', desdeEventoId)
    .maybeSingle()

  if (sentada) {
    return {
      ok: false,
      motivo: 'mesa-publicada',
      error: 'Esa reserva ya está en una mesa publicada.',
    }
  }

  /**
   * Y la fecha de destino no puede tener ya una reserva suya.
   *
   * `bookings` es única por (evento, persona). Si tiene una CANCELADA ahí
   * —se apuntó, se bajó, y ahora vuelve— el update chocaría con esa fila,
   * así que se quita: una reserva cancelada no es historia que haga falta
   * conservar en la misma fecha a la que vuelve.
   */
  const { data: enDestino } = await admin
    .from('bookings')
    .select('id, status')
    .eq('profile_id', perfilId)
    .eq('event_id', aEventoId)
    .maybeSingle()

  if (enDestino) {
    if ((VIVAS as readonly string[]).includes(enDestino.status)) {
      return { ok: false, motivo: 'ya-apuntada', error: 'Ya hay una reserva en esa fecha.' }
    }
    await admin.from('bookings').delete().eq('id', enDestino.id)
  }

  /**
   * Se conserva la fecha ORIGINAL, no la anterior: si se mueve dos veces,
   * la etiqueta tiene que seguir diciendo dónde reservó.
   *
   * Y si vuelve a donde reservó, el rastro se borra. Mover y deshacer tiene
   * que dejarlo como estaba; sin esto, devolver a alguien a su fecha la
   * dejaba con un «reservó en» que apunta a esa misma fecha.
   */
  const vuelveACasa = suya.movida_de === aEventoId

  const { error } = await admin
    .from('bookings')
    .update({
      event_id: aEventoId,
      movida_de: vuelveACasa ? null : (suya.movida_de ?? desdeEventoId),
      movida_at: vuelveACasa ? null : new Date().toISOString(),
      movida_por: vuelveACasa ? null : movidaPor,
    } as never)
    .eq('id', suya.id)

  if (error) {
    console.error('[mover-reserva]', error)
    return { ok: false, motivo: 'fallo', error: 'No pudimos moverla.' }
  }

  return {
    ok: true,
    reservaId: suya.id,
    reservoEn: vuelveACasa ? null : (suya.movida_de ?? desdeEventoId),
    cambioDeDia,
    hayQueRepartir: true,
    deshacerCon: {
      volverA: desdeEventoId,
      movida_de: suya.movida_de,
      movida_at: suya.movida_at,
      movida_por: suya.movida_por,
    },
  }
}

/**
 * DESHACER una movida porque no pudimos avisar.
 *
 * Mover a alguien de día y que el aviso no salga es dejarlo yendo la noche
 * que no es, que es justo lo que ese correo existe para evitar. Entre las
 * dos cosas malas —no moverla, o moverla a escondidas— la mala de verdad es
 * la segunda: la primera la persona la ve en el momento y vuelve a
 * intentarlo.
 *
 * No pasa por `moverReserva`: aquello comprueba el mundo otra vez —horas,
 * revelación, precio— y aquí no hay nada que comprobar, solo devolver la
 * fila a donde estaba. Volver a pasar por los candados podría negarse a
 * deshacer lo que acabamos de hacer.
 *
 * Esto se escribió el 29-10, probando: el valor `fecha_cambiada` no estaba
 * en el enum `email_kind_t` de la base, así que el INSERT se caía y la
 * reserva se movía sin que saliera nada. La migración lo arregla; esto
 * impide que vuelva a importar.
 */
export async function deshacerMovida(
  admin: SupabaseClient<Database>,
  reservaId: string,
  volverA: string,
  rastroAnterior: { movida_de: string | null; movida_at: string | null; movida_por: string | null },
): Promise<boolean> {
  const { error } = await admin
    .from('bookings')
    .update({
      event_id: volverA,
      movida_de: rastroAnterior.movida_de,
      movida_at: rastroAnterior.movida_at,
      movida_por: rastroAnterior.movida_por,
    } as never)
    .eq('id', reservaId)

  if (error) {
    // Y si ni siquiera se puede deshacer, que grite: esa persona está movida
    // y sin avisar, y alguien lo tiene que arreglar a mano.
    console.error('[mover-reserva] NO SE PUDO DESHACER', reservaId, error)
    return false
  }
  return true
}
