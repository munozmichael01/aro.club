import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Locales (entrega 8).
 *
 * No es un CRUD suelto: alimenta el reparto. Un local decide si una zona
 * puede tener mesa, qué formato admite, cuántas mesas simultáneas caben y
 * si se puede conversar allí.
 *
 * **Un local no se borra nunca.** Solo se desactiva, y con firma: quién y
 * cuándo. Borrarlo rompería el histórico de las mesas que pasaron por él, y
 * ese histórico es justo lo que decide si se renueva.
 */

/**
 * Los cuatro formatos de la pantalla son FAMILIAS; la base guarda el
 * formato del evento. «Movimiento» son seis cosas distintas —caminata,
 * carrera, pádel…— y pedirle a operación que marque las seis para decir
 * «aquí se puede hacer deporte» sería trasladarle una decisión de esquema.
 */
const FAMILIAS: Record<string, string[]> = {
  cenas: ['dinner', 'foodie_dinner', 'women_dinner'],
  drinks: ['drinks'],
  movimiento: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],
  coffee: ['coffee'],
}

const familiaDe = (formato: string) =>
  Object.keys(FAMILIAS).find((f) => FAMILIAS[f].includes(formato)) ?? null

/**
 * El ruido: 1-3 en la base, etiqueta en pantalla. El número no sale nunca,
 * que es lo que pide el contrato: quien elige sitio para una mesa que viene
 * a conversar no debería traducir una escala.
 */
const RUIDO: Record<number, [string, string]> = {
  1: ['Se puede conversar', 'Una mesa de seis se oye entera sin levantar la voz.'],
  2: ['Suena', 'Se conversa, pero hay que acercarse al de enfrente.'],
  3: ['Suena alto', 'No sirve para cenas. Solo drinks.'],
}

const alta = z.object({
  nombre: z.string().min(1).max(120),
  zona: z.string().min(1),
  direccion: z.string().max(300).optional(),
  familias: z.array(z.enum(['cenas', 'drinks', 'movimiento', 'coffee'])).min(1),
  aforo: z.number().int().min(1).max(20),
  ruido: z.number().int().min(1).max(3),
  // Tres columnas que el esquema define desde el 10 de agosto y que el alta
  // no pedía: se guardaban vacías y nadie las volvía a tocar.
  //
  // El metro y los minutos andando, porque en Caracas deciden si alguien
  // acepta una zona o no.
  metro: z.string().trim().max(80).nullable().optional(),
  metroMinutos: z.number().int().min(0).max(60).nullable().optional(),
  // La forma de la mesa, que en una de seis desconocidos pesa más que el
  // ruido: en una mesa larga los dos extremos no se oyen. Tres valores y no
  // una casilla, porque con un booleano no se distingue «larga» de «ambas».
  forma: z.enum(['redonda', 'larga', 'ambas']).nullable().optional(),
  // Y los días que abre. Es el que impide que un sitio cerrado los jueves
  // reciba la cena del jueves. 0 = domingo, como getDay().
  dias: z.array(z.number().int().min(0).max(6)).min(1).optional(),
})

const cambio = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('activar'),
    id: z.string().uuid(),
    activo: z.boolean(),
  }),
  z.object({
    accion: z.literal('editar'),
    id: z.string().uuid(),
    campo: z.enum([
      'direccion', 'menu', 'comision', 'contacto', 'telefono', 'aforo', 'ruido', 'mapa',
      // Los tres del alta, también editables desde la ficha: un sitio cambia
      // los días que abre y la mesa larga que compró el mes pasado.
      'metro', 'metroMinutos', 'forma', 'dias',
    ]),
    valor: z.union([z.string(), z.number(), z.array(z.number().int().min(0).max(6)), z.null()]),
  }),
])

