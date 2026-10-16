import { NextResponse } from 'next/server'
import { z } from 'zod'

import { desglose, evaluacion, puntuar, resumen, roturas, zonasDe, PESOS } from '@/lib/reparto/repartir'
import { exigirOps } from '@/lib/ops'
import { construirPool, type Pool } from '@/lib/reparto/pool'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Retocar la propuesta a mano.
 *
 * El algoritmo propone, pero hay cosas que no sabe: que a esos dos les
 * viene mejor un sitio que otro, que esta semana conviene juntar a dos
 * personas por algo que pasó fuera. Operación tiene que poder mover.
 *
 * Lo que NO se negocia es que se revalide. Mover a alguien recalcula las
 * roturas y la puntuación de LAS DOS mesas y lo guarda: si el cambio rompe
 * algo, se ve en el momento y el freno de publicar lo sigue viendo después.
 * Un panel que deja mover sin revalidar convierte el freno en decorado.
 */

const accion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('sede'),
    corridaId: z.string().uuid(),
    mesa: z.number().int().positive(),
    restaurantId: z.string().uuid(),
  }),
  /**
   * Una mesa vacía, a mano.
   *
   * Michael, 13-10: «para mover gente entre mesas necesito poder crear una
   * mesa vacía; siempre se me quedan dos o tres fuera y tenerlos dentro de
   * una mesa, aunque no se pueda cerrar, es mejor».
   *
   * El reparto propone las mesas que salen de la gente que hay; esto es
   * para la parte que hace una persona después, moviendo. Una mesa de dos
   * no se puede publicar —el servidor lo impide— pero sí se puede mirar, y
   * mirar es el trabajo.
   */
  z.object({
    accion: z.literal('nueva-mesa'),
    corridaId: z.string().uuid(),
  }),
  /** Y quitarla, SOLO si está vacía: una con gente se vacía moviéndola. */
  z.object({
    accion: z.literal('quitar-mesa'),
    corridaId: z.string().uuid(),
    mesa: z.number().int().positive(),
  }),
  z.object({
    accion: z.literal('mover'),
    corridaId: z.string().uuid(),
    profileId: z.string().uuid(),
    // 0 = a la lista de espera.
    aMesa: z.number().int().min(0),
  }),
])

// La MISMA forma que escribe repartir. Guardar solo el nombre dejaba a
// quien se movia sin edad ni sector, y la tarjeta enseñaba "—, undefined"
// y un rango de edades "NaN–NaN".
type Integrante = {
  profileId: string
  bookingId: string
  nombre: string
  edad: number | null
  genero: string | null
  empresa: string | null
  sector: string | null
}

const comoIntegrante = (p: {
  profileId: string
  bookingId: string
  nombre: string
  edad: number | null
  genero: string | null
  empresa: string | null
  sector: string | null
  empresaTexto?: string | null
}): Integrante => ({
  profileId: p.profileId,
  bookingId: p.bookingId,
  nombre: p.nombre,
  edad: p.edad,
  genero: p.genero,
  // Como se escribe, no como se compara.
  empresa: p.empresaTexto || p.empresa,
  sector: p.sector,
})
type Mesa = {
  numero: number
  publicada?: boolean
  zona: string | null
  zonasPosibles: string[]
  restaurantId: string | null
  restaurante: string | null
  puntuacion: number
  desglose: Record<string, number>
  resumen: unknown
  roturas: { regla: string; detalle: string }[]
  reglas?: { regla: string; ok: boolean; texto: string }[]
  integrantes: Integrante[]
}

/**
 * Las mesas, de 1 a N y sin huecos.
 *
 * Quitar la 3 de cuatro mesas dejaba 1, 2 y 4, y la siguiente que se añadía
 * era la 5: el número de mesa es lo que se dice en voz alta al llegar —«la
 * mesa de Aro, la cuatro»— y una noche con mesas 1, 2 y 4 es una pregunta en
 * la puerta del restaurante. Michael, 16-10: «siempre renombra las mesas de
 * menor a mayor, no puede quedar 1 y 4».
 *
 * Compacta hacia abajo y en orden ascendente, así que el número nuevo nunca
 * choca con uno que todavía exista: cuando le toca a la 4, el 3 ya quedó
 * libre.
 *
 * Y toca `dinner_tables` si la mesa ya está publicada, porque ahí vive el
 * número de verdad: el correo de la mesa lo lee al enviarlo. Primero la base
 * y después la propuesta — si la base falla, la propuesta no se queda
 * diciendo un número que `dinner_tables` no tiene.
 *
 * NUNCA después de la revelación: a partir de ahí el número está en una
 * pantalla, en un correo y en la cabeza de seis personas. Quien llama a esto
 * comprueba `yaRevelada` antes.
 */
