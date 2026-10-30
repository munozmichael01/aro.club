/**
 * Banco de pruebas: crea una cuenta desechable con el estado que le pida,
 * la uso para mirar la pantalla en el navegador, y la borro.
 *
 * Existe porque mis datos de prueba llevan toda la semana saltandose el
 * camino que recorre una persona real, y asi es como se cuelan los fallos
 * que luego encuentra Michael y no yo.
 *
 * Nunca toca cuentas de nadie: solo la suya, y la borra al terminar.
 */
import { createClient } from '@supabase/supabase-js'
import { claveDe } from './claves.mjs'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CORREO = 'banco-pruebas@aro.club'
const CLAVE = claveDe('BANCO_CLAVE', { para: 'la cuenta del banco de pruebas' })
const RASTRO = new URL('../.banco-pruebas-fechas.json', import.meta.url).pathname
/**
 * El codigo del 20% con el que se prueba el descuento parcial.
 *
 * Lleva dueño a proposito: un codigo de referido es un cupon con
 * `creado_por`, y son esas tres reglas —no el tuyo, no dos, solo la primera
 * fecha— las que no se pueden comprobar con un cupon de operacion. El dueño
 * es otra cuenta de PRUEBA, nunca una de verdad.
 */
const CODIGO_PRUEBA = 'BANCO20'

async function cuentaExistente() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === CORREO) || null
}

async function limpiar() {
  const u = await cuentaExistente()
  if (!u) return null
  // Los pagos antes que las reservas: apuntan a ellas y bloquean el borrado.
  await admin.from('payments').delete().eq('profile_id', u.id)
  await admin.from('credit_ledger').delete().eq('profile_id', u.id)
  await admin.from('bookings').delete().eq('profile_id', u.id)
  await admin.from('answers').delete().eq('profile_id', u.id)
  // Y las fechas que monto este banco. Los ids quedan anotados en disco:
  // se borra exactamente lo que creo el banco y nada mas. Filtrar "por
  // fecha pasada" habria barrido eventos reales.
  if (fs.existsSync(RASTRO)) {
    const ids = JSON.parse(fs.readFileSync(RASTRO, 'utf8'))
    for (const ev of ids) await admin.from('events').delete().eq('id', ev)
    fs.unlinkSync(RASTRO)
  }
  // El codigo de prueba y lo que se canjeo con el. Antes que el perfil:
  // `coupon_redemptions.profile_id` apunta a `profiles` y lo bloquea.
  await admin.from('coupon_redemptions').delete().eq('profile_id', u.id)
  await admin.from('coupons').delete().eq('code', CODIGO_PRUEBA)
  /**
   * Y el codigo de referido que se creo SOLO al abrir su perfil.
   *
   * `coupons.creado_por` es `on delete set null`, asi que borrar la cuenta
   * sin esto dejaria su codigo vivo y sin dueño: un cupon del 20% que
   * cualquiera puede teclear y que no premia a nadie.
   */
  await admin.from('coupons').delete().eq('creado_por', u.id)
  await admin.from('verifications').delete().eq('profile_id', u.id)
  await admin.from('profiles').delete().eq('id', u.id)
  await admin.auth.admin.deleteUser(u.id)
  return u.id
}

/**
 * Los modos, TODOS los argumentos.
 *
 * Esto era `const [orden, ...resto] = process.argv.slice(2)`, y `orden` solo
 * se usaba para `borrar`: el primer modo que se escribiera caía ahí y se
 * ignoraba en silencio. `banco-pruebas.mjs lista` creaba una cuenta desnuda
 * —sin datos, sin verificar, sin respuestas— y anunciaba «lista». Solo
 * funcionaba escribiéndolo segundo, que nadie iba a adivinar.
 *
 * Lo encontró el agente de la app intentando probar los estados de reserva; yo
 * lo tuve delante unas horas antes, vi «Sin verificar» después de pedir
 * `verificada`, y no lo perseguí.
 *
 * Y ahora un modo que no existe FALLA. Silencioso es como esto pasó.
 */
const MODOS = ['borrar', 'verificada', 'purgada', 'cenas', 'mesa', 'revelada', 'lista', 'cupon']

/**
 * `--local <nombre o id>`: en qué sitio se sienta la mesa.
 *
 * Existe para enseñarle a un restaurante cómo se le ve. El correo se puede
 * pintar desde la ficha del local, pero la app y Mi mesa no: ahí hay que
 * entrar con una cuenta de verdad, y hasta ahora esta mesa caía en el primer
 * restaurante que devolviera la base — casi siempre el de pruebas del juego.
 *
 * Sin la opción se comporta igual que antes.
 */