/** Lo que hace falta para poder ofrecerlo a una fecha. */
function loQueFalta(l: {
  noise_level: number | null
  address: string | null
  contact_name: string | null
  contact_phone: string | null
  facade_photo_path: string | null
}) {
  const falta: string[] = []
  if (!l.noise_level) falta.push('medir el ruido')
  if (!l.address) falta.push('la dirección')
  if (!l.contact_name || !l.contact_phone) falta.push('un contacto')
  if (!l.facade_photo_path) falta.push('la foto de la entrada')
  return falta
}

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: locales, error } = await admin
    .from('restaurants')
    .select('id, name, zone_slug, address, maps_url, facade_photo_path, contact_name, contact_phone, fixed_menu_usd, avg_check_usd, commission_pct, noise_level, max_tables, is_active, formats, created_at, metro_nearby, metro_minutes, table_shape, open_days')
    .order('name')

  if (error) {
    console.error('[locales] leer', error)
    return NextResponse.json({ error: 'No pudimos leer los locales.' }, { status: 500 })
  }

  const { data: zonas } = await admin
    .from('zones')
    .select('slug, name, city_slug, is_active')
    .order('sort_order')

  // El histórico: mesas, personas y valoración media de cada sitio. Sale de
  // las mesas que ya cenaron ahí, no de una columna que alguien mantenga.
  const { data: mesas } = await admin
    .from('dinner_tables')
    .select('id, restaurant_id')

  const { data: sentados } = await admin
    .from('table_members')
    .select('table_id')

  const { data: notas } = await admin
    .from('table_feedback')
    .select('table_id, conversation_rating')

  const sitioDe = new Map((mesas ?? []).map((m) => [m.id, m.restaurant_id]))
  const porSitio = new Map<string, { mesas: number; personas: number; suma: number; votos: number }>()
  const cero = () => ({ mesas: 0, personas: 0, suma: 0, votos: 0 })

  for (const m of mesas ?? []) {
    if (!m.restaurant_id) continue
    const h = porSitio.get(m.restaurant_id) ?? cero()
    h.mesas++
    porSitio.set(m.restaurant_id, h)
  }
  for (const s of sentados ?? []) {
    const r = sitioDe.get(s.table_id)
    if (!r) continue
    const h = porSitio.get(r) ?? cero()
    h.personas++
    porSitio.set(r, h)
  }
  for (const n of notas ?? []) {
    const r = sitioDe.get(n.table_id)
    if (!r || n.conversation_rating == null) continue
    const h = porSitio.get(r) ?? cero()
    // La escala de la mesa es 1-5; la pantalla enseña sobre 5.
    h.suma += Number(n.conversation_rating)
    h.votos++
    porSitio.set(r, h)
  }

  const nombreZona = new Map((zonas ?? []).map((z) => [z.slug, z.name]))

  const lista = (locales ?? []).map((l) => {
    const h = porSitio.get(l.id) ?? cero()
    const familias = [...new Set(((l.formats ?? []) as string[]).map(familiaDe).filter(Boolean))] as string[]
    const falta = loQueFalta(l)
    return {
      id: l.id,
      nombre: l.name,
      zona: l.zone_slug,
      zonaNombre: nombreZona.get(l.zone_slug ?? '') ?? l.zone_slug,
      ciudad: (zonas ?? []).find((z) => z.slug === l.zone_slug)?.city_slug ?? null,
      direccion: l.address,
      mapa: l.maps_url,
      foto: l.facade_photo_path,
      contacto: l.contact_name,
      telefono: l.contact_phone,
      menu: l.fixed_menu_usd != null ? Number(l.fixed_menu_usd) : null,
      // El gasto medio DECLARADO. El real, por persona, saldría de lo que
      // gastó cada mesa, y eso no lo capturamos en ningún sitio: decir que
      // este número sale de las mesas que ya cenaron sería falso.
      gastoDeclarado: l.avg_check_usd != null ? Number(l.avg_check_usd) : null,
      comision: l.commission_pct != null ? Number(l.commission_pct) : null,
      ruido: l.noise_level,
      // Sin medir NO es «se puede conversar». Caer en el nivel 1 por defecto
      // es inventarse que un sitio es tranquilo, y eso sienta una mesa que
      // viene a conversar en un sitio donde no se oyen.
      ruidoTexto: l.noise_level ? RUIDO[l.noise_level][0] : 'Ruido sin medir',
      ruidoNota: l.noise_level ? RUIDO[l.noise_level][1] : 'Nadie ha anotado si ahí se puede conversar.',
      aforo: l.max_tables,
      // En Caracas el metro decide si alguien acepta una zona.
      metro: l.metro_nearby,
      metroMinutos: l.metro_minutes,
      // En una mesa larga de seis, los dos extremos no se oyen.
      forma: l.table_shape,
      // Los días que abre, para que el selector de una fecha no ofrezca un
      // sitio cerrado ese día. 0 = domingo.
      dias: l.open_days ?? [],
      familias,
      activo: l.is_active,
      desde: l.created_at,
      // Un sitio a medias en un selector es una mesa mal sentada.
      falta,
      sePuedeActivar: falta.length === 0,
      historico: {
        mesas: h.mesas,
        personas: h.personas,
        // Esto NO es la nota del local: es la de las MESAS que mandamos
        // ahí, y la pregunta que la escribe es «¿volverías a esa mesa?»
        // —sobre la gente, no sobre el sitio—. Usarla para decidir si se
        // renueva un proveedor penaliza a un restaurante impecable porque
        // a alguien le tocó una mesa aburrida.
        //
        // La valoración del local todavía no existe: hay que preguntarla.
        notaDeLasMesas: h.votos ? Number((h.suma / h.votos).toFixed(2)) : null,
        valoracion: null,
      },
    }
  })

  // La media de los locales que tengan nota PROPIA. Hoy ninguno la tiene,
  // así que sale «—» en vez de un número que no es de lo que dice ser.
  const conNota = lista.filter((l) => l.historico.valoracion != null)
  const media = conNota.length
    ? conNota.reduce((t, l) => t + (l.historico.valoracion ?? 0), 0) / conNota.length
    : null

  // Nombrar y contar salen del MISMO conjunto: las zonas activas sin ningún
  // local activo de cenas. Sin sitio no hay mesa, aunque haya doce apuntados.
  const conCena = new Set(
    lista.filter((l) => l.activo && l.familias.includes('cenas')).map((l) => l.zona),
  )
  const sinCena = (zonas ?? [])
    .filter((z) => z.is_active !== false && !conCena.has(z.slug))
    .map((z) => z.name)

  const activos = lista.filter((l) => l.activo)
  const porZona = new Map<string, number>()
  for (const l of activos) porZona.set(l.zona ?? '', (porZona.get(l.zona ?? '') ?? 0) + 1)

  // Cuánta gente acepta cada zona.
  //
  // Es el número que decide si vale la pena abrirla: una zona con cuatro
  // personas no da para una mesa por muchos locales que tenga. Sale de las
  // respuestas, no de los locales, y se cuenta solo a quien podría sentarse
  // —verificada y de alta—: contar leads infla la zona y hace abrir fechas
  // que luego no se llenan.
  const { data: verificados } = await admin.from('v_verified_profiles').select('id')
  const puedenSentarse = new Set((verificados ?? []).map((v) => v.id))

  const { data: respuestasZona } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'zonas')

  const genteEn = new Map<string, number>()
  for (const r of respuestasZona ?? []) {
    if (!puedenSentarse.has(r.profile_id)) continue
    for (const z of (Array.isArray(r.value) ? r.value : []) as string[]) {
      genteEn.set(z, (genteEn.get(z) ?? 0) + 1)
    }
  }

  return NextResponse.json({
    locales: lista,
    zonas: (zonas ?? []).map((z) => ({
      slug: z.slug,
      nombre: z.name,
      ciudad: z.city_slug,
      activa: z.is_active !== false,
      personas: genteEn.get(z.slug) ?? 0,
    })),
    resumen: {
      activos: activos.length,
      total: lista.length,
      zonasCubiertas: new Set(activos.map((l) => l.zona)).size,
      zonasTotales: (zonas ?? []).length,
      zonasConUnSolo: [...porZona.values()].filter((n) => n === 1).length,
      // A un decimal, y la comparación se hace a esa misma precisión: un
      // 4,35 comparado contra un 4,4 impreso decía estar «por encima de la
      // media de 4,4» mostrando 4,4.
      valoracionMedia: media != null ? Number(media.toFixed(1)) : null,
      zonasSinCena: sinCena,
    },
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = alta.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Faltan datos del local.' }, { status: 400 })
  }
  const d = parsed.data

  const admin = createAdminClient()

  const { data: zona } = await admin
    .from('zones')
    .select('slug')
    .eq('slug', d.zona)
    .maybeSingle()
  if (!zona) return NextResponse.json({ error: 'Esa zona no existe.' }, { status: 400 })

  const formatos = [...new Set(d.familias.flatMap((f) => FAMILIAS[f]))]

  const { data, error } = await admin
    .from('restaurants')
    .insert({
      name: d.nombre.trim(),
      zone_slug: d.zona,
      address: d.direccion?.trim() || '',
      max_tables: d.aforo,
      noise_level: d.ruido,
      formats: formatos as never,
      metro_nearby: d.metro?.trim() || null,
      metro_minutes: d.metroMinutos ?? null,
      table_shape: d.forma ?? null,
      // Si no se dicen, abre todos los días: es el default de la columna y es
      // lo que hacía hasta ahora. Decir «ninguno» sería peor que no saberlo.
      ...(d.dias?.length ? { open_days: [...new Set(d.dias)].sort() } : {}),
      // Entra SIN activar, siempre. El alta pide cinco cosas y el resto se
      // rellena luego; hasta que esté completo no se ofrece a ninguna fecha.
      is_active: false,
    } as never)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[locales] alta', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  await anotar(actor, 'local_creado', 'local', data?.id ?? null, {
    nombre: d.nombre.trim(),
    zona: d.zona,
  })

  return NextResponse.json({ estado: 'creado', id: data?.id })
}

