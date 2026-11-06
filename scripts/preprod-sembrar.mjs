/**
 * Llena la base de preproducción con lo que hace falta para recorrer la web.
 *
 * LEE de producción y ESCRIBE en preproducción, y solo eso. Copia catálogos y
 * locales, que no son de nadie, y abre fechas futuras con la forma de las
 * últimas de verdad. No copia ni una persona: ni perfiles, ni reservas, ni
 * pagos, ni cédulas.
 *
 * Las claves de preproducción viven en `.env.preprod.local`, que no se sube.
 *
 *   node scripts/preprod-sembrar.mjs
 *
 * Se puede repetir. Las fechas caducan, y volver a correrlo abre las que falten.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const leer = (nombre) => Object.fromEntries(
  fs.readFileSync(new URL(`../${nombre}`, import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const REAL = leer('.env.local')
const PRE = leer('.env.preprod.local')

// El candado de este guion: escribir en producción por un fichero mal puesto
// es lo único que no se puede permitir aquí.
if (!REAL.NEXT_PUBLIC_SUPABASE_URL.includes('qdydmklrbsdemzvjsldo')) {
  throw new Error('.env.local no apunta a producción: no sé de dónde estoy leyendo.')
}
// La referencia cambia cada vez que se enciende: la anota `preprod.mjs`.
if (!PRE.PREPROD_REF || !PRE.NEXT_PUBLIC_SUPABASE_URL?.includes(PRE.PREPROD_REF) || PRE.NEXT_PUBLIC_SUPABASE_URL.includes('qdydmklrbsdemzvjsldo')) {
  throw new Error('.env.preprod.local no apunta a preproducción: no escribo.')
}

const opciones = { auth: { autoRefreshToken: false, persistSession: false } }
const real = createClient(REAL.NEXT_PUBLIC_SUPABASE_URL, REAL.SUPABASE_SERVICE_ROLE_KEY, opciones)
const pre = createClient(PRE.NEXT_PUBLIC_SUPABASE_URL, PRE.SUPABASE_SERVICE_ROLE_KEY, opciones)

async function copiar(tabla, { sin = [], alCopiar = (f) => f, clave } = {}) {
  const { data, error } = await real.from(tabla).select('*')
  if (error) throw new Error(`${tabla}: ${error.message}`)
  const filas = data.map((f) => {
    const copia = { ...f }
    for (const c of sin) copia[c] = null
    return alCopiar(copia)
  })
  const { error: e2 } = await pre.from(tabla).upsert(filas, clave ? { onConflict: clave } : undefined)
  if (e2) throw new Error(`${tabla}: ${e2.message}`)
  console.log(`${tabla}: ${filas.length}`)
}

// --- catálogos: en el orden de sus llaves --------------------------------
//
// Las migraciones los siembran con ids al azar, así que aquí nacen con otros
// que en producción. Esos se quitan para que queden los canónicos, de atrás
// hacia delante por las llaves. Al repetir el guion ya coinciden y no se toca
// nada, de modo que no se lleva por delante lo que haya probado el analista.
for (const [tabla, llave] of [
  ['questions', 'id'], ['questionnaire_versions', 'id'], ['verification_rejection_reasons', 'code'],
  ['payment_methods', 'id'], ['products', 'id'],
]) {
  const { data: buenas, error } = await real.from(tabla).select(llave)
  if (error) throw new Error(`${tabla}: ${error.message}`)
  const validas = new Set(buenas.map((f) => f[llave]))
  const { data: aqui } = await pre.from(tabla).select(llave)
  const sobran = (aqui ?? []).map((f) => f[llave]).filter((v) => !validas.has(v))
  if (sobran.length) {
    const { error: e2 } = await pre.from(tabla).delete().in(llave, sobran)
    if (e2) throw new Error(`${tabla}: ${e2.message}`)
  }
}

await copiar('cities')
await copiar('zones')
await copiar('products')
// La cuenta de verdad no sale de producción. Quien prueba el pago ve estos
// datos y los puede copiar: con los reales, un ensayo acabaría en un pago real.
await copiar('payment_methods', {
  alCopiar: (m) => ({
    ...m,
    datos_cuenta: m.datos_cuenta && Object.fromEntries(
      Object.keys(m.datos_cuenta).map((k) => [k, typeof m.datos_cuenta[k] === 'boolean' ? m.datos_cuenta[k] : 'PRUEBA, NO PAGAR']),
    ),
  }),
})
await copiar('verification_rejection_reasons')
await copiar('questionnaire_versions')
await copiar('questions')

// Quien desactivó un local es un perfil, y aquí no hay perfiles.
await copiar('restaurants', { sin: ['deactivated_by'] })
await copiar('restaurant_after_venues')

// --- las fotos de los locales --------------------------------------------
// El cubo `locales` se creó a mano en producción: ninguna migración lo trae.
const { data: cubos } = await real.storage.listBuckets()
const cubo = cubos.find((c) => c.id === 'locales')
const { error: eCubo } = await pre.storage.createBucket('locales', {
  public: cubo.public,
  fileSizeLimit: cubo.file_size_limit ?? undefined,
  allowedMimeTypes: cubo.allowed_mime_types ?? undefined,
})
if (eCubo && !/already exists/i.test(eCubo.message)) throw new Error(`cubo: ${eCubo.message}`)

const { data: conFoto } = await real.from('restaurants').select('facade_photo_path').not('facade_photo_path', 'is', null)
let fotos = 0
for (const { facade_photo_path: ruta } of conFoto ?? []) {
  const { data: blob, error } = await real.storage.from('locales').download(ruta)
  if (error) { console.error('foto', ruta, error.message); continue }
  const { error: e2 } = await pre.storage.from('locales').upload(ruta, blob, { upsert: true, contentType: blob.type })
  if (e2) console.error('foto', ruta, e2.message)
  else fotos++
}
console.log(`fotos de locales: ${fotos}`)

// --- la tasa -------------------------------------------------------------
// Los crons de Vercel solo corren en producción, así que aquí nadie la pone al
// día. La pantalla de pago la lee de esta tabla: sin una reciente no cobra.
const { data: tasas } = await real.from('fx_rates').select('*').order('created_at', { ascending: false }).limit(5)
const { error: eTasa } = await pre.from('fx_rates').upsert(tasas.map((t) => ({ ...t, set_by: null })))
if (eTasa) throw new Error(`fx_rates: ${eTasa.message}`)
console.log(`fx_rates: ${tasas.length}`)

// --- las fechas ----------------------------------------------------------
// Cada fecha nace de la última real de ese formato, movida a las semanas que
// vienen: así el horario, el cierre, la revelación y las zonas son de verdad.
const SEMANAS = 8
const DIA = 86_400_000
const { data: existentes } = await pre.from('events').select('format, starts_at').gt('starts_at', new Date().toISOString())
const hay = new Set((existentes ?? []).map((e) => `${e.format}|${e.starts_at.slice(0, 10)}`))

let abiertas = 0
for (const formato of ['dinner', 'drinks', 'brunch']) {
  const { data: molde } = await real
    .from('events').select('*')
    .eq('format', formato).eq('es_prueba', false).neq('status', 'cancelled')
    .eq('mas_uno', false)
    .order('starts_at', { ascending: false }).limit(1).maybeSingle()
  if (!molde) { console.error('sin molde para', formato); continue }

  const { data: zonas } = await real.from('event_venues').select('zone_slug, restaurant_id, max_tables').eq('event_id', molde.id)

  const base = new Date(molde.starts_at).getTime()
  const semanasHasta = Math.max(1, Math.ceil((Date.now() - base) / (7 * DIA)))

  for (let i = 0; i < SEMANAS; i++) {
    const salto = (semanasHasta + i) * 7 * DIA
    const mover = (iso) => (iso ? new Date(new Date(iso).getTime() + salto).toISOString() : iso)
    const empieza = mover(molde.starts_at)
    if (hay.has(`${formato}|${empieza.slice(0, 10)}`)) continue

    const fila = { ...molde }
    delete fila.id
    delete fila.created_at
    Object.assign(fila, {
      starts_at: empieza,
      booking_closes_at: mover(molde.booking_closes_at),
      reveal_at: mover(molde.reveal_at),
      after_reveal_at: mover(molde.after_reveal_at),
      after_starts_at: mover(molde.after_starts_at),
      aviso_previo_at: null,
      // Sin banda de edad: aquí se prueba con cuentas de cualquier fecha de
      // nacimiento, y una banda escondería la fecha sin decir por qué.
      age_band_min: null,
      age_band_max: null,
      status: 'open',
    })

    const { data: nueva, error } = await pre.from('events').insert(fila).select('id').single()
    if (error) throw new Error(`events: ${error.message}`)
    if (zonas?.length) {
      const { error: e2 } = await pre.from('event_venues').insert(zonas.map((z) => ({ ...z, event_id: nueva.id })))
      if (e2) throw new Error(`event_venues: ${e2.message}`)
    }
    abiertas++
  }
}
console.log(`fechas abiertas: ${abiertas}`)
