import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { FORMATOS_DE_FAMILIA, familiaDe } from '@/lib/formatos'
import { buscarSitio } from '@/lib/places'
import { exigirOps } from '@/lib/ops'
import { COCINAS, nombreDeCocina } from '@/lib/reglas'
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
  // Qué se come. Los mismos códigos que la pregunta «comidas» del
  // cuestionario: cruzar los dos es lo que dice qué restaurante pide la bolsa
  // de una fecha, y con dos catálogos paralelos el cruce falla en silencio.
  cocinas: z.array(z.string().min(1).max(40)).max(6).optional(),
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
  /**
   * El enlace de la ficha de Maps. OBLIGATORIO desde el 22 de agosto de 2026.
   *
   * Era opcional aquí y solo hacía falta para activar. Michael lo sube al
   * alta: la dirección se comprueba al dar de alta el local, no al pintar el
   * enlace — si entra mal, se arregla en un sitio y no en los tres que la
   * pintan.
   *
   * Y «localizable» se comprueba así y no geocodificando la dirección. Lo
   * probé contra Nominatim: encuentra «Av. Tamanaco, El Rosal» y «Calle
   * Madrid, Las Mercedes», pero NO «Cardenal, Calle Madrid con avenida
   * Principal, Las Mercedes», que es la dirección real de un local de verdad
   * — el «con avenida X» es cómo se escriben las direcciones en Caracas. Un
   * validador que rechaza locales buenos es peor que ninguno, y además
   * añadiría un tercero del que depender.
   *
   * Lo que sí prueba que el sitio existe es el enlace que alguien encontró en
   * Maps. Se comprueba que sea de Maps y no una URL cualquiera: con
   * `.url()` a secas valía `https://ejemplo.com`, y el botón «Cómo llegar»
   * llevaría ahí.
   */
  mapa: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((u) => /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps)/i.test(u), {
      message: 'El enlace tiene que ser de Google Maps.',
    }),
})

const cambio = z.discriminatedUnion('accion', [
  /**
   * Buscar el sitio en Google Places, por nombre.
   *
   * Devuelve candidatos y no escribe nada: elegir cuál es es una decisión de
   * quien conoce el local. «Alto» en El Rosal devuelve varios.
   */
  z.object({
    accion: z.literal('buscar'),
    consulta: z.string().trim().min(3).max(200),
  }),
  /**
   * Y fijar el elegido en un local que ya existe.
   *
   * Es lo que arregla los que se dieron de alta antes del candado: Cardenal y
   * Alto entraron el 8 y el 9 de agosto, siguen activos y ninguno tiene
   * `maps_url`, así que su «Cómo llegar» cae en una búsqueda por texto. El
   * candado del alta solo mira los nuevos.
   */
  z.object({
    accion: z.literal('fijar-sitio'),
    id: z.string().uuid(),
    placeId: z.string().min(3).max(300),
  }),
  z.object({
    accion: z.literal('activar'),
    id: z.string().uuid(),
    activo: z.boolean(),
  }),
  /**
   * Las cocinas del local.
   *
   * Van aparte de `editar` porque no son un campo de texto: son una lista de
   * códigos y hay que comprobarlos contra `AroReglas.COCINAS`, que es la misma
   * lista que se le ofrece a la gente en el cuestionario. Un código que no esté
   * ahí se guarda igual —la columna es un array de texto— y lo que se rompe es
   * el cruce, en silencio.
   *
   * Esto faltaba entero. La pregunta «elige tus 3 comidas favoritas» lleva
   * desde el principio y NINGUN local tiene cocina asignada, así que esa
   * respuesta no se cruzaba con nada: la gente elegía y el dato moría ahí.
   * Del panel solo se podían leer; para ponerlas había que entrar a la base.
   */
  z.object({
    accion: z.literal('cocinas'),
    id: z.string().uuid(),
    cocinas: z.array(z.string()).max(8),
  }),
  z.object({
    accion: z.literal('editar'),
    id: z.string().uuid(),
    campo: z.enum([
      'direccion', 'menu', 'comision', 'contacto', 'telefono', 'aforo', 'ruido', 'mapa',
      // Los tres del alta, también editables desde la ficha: un sitio cambia
      // los días que abre y la mesa larga que compró el mes pasado.
      'metro', 'metroMinutos', 'forma', 'dias',
      // Lo que solo se podía poner entrando a la base.
      //
      // `nombre` y `zona` porque un sitio se renombra y una zona se pone mal
      // el día del alta; sin esto había que borrarlo y volver a crearlo, y con
      // él se iría su histórico de mesas.
      'nombre', 'zona',
      // `gasto` es lo DECLARADO al abrir el local; lo real sale de lo que
      // reportan las que cenaron, en `venue_feedback`. No se mezclan.
      'gasto', 'tramo',
      // La migración que las creó dice que `has_parking` «solo se hace
      // editable en la ficha». Nunca se hizo, y las cinco de al lado tampoco.
      'estacionamiento', 'terraza', 'accesible', 'divide', 'segundoActo',
      'ultimaEntrada', 'notas',
    ]),
    valor: z.union([
      z.string(), z.number(), z.boolean(),
      z.array(z.number().int().min(0).max(6)), z.null(),
    ]),
  }),
  /**
   * Los formatos que admite el sitio.
   *
   * Aparte de `editar` porque son una lista de familias que la ruta traduce a
   * los once formatos de la base —igual que en el alta— y porque un sitio sin
   * ningún formato no se le puede ofrecer a nada.
   */
  z.object({
    accion: z.literal('familias'),
    id: z.string().uuid(),
    familias: z.array(z.enum(['cenas', 'drinks', 'movimiento', 'coffee'])).min(1),
  }),
])

