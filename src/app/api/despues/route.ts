import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { notaDesdeIndice, notasDelSitio } from '@/lib/encuesta'
import { createClient } from '@/lib/supabase/server'

/**
 * F11 · Después de la cena.
 *
 * Tres caminos INDEPENDIENTES, y esa independencia es el diseño:
 *
 *  - **Valorar**: si volvería. Alimenta el emparejamiento.
 *  - **Bloquear**: con quién no quiere volver a coincidir. Va al lado de
 *    valorar, sin ceremonia, y nadie se entera. No es una denuncia: es una
 *    preferencia, y tratarla como denuncia haría que nadie la usara.
 *  - **Reportar**: pasó algo. Lo lee una persona el mismo día, nombra a
 *    quién, y bloquea de paso.
 *
 * Enviar uno no cierra los otros. Quien valora puede reportar después, y
 * quien reporta no tiene por qué valorar.
 *
 * Un bloqueo se guarda en `exclusions` y SOLO ahí. Antes se escribía también
 * en `peer_feedback` con `signal: 'avoid'`, que era la misma verdad en dos
 * sitios: el reparto leía una y la otra podía quedarse atrás sin que nadie
 * lo notara —quitar un bloqueo tenía que acordarse de borrar las dos—. Un
 * bloqueo no es de una mesa, es de una pareja y es permanente, así que
 * `exclusions` es su sitio. `created_by` dice quién lo puso y `reason`
 * distingue el bloqueo del reporte.
 */

const accion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('valorar'),
    mesaId: z.string().uuid(),
    // Entrega 16. Todo opcional: saltarse un bloque es lo normal, y un bloque
    // en blanco no es un cero. Los índices van de mejor a peor —0 Excelente,
    // 3 Mala— porque así están los botones; `notaDesdeIndice` los da la
    // vuelta antes de tocar la base, en un solo sitio.
    mesa: z.number().int().min(0).max(3).nullable().optional(),
    sitio: z
      .object({
        ambiente: z.number().int().min(0).max(3).nullable().optional(),
        servicio: z.number().int().min(0).max(3).nullable().optional(),
        conversar: z.number().int().min(0).max(3).nullable().optional(),
        comida: z.number().int().min(0).max(3).nullable().optional(),
      })
      .optional(),
    // «¿Volverías a Aro Club?». No a esa mesa: esa mesa no se repite nunca.
    volveriaAAro: z.boolean().nullable().optional(),
    /**
     * El texto libre (Michael, 17-10): «¿algo que quieras destacar o nos
     * quieras contar?».
     *
     * La columna `comment` existe en `table_feedback` desde el principio y
     * no la escribía nadie. Es lo único de la encuesta que no es una escala
     * y por eso lo único que puede traer lo que no sabíamos preguntar: que
     * la música estaba alta, que faltó alguien, que la mesa daba a la
     * cocina.
     *
     * 600 caracteres, los mismos que acepta la pantalla. Vacío se guarda
     * como nulo y no como cadena vacía: «no escribió» y «escribió nada» son
     * lo mismo, y en la base se ven distintos.
     */
    comentario: z.string().trim().max(600).nullable().optional(),
    /**
     * Cuánto gastó, por persona y sin contar la plaza de Aro.
     *
     * Michael, 17-10: «la encuesta no pregunta cuánto gastaste, y sin eso
     * el tramo de los locales se queda en lo que escribimos a ojo». De aquí
     * sale el gasto REAL de un sitio, frente al que declaramos al darlo de
     * alta, que hoy es lo único que hay y no cuadra entre locales.
     *
     * Opcional de verdad: es una pregunta sobre el dinero de alguien.
     */
    gasto: z.number().min(0).max(1000).nullable().optional(),
    /**
     * Y si no quiere que la volvamos a mandar a ese sitio.
     *
     * Lo pidió Leonor anoche, en el texto libre: «así como permite excluir
     * personas de próximas cenas, que también permita excluir restaurantes».
     * Es una preferencia suya, no una queja del local: no baja su nota y no
     * se le dice al restaurante.
     */
    noRepetirSitio: z.boolean().optional(),
  }),
  /**
   * «Ahora no». La encuesta se cierra sin contestarla.
   *
   * Michael, 18-10: la encuesta deja de verse cuando la contestan O LA
   * SALTAN, no a las 48 horas. Hasta hoy ese botón solo volvía a Inicio y no
   * guardaba nada, así que sin plazo se quedaría para siempre delante de
   * quien ya dijo que no quiere contestarla.
   *
   * No es una valoración vacía: es la constancia de que no quiere. Por eso
   * no escribe ninguna nota, solo la fecha.
   */
  z.object({
    accion: z.literal('saltar'),
    mesaId: z.string().uuid(),
  }),
  z.object({
    accion: z.literal('bloquear'),
    mesaId: z.string().uuid(),
    aQuien: z.array(z.string().uuid()),
  }),
  /**
   * «¿FALTÓ ALGUIEN?». Michael, 29-10: «son ellos los que saben quién fue».
   *
   * Cruza a propósito la regla de que quién vino lo marca operación. El
   * motivo de esa regla era no cobrarle a quien acaba de cenar un trabajo
   * nuestro, y esto no es una tarea: es un toque. «Vinimos todos» es la
   * lista vacía, y se manda igual, porque decir que no faltó nadie es una
   * respuesta y no contestar es otra cosa.
   *
   * Y operación sigue decidiendo: hacen falta DOS para dar a alguien por
   * ausente, y cuando no coinciden lo revisa una persona.
   */
  z.object({
    accion: z.literal('falto'),
    mesaId: z.string().uuid(),
    /** Vacía es «vinimos todos». */
    aQuien: z.array(z.string().uuid()),
  }),
  /**
   * «¿Te gustaría seguir en contacto con alguien de la mesa?».
   *
   * Cruza a propósito la otra regla escrita, la de que la encuesta no
   * clasifica persona por persona. Aquella se puso porque un «sí repetiría
   * con X» no sirve para repartir: no volvemos a juntar a la misma gente.
   * Esto no reparte, pasa un contacto, y el veto de tres meses no se toca.
   *
   * Marcar NO le dice nada a nadie. Solo cuando las dos se marcan hay
   * coincidencia; si solo marca una, la otra no se entera nunca.
   */
  z.object({
    accion: z.literal('contacto'),
    mesaId: z.string().uuid(),
    aQuien: z.array(z.string().uuid()),
  }),
  z.object({
    accion: z.literal('reportar'),
    mesaId: z.string().uuid(),
    aQuien: z.string().uuid(),
    motivo: z.string().min(1).max(60),
  }),
])