const argumentos = process.argv.slice(2)
const iLocal = argumentos.indexOf('--local')
const QUE_LOCAL = iLocal >= 0 ? argumentos[iLocal + 1] : null
// `iLocal >= 0` antes de nada: sin `--local`, `indexOf` da -1 y «-1 + 1» es
// CERO, así que esto se comía el primer argumento. `borrar` dejaba de ser
// `borrar`, caía al camino de crear y el guion anunciaba una cuenta nueva
// donde se le pidió quitar una. Lo rompí al añadir la opción y lo vi al
// probarlo: el mismo fallo silencioso que esta cabecera ya contaba de antes.
const resto = argumentos.filter((x, i) => x !== '--local' && !(iLocal >= 0 && i === iLocal + 1))
const desconocidos = resto.filter((x) => !MODOS.includes(x))
if (desconocidos.length) {
  console.error('No conozco ' + desconocidos.join(' ni ') + '.')
  console.error('Los modos son: ' + MODOS.join(', ') + '.')
  process.exit(1)
}

if (resto.includes('borrar')) {
  const id = await limpiar()
  console.log(id ? 'borrada ' + id : 'no habia nada')
  process.exit(0)
}

await limpiar()
const { data: nueva, error } = await admin.auth.admin.createUser({
  email: CORREO, password: CLAVE, email_confirm: true,
})
if (error) { console.log('✗', error.message); process.exit(1) }
const id = nueva.user.id

const { error: ep } = await admin.from('profiles').insert({
  id, full_name: 'Banco Pruebas', email: CORREO, city_slug: 'caracas',
  gender: 'sin-decir', status: 'active', locale: 'es-VE',
  // Marcada: una cuenta del banco de pruebas no ocupa asiento en una cena
  // real. Lo sostiene el trigger `prueba_sin_asiento`.
  es_prueba: true,
})
if (ep) { console.log('✗ perfil:', ep.message); process.exit(1) }

// Estados opcionales, uno por argumento.
if (resto.includes('verificada')) {
  // Revisada hace veinte dias: la fecha de borrado cae dentro de los noventa
  // y se puede comprobar que la pantalla dice la misma que la purga.
  const hace20 = new Date(Date.now() - 20 * 86400_000).toISOString()
  const { error: ev } = await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace20, storage_path: id + '/id.jpg' },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace20, storage_path: id + '/selfie.jpg' },
  ])
  if (ev) { console.log('✗ verificacion:', ev.message); process.exit(1) }
}

if (resto.includes('purgada')) {
  const hace100 = new Date(Date.now() - 100 * 86400_000).toISOString()
  await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace100, storage_path: null },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace100, storage_path: null },
  ])
}


// Historial de cenas: una recien pasada sin valorar (para la tarjeta de
// valorar) y una vieja a la que fue. Se usan eventos y mesas ya existentes
// si los hay; si no, se avisa en vez de inventarlos.
if (resto.includes('cenas')) {
  // Dos fechas pasadas propias del banco, marcadas para poder borrarlas.
  // Antes usaba las que hubiera en la base y no habia ninguna pasada; el
  // resto de datos —restaurante, mesa— sale de lo que ya existe.
  const { data: rest } = await admin.from('restaurants').select('id, name').limit(1)
  const restId = rest?.[0]?.id ?? null

  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString()
  const nueva = async (horas) => {
    const { data, error } = await admin.from('events').insert({
      format: 'dinner', starts_at: hace(horas),
      booking_closes_at: hace(horas + 48), reveal_at: hace(horas + 12),
      restaurant_id: restId, status: 'completed', price_usd: 8, city_slug: 'caracas',
    }).select('id').single()
    if (error) { console.log('  ! fecha:', error.message); return null }
    const ya = fs.existsSync(RASTRO) ? JSON.parse(fs.readFileSync(RASTRO, 'utf8')) : []
    fs.writeFileSync(RASTRO, JSON.stringify([...ya, data.id]))
    return data.id
  }

  // Una hace 8 horas: ya termino (>5h) y aun dentro de las 48 → por valorar.
  const recien = await nueva(8)
  // Otra hace treinta dias, fuera de la ventana → solo historial.
  const vieja = await nueva(24 * 30)

  if (recien) {
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: recien, status: 'attended' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: recien, table_number: 1, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  cena de hace 8 h, sin valorar')
  }
  if (vieja) {
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: vieja, status: 'attended' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: vieja, table_number: 2, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  cena de hace 30 dias')
  }
}