/**
 * Lo que hace falta para poder ofrecerlo a una fecha.
 *
 * El enlace del mapa entró aquí el 21 de agosto de 2026, y no por completismo.
 * Los dos locales de la base no lo tienen, así que «Cómo llegar» —en el correo
 * de la mesa y en `/mesa`— se caía a una búsqueda de Maps por nombre y
 * dirección. Michael la pulsó camino de la cena y Maps no dio con el sitio.
 *
 * Una búsqueda acierta o no acierta; el enlace de la ficha lleva al sitio
 * exacto y abre la app de mapas con la navegación puesta. Y este botón se
 * pulsa yendo tarde a una dirección que no conoces: es el peor momento para
 * que una aproximación no funcione.
 *
 * Va en el candado de activar y no en un aviso porque ya hay un candado que
 * hace exactamente esto —sin ruido medido y sin foto de la entrada tampoco se
 * ofrece— y porque el fallo no aparece al dar de alta, aparece la noche de la
 * cena, cuando ya no hay quien lo arregle.
 */
function loQueFalta(l: {
  noise_level: number | null
  address: string | null
  contact_name: string | null
  contact_phone: string | null
  facade_photo_path: string | null
  maps_url: string | null
}) {
  const falta: string[] = []
  if (!l.noise_level) falta.push('medir el ruido')
  if (!l.address) falta.push('la dirección')
  if (!l.contact_name || !l.contact_phone) falta.push('un contacto')
  if (!l.facade_photo_path) falta.push('la foto de la entrada')
  if (!l.maps_url?.trim()) falta.push('el enlace del mapa')
  return falta
}

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: locales, error } = await admin
    .from('restaurants')
    .select('id, name, zone_slug, address, maps_url, facade_photo_path, contact_name, contact_phone, fixed_menu_usd, avg_check_usd, budget_tier, commission_pct, noise_level, max_tables, is_active, formats, created_at, metro_nearby, metro_minutes, table_shape, open_days, cuisines, has_parking, has_terrace, is_accessible, splits_bill, is_after_venue, last_seating, safety_notes')
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

  // La nota del SITIO, que sale de las cuatro preguntas del sitio de la
  // encuesta del día después. Hasta la entrega 16 no existía y la ficha
  // enseñaba `notaDeLasMesas`, que sale de «¿volverías a esa mesa?» y mide a
  // la gente: renovar a un proveedor con esa nota castiga a un restaurante
  // impecable porque a alguien le tocó una mesa aburrida.
  const { data: notasDeSitio } = await admin
    .from('v_nota_de_local')
    .select('restaurant_id, valoracion, respuestas, ambiente, servicio, conversar, comida')
  const notaDelSitio = new Map(
    (notasDeSitio ?? []).map((n) => [n.restaurant_id as string, n]),
  )

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
      // Y la URL para verla. El bucket es privado, como los otros dos, asi
      // que se firma al vuelo; cinco minutos, lo mismo que las verificaciones.
      fotoUrl: null as string | null,
      contacto: l.contact_name,
      telefono: l.contact_phone,
      menu: l.fixed_menu_usd != null ? Number(l.fixed_menu_usd) : null,
      // El gasto medio DECLARADO. El real, por persona, saldría de lo que
      // gastó cada mesa, y eso no lo capturamos en ningún sitio: decir que
      // este número sale de las mesas que ya cenaron sería falso.
      gastoDeclarado: l.avg_check_usd != null ? Number(l.avg_check_usd) : null,
      comision: l.commission_pct != null ? Number(l.commission_pct) : null,
      ruido: l.noise_level,
      // Las cocinas. El CÓDIGO para cruzar contra `profile_traits.cuisines`,
      // y el nombre ya resuelto para pintar: esta pantalla no carga
      // `reglas.js`, así que si la traducción viviera allí saldrían los
      // códigos en crudo — que es lo que pasó al probarlo.
      cocinas: (l as { cuisines?: string[] | null }).cuisines ?? [],
      cocinasTexto: ((l as { cuisines?: string[] | null }).cuisines ?? []).map(nombreDeCocina),
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
      // Lo que hasta hoy solo se podía ver entrando a la base.
      tramo: (l as { budget_tier?: number | null }).budget_tier ?? null,
      estacionamiento: (l as { has_parking?: boolean }).has_parking ?? false,
      terraza: (l as { has_terrace?: boolean | null }).has_terrace ?? null,
      accesible: (l as { is_accessible?: boolean | null }).is_accessible ?? null,
      divide: (l as { splits_bill?: boolean | null }).splits_bill ?? null,
      segundoActo: (l as { is_after_venue?: boolean }).is_after_venue ?? false,
      // Sin los segundos. La columna es `time` y devuelve «22:30:00»; el campo
      // de la ficha pide «22:30» y lo valida así, de modo que al reeditarla
      // sin tocar nada se rechazaba lo que la propia pantalla acababa de
      // enseñar.
      ultimaEntrada: ((l as { last_seating?: string | null }).last_seating ?? '').slice(0, 5) || null,
      notas: (l as { safety_notes?: string | null }).safety_notes ?? null,
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
        // Ya es suya. Sobre 4: Excelente vale 4 y Mal vale 1.
        valoracion: notaDelSitio.get(l.id)?.valoracion ?? null,
        detalleDelSitio: notaDelSitio.get(l.id)
          ? {
              respuestas: notaDelSitio.get(l.id)?.respuestas ?? 0,
              ambiente: notaDelSitio.get(l.id)?.ambiente ?? null,
              servicio: notaDelSitio.get(l.id)?.servicio ?? null,
              conversar: notaDelSitio.get(l.id)?.conversar ?? null,
              comida: notaDelSitio.get(l.id)?.comida ?? null,
            }
          : null,
      },
    }
  })

  // La media de los locales que tengan nota PROPIA. Mientras nadie haya
  // contestado la encuesta sale «—», que es mejor que un número que no es de
  // lo que dice ser.
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

  // Las fotos que hay, firmadas. El bucket es privado —una foto de la puerta
  // de un local no tiene por que ser publica— asi que la URL se firma al
  // vuelo, cinco minutos, igual que las de verificacion.
  for (const l of lista) {
    if (!l.foto) continue
    const { data } = await admin.storage.from('locales').createSignedUrl(l.foto, 300)
    l.fotoUrl = data?.signedUrl ?? null
  }

  return NextResponse.json({
    locales: lista,
    // El catálogo de cocinas, de `AroReglas.COCINAS`, que es la MISMA lista
    // que se le ofrece a la gente en el cuestionario. La ficha no carga
    // `reglas.js` —es una pantalla de operación y no lo necesita para nada
    // más— así que viaja aquí en vez de copiarse allí: una copia y la ficha
    // ofrecería cocinas que nadie puede elegir, o al revés.
    catalogoCocinas: COCINAS.map((c) => ({ codigo: c[1], nombre: c[0] })),
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

/**
 * La foto de la entrada.
 *
 * Es una de las cuatro cosas que impiden ofrecer un local a una fecha, y era
 * la unica SIN NINGUN CAMINO: la ficha tiene el marco y hasta el texto que la
 * promete —«los precios, el contacto y la foto de la entrada se rellenan desde
 * su ficha»— y no habia por donde subirla. Michael se quedo sin poder activar
 * un sitio por una foto que la pantalla decia que se podia poner.
 *
 * Va aparte de `PATCH` porque lleva un fichero: `PATCH` es JSON.
 *
 * Para que sirve, y por que no es una foto bonita del sitio: es para
 * reconocer la PUERTA de noche, llegando. Va en el correo de la mesa y en
 * `/mesa`.
 */
const MAXIMO_FOTO = 8 * 1024 * 1024
const MIMES_FOTO = ['image/jpeg', 'image/png', 'image/webp']

export async function PUT(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const form = await request.formData().catch(() => null)
  const id = String(form?.get('id') ?? '')
  const archivo = form?.get('archivo')

  if (!id || !(archivo instanceof File)) {
    return NextResponse.json({ error: 'Falta la foto.' }, { status: 400 })
  }
  if (archivo.size > MAXIMO_FOTO) {
    return NextResponse.json({ error: 'Esa foto pesa demasiado. El tope son 8 MB.' }, { status: 400 })
  }
  if (!MIMES_FOTO.includes(archivo.type)) {
    return NextResponse.json({ error: 'Ese archivo no es una foto.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: local } = await admin
    .from('restaurants')
    .select('id, facade_photo_path')
    .eq('id', id)
    .maybeSingle()

  if (!local) return NextResponse.json({ error: 'Ese local no existe.' }, { status: 404 })

  const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${id}/entrada-${Date.now()}.${ext}`

  const { error: errorSubida } = await admin.storage
    .from('locales')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

  if (errorSubida) {
    console.error('[locales] no se subio la foto', errorSubida)
    return NextResponse.json({ error: 'No pudimos guardar la foto.' }, { status: 500 })
  }

  const { error } = await admin
    .from('restaurants')
    .update({ facade_photo_path: ruta })
    .eq('id', id)

  if (error) {
    console.error('[locales] no se guardo la ruta de la foto', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  // La anterior se borra DESPUES de que la nueva este guardada: si se borra
  // antes y la subida falla, el local se queda sin foto y sin poder ofrecerse.
  if (local.facade_photo_path) {
    await admin.storage.from('locales').remove([local.facade_photo_path])
  }

  const { data: firmada } = await admin.storage.from('locales').createSignedUrl(ruta, 300)
  return NextResponse.json({ ok: true, fotoUrl: firmada?.signedUrl ?? null })
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

  const formatos = [...new Set(d.familias.flatMap((f) => FORMATOS_DE_FAMILIA[f]))]

  const { data, error } = await admin
    .from('restaurants')
    .insert({
      name: d.nombre.trim(),
      zone_slug: d.zona,
      address: d.direccion?.trim() || '',
      max_tables: d.aforo,
      noise_level: d.ruido,
      ...(d.cocinas?.length ? { cuisines: [...new Set(d.cocinas)] } : {}),
      formats: formatos as never,
      metro_nearby: d.metro?.trim() || null,
      metro_minutes: d.metroMinutos ?? null,
      table_shape: d.forma ?? null,
      maps_url: d.mapa,
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

  // Buscar va ANTES de leer el local: es la única acción que no habla de uno
  // concreto —todavía no se ha elegido— y con el `select` delante el
  // discriminante ni siquiera compila, porque `buscar` no trae `id`.
  if (d.accion === 'buscar') {
    const r = await buscarSitio(d.consulta)
    if (!r.ok) {
      // Se dice cuál de los tres motivos es: «no encontré el sitio» y «la
      // clave no está puesta» piden cosas muy distintas de quien lo lee.
      const porque = r.motivo === 'sin-clave'
        ? 'Falta la clave de Google Maps en el servidor.'
        : 'No pudimos preguntarle a Google Maps ahora mismo.'
      return NextResponse.json({ error: porque, motivo: r.motivo }, { status: 502 })
    }
    return NextResponse.json({ sitios: r.sitios })
  }

  const { data: local } = await admin
    .from('restaurants')
    .select('id, noise_level, address, contact_name, contact_phone, facade_photo_path, maps_url')
    .eq('id', d.id)
    .maybeSingle()

  if (!local) return NextResponse.json({ error: 'Ese local no existe.' }, { status: 404 })

  if (d.accion === 'fijar-sitio') {
    // Se vuelve a preguntar a Places por el id en vez de fiarse de lo que
    // mande la pantalla: así el `maps_url` y las coordenadas que se guardan
    // son los de Google y no los que alguien pudo cambiar por el camino.
    const r = await buscarSitio(`place_id:${d.placeId}`)
    const elegido = r.ok ? r.sitios.find((s) => s.placeId === d.placeId) : null

    // `place_id:` no es una consulta de texto que Places entienda, así que si
    // no vuelve por ahí se busca por el nombre del local que ya tenemos.
    const porNombre = elegido
      ? null
      : await (async () => {
          const { data: l } = await admin
            .from('restaurants')
            .select('name, zone_slug, zones(name)')
            .eq('id', d.id)
            .maybeSingle()
          if (!l) return null
          const zona = (l.zones as unknown as { name: string } | null)?.name ?? ''
          const otra = await buscarSitio(`${l.name}, ${zona}, Caracas`)
          return otra.ok ? otra.sitios.find((s) => s.placeId === d.placeId) ?? null : null
        })()

    const sitio = elegido ?? porNombre
    if (!sitio) {
      return NextResponse.json(
        { error: 'Google Maps ya no devuelve ese sitio. Busca otra vez.' },
        { status: 409 },
      )
    }

    const { error } = await admin
      .from('restaurants')
      .update({
        place_id: sitio.placeId,
        lat: sitio.lat,
        lng: sitio.lng,
        maps_url: sitio.mapa,
        // La dirección de Google si el local no tenía ninguna. Si ya tenía
        // una escrita a mano, se respeta: puede llevar la referencia que de
        // verdad usa quien va —«al lado del banco»— y Google no la tiene.
        ...(sitio.direccion ? { address: sitio.direccion } : {}),
      } as never)
      .eq('id', d.id)

    if (error) {
      console.error('[locales] fijar sitio', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }

    await anotar(actor, 'local_editado', 'local', d.id, { placeId: sitio.placeId, mapa: sitio.mapa })
    return NextResponse.json({ estado: 'fijado', sitio })
  }

  if (d.accion === 'familias') {
    const formatos = [...new Set(d.familias.flatMap((x) => FORMATOS_DE_FAMILIA[x]))]
    const { error } = await admin
      .from('restaurants')
      .update({ formats: formatos as never })
      .eq('id', d.id)

    if (error) {
      console.error('[locales] no se guardaron los formatos', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (d.accion === 'cocinas') {
    // Contra la lista compartida, no contra una copia. `COCINAS` es la que
    // usan el cuestionario, la app y la ficha, así que si una cocina se
    // retira mañana esto deja de aceptarla el mismo día.
    const validas = new Set(COCINAS.map((c) => c[1]))
    const malas = d.cocinas.filter((c) => !validas.has(c))
    if (malas.length) {
      return NextResponse.json(
        { error: `No conocemos ${malas.join(' ni ')}.` },
        { status: 400 },
      )
    }

    const { error } = await admin
      .from('restaurants')
      .update({ cuisines: [...new Set(d.cocinas)] })
      .eq('id', d.id)

    if (error) {
      console.error('[locales] no se guardaron las cocinas', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

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
    nombre: 'name',
    zona: 'zone_slug',
    gasto: 'avg_check_usd',
    tramo: 'budget_tier',
    estacionamiento: 'has_parking',
    terraza: 'has_terrace',
    accesible: 'is_accessible',
    divide: 'splits_bill',
    segundoActo: 'is_after_venue',
    ultimaEntrada: 'last_seating',
    notas: 'safety_notes',
  }

  /** Las que son sí o no. Se guardan tal cual, sin pasar por el texto. */
  const SI_O_NO = new Set(['estacionamiento', 'terraza', 'accesible', 'divide', 'segundoActo'])

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

  // El nombre no puede quedarse vacío: es como se le llama al sitio en el
  // correo de la mesa y en «Mi mesa».
  if (d.campo === 'nombre') {
    const nombre = String(d.valor ?? '').trim()
    if (!nombre) {
      return NextResponse.json({ error: 'El sitio necesita un nombre.' }, { status: 400 })
    }
  }

  // La zona decide a qué mesas se le puede ofrecer, así que tiene que existir.
  if (d.campo === 'zona') {
    const { data: z } = await admin
      .from('zones')
      .select('slug')
      .eq('slug', String(d.valor ?? ''))
      .maybeSingle()
    if (!z) return NextResponse.json({ error: 'Esa zona no existe.' }, { status: 400 })
  }

  // La última entrada es una hora, no un texto libre: la columna es `time` y
  // rechaza cualquier otra cosa con un error que no dice nada.
  if (d.campo === 'ultimaEntrada' && d.valor !== null && d.valor !== '') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.valor))) {
      return NextResponse.json(
        { error: 'La hora va como 22:30, en formato de 24 horas.' },
        { status: 400 },
      )
    }
  }

  const NUMERICOS = new Set(['menu', 'comision', 'aforo', 'ruido', 'metroMinutos', 'gasto', 'tramo'])
  let valor: string | number | boolean | null = d.valor as string | number | boolean | null

  // Sí o no van tal cual: pasarlos por el camino del texto los convertiría en
  // la cadena «true», que la columna booleana rechaza.
  if (SI_O_NO.has(d.campo)) {
    // `null` se acepta: es «no lo sabemos», que no es lo mismo que «no» y es
    // el estado en el que nacen. Sin esto, contestar una por error la dejaba
    // contestada para siempre.
    //
    // `has_parking` e `is_after_venue` son `not null` en la base, así que ahí
    // vaciarlas es volver a su valor de nacimiento: falso.
    if (valor !== null && typeof valor !== 'boolean') {
      return NextResponse.json({ error: 'Eso es sí o no.' }, { status: 400 })
    }
    if (valor === null && (d.campo === 'estacionamiento' || d.campo === 'segundoActo')) {
      valor = false
    }
  } else if (NUMERICOS.has(d.campo)) {
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
      if (d.campo === 'tramo' && ![1, 2, 3, 4].includes(n)) {
        return NextResponse.json({ error: 'El tramo de precio va de 1 a 4.' }, { status: 400 })
      }
      if (d.campo === 'gasto' && (n < 0 || n > 500)) {
        return NextResponse.json({ error: 'Ese gasto por persona no cuadra.' }, { status: 400 })
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