async function renumerar(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  mesas: Mesa[],
): Promise<string | null> {
  const plan = [...mesas]
    .sort((a, b) => a.numero - b.numero)
    .map((mesa, i) => ({ mesa, de: mesa.numero, a: i + 1 }))
    .filter((c) => c.de !== c.a)

  if (!plan.length) return null

  for (const c of plan) {
    if (c.mesa.publicada !== true) continue
    const { error } = await admin
      .from('dinner_tables')
      .update({ table_number: c.a })
      .eq('event_id', eventId)
      .eq('table_number', c.de)

    if (error) {
      console.error('[propuesta] no se pudo renumerar la mesa publicada', c, error)
      return 'No pudimos renumerar las mesas.'
    }
  }

  for (const c of plan) c.mesa.numero = c.a
  return null
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = accion.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data

  const { data: corrida } = await admin
    .from('matching_runs')
    .select('id, event_id, proposal, unmatched, is_published, weights')
    .eq('id', d.corridaId)
    .maybeSingle()

  if (!corrida) return NextResponse.json({ error: 'Esa corrida no existe.' }, { status: 404 })

  const mesas = (corrida.proposal ?? []) as unknown as Mesa[]
  const espera = ((corrida.unmatched ?? []) as unknown as Integrante[]) ?? []
  const pesos = (corrida.weights as unknown as typeof PESOS) ?? PESOS

  // El pool completo, para poder recalcular con los datos de verdad y no
  // con el resumen que quedó guardado en la propuesta.
  const pool: Pool = await construirPool(admin, corrida.event_id)
  const porId = new Map(pool.personas.map((p) => [p.profileId, p]))

  // Una mesa publicada no se toca. Esa gente ya sabe con quién cena y
  // dónde; cambiarlo aquí dejaría su pantalla diciendo una cosa y la base
  // otra. Para cambiarla hay que despublicarla a propósito.
  const cerrada = (m?: Mesa | null) => m?.publicada === true

  /**
   * SALVO EL SITIO, Y SOLO ANTES DE LA REVELACIÓN.
   *
   * El candado de arriba dice «esa gente ya sabe con quién cena y dónde», y
   * lo primero es verdad desde que se publica. Lo segundo no: el sitio no se
   * cuenta hasta `reveal_at`, mediodía del día de la cena. Entre publicar y
   * esa hora, nadie conoce la dirección, así que cambiarla no contradice
   * nada que le hayamos dicho a nadie.
   *
   * Y no hace falta reencolar: `mesa_asignada` compone la dirección AL
   * ENVIARLO, leyendo `table_members`, no del payload. Quien tenga su correo
   * todavía en cola recibirá el sitio nuevo sin que haya que tocarlo.
   *
   * Después de la revelación sigue cerrado aquí: ahí ya hay gente con una
   * dirección en la mano, y ese camino pasa por volver a publicar, que es
   * quien sabe mandar el `mesa_cambiada` a los que se mueven.
   *
   * Lo pidió Michael el 14-10: «¿podría editar el sitio luego sin tener que
   * reabrir la mesa?», y al preguntar, «me refería antes de revelar».
   */
  const { data: evento } = await admin
    .from('events')
    .select('reveal_at')
    .eq('id', corrida.event_id)
    .maybeSingle()

  // Sin `reveal_at` se trata como revelada: no se abre una puerta por un
  // dato que falta.
  const yaRevelada = !evento?.reveal_at || new Date(evento.reveal_at) <= new Date()

  if (d.accion === 'nueva-mesa') {
    // El siguiente número libre, contando también las publicadas: dos mesas
    // con el mismo número en la misma noche es una mesa que nadie encuentra.
    const numero = mesas.reduce((n, m) => Math.max(n, m.numero), 0) + 1
    mesas.push({
      numero,
      zona: null,
      zonasPosibles: [],
      restaurantId: null,
      restaurante: null,
      puntuacion: 0,
      desglose: {},
      resumen: null,
      roturas: [],
      integrantes: [],
    })
  } else if (d.accion === 'quitar-mesa') {
    const i = mesas.findIndex((m) => m.numero === d.mesa)
    if (i < 0) return NextResponse.json({ error: 'Esa mesa no existe.' }, { status: 404 })
    if (cerrada(mesas[i])) {
      return NextResponse.json({ error: 'Esa mesa ya está publicada.' }, { status: 409 })
    }
    if (mesas[i].integrantes.length) {
      return NextResponse.json(
        { error: 'Esa mesa tiene gente. Muévela antes de quitarla.' },
        { status: 409 },
      )
    }
    mesas.splice(i, 1)
  } else if (d.accion === 'sede') {
    const mesa = mesas.find((m) => m.numero === d.mesa)
    if (!mesa) return NextResponse.json({ error: 'Esa mesa no existe.' }, { status: 404 })
    if (cerrada(mesa) && yaRevelada) {
      return NextResponse.json(
        {
          error:
            'Esa mesa ya está publicada y la gente ya tiene la dirección. Cámbiala y vuelve a publicar: a quien le cambie el sitio le sale un aviso.',
          motivo: 'ya-revelada',
        },
        { status: 409 },
      )
    }

    const sede = pool.sedes.find((v) => v.restaurantId === d.restaurantId)
    if (!sede) {
      return NextResponse.json({ error: 'Ese sitio no está abierto en esta fecha.' }, { status: 400 })
    }

    // El sitio tiene que estar en una zona que acepten los seis. Si no, se
    // les manda a un sitio al que dijeron que no pueden ir.
    const gente = mesa.integrantes.map((i) => porId.get(i.profileId)).filter((p) => p != null)
    const posibles = zonasDe(gente)
    if (!posibles.includes(sede.zona)) {
      return NextResponse.json(
        {
          error: `Esa mesa no acepta ${sede.zonaNombre}. Sus zonas son: ${posibles.join(', ') || 'ninguna en común'}.`,
        },
        { status: 409 },
      )
    }

    mesa.zona = sede.zona
    mesa.restaurantId = sede.restaurantId
    mesa.restaurante = sede.nombre
    mesa.roturas = mesa.roturas.filter((r) => r.regla !== 'sede')

    /**
     * Y si la mesa YA ESTÁ PUBLICADA, también en la mesa de verdad.
     *
     * Cambiarlo solo en la propuesta no serviría de nada, y además mentiría:
     * `publicar` se niega a republicar una mesa ya publicada, así que el
     * panel enseñaría el sitio nuevo y `dinner_tables` seguiría con el
     * viejo. Dos verdades sobre dónde cena esa gente, y la que manda —la de
     * la base— sería la que no se ve.
     *
     * Se toca SOLO el sitio. Ni la gente, ni los encuentros, ni el número:
     * nada de eso cambia porque se cambie el restaurante, y el candado de
     * arriba sigue tapando todo lo demás.
     *
     * Nada que avisar: estamos antes de `reveal_at` —si no, no se llega
     * aquí— así que nadie tiene todavía la dirección, y el correo de la mesa
     * la compone al enviarlo leyendo `table_members`. El que esté en cola
     * saldrá con el sitio nuevo sin tocarlo.
     */
    if (cerrada(mesa)) {
      const { error } = await admin
        .from('dinner_tables')
        .update({ restaurant_id: sede.restaurantId })
        .eq('event_id', corrida.event_id)
        .eq('table_number', mesa.numero)

      if (error) {
        console.error('[propuesta] no se pudo cambiar el sitio de la mesa publicada', error)
        return NextResponse.json(
          { error: 'No pudimos cambiar el sitio de esa mesa.' },
          { status: 500 },
        )
      }
    }
  } else {
    const persona = porId.get(d.profileId)
    if (!persona) return NextResponse.json({ error: 'Esa persona no está.' }, { status: 404 })

    const origen = mesas.find((m) => m.integrantes.some((i) => i.profileId === d.profileId))
    const destino = d.aMesa === 0 ? null : mesas.find((m) => m.numero === d.aMesa)

    if (d.aMesa !== 0 && !destino) {
      return NextResponse.json({ error: 'Esa mesa no existe.' }, { status: 404 })
    }
    if (cerrada(origen) || cerrada(destino)) {
      return NextResponse.json(
        { error: 'No se puede mover gente de una mesa ya publicada.' },
        { status: 409 },
      )
    }
    if (origen && destino && origen.numero === destino.numero) {
      return NextResponse.json({ estado: 'sin cambios', mesas, espera })
    }

    if (origen) origen.integrantes = origen.integrantes.filter((i) => i.profileId !== d.profileId)
    const desdeEspera = espera.findIndex((e) => e.profileId === d.profileId)
    if (desdeEspera >= 0) espera.splice(desdeEspera, 1)

    if (destino) {
      destino.integrantes.push(comoIntegrante(persona))
    } else {
      espera.push(comoIntegrante(persona))
    }
  }

  /**
   * Y antes de nada, los números: de 1 a N, sin huecos.
   *
   * Va aquí y no dentro de cada acción porque es una propiedad de la
   * propuesta entera, no de la acción que se acaba de hacer: cualquier
   * cambio que deje un hueco lo cierra, venga de donde venga.
   */
  if (!yaRevelada) {
    const falloNumeros = await renumerar(admin, corrida.event_id, mesas)
    if (falloNumeros) return NextResponse.json({ error: falloNumeros }, { status: 500 })
  }

  // Se recalcula TODO, no solo lo tocado: mover a alguien cambia la mesa de
  // la que sale tanto como la de la que entra, y una sede puede dejar de
  // valer si la mesa cambió de gente.
  const nombresDeZona = new Map(pool.zonas.map((z) => [z.slug, z.nombre]))

  for (const m of mesas) {
    // Las publicadas se dejan como están: recalcularlas no cambiaría nada y
    // su gente ya no está en el pool, así que saldrían vacías.
    if (m.publicada) continue

    // Una mesa vacía no se puntúa: no hay nada que puntuar, y las reglas
    // sobre cero personas dirían que todas se cumplen, que es mentira. Se
    // deja en blanco y el panel la enseña como lo que es, un sitio donde
    // dejar gente mientras se mueve.
    if (!m.integrantes.length) {
      m.puntuacion = 0
      m.desglose = {}
      m.resumen = null
      m.zonasPosibles = []
      m.roturas = []
      m.reglas = []
      continue
    }

    const gente = m.integrantes.map((i) => porId.get(i.profileId)).filter((p) => p != null)
    m.puntuacion = Number(puntuar(gente, pesos).toFixed(3))
    m.desglose = desglose(gente)
    m.resumen = resumen(gente)
    m.zonasPosibles = zonasDe(gente)
    m.roturas = roturas(gente)
    // Las siete, otra vez: mover a alguien cambia el balance de las dos
    // mesas, y la pantalla las pinta desde aqui.
    m.reglas = evaluacion(gente, m.zona, nombresDeZona.get(m.zona ?? '') ?? m.zona)

    // Si la sede elegida ya no está entre las zonas posibles, se cae.
    if (m.restaurantId) {
      const sede = pool.sedes.find((v) => v.restaurantId === m.restaurantId)
      if (!sede || !m.zonasPosibles.includes(sede.zona)) {
        m.restaurantId = null
        m.restaurante = null
        m.zona = null
      }
    }
    if (!m.restaurantId) {
      m.zona = m.zonasPosibles[0] ?? null
      m.roturas = [
        ...m.roturas,
        {
          regla: 'sede',
          detalle: m.zona ? `falta elegir sitio en ${m.zona}` : 'sin zona común',
        },
      ]
    }

    // Una mesa que se queda corta o se pasa tampoco puede publicarse.
    if (m.integrantes.length !== pool.porMesa) {
      m.roturas = [
        ...m.roturas,
        { regla: 'tamaño', detalle: `${m.integrantes.length} en vez de ${pool.porMesa}` },
      ]
    }
  }

  const { error } = await admin
    .from('matching_runs')
    .update({ proposal: mesas as never, unmatched: espera as never })
    .eq('id', corrida.id)

  if (error) {
    console.error('[propuesta] no se guardó', error)
    return NextResponse.json({ error: 'No pudimos guardar el cambio.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'actualizada', mesas, espera })
}