// Una fecha por delante con su mesa: es lo que hace aparecer la pestaña
// "Mi mesa", que sin reserva no se enseña.
if (resto.includes('mesa') || resto.includes('revelada')) {
  const yaRevelada = resto.includes('revelada')
  /**
   * El sitio. El que se pida con `--local`, y si no el primero que haya.
   *
   * Por nombre o por id, porque quien lo usa está mirando la ficha del local
   * en el panel y lo que tiene a mano es el nombre.
   */
  let restId = null
  if (QUE_LOCAL) {
    const porId = /^[0-9a-f-]{36}$/i.test(QUE_LOCAL)
    const { data } = porId
      ? await admin.from('restaurants').select('id, name').eq('id', QUE_LOCAL).maybeSingle()
      : await admin.from('restaurants').select('id, name').ilike('name', '%' + QUE_LOCAL + '%').limit(1).maybeSingle()
    if (!data) {
      console.error('No encuentro ningun local que sea «' + QUE_LOCAL + '».')
      process.exit(1)
    }
    restId = data.id
    console.log('  sitio: ' + data.name)
  } else {
    const { data: rest } = await admin.from('restaurants').select('id').limit(1)
    restId = rest?.[0]?.id ?? null
  }
  const en = (h) => new Date(Date.now() + h * 3600_000).toISOString()

  /**
   * Y si está revelada, a las 7:30 de la noche, no «dentro de seis horas».
   *
   * Esto ponía la cena seis horas por delante, así que corriéndolo de noche
   * salía «Jueves · 2:41 a.m.». Da igual para probar un estado, y no da
   * igual para enseñarle la pantalla a un restaurante: nadie cena a las tres
   * de la mañana y lo primero que se lee es la hora.
   *
   * Hoy si todavía no son las 7:30, y si no mañana. 23:30 UTC son las 7:30
   * p.m. de Caracas.
   */
  const laCena = () => {
    const d = new Date()
    d.setUTCHours(23, 30, 0, 0)
    if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString()
  }
  const { data: ev, error: ee } = await admin.from('events').insert({
    format: 'dinner',
    starts_at: yaRevelada ? laCena() : en(48),
    booking_closes_at: yaRevelada ? en(-48) : en(2),
    reveal_at: yaRevelada ? en(-1) : en(24),
    // `locked` y NUNCA `open`: /api/proxima —la cuenta atras de la portada—
    // filtra por status = 'open', asi que una fecha de pruebas abierta sale
    // como cena fantasma contando atras en aro.club, a la vista de cualquiera.
    // En locked no la ve ningun visitante y el banco sigue sirviendo igual:
    // la reserva la inserta el propio guion, y /api/pago no mira el estado
    // del evento sino su cierre.
    restaurant_id: restId, status: 'locked', price_usd: 8, city_slug: 'caracas',
    // Marcada: no sale en la agenda de nadie, ni en la portada, ni en ningún
    // recuento público. `locked` no bastaba — ese estado dice «no admite gente
    // nueva», que es una decisión sobre una fecha REAL, y la de pruebas se
    // colaba cada vez que alguien ampliaba una consulta con buen criterio.
    es_prueba: true,
  }).select('id').single()
  if (ee) console.log('  ! fecha:', ee.message)
  else {
    const ya = fs.existsSync(RASTRO) ? JSON.parse(fs.readFileSync(RASTRO, 'utf8')) : []
    fs.writeFileSync(RASTRO, JSON.stringify([...ya, ev.id]))
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: ev.id, status: 'confirmed' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: ev.id, table_number: 3, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  reserva en dos dias')
  }
}

