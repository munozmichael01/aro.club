import { NextResponse } from 'next/server'
import { z } from 'zod'

import { desglose, puntuar, resumen, roturas, zonasDe, PESOS } from '@/lib/reparto/repartir'
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
}): Integrante => ({
  profileId: p.profileId,
  bookingId: p.bookingId,
  nombre: p.nombre,
  edad: p.edad,
  genero: p.genero,
  empresa: p.empresa,
  sector: p.sector,
})
type Mesa = {
  numero: number
  zona: string | null
  zonasPosibles: string[]
  restaurantId: string | null
  restaurante: string | null
  puntuacion: number
  desglose: Record<string, number>
  resumen: unknown
  roturas: { regla: string; detalle: string }[]
  integrantes: Integrante[]
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
  if (corrida.is_published) {
    // Una vez publicada, la gente ya sabe con quién cena. Cambiarla aquí
    // dejaría la pantalla del miembro diciendo una cosa y la base otra.
    return NextResponse.json(
      { error: 'Esa corrida ya está publicada. Vuelve a repartir para cambiarla.' },
      { status: 409 },
    )
  }

  const mesas = (corrida.proposal ?? []) as unknown as Mesa[]
  const espera = ((corrida.unmatched ?? []) as unknown as Integrante[]) ?? []
  const pesos = (corrida.weights as unknown as typeof PESOS) ?? PESOS

  // El pool completo, para poder recalcular con los datos de verdad y no
  // con el resumen que quedó guardado en la propuesta.
  const pool: Pool = await construirPool(admin, corrida.event_id)
  const porId = new Map(pool.personas.map((p) => [p.profileId, p]))

  if (d.accion === 'sede') {
    const mesa = mesas.find((m) => m.numero === d.mesa)
    if (!mesa) return NextResponse.json({ error: 'Esa mesa no existe.' }, { status: 404 })

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
  } else {
    const persona = porId.get(d.profileId)
    if (!persona) return NextResponse.json({ error: 'Esa persona no está.' }, { status: 404 })

    const origen = mesas.find((m) => m.integrantes.some((i) => i.profileId === d.profileId))
    const destino = d.aMesa === 0 ? null : mesas.find((m) => m.numero === d.aMesa)

    if (d.aMesa !== 0 && !destino) {
      return NextResponse.json({ error: 'Esa mesa no existe.' }, { status: 404 })
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

  // Se recalcula TODO, no solo lo tocado: mover a alguien cambia la mesa de
  // la que sale tanto como la de la que entra, y una sede puede dejar de
  // valer si la mesa cambió de gente.
  for (const m of mesas) {
    const gente = m.integrantes.map((i) => porId.get(i.profileId)).filter((p) => p != null)
    m.puntuacion = Number(puntuar(gente, pesos).toFixed(3))
    m.desglose = desglose(gente)
    m.resumen = resumen(gente)
    m.zonasPosibles = zonasDe(gente)
    m.roturas = roturas(gente)

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