export async function PATCH(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cambio.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const d = parsed.data
  const admin = createAdminClient()

  const { data: local } = await admin
    .from('restaurants')
    .select('id, noise_level, address, contact_name, contact_phone, facade_photo_path')
    .eq('id', d.id)
    .maybeSingle()

  if (!local) return NextResponse.json({ error: 'Ese local no existe.' }, { status: 404 })

  if (d.accion === 'activar') {
    if (d.activo) {
      const falta = loQueFalta(local)
      if (falta.length) {
        return NextResponse.json(
          { error: `Todavía falta ${falta.join(' y ')}. Sin eso no se puede ofrecer.`, falta },
          { status: 409 },
        )
      }
    }

    const { error } = await admin
      .from('restaurants')
      .update({
        is_active: d.activo,
        // Quién dejó de ofrecerlo y cuándo. Es una decisión de dinero.
        deactivated_by: d.activo ? null : actor,
        deactivated_at: d.activo ? null : new Date().toISOString(),
      } as never)
      .eq('id', d.id)

    if (error) {
      console.error('[locales] activar', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json({ estado: d.activo ? 'activo' : 'desactivado' })
  }

  const COLUMNA: Record<string, string> = {
    direccion: 'address',
    menu: 'fixed_menu_usd',
    comision: 'commission_pct',
    contacto: 'contact_name',
    telefono: 'contact_phone',
    aforo: 'max_tables',
    ruido: 'noise_level',
    mapa: 'maps_url',
    metro: 'metro_nearby',
    metroMinutos: 'metro_minutes',
    forma: 'table_shape',
    dias: 'open_days',
  }

  // Los días son una lista, no un valor suelto: se validan aparte y salen por
  // su propio camino antes de que el resto los trate como texto.
  if (d.campo === 'dias') {
    if (!Array.isArray(d.valor) || !d.valor.length) {
      return NextResponse.json(
        { error: 'Un sitio que no abre ningún día no puede recibir mesas. Elige al menos uno.' },
        { status: 400 },
      )
    }
    const dias = [...new Set(d.valor)].sort()
    const { error } = await admin
      .from('restaurants')
      .update({ open_days: dias } as never)
      .eq('id', d.id)

    if (error) {
      console.error('[locales] editar días', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    await anotar(actor, 'local_editado', 'local', d.id, { campo: 'dias', valor: dias })
    return NextResponse.json({ estado: 'guardado', dias })
  }

  if (d.campo === 'forma' && d.valor !== null) {
    if (!['redonda', 'larga', 'ambas'].includes(String(d.valor))) {
      return NextResponse.json({ error: 'Esa forma de mesa no existe.' }, { status: 400 })
    }
  }

  const NUMERICOS = new Set(['menu', 'comision', 'aforo', 'ruido', 'metroMinutos'])
  let valor: string | number | null = d.valor as string | number | null

  if (NUMERICOS.has(d.campo)) {
    if (valor === '' || valor === null) valor = null
    else {
      const n = Number(valor)
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: 'Ese valor no es un número.' }, { status: 400 })
      }
      if (d.campo === 'ruido' && ![1, 2, 3].includes(n)) {
        return NextResponse.json({ error: 'Ese nivel de ruido no existe.' }, { status: 400 })
      }
      if (d.campo === 'aforo' && (n < 1 || n > 20)) {
        return NextResponse.json({ error: 'El aforo va de 1 a 20 mesas.' }, { status: 400 })
      }
      if (d.campo === 'metroMinutos' && (n < 0 || n > 60)) {
        return NextResponse.json({ error: 'Los minutos andando van de 0 a 60.' }, { status: 400 })
      }
      valor = n
    }
  } else if (typeof valor === 'string') {
    valor = valor.trim() || null
  }

  const { error } = await admin
    .from('restaurants')
    .update({ [COLUMNA[d.campo]]: valor } as never)
    .eq('id', d.id)

  if (error) {
    console.error('[locales] editar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  await anotar(actor, 'local_editado', 'local', d.id, { campo: d.campo, valor })

  return NextResponse.json({ estado: 'guardado' })
}