// Perfil completo y verificado, con creditos: lo minimo para llegar al pago.
if (resto.includes('lista')) {
  await admin.from('profiles').update({
    full_name: 'Banco Pruebas', display_name: 'Banco',
    birthdate: '1990-05-12', gender: 'mujer', phone_e164: '+584121234567',
  }).eq('id', id)
  const hace2 = new Date(Date.now() - 2 * 86400_000).toISOString()
  await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace2, storage_path: id + '/id.jpg' },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace2, storage_path: id + '/selfie.jpg' },
  ])
  // Las respuestas obligatorias, con el primer codigo de cada una.
  const { data: v } = await admin.from('questionnaire_versions').select('id').eq('is_active', true).maybeSingle()
  const { data: qs } = await admin.from('questions')
    .select('key, options, input_type, min_select, exclusive_value')
    .eq('version_id', v.id).eq('is_required', true)

  // Respuestas que de verdad VALEN, no filas que ocupen sitio.
  //
  // Antes eran `cods.slice(0, 2)` para todo lo múltiple y `cods[0] ?? 'x'`
  // para el resto, y eso dejaba tres preguntas mal sin que nada lo dijera:
  // `nacimiento` guardaba la letra «x» —es una fecha y no tiene opciones—, y
  // `comidas` y `actividades` se quedaban en dos cuando piden tres. La cuenta
  // salía «completa» y la pantalla seguía pidiendo cosas, que es exactamente
  // lo que hizo perder una tarde probando los estados de reserva.
  //
  // Y se evita la opción EXCLUSIVA —«cualquier zona», «ninguna»—: marcarla
  // con otra al lado es un estado que la pantalla no deja producir.
  const filas = (qs || []).map((q) => {
    const cods = (q.options || [])
      .map((o) => o.value)
      .filter((c) => c !== q.exclusive_value)
    let valor
    if (q.input_type === 'date') valor = '1990-05-12'
    else if (q.input_type === 'text') valor = 'Banco de pruebas'
    else if (q.input_type === 'multi') valor = cods.slice(0, Math.max(q.min_select || 1, 1))
    else valor = cods[0] ?? null
    return { profile_id: id, version_id: v.id, question_key: q.key, value: valor }
  }).filter((f) => f.value !== null && !(Array.isArray(f.value) && !f.value.length))
  if (filas.length) await admin.from('answers').insert(filas)
  console.log('  perfil completo, verificado, ' + filas.length + ' respuestas')
}

if (resto.includes('cupon')) {
  // De otra cuenta de prueba, que es lo que hace que valga como referido.
  // Si no hay ninguna, se queda sin dueño: sirve para el descuento, no para
  // las reglas del referido, y se dice.
  const { data: otras } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .eq('es_prueba', true)
    .neq('id', id)
    .limit(1)

  const dueno = (otras ?? [])[0] ?? null
  const { error: ec } = await admin.from('coupons').insert({
    code: CODIGO_PRUEBA,
    descuento_pct: 20,
    creado_por: dueno?.id ?? null,
    activo: true,
    max_usos: null,
    caduca_at: null,
    nota: 'Banco de pruebas. Lo borra `borrar`.',
  })
  if (ec) console.log('  ! cupon:', ec.message)
  else {
    /**
     * Y su propia fecha, en `draft`, para poder pagarla con el codigo.
     *
     * No vale la de `mesa`: esa nace `locked` y `/api/cupon` se niega a
     * aplicar un codigo a una fecha que ya no admite gente, con razon. Y no
     * se pone `open` porque `v_fechas_publicas` solo esconde los `draft`:
     * una fecha de prueba en `open` se asoma por la vista publica.
     */
    /**
     * DOS fechas, no una.
     *
     * La segunda es la que comprueba lo que de verdad protege el descuento:
     * que el codigo de invitacion es de la PRIMERA fecha. Con una sola se
     * prueba que la rebaja se aplica, que es la mitad facil.
     */
    const { data: locs } = await admin.from('restaurants').select('id').limit(1)
    for (const cual of ['la primera', 'la segunda']) {
      const dias = cual === 'la primera' ? 3 : 5
      const { data: fecha, error: ef2 } = await admin.from('events').insert({
        starts_at: new Date(Date.now() + dias * 86400_000).toISOString(),
        booking_closes_at: new Date(Date.now() + (dias - 1) * 86400_000).toISOString(),
        reveal_at: new Date(Date.now() + (dias - 0.5) * 86400_000).toISOString(),
        restaurant_id: (locs ?? [])[0]?.id ?? null,
        status: 'draft', price_usd: 10, city_slug: 'caracas', es_prueba: true,
      }).select('id').single()

      if (ef2) { console.log('  ! fecha del cupon:', ef2.message); continue }
      const ya = fs.existsSync(RASTRO) ? JSON.parse(fs.readFileSync(RASTRO, 'utf8')) : []
      fs.writeFileSync(RASTRO, JSON.stringify([...ya, fecha.id]))
      console.log('  ' + cual + ': /pago?evento=' + fecha.id)
    }
    console.log('  codigo ' + CODIGO_PRUEBA + ' · −20%'
      + (dueno ? ' · de ' + (dueno.display_name || dueno.full_name || 'otra cuenta de prueba') : ' · SIN DUEÑO (no prueba las reglas del referido)'))
  }
}

console.log('lista ' + id + (resto.length ? ' · ' + resto.join(', ') : ''))
console.log('   ' + CORREO + ' / ' + CLAVE)
