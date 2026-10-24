import { NextResponse } from 'next/server'

import { minutosAPie } from '@/lib/distancia'
import { enlaceApple, enlaceDeMapa } from '@/lib/mapa'
import { urlDeFotoDeLocal } from '@/lib/foto-local'
import { fraseDeTamano } from '@/lib/mesa-corta'
import { esDeManana } from '@/lib/reglas'
import { avisoDeDosHoras } from '@/lib/ventana-mesa'
import { bloqueDeReembolso } from '@/lib/reembolso'
import { createAdminClient } from '@/lib/supabase/admin'
import { zonaDeCiudad } from '@/lib/zona-ciudad'
import { createClient } from '@/lib/supabase/server'
import { FIN_CENA, sePuedeValorar } from '@/lib/ventana-mesa'
import { claveDeMesa, claveDeNumero, mesasUnicas, numeroQueSeDice } from '@/lib/mesa-unica'

/**
 * F10 · Mi mesa.
 *
 * LEE la asignación ya persistida. Nunca la calcula al abrirse: el reparto
 * ocurre al cerrar la fecha y queda consultable desde ese momento.
 *
 * Antes de `reveal_at` no devuelve ni restaurante ni acompañantes, aunque
 * la mesa ya esté armada. La dosificación es el producto: adelantarla lo
 * rompe, y una API que lo suelta antes hace inútil el candado de la
 * pantalla.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: reservas } = await admin
    .from('bookings')
    .select('id, event_id, permiso_grabacion, events(starts_at, reveal_at, status, format, activity, city_slug, grabacion, seats_per_table)')
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])

  const ahora = Date.now()
  // Las dos cifras viven en lib/ventana-mesa: Mi cuenta decide con ellas si
  // enseña la tarjeta de valorar, y si alli fueran 72 horas el boton
  // llevaria a esta pantalla cuando ya no deja valorar.

  type Reserva = NonNullable<typeof reservas>[number]
  const empiezaDe = (r: Reserva) =>
    new Date((r.events as unknown as { starts_at: string }).starts_at).getTime()

  // Cuál de sus reservas es "su mesa" ahora mismo. Ordenar por fecha de
  // creación y quedarse con la última tenía un agujero: quien se apunta a la
  // siguiente fecha antes de valorar la anterior deja de ver la anterior, y
  // valorar es la única cosa de F11 que caduca. Así que durante las 48 horas
  // siguientes a una cena, esa cena manda; después vuelve a mandar la próxima.
  // Y ya valorada deja de mandar.
  //
  // «Durante 48 horas manda la cena pasada» era media regla. Quien ya contó
  // cómo estuvo no tiene nada pendiente ahí, y la pantalla le seguía
  // enseñando la cena del sábado hasta el lunes: con la del miércoles ya
  // reservada, la que importa es la que viene. Lo que sostiene la regla no es
  // que la cena sea reciente, es que PIDE una respuesta.
  //
  // Se mira por mesa, que es de lo que cuelga `table_feedback`, y de una vez
  // para todas sus reservas.
  const { data: suyasEnMesa } = await admin
    .from('table_members')
    .select('booking_id, table_id')
    .eq('profile_id', user.id)

  const { data: yaContadas } = await admin
    .from('table_feedback')
    .select('table_id, saltada_at')
    .eq('profile_id', user.id)

  /**
   * Las que ya cerró: contestadas O SALTADAS.
   *
   * Desde el 18-10 la encuesta no caduca a las 48 h —Michael: «que no deje
   * de mostrarse a las 48 h, sino cuando la persona la conteste o se la
   * salte»— así que lo que la quita de la pantalla es esto y nada más.
   */
  const valoradas = new Set((yaContadas ?? []).map((f) => f.table_id))
  const mesaDeReserva = new Map((suyasEnMesa ?? []).map((m) => [m.booking_id, m.table_id]))
  const yaLaConto = (r: Reserva) => {
    const mesa = mesaDeReserva.get(r.id)
    return !!mesa && valoradas.has(mesa)
  }

  /**
   * Y SIN MESA NO HAY NADA QUE VALORAR, NI NADA QUE CONTAR.
   *
   * `yaLaConto` mira si hay valoración de SU mesa, así que una reserva sin
   * mesa devolvía `false` para siempre: nunca estaba contada porque nunca
   * pudo contarse. Y entonces `porValorar` la elegía, la pantalla no
   * encontraba mesa y caía en «sin-mesa», o sea «Esta vez no entraste. Tu
   * crédito sigue descontado, lo estamos arreglando hoy mismo».
   *
   * De una cena del 7 de octubre. Michael lo vio hoy, el 24, al cancelar la
   * de esta noche: lo que hacía era destapar lo que llevaba semanas debajo.
   * Son NUEVE personas con una reserva viva sin mesa de una fecha ya
   * pasada, y a todas les dice eso cada vez que abren Mi mesa.
   *
   * «Esta vez no entraste» es un estado de verdad, pero de la fecha que
   * viene: lo saca `proxima`, que es la que lo necesita. Mirando hacia
   * atrás no ayuda a nadie, y prometer que el crédito se arregla «hoy
   * mismo» diecisiete días después es peor que no decir nada.
   */
  const tieneMesa = (r: Reserva) => mesaDeReserva.has(r.id)

  const porValorar = (reservas ?? [])
    .filter((r) => tieneMesa(r) && sePuedeValorar(empiezaDe(r), ahora) && !yaLaConto(r))
    .sort((a, b) => empiezaDe(b) - empiezaDe(a))[0]

  const proxima = (reservas ?? [])
    .filter((r) => empiezaDe(r) + FIN_CENA > ahora)
    .sort((a, b) => empiezaDe(a) - empiezaDe(b))[0]

  // Y si no hay ninguna de las dos, la última que tuvo: su cena de hace un
  // mes sigue siendo lo último que pasó, y la pantalla la cuenta.
  //
  // Salvo que ya la haya valorado. Entonces no queda nada que decir de ella
  // y lo honesto es el «sin reserva» de siempre, que al menos invita a
  // apuntarse a la próxima. Solo se mira la ÚLTIMA: si esa está contada,
  // rebuscar hacia atrás hasta encontrar una sin contar sacaría una cena de
  // hace tres meses a la pantalla de hoy.
  const ultima = (reservas ?? []).filter(tieneMesa).sort((a, b) => empiezaDe(b) - empiezaDe(a))[0]
  const reserva = porValorar ?? proxima ?? (ultima && !yaLaConto(ultima) ? ultima : undefined)

  const evento = reserva?.events as
    | { starts_at: string; reveal_at: string; status: string; format: string; activity: unknown; city_slug: string; grabacion: boolean; seats_per_table: number | null }
    | null
    | undefined

  if (!reserva || !evento) {
    // Sin mesa no son todos el mismo caso, y la pantalla necesita saber
    // cuál es para decir algo útil. Quien está esperando a que revisemos su
    // cédula no tiene nada que hacer —y decirle «aparta tu puesto» sería
    // mandarlo a una puerta que aún no se le abre—; quien ya está verificado
    // sí, y lo que le falta es reservar.
    const { data: perfil } = await admin
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({ fase: 'sin-reserva', estado: perfil?.status ?? null })
  }

  const revelaEn = new Date(evento.reveal_at).getTime()
  const empiezaEn = new Date(evento.starts_at).getTime()

  // En qué hora habla esta fecha. Viaja con ella y no en la raíz: una persona
  // puede tener una cena en Caracas y otra en otra ciudad.
  const zonaHoraria = await zonaDeCiudad(evento.city_slug)

  if (ahora < revelaEn) {
    // Cerrada: la hora y las zonas que ELLA acepto. Ya no es informacion
    // que le damos sobre el sitio —es lo que ella eligio— asi que no
    // adelanta nada de la revelacion. Si acepto una sola, la sabe desde el
    // primer momento; si acepto dos, sabe que es una de las dos.
    const { data: suyas } = await admin
      .from('booking_zones')
      .select('zone_slug')
      .eq('booking_id', reserva.id)

    // Y cruzadas con las que esta fecha abrió DE VERDAD.
    //
    // Sin el cruce se le listaban las cinco que aceptó —«Las Mercedes,
    // Chacao, Altamira, La Castellana o Los Palos Grandes»— para una fecha
    // que solo abrió Chacao. Las otras cuatro no son una respuesta a medias:
    // son imposibles, y encima contradicen a la tarjeta de la fecha, que sí
    // dice «Chacao».
    //
    // No adelanta nada de la revelación: las zonas abiertas están a la vista
    // en su inicio desde que la fecha se abre. Lo que sigue sin saber es el
    // sitio, que es lo que se revela.
    const { data: abiertas } = await admin
      .from('event_venues')
      .select('zone_slug')
      .eq('event_id', reserva.event_id)

    const deLaFecha = new Set((abiertas ?? []).map((z) => z.zone_slug))
    const suyasSlugs = (suyas ?? []).map((z) => z.zone_slug)
    const cruzadas = suyasSlugs.filter((z) => deLaFecha.has(z))
    // Si el cruce sale vacío —no debería, porque reservar lo exige— se cae a
    // las suyas antes que a nada: una lista de más es mejor que un hueco.
    const slugs = cruzadas.length ? cruzadas : suyasSlugs

    const { data: nombres } = await admin
      .from('zones')
      .select('name')
      .in('slug', slugs.length ? slugs : ['__ninguna__'])
      .order('sort_order')

    return NextResponse.json({
      fase: 'cerrada',
      formato: evento.format,
      revelaEn: evento.reveal_at,
      zonaHoraria,
      empiezaEn: evento.starts_at,
      zonas: (nombres ?? []).map((z) => z.name),
      faltanSegundos: Math.round((revelaEn - ahora) / 1000),
    })
  }

  const { data: miembro } = await admin
    .from('table_members')
    .select('table_id, sentado_en, dinner_tables(table_number, event_id, restaurant_id, grabacion, restaurants!dinner_tables_restaurant_id_fkey(id, name, address, maps_url, place_id, facade_photo_path, lat, lng))')
    .eq('profile_id', user.id)
    .eq('booking_id', reserva.id)
    .maybeSingle()

  if (!miembro) {
    /**
     * Apuntada y revelada pero sin mesa. Y hay que MIRAR si el crédito
     * volvió, no darlo por hecho.
     *
     * La pantalla decía «tu crédito volvió entero a tu cuenta» siempre, sin
     * comprobar nada, porque se escribió pensando en el único camino que
     * existía: quien se queda en espera al publicar, y ahí el abono va
     * pegado al aviso.
     *
     * El 17-10 apareció el otro camino. Cinco personas tenían su mesa
     * armada y esa mesa no se publicó —rompía tres reglas y el panel la
     * frena—, así que no hubo aviso, no hubo abono, y la pantalla les
     * siguió diciendo que su dinero estaba de vuelta. Una de ellas escribió
     * para preguntar por qué no lo veía, y tenía razón.
     *
     * Se mira el abono de ESTA reserva. Si no está, se dice que no está.
     */
    const { data: abono } = await admin
      .from('credit_ledger')
      .select('id')
      .eq('booking_id', reserva.id)
      .eq('reason', 'refund')
      .maybeSingle()

    return NextResponse.json({
      fase: 'sin-mesa',
      formato: evento.format,
      empiezaEn: evento.starts_at,
      zonaHoraria,
      creditoDevuelto: !!abono,
      // Y si prefiere el dinero al crédito. Mismo bloque que Mi cuenta.
      reembolso: await bloqueDeReembolso(admin, user.id),
    })
  }

  const mesa = miembro.dinner_tables as unknown as {
    table_number: number
    event_id: string
    restaurant_id: string | null
    grabacion: boolean
    restaurants: {
      id: string
      name: string
      address: string
      maps_url: string | null
      facade_photo_path: string | null
      lat: number | null
      lng: number | null
    } | null
  }

  /**
   * Los sitios para seguir del local (entrega 20).
   *
   * Hasta tres, los que operación eligió en la ficha de ESE restaurante. Van
   * con el enlace ya montado —el de Google y el de Apple, como el del propio
   * sitio— porque es la pantalla la que sabe en qué teléfono se lee.
   *
   * `[]` cuando no hay ninguno, y entonces la despedida se queda con su
   * frase: «si hay ganas de seguir, busquen un sitio cerca».
   */
  const { data: seguires } = await admin
    .from('restaurant_after_venues')
    .select('after_id, minutos_a_pie, orden, restaurants!restaurant_after_venues_after_id_fkey(name, address, maps_url, place_id, lat, lng, budget_tier)')
    .eq('restaurant_id', mesa.restaurant_id ?? '')
    .order('orden')

  /**
   * Lo caro que es, en una palabra, del `budget_tier` del propio sitio.
   *
   * A las diez de la noche la pregunta no es solo «¿queda cerca?», también
   * «¿cuánto me va a costar seguir» (Michael, 16-10). Sin tramo no sale
   * nada: inventarlo es peor que callarlo.
   */
  /**
   * Lo caro que es, en signos y no en palabras.
   *
   * Michael, 22-10: «"Caro" no lo podemos mostrar con esta clasificación».
   * Y tiene razón: «caro» es un juicio nuestro sobre el sitio al que
   * mandamos a alguien, y «$$$» es una escala que se lee sin discutirla.
   * Cuatro niveles, los mismos que distingue Google, y van pegados a los
   * minutos: «6 min a pie · $$$».
   *
   * Sin tramo no sale nada. Inventarlo es peor que callarlo, y hay bares a
   * los que Google no les pone precio.
   */
  const LO_CARO: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

  /**
   * Y EN LOS PLANES DE MAÑANA, NINGUNO.
   *
   * Michael, 24-10, sobre el brunch: «juego sí, bares no». Un brunch acaba
   * a la una de la tarde y el segundo acto de Aro son bares: ofrecerlos ahí
   * es mandar a seis personas a tomar a las dos. La lista se vacía en el
   * servidor y no en la pantalla porque de ella cuelgan dos cosas más: la
   * coletilla de «hay sitios cerca» del aviso de las dos horas y el bloque
   * del paso a paso. Vaciándola aquí, las tres desaparecen solas.
   */
  const paraSeguir = esDeManana(evento.format) ? [] : (seguires ?? []).map((s) => {
    const sitio = s.restaurants as unknown as {
      name: string
      address: string | null
      maps_url: string | null
      lat: number | null
      lng: number | null
      budget_tier: number | null
    } | null
    return {
      nombre: sitio?.name ?? '',
      /**
       * Lo tecleado a mano manda; si no hay, se calcula con las coordenadas
       * de los dos sitios. El bar es el mismo y la cena cambia de
       * restaurante cada semana, así que el número no puede vivir escrito
       * en la relación: sería uno por cada par, y uno más por cada
       * restaurante nuevo.
       */
      minutosAPie: s.minutos_a_pie ?? minutosAPie(mesa.restaurants, sitio),
      precio: sitio?.budget_tier != null ? (LO_CARO[sitio.budget_tier] ?? '') : '',
      mapa: enlaceDeMapa(sitio),
      mapaApple: enlaceApple(sitio),
    }
  })

  const { data: companeros } = await admin
    .from('table_members')
    .select('profile_id, seat_order, sentado_en, profiles(display_name, full_name)')
    .eq('table_id', miembro.table_id)
    .neq('profile_id', user.id)
    .order('seat_order')

  /**
   * Cuándo se sentó el PRIMERO de la mesa.
   *
   * «Se sumó después» no puede medirse solo contra la revelación: si
   * operación reparte y publica tarde —pasa—, la mesa entera se sienta
   * después de las doce y entonces TODOS saldrían marcados, que es ruido y
   * encima falso: nadie llegó tarde a esa mesa, llegó tarde la mesa.
   *
   * Tarde es haber entrado bastante después que el resto. Un cuarto de hora
   * de margen sobre el primer asiento absorbe lo que tarda una publicación
   * y no tapa lo que esto viene a contar: los dos casos del 16-10 entraron
   * tres horas después.
   */
  const { data: primeros } = await admin
    .from('table_members')
    .select('sentado_en')
    .eq('table_id', miembro.table_id)
    .order('sentado_en')
    .limit(1)

  const primerAsiento = primeros?.[0]?.sentado_en ?? null
  const MARGEN_PUBLICACION = 15 * 60_000

  const { data: traits } = await admin
    .from('profile_traits')
    .select('profile_id, industry')
    .in('profile_id', (companeros ?? []).map((c) => c.profile_id))

  // `industry` se guarda con el código estable ("tecnologia"), que no es lo
  // que se enseña. La etiqueta vive en las opciones de la pregunta y se lee
  // de ahí: un mapa aquí sería un segundo catálogo que se desincroniza a la
  // primera vez que Design cambie un nombre.
  const { data: preguntaSector } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiquetaDe = new Map(
    ((preguntaSector?.options ?? []) as { value: string; label: string }[]).map((o) => [
      o.value,
      o.label,
    ]),
  )

  const { data: yaValoro } = await admin
    .from('table_feedback')
    .select('id, saltada_at')
    .eq('table_id', miembro.table_id)
    .eq('profile_id', user.id)
    .maybeSingle()

  // De `exclusions`, que es donde vive el bloqueo. Se cruza con quienes
  // estuvieron en esta mesa para saber a cuáles de ellos bloqueó.
  const idsMesa = (companeros ?? []).map((c) => c.profile_id)
  const { data: exclusiones } = await admin
    .from('exclusions')
    .select('profile_a, profile_b, reason, created_by')
    .or(`profile_a.eq.${user.id},profile_b.eq.${user.id}`)

  const suyas = (exclusiones ?? [])
    .map((e) => ({
      otro: e.profile_a === user.id ? e.profile_b : e.profile_a,
      reason: e.reason,
      mia: e.created_by === user.id,
    }))
    .filter((e) => e.mia && idsMesa.includes(e.otro))

  const sectorDe = new Map(
    (traits ?? []).map((t) => [
      t.profile_id,
      t.industry ? (etiquetaDe.get(t.industry) ?? t.industry) : null,
    ]),
  )

  /**
   * ¿Se cayó alguien de ESTA mesa después de la revelación?
   *
   * Se calcula una vez y lo usan dos cosas: la frase de mesa corta y el
   * bloque de ajustes. Con dos cálculos, el correo podría decir «alguien
   * canceló» y la pantalla «no completamos la mesa» de la misma mesa.
   */
  const seCayoAlguienDeAqui = await (async () => {
        if (!evento.reveal_at) return false
        const { data: caidos } = await admin
          .from('bookings')
          .select('profile_id, cancelled_at')
          .eq('event_id', mesa.event_id)
          .not('cancelled_at', 'is', null)
          .gt('cancelled_at', evento.reveal_at)

        if (!caidos?.length) return false

        const { data: loSuyo } = await admin
          .from('scheduled_emails')
          .select('payload')
          .eq('event_id', mesa.event_id)
          .eq('kind', 'mesa_asignada')
          .in('profile_id', caidos.map((c) => c.profile_id))

        return (loSuyo ?? []).some(
          (f) => String(((f.payload ?? {}) as { mesa?: unknown }).mesa ?? '') === String(mesa.table_number),
        )
      })()

  return NextResponse.json({
    // Pasada: la cena ya ocurrió, toca F11.
    fase: ahora > empiezaEn + 5 * 3600 * 1000 ? 'pasada' : 'abierta',
    // El id de la mesa y los de sus companeros: hacen falta para valorar,
    // bloquear y reportar. Son uuid opacos; el nombre de pila y el sector
    // siguen siendo lo unico legible que se le enseña de ellos.
    mesaId: miembro.table_id,
    // El número que se dice al llegar, que es la posición de esta mesa
    // DENTRO de su restaurante esa noche, no el que guardamos. Su porqué
    // está en `numeroQueSeDice`.
    numeroMesa:
      (await numeroQueSeDice([
        { eventoId: mesa.event_id, sitioId: mesa.restaurant_id, numero: mesa.table_number },
      ])).get(claveDeNumero(mesa.event_id, mesa.table_number)) ?? mesa.table_number,
    // Y si es la única de ese sitio en esta fecha. Cuando lo es, la pantalla
    // y los correos se callan el número: «la mesa de Aro, la 01» donde solo
    // hay una mesa de Aro manda a buscar un cartel que no existe.
    mesaUnica: (await mesasUnicas([{ eventoId: mesa.event_id, sitioId: mesa.restaurant_id }]))
      .has(claveDeMesa(mesa.event_id, mesa.restaurant_id)),
    // De qué es esto: decide si la pantalla dice mesa y restaurante o grupo
    // y punto de encuentro. Once formatos y una sola palabra no se sostiene.
    formato: evento.format,
    zonaHoraria,
    /**
     * Si esa noche grabamos por la zona, y qué contestó esta persona.
     *
     * `null` en `permisoGrabacion` es «todavía no ha contestado», que no es
     * un no: la pantalla pregunta una vez y lo guarda; quien no entre no
     * queda como negativa ni como permiso.
     *
     * Va con la mesa y no en una ruta aparte porque se pinta en la misma
     * pantalla y a la vez: una segunda llamada para un booleano es una
     * segunda forma de llegar tarde.
     */
    // La fecha, para poder contestar contra ella. Es un uuid opaco y ya
    // viaja en otras pantallas; sin él la respuesta no sabría de qué cena es.
    eventoId: mesa.event_id,
    // Cualquiera de las dos lo enciende: la fecha entera o esta mesa. No se
    // graba una noche, se graba una mesa, y preguntarle el permiso a las
    // otras cuatro gasta la atención que hace falta donde sí vamos a grabar.
    grabamos: !!(evento.grabacion || mesa.grabacion),
    permisoGrabacion: reserva.permiso_grabacion ?? null,
    // Y qué se hace, cuando el sitio no lo dice: la ruta, los kilómetros y
    // el nivel de una caminata no caben en una dirección.
    actividad: evento.activity ?? null,
    empiezaEn: evento.starts_at,
    restaurante: mesa.restaurants?.name ?? null,
    direccion: mesa.restaurants?.address ?? null,
    // El enlace ya montado, respaldo incluido. La pantalla lo pintaba y, si
    // venía vacío, se inventaba el suyo: dos formas de armar el mismo botón,
    // y la del navegador tampoco metía la ciudad.
    mapa: enlaceDeMapa(mesa.restaurants),
    // Y el mismo sitio en Apple Maps, para el iPhone sin Google Maps: ahí el
    // enlace normal cae en Safari, que es un mapa sin navegación. La pantalla
    // elige, porque es el único sitio donde se sabe en qué teléfono se lee.
    mapaApple: enlaceApple(mesa.restaurants),
    /**
     * La foto de la entrada, para «AL LLEGAR · BUSCA ESTA ENTRADA».
     *
     * La misma dirección para la app, la web y los dos correos de la mesa, y
     * `null` cuando ese local no tiene foto: de los nueve del catálogo la
     * tienen cuatro, así que la pantalla sin foto no es el caso raro.
     */
    fotoEntrada: urlDeFotoDeLocal(mesa.restaurants?.id, mesa.restaurants?.facade_photo_path),
    // Hasta tres sitios para seguir, los que operación eligió para ESE local.
    paraSeguir,
    /**
     * `cierraMesaEn` se quitó el 15-10, el mismo día que se puso.
     *
     * Se sacaba de `restaurants.last_seating` y esa columna es otra cosa: es
     * lo más tarde que puede EMPEZAR una cena, no hasta cuándo nos dejan la
     * mesa (Michael, 15-10). La reserva es siempre de dos horas, y eso lo
     * sabe el guion —`AroReglas.GUION.duracionDeLaMesa`—, así que no hay nada
     * que mandar: un campo con ese nombre y ese contenido era una respuesta
     * equivocada a una pregunta que no tenemos.
     */
    // Solo nombre de pila y sector. Sin apellidos, sin fotos, sin contacto.
    companeros: (companeros ?? []).map((c) => {
      const p = c.profiles as unknown as { display_name: string | null; full_name: string | null } | null
      const nombre = p?.display_name || p?.full_name?.split(' ')[0] || null
      return {
        id: c.profile_id,
        nombre,
        sector: sectorDe.get(c.profile_id) ?? null,
        /**
         * Si entró DESPUÉS de que se contara la mesa.
         *
         * El correo de la revelación dice cuántos son y lista los nombres, y
         * esa foto se queda fija en la bandeja de entrada. Si después se
         * suma alguien —hoy pasó dos veces—, quien abre la pantalla cuenta
         * una cara de más y no sabe si se equivocó al leer, si falta alguien
         * o qué. Con la marca lo entiende en medio segundo y sin que le
         * tengamos que escribir otro correo.
         *
         * Se compara contra `reveal_at` y no contra el reparto: la
         * revelación es el momento en que la mesa se le CONTÓ a la gente,
         * que es lo que esta marca explica.
         */
        seUnioDespues:
          !!evento.reveal_at && !!c.sentado_en && !!primerAsiento
          && new Date(c.sentado_en as string) > new Date(evento.reveal_at)
          && new Date(c.sentado_en as string).getTime()
            > new Date(primerAsiento).getTime() + MARGEN_PUBLICACION,
      }
    }),
    /**
     * Lo que cambió en esta mesa DESPUÉS de contársela a la gente.
     *
     * Michael, 17-10: «a la gente que no cambiamos de sitio podríamos no
     * mandarle email sino mostrarle los cambios en Mi mesa con un aviso de
     * que hubo ajustes». Y es lo correcto: a quien se queda donde estaba, un
     * correo de «cambios de última hora» le mete ruido para contarle algo
     * que ya se ve entrando.
     *
     * Hoy pasaron las dos cosas en la misma noche: tres personas cancelaron
     * en la hora siguiente a la revelación —una mesa se quedó en tres— y
     * hubo que mover gente de sitio para que nadie cenara de a tres.
     *
     * Dos hechos, no una opinión: cuántos son y si se sumó alguien después.
     * La pantalla los junta en una frase.
     */
    /**
     * Y SI LA MESA SALIÓ CORTA, dicho aquí también.
     *
     * Lo encontró el agente de la app el 22-10: el correo de la revelación
     * lo explicaba y la pantalla pintaba «4 personas» sin una palabra. El
     * bloque de `ajustes` de abajo cuenta lo que pasa DESPUÉS de revelar
     * —quién canceló, a quién movimos— y esto es otra cosa: la mesa nació
     * así.
     *
     * Misma frase que el correo, de `fraseDeTamano`, y `null` cuando la
     * mesa está completa, que es lo normal. Michael: «no debe ser lo
     * protagonista de Mi mesa, es informativo y ya».
     */
    /**
     * Cuánto dura la mesa, también aquí.
     *
     * Michael, 22-10: «lo de las dos horas con la revelación y la mesa es
     * suficiente». El correo se lee una vez a mediodía; esta pantalla se
     * abre otra vez camino del restaurante, que es cuando la pregunta
     * importa de verdad.
     *
     * Misma frase y misma función que el correo, y con la coletilla de los
     * sitios cerca solo si esta mesa los tiene: `paraSeguir` ya se calculó
     * arriba, así que aquí no se adivina nada.
     */
    avisoDosHoras: avisoDeDosHoras(
      evento.starts_at,
      zonaHoraria,
      paraSeguir.length > 0,
      'el paso a paso',
    ) || null,
    mesaCorta: fraseDeTamano(
      (companeros ?? []).length + 1,
      evento.seats_per_table ?? 6,
      seCayoAlguienDeAqui,
    ) || null,
    ajustes: {
      /**
       * Si alguien se cayó de ESTA mesa después de la revelación.
       *
       * No vale mirar solo si la mesa es corta: una de cinco puede haber
       * salido así desde el principio —se publican cortas a propósito— y
       * decirle a esa gente «alguien canceló» sería inventarse un hecho.
       *
       * Tampoco vale mirar las cancelaciones de la fecha: cancela alguien
       * de otra mesa y esta se enteraría de algo que no le pasó.
       *
       * La forma de saberlo después de que la fila de `table_members` ya no
       * existe es el correo que se le mandó: `mesa_asignada` guarda en su
       * payload en qué mesa estaba. Eso es exactamente «a quién le dijimos
       * que se sentaba aquí».
       */
      alguienCancelo: seCayoAlguienDeAqui,
      // Cuántos se sientan de verdad, contándose a sí misma.
      sonCuantos: (companeros ?? []).length + 1,
      // Y cuántos caben, que es lo que hace que «cinco» signifique algo.
      caben: evento.seats_per_table ?? 6,
      /**
       * Y si la movida fue ELLA.
       *
       * Michael: «este aviso es para el que no cambió de mesa, ¿y el que fue
       * cambiado de lugar?». Tenía razón: a quien movimos le salía «se suma
       * alguien», que es la frase de los que se quedaron.
       *
       * Se sabe igual que lo de los demás, pero mirando su propia fila: si
       * se sentó aquí después de la revelación, es que la movimos. Su correo
       * ya se lo dijo; esto es lo que ve al entrar.
       */
      teMovimos:
        !!evento.reveal_at && !!miembro.sentado_en && !!primerAsiento
        && new Date(miembro.sentado_en as string) > new Date(evento.reveal_at)
        && new Date(miembro.sentado_en as string).getTime()
          > new Date(primerAsiento).getTime() + MARGEN_PUBLICACION,
      seSumoAlguien: (companeros ?? []).some(
        (c) =>
          !!evento.reveal_at && !!c.sentado_en && !!primerAsiento
          && new Date(c.sentado_en as string) > new Date(evento.reveal_at)
          && new Date(c.sentado_en as string).getTime()
            > new Date(primerAsiento).getTime() + MARGEN_PUBLICACION,
      ),
    },
    // Todas verificaron: es el retorno de lo que costó verificarse.
    todosVerificados: true,
    // Lo que ya hizo. Los tres caminos son independientes, asi que se
    // devuelven por separado: haber valorado no cierra reportar.
    /**
     * Contestada, y saltada, que no son lo mismo.
     *
     * `yaValoro` es «ya contó lo que le pareció» y enseña el «Anotado,
     * gracias». `yaSalto` es «dijo que ahora no»: la encuesta no se le
     * vuelve a enseñar y no hay nada que agradecerle.
     */
    yaValoro: !!yaValoro && !yaValoro.saltada_at,
    yaSalto: !!yaValoro?.saltada_at,
    yaBloqueados: suyas.map((e) => e.otro),
    // A quién reportó, no un sí/no: al recargar, la pantalla decía
    // «Reportaste a alguien». Con el id puede volver a decir su nombre.
    yaReporto: suyas.find((e) => e.reason === 'reporte')?.otro ?? null,
  })
}