/**
 * Cuántos sitios puede tener vetados a la vez una persona.
 *
 * Michael, 17-10: «ojo, lo ponemos muy fácil porque la gente es muy quejona,
 * ¿cuánto tiene sentido que lo marque?». Y la cuenta le da la razón: en
 * Chacao hay seis locales de cena, en Las Mercedes dos y en El Rosal uno.
 * Quien vete tres en Chacao casi no cabe en ninguna mesa, y quien vete el
 * único de su zona se queda fuera de su propia zona sin saberlo.
 *
 * Dos es suficiente para «ese sitio no» y no vacía ninguna zona salvo las de
 * un solo local. Al tercero se le dice cuál tiene que soltar: es su lista y
 * la decide ella, pero no puede crecer sin límite.
 */
const TOPE_SITIOS_VETADOS = 2

/** La exclusión se guarda ordenada: el CHECK exige profile_a < profile_b. */
const par = (a: string, b: string) => (a < b ? [a, b] : [b, a])

async function estaEnLaMesa(
  admin: ReturnType<typeof createAdminClient>,
  mesaId: string,
  quien: string,
) {
  const { data } = await admin
    .from('table_members')
    .select('profile_id')
    .eq('table_id', mesaId)
    .eq('profile_id', quien)
    .maybeSingle()
  return !!data
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = accion.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data

  // Solo se opina de una mesa en la que se estuvo. Sin esto, cualquiera con
  // un id de mesa podría bloquear a gente que no conoce.
  if (!(await estaEnLaMesa(admin, d.mesaId, user.id))) {
    return NextResponse.json({ error: 'Esa no es tu mesa.' }, { status: 404 })
  }

  if (d.accion === 'valorar') {
    /** Si el veto no cupo, para decirlo al final sin perder la encuesta. */
    let sobraElVeto: { motivo: 'tope-sitios'; texto: string } | null = null

    // Los cuatro bloques son opcionales por separado, así que se escribe solo
    // lo que vino. Mandar `null` en el resto borraría lo que ya contestó
    // quien vuelve a entrar a completar la encuesta.
    // `saltada_at` a null: si antes dijo «ahora no» y ahora contesta, lo que
    // vale es la respuesta. Al revés no: saltar después de valorar no borra
    // lo que ya contó.
    const fila: Record<string, unknown> = {
      table_id: d.mesaId,
      profile_id: user.id,
      saltada_at: null,
    }

    const nota = notaDesdeIndice(d.mesa)
    if (nota !== null) fila.conversation_rating = nota

    for (const [columna, valor] of Object.entries(notasDelSitio(d.sitio))) {
      if (valor !== null) fila[columna] = valor
    }

    if (typeof d.volveriaAAro === 'boolean') fila.would_repeat = d.volveriaAAro
    if (d.comentario !== undefined) fila.comment = d.comentario || null
    if (d.gasto !== undefined) fila.gasto_usd = d.gasto

    if (d.noRepetirSitio === true) {
      /**
       * El tope, comprobado aquí y no en la pantalla.
       *
       * La pantalla ya no enseña el botón si le gustó el sitio, pero el tope
       * es una regla del producto: si vive solo en el navegador, basta con
       * mandar la petición a mano para saltárselo, y lo que se salta es la
       * posibilidad de sentar a esa persona en algún sitio.
       */
      const { data: suMesa } = await admin
        .from('dinner_tables')
        .select('restaurant_id')
        .eq('id', d.mesaId)
        .maybeSingle()

      const { data: yaVetados } = await admin
        .from('table_feedback')
        .select('dinner_tables!inner(restaurant_id)')
        .eq('profile_id', user.id)
        .eq('sitio_no_repetir', true)

      type ConSitio = { dinner_tables: { restaurant_id: string | null } | null }
      const sitios = new Set(
        ((yaVetados ?? []) as unknown as ConSitio[])
          .map((x) => x.dinner_tables?.restaurant_id)
          .filter((x): x is string => !!x),
      )
      // El de esta mesa no cuenta dos veces si ya estaba marcado.
      if (suMesa?.restaurant_id) sitios.delete(suMesa.restaurant_id)

      if (sitios.size >= TOPE_SITIOS_VETADOS) {
        const { data: nombres } = await admin
          .from('restaurants')
          .select('name')
          .in('id', [...sitios])

        /**
         * EL TOPE TUMBA EL VETO, NO LA ENCUESTA.
         *
         * Esto devolvía 409 y se iba, o sea que quien ya tenía dos sitios
         * marcados contestaba la encuesta entera —las cuatro notas, el
         * comentario, lo que gastó— y no se guardaba NADA. La pantalla
         * enseñaba «No pudimos guardarlo. Vuelve a intentarlo», y al
         * intentarlo otra vez volvía a fallar igual, porque el tope seguía
         * lleno. Sin salida y sin decir por qué.
         *
         * Lo que la persona quiso decir fueron dos cosas, y solo una choca
         * con el tope. Así que se guarda la valoración y se le dice lo del
         * sitio: `estado: 'valorada'` con `sitioNoGuardado` dentro.
         */
        sobraElVeto = {
          motivo: 'tope-sitios' as const,
          texto:
            `Ya tienes ${sitios.size} sitios marcados: ${(nombres ?? []).map((n) => n.name).join(' y ')}. ` +
            'Tu valoración sí quedó guardada. Si quieres marcar este, quita uno en tu perfil.',
        }
      }
    }

    // El veto solo entra si cabe. Lo demás de la encuesta se guarda igual.
    if (d.noRepetirSitio !== undefined && !sobraElVeto) fila.sitio_no_repetir = d.noRepetirSitio

    const { error } = await admin.from('table_feedback').upsert(
      fila as never,
      { onConflict: 'table_id,profile_id' },
    )

    if (error) {
      console.error('[despues] valorar', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json(
      sobraElVeto ? { estado: 'valorada', sitioNoGuardado: sobraElVeto } : { estado: 'valorada' },
    )
  }

  if (d.accion === 'saltar') {
    const { error } = await admin.from('table_feedback').upsert(
      { table_id: d.mesaId, profile_id: user.id, saltada_at: new Date().toISOString() } as never,
      { onConflict: 'table_id,profile_id' },
    )

    if (error) {
      console.error('[despues] saltar', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json({ estado: 'saltada' })
  }

  if (d.accion === 'bloquear') {
    for (const otro of d.aQuien) {
      if (otro === user.id) continue
      if (!(await estaEnLaMesa(admin, d.mesaId, otro))) continue

      const [a, b] = par(user.id, otro)
      /**
       * SI YA HAY UNA EXCLUSIÓN, NO SE TOCA.
       *
       * `ignoreDuplicates` y no un upsert normal. El upsert pisaba `reason`,
       * y ese campo es lo único que decide si la exclusión se puede quitar
       * desde Mi perfil. Reportar escribe `reason: 'reporte'`, que no se
       * puede quitar; acto seguido la encuesta manda `bloquear` con esa
       * misma persona dentro —las dos pantallas la añaden a la lista de
       * bloqueados al reportar— y la degradaba a «bloqueo del miembro».
       * Desde ahí, la persona a la que reportaste se podía desbloquear.
       *
       * Lo encontró Michael grabando el video para Apple, y lo trazó el
       * agente de la app. En la app ya no se manda, pero el candado va aquí:
       * la web hace lo mismo y cualquier cliente futuro también podría.
       *
       * Ignorar el conflicto es además lo correcto en general: una exclusión
       * que ya existe —de un reporte o puesta por operación— ya cumple lo
       * que esta persona pide, y volver a pedirlo no puede debilitarla.
       */
      await admin.from('exclusions').upsert(
        {
          profile_a: a,
          profile_b: b,
          // El motivo NUNCA se le enseña a la otra persona. Solo distingue
          // un bloqueo de una exclusión puesta por operación.
          reason: 'bloqueo del miembro',
          created_by: user.id,
        },
        { onConflict: 'profile_a,profile_b', ignoreDuplicates: true },
      )
    }

    return NextResponse.json({ estado: 'bloqueados', cuantos: d.aQuien.length })
  }

  /**
   * --- «¿faltó alguien?» y «¿seguir en contacto?» ------------------------
   *
   * Las dos son la misma escritura: una señal de quien se sentó sobre otra
   * persona de SU mesa, y por eso van juntas. La tabla `peer_feedback` tiene
   * justo esa forma y estaba reservada para esto desde el 10-08.
   *
   * Se REEMPLAZA la lista entera, no se añade: la respuesta es «estos y no
   * los demás», así que desmarcar a alguien tiene que poder deshacerse. Con
   * un insert suelto, quitar una marca sería imposible desde la pantalla.
   *
   * Marcar a nadie es una respuesta válida y se guarda como tal: «vinimos
   * todos» es la lista vacía, y no es lo mismo que no contestar.
   */
  if (d.accion === 'falto' || d.accion === 'contacto') {
    const senal = d.accion === 'falto' ? 'ausente' : 'connect'

    // Solo gente de SU mesa, y nunca ella misma.
    const suyos: string[] = []
    for (const otro of d.aQuien) {
      if (otro === user.id) continue
      if (!(await estaEnLaMesa(admin, d.mesaId, otro))) continue
      suyos.push(otro)
    }

    /**
     * Y no se puede querer seguir en contacto con quien dices que no vino.
     *
     * La pantalla ya no lo deja —marcar a alguien como ausente lo saca de la
     * otra lista—, pero las dos señales llegan en DOS llamadas, así que entre
     * una y otra cabe cualquier cosa: una pantalla vieja en caché, la app en
     * una versión distinta, o las dos llamadas cruzadas. Si se cuela, la
     * coincidencia mutua acabaría pasándole un Instagram a nombre de una
     * mesa en la que uno de los dos no estuvo.
     *
     * Se cae la marca de contacto, no la de ausente: la ausencia es la que
     * tiene consecuencias para la otra persona y la que decide operación.
     */
    if (d.accion === 'contacto' && suyos.length) {
      const { data: ausentes } = await admin
        .from('peer_feedback')
        .select('rated_id')
        .eq('table_id', d.mesaId)
        .eq('rater_id', user.id)
        .eq('signal', 'ausente')

      const noVinieron = new Set((ausentes ?? []).map((f) => f.rated_id))
      for (let i = suyos.length - 1; i >= 0; i--) {
        if (noVinieron.has(suyos[i])) suyos.splice(i, 1)
      }
    }

    /**
     * Y ANTES DE ESCRIBIR, fuera la señal contraria de esa misma gente.
     *
     * No es higiene: sin esto la escritura FALLA. `peer_feedback` lleva
     * desde el 02-08 un único por `(table_id, rater_id, rated_id)` **sin la
     * señal**, o sea una sola opinión por persona y mesa. Marcar a alguien
     * de ausente cuando ya lo habías marcado para seguir en contacto choca
     * con esa fila, Postgres devuelve 23505, y como el insert no miraba el
     * error la encuesta contestaba «guardado» sin haber guardado nada.
     *
     * Pasó de verdad, probándolo: quedó sin marca de ausente Y sin marca de
     * contacto. Las dos señales se perdieron y nadie se enteró.
     *
     * Se tira la contraria y se queda la nueva, que es la última que dijo
     * esa persona. Y el orden importa: primero quitar, luego escribir.
     */
    const contraria = senal === 'ausente' ? 'connect' : 'ausente'
    if (suyos.length) {
      await admin
        .from('peer_feedback')
        .delete()
        .eq('table_id', d.mesaId)
        .eq('rater_id', user.id)
        .eq('signal', contraria)
        .in('rated_id', suyos)
    }

    await admin
      .from('peer_feedback')
      .delete()
      .eq('table_id', d.mesaId)
      .eq('rater_id', user.id)
      .eq('signal', senal)

    if (suyos.length) {
      // Y el error SE MIRA. Sin esto, una fila que no entra se lee en la
      // pantalla como una respuesta guardada, que es la forma exacta en que
      // este fallo estuvo vivo desde anoche.
      const { error } = await admin.from('peer_feedback').insert(
        suyos.map((otro) => ({
          table_id: d.mesaId,
          rater_id: user.id,
          rated_id: otro,
          signal: senal,
        })) as never,
      )
      if (error) {
        console.error('[despues] no se guardó', d.accion, d.mesaId, error)
        return NextResponse.json({ error: 'no se pudo guardar' }, { status: 500 })
      }
    }


    /**
     * Y EL CRUCE, que es lo que convierte dos opiniones en un hecho.
     *
     * Michael, 29-10: «si dos de la mesa marcan a alguien, queda como
     * ausente, y operación solo revisa cuando no coinciden». Dos, no uno:
     * una sola persona puede confundirse de nombre o de cara, y marcar a
     * alguien de ausente le quita una cena de su historial.
     *
     * Las mismas guardas que `/api/operacion/asistencia`, que es quien hace
     * esto a mano: una reserva CANCELADA no se toca —quien canceló no vino,
     * y pisar el estado borraría por qué— y una cena que todavía no ha
     * empezado tampoco.
     *
     * Y nunca pisa un `attended`: si operación ya dijo que vino, su palabra
     * manda sobre dos recuerdos de la madrugada. Ahí se queda la discrepancia
     * para que la mire una persona, que es lo que él pidió.
     */
    if (d.accion === 'falto' && suyos.length) {
      // La fecha de esta mesa, para encontrar la reserva de cada uno.
      const { data: deQueFecha } = await admin
        .from('dinner_tables')
        .select('event_id')
        .eq('id', d.mesaId)
        .maybeSingle()
      const evento = deQueFecha?.event_id ?? null

      const { data: senales } = await admin
        .from('peer_feedback')
        .select('rated_id')
        .eq('table_id', d.mesaId)
        .eq('signal', 'ausente')
        .in('rated_id', suyos)

      const cuantos = new Map<string, number>()
      for (const x of senales ?? []) {
        cuantos.set(x.rated_id, (cuantos.get(x.rated_id) ?? 0) + 1)
      }

      const conDos = [...cuantos.entries()].filter(([, n]) => n >= 2).map(([id]) => id)

      if (evento) for (const quien of conDos) {
        const { data: suya } = await admin
          .from('bookings')
          .select('id, status, events(starts_at)')
          .eq('profile_id', quien)
          .eq('event_id', evento)
          .maybeSingle()

        if (!suya) continue
        if (suya.status !== 'confirmed' && suya.status !== 'pending_payment') continue
        const empieza = (suya.events as unknown as { starts_at: string } | null)?.starts_at
        if (empieza && Date.parse(empieza) > Date.now()) continue

        const { error } = await admin
          .from('bookings')
          .update({ status: 'no_show' } as never)
          .eq('id', suya.id)
        if (error) console.error('[despues] no se pudo marcar la ausencia', suya.id, error)
      }
    }

    return NextResponse.json({ estado: d.accion, cuantos: suyos.length })
  }

  // --- reportar ---------------------------------------------------------
  if (!(await estaEnLaMesa(admin, d.mesaId, d.aQuien))) {
    return NextResponse.json({ error: 'Esa persona no estaba en tu mesa.' }, { status: 404 })
  }

  const { data: mesa } = await admin
    .from('dinner_tables')
    .select('event_id')
    .eq('id', d.mesaId)
    .maybeSingle()

  const { error } = await admin.from('incident_reports').insert({
    reporter_id: user.id,
    subject_id: d.aQuien,
    event_id: mesa?.event_id ?? null,
    // Alto por defecto: lo lee una persona el mismo día. Bajarlo es una
    // decisión de quien lo lee, no del formulario.
    severity: 'high',
    description: d.motivo,
  })

  if (error) {
    console.error('[despues] reportar', error)
    return NextResponse.json({ error: 'No pudimos registrarlo.' }, { status: 500 })
  }

  // Reportar bloquea de paso, y para siempre. Quien reporta no tiene que
  // acordarse además de bloquear.
  const [a, b] = par(user.id, d.aQuien)
  await admin.from('exclusions').upsert(
    { profile_a: a, profile_b: b, reason: 'reporte', created_by: user.id },
    { onConflict: 'profile_a,profile_b' },
  )

  return NextResponse.json({ estado: 'reportado' })
}
