/**
 * La cuenta que se le da a quien revisa la app en la App Store.
 *
 * Apple pide un usuario y una contraseña con los que ver el producto entero.
 * El banco de pruebas ya sabe montar una cuenta así —`banco-pruebas.mjs lista
 * revelada`— pero no sirve para esto por dos motivos:
 *
 *  · su cena es dentro de seis horas, y una revisión tarda días: para cuando
 *    la miran, la mesa ya pasó y el revisor ve una pantalla vacía;
 *  · su contraseña está escrita en el guión, y **este repositorio es
 *    público**. La de aquí se genera, se imprime una vez y no se guarda en
 *    ningún fichero.
 *
 * **Qué toca y qué no.** Crea SU propia cuenta, SU propio restaurante y SU
 * propia fecha. No usa ninguna fecha real ni sienta a nadie de verdad en su
 * mesa: los otros cinco son cuentas suyas, con correos `@prueba.aro.club`,
 * que el remitente nunca escribe. La fecha nace en `locked` y no en `open`:
 * `/api/proxima` filtra por `open`, así que una fecha de pruebas abierta
 * saldría contando atrás en aro.club a la vista de cualquiera.
 *
 * Todo lo que crea queda anotado en disco por id, y `--borrar` quita
 * exactamente eso y nada más.
 *
 *   node scripts/cuenta-revision.mjs
 *       La monta y imprime el usuario y la contraseña. Si ya existe, la
 *       refresca: mueve la cena hacia delante y deja la contraseña como
 *       estaba.
 *
 *   node scripts/cuenta-revision.mjs --refrescar
 *       Solo mueve la cena hacia delante. Es lo que hay que correr el día que
 *       se manda a revisar, y otra vez si Apple la devuelve. Con
 *       `--horas=144` la cena queda a seis días y aguanta la revisión entera.
 *
 *   node scripts/cuenta-revision.mjs --sin-normas
 *       Deja la cuenta SIN haber aceptado las normas, para que el revisor vea
 *       esa pantalla. Hace falta porque grabar el video con esa cuenta la
 *       hace aceptarlas: quien graba pulsa «Continuar» y el revisor ya no ve
 *       nada. Se corre DESPUÉS de grabar y ANTES de mandar a revisar.
 *
 *   node scripts/cuenta-revision.mjs --sin-encuesta
 *       Deshace lo que la cuenta hizo en Mi mesa después de la cena: la
 *       valoración, los bloqueos y los reportes. Mismo motivo que
 *       `--sin-normas`: grabar el video con esta cuenta valora de verdad, y
 *       el revisor entraría y vería «Anotado, gracias» con la persona ya
 *       reportada, sin nada que probar. Va aparte y no dentro de
 *       `--sin-normas` a propósito: aquello pone una columna a null y esto
 *       borra filas, y una bandera que borra datos tiene que pedirse.
 *
 *   node scripts/cuenta-revision.mjs --borrar
 *       Quita la cuenta, su fecha, su restaurante y sus cinco acompañantes.
 *
 * **La verificación de identidad la aprueba Michael**, no este guión: aquí se
 * insertan las dos filas ya aprobadas porque no hay cédula real que revisar,
 * y eso es una decisión suya, no mía. Está dicho para que no se cuele como un
 * detalle técnico.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const env = Object.fromEntries(
  readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const { createClient } = await import('@supabase/supabase-js')
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CORREO = 'revision.appstore@aro.club'
const DOMINIO_MESA = 'prueba.aro.club'
const RASTRO = fileURLToPath(new URL('../.cuenta-revision.json', import.meta.url))

const args = process.argv.slice(2)
const CONOCIDOS = ['--borrar', '--refrescar', '--acompanantes', '--sin-normas', '--sin-encuesta']
const raros = args.filter((a) => !CONOCIDOS.includes(a) && !/^--horas=-?\d+$/.test(a))
if (raros.length) {
  console.error('No conozco: ' + raros.join(', ') + '. Los modos son: ' + CONOCIDOS.join(', ') + '.')
  process.exit(1)
}

const en = (h) => new Date(Date.now() + h * 3600_000).toISOString()

// A cuántas horas queda la cena. 30 por defecto; durante una revisión larga,
// `--horas=144` (seis días) evita que caduque a mitad sin que nadie lo note.
// Negativo deja la cena en el pasado: `--horas=-6` enseña Mi mesa después de
// la cena (valorar, bloquear, reportar), que es lo que Apple pide grabar.
const HORAS = Number(args.find((a) => a.startsWith('--horas='))?.slice(8)) || 30

/**
 * Nada en silencio.
 *
 * Una inserción que falla devuelve `{ data: null }` y el guión revienta tres
 * pasos después con una clave foránea, cuando el mensaje ya no dice qué pasó.
 * Montando esto ya ocurrió dos veces —el perfil y las respuestas—, y en los
 * dos casos la cuenta se anunciaba lista estando a medias.
 */
const oExplota = (qué, { data, error }) => {
  if (error || !data) {
    console.error('No se pudo crear ' + qué + ': ' + (error?.message ?? 'sin datos'))
    console.error('La cuenta quedó a medias. Corre --borrar antes de reintentar.')
    process.exit(1)
  }
  return data
}

/** Lo que este guión creó, por id. Sin esto no se puede borrar sin barrer. */
const leerRastro = () => (existsSync(RASTRO) ? JSON.parse(readFileSync(RASTRO, 'utf8')) : null)

async function usuarioPorCorreo(correo) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return data.users.find((u) => u.email === correo) || null
}

// ---------------------------------------------------------------- borrar
if (args.includes('--borrar')) {
  const r = leerRastro()
  if (!r) {
    console.log('No hay nada anotado: este guión no ha creado nada que borrar.')
    process.exit(0)
  }
  /**
   * Los reportes, a mano y los primeros.
   *
   * `incident_reports.reporter_id` y `subject_id` son `on delete set null`,
   * no `cascade`: borrando las cuentas, la fila SOBREVIVE con los dos
   * extremos en null y el panel la sigue enseñando como un reporte abierto
   * «sobre —». La encuesta y los bloqueos sí caen solos, porque sus claves
   * son `on delete cascade`.
   */
  const ids = r.perfiles ?? []
  if (ids.length) {
    await admin.from('incident_reports').delete().in('reporter_id', ids)
    await admin.from('incident_reports').delete().in('subject_id', ids)
  }
  // Primero lo que apunta a las reservas, que bloquean el borrado.
  for (const id of r.perfiles ?? []) {
    await admin.from('table_members').delete().eq('profile_id', id)
    await admin.from('credit_ledger').delete().eq('profile_id', id)
    await admin.from('bookings').delete().eq('profile_id', id)
    await admin.from('answers').delete().eq('profile_id', id)
    await admin.from('verifications').delete().eq('profile_id', id)
  }
  if (r.mesa) await admin.from('dinner_tables').delete().eq('id', r.mesa)
  if (r.evento) await admin.from('events').delete().eq('id', r.evento)
  if (r.restaurante) await admin.from('restaurants').delete().eq('id', r.restaurante)
  for (const id of r.perfiles ?? []) await admin.auth.admin.deleteUser(id).catch(() => {})
  unlinkSync(RASTRO)
  console.log('Borrado: la cuenta de revisión, su fecha, su mesa y sus cinco acompañantes.')
  process.exit(0)
}

// ---------------------------------------------------------- acompañantes
//
// Vuelve a sentar a los cinco de la mesa del revisor si faltan, sin tocar su
// cuenta ni su contraseña. Existe porque una limpieza de cuentas de prueba se
// los llevó el 12-10 y Apple habría visto una mesa con una sola persona.
if (args.includes('--acompanantes')) {
  const r = leerRastro()
  if (!r?.mesa || !r?.evento) {
    console.error('No hay cuenta de revisión montada. Corre el guión sin argumentos primero.')
    process.exit(1)
  }
  const { data: version } = await admin.from('questionnaire_versions')
    .select('id').eq('is_active', true).single()
  const { data: sentados } = await admin.from('table_members').select('profile_id, seat_order').eq('table_id', r.mesa)
  let asiento = Math.max(1, ...(sentados ?? []).map((s) => s.seat_order ?? 1)) + 1
  const OTROS = [
    ['Daniela', 'diseno'], ['Andrés', 'tecnologia'], ['Gabriela', 'salud'],
    ['José', 'finanzas'], ['Andreína', 'educacion'],
  ]
  const vivos = new Set((sentados ?? []).map((s) => s.profile_id))
  let puestos = 0
  for (const [nombre, sector] of OTROS) {
    const correo = 'revision-' + nombre.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') + '@' + DOMINIO_MESA
    let u = await usuarioPorCorreo(correo)
    if (u && vivos.has(u.id)) continue
    if (!u) {
      const { data } = await admin.auth.admin.createUser({
        email: correo, password: 'Aro-' + randomBytes(9).toString('base64url'), email_confirm: true,
      })
      u = data?.user
      if (!u) continue
      await admin.from('profiles').insert({ es_prueba: true,
        id: u.id, email: correo, full_name: nombre, display_name: nombre,
        city_slug: 'caracas', gender: 'sin-decir', status: 'active', locale: 'es-VE',
      })
      await admin.from('answers').insert({
        profile_id: u.id, version_id: version.id, question_key: 'sector', value: sector,
      })
    }
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: u.id, event_id: r.evento, status: 'confirmed' }).select('id').single()
    await admin.from('table_members')
      .insert({ table_id: r.mesa, profile_id: u.id, booking_id: b?.id, seat_order: asiento++ })
    if (!r.perfiles.includes(u.id)) r.perfiles.push(u.id)
    puestos++
  }
  writeFileSync(RASTRO, JSON.stringify(r, null, 2))
  console.log(`Acompañantes: ${puestos} vueltos a sentar. La cuenta del revisor y su contraseña, sin tocar.`)
  process.exit(0)
}

// ------------------------------------------------------------ sin normas
//
// Apple (norma 1.2) pide que se acepten las normas antes de ver contenido de
// otra gente, y desde hoy eso se acepta UNA vez por cuenta y queda guardado.
// El efecto secundario es este: grabar el video con la cuenta del revisor la
// deja aceptada, y el revisor entraría sin ver la pantalla que viene a
// comprobar. Esto la devuelve a cero.
if (args.includes('--sin-normas')) {
  const { data: perfil } = await admin
    .from('profiles')
    .select('id, terms_accepted_at')
    .eq('email', CORREO)
    .maybeSingle()

  if (!perfil) {
    console.error('No hay cuenta de revisión montada. Corre el guión sin argumentos primero.')
    process.exit(1)
  }

  const { error } = await admin
    .from('profiles')
    .update({ terms_accepted_at: null, terms_version: null })
    .eq('id', perfil.id)

  if (error) {
    console.error('✗ no se pudo: ' + error.message)
    process.exit(1)
  }

  console.log(perfil.terms_accepted_at
    ? 'Listo: la cuenta vuelve a no haber aceptado las normas (las aceptó el ' + perfil.terms_accepted_at.slice(0, 16) + ').'
    : 'Ya estaba sin aceptar: el revisor verá la pantalla.')
  process.exit(0)
}

// ----------------------------------------------------------- sin encuesta
//
// Lo mismo que `--sin-normas`, para lo que pasa DESPUÉS de la cena.
//
// Me lo pidió el agente de la app el 20-10, antes del reenvío a Apple: en el
// video Michael entra con la cuenta del revisor y en Mi mesa valora la cena,
// bloquea a un acompañante y reporta a otro. Eso deja una fila en
// `table_feedback`, el bloqueo en `exclusions` y el reporte en
// `incident_reports`, todo de esa cuenta. Cuando entre el revisor de Apple ve
// «Anotado, gracias» y la persona ya reportada: nada que probar.
// `--refrescar` no lo deshace, solo mueve la fecha.
//
// Toca SOLO a la cuenta del revisor y dentro de SU mesa, y los bloqueos solo
// entre cuentas que montó este guión. Si apareciera un reporte suyo sobre
// alguien de fuera del guión, no se borra: se dice y se para, porque eso ya
// no es un ensayo.
if (args.includes('--sin-encuesta')) {
  const r = leerRastro()
  if (!r?.mesa) {
    console.error('No hay cuenta de revisión montada. Corre el guión sin argumentos primero.')
    process.exit(1)
  }

  const { data: perfil } = await admin
    .from('profiles').select('id').eq('email', CORREO).maybeSingle()

  if (!perfil) {
    console.error('No hay cuenta de revisión montada. Corre el guión sin argumentos primero.')
    process.exit(1)
  }

  const delGuion = r.perfiles ?? []
  if (!delGuion.includes(perfil.id)) delGuion.push(perfil.id)

  // Qué hay, antes de tocar nada: este guión dice lo que borra.
  const { data: encuesta } = await admin
    .from('table_feedback').select('created_at, nps, saltada_at')
    .eq('table_id', r.mesa).eq('profile_id', perfil.id)

  const { data: bloqueos } = await admin
    .from('exclusions').select('profile_a, profile_b, reason')
    .in('profile_a', delGuion).in('profile_b', delGuion)

  const { data: reportes } = await admin
    .from('incident_reports').select('id, subject_id, description, resolved_at')
    .eq('reporter_id', perfil.id)

  const deFuera = (reportes ?? []).filter((x) => x.subject_id && !delGuion.includes(x.subject_id))
  if (deFuera.length) {
    console.error('✗ me paro: la cuenta del revisor tiene ' + deFuera.length
      + ' reporte(s) sobre alguien que NO es de este guión. Eso no es un ensayo y no lo borro yo.')
    process.exit(1)
  }

  const fallo = (qué, { error }) => {
    if (!error) return
    console.error('✗ no se pudo borrar ' + qué + ': ' + error.message)
    process.exit(1)
  }

  fallo('la valoración', await admin.from('table_feedback')
    .delete().eq('table_id', r.mesa).eq('profile_id', perfil.id))
  fallo('los bloqueos', await admin.from('exclusions')
    .delete().in('profile_a', delGuion).in('profile_b', delGuion))
  fallo('los reportes', await admin.from('incident_reports')
    .delete().eq('reporter_id', perfil.id))

  // Se borran y no se marcan cerrados: un reporte resuelto sigue siendo un
  // reporte, le queda pegado al perfil en su ficha de operación y cuenta como
  // reincidencia la próxima vez. Esto no pasó: lo grabó Michael.
  const cuantas = (encuesta ?? []).length
  const laSalto = (encuesta ?? []).some((x) => x.saltada_at)
  console.log('Encuesta: ' + (cuantas
    ? (laSalto ? 'estaba saltada, borrada.' : 'estaba valorada, borrada.')
    : 'no había.'))
  console.log('Bloqueos: ' + ((bloqueos ?? []).length
    ? (bloqueos ?? []).length + ' borrado(s) · ' + (bloqueos ?? []).map((x) => x.reason).join(', ')
    : 'no había.'))
  console.log('Reportes: ' + ((reportes ?? []).length
    ? (reportes ?? []).length + ' borrado(s), todos sobre acompañantes del guión.'
    : 'no había.'))
  console.log('La cuenta, su contraseña y su mesa, sin tocar.')
  process.exit(0)
}

// ------------------------------------------------------------- refrescar
if (args.includes('--refrescar')) {
  const r = leerRastro()
  if (!r?.evento) {
    console.error('No hay cuenta de revisión montada. Corre el guión sin argumentos primero.')
    process.exit(1)
  }
  // La cena vuelve a estar por delante, ya revelada: el revisor entra y ve su
  // mesa, su restaurante y sus cinco acompañantes sin tener que esperar nada.
  await admin.from('events').update({
    starts_at: en(HORAS),
    reveal_at: en(Math.min(-2, HORAS - 2)),
    booking_closes_at: en(Math.min(-24, HORAS - 24)),
  }).eq('id', r.evento)
  console.log(`Refrescada: la cena vuelve a ser dentro de ${HORAS} h (${en(HORAS)}), ya revelada.`)
  console.log('Usuario: ' + CORREO + ' · la contraseña es la que ya tienes.')
  process.exit(0)
}

// ---------------------------------------------------------------- montar
const yaExiste = await usuarioPorCorreo(CORREO)
if (yaExiste) {
  console.log('Esa cuenta ya existe. Usa --refrescar para mover la cena, o --borrar y vuelve a empezar.')
  process.exit(0)
}

// La contraseña se genera y se imprime UNA vez. No se escribe en ningún
// fichero: este repositorio es público.
const CLAVE = 'Aro-' + randomBytes(9).toString('base64url')

const { data: creada, error: errAlta } = await admin.auth.admin.createUser({
  email: CORREO, password: CLAVE, email_confirm: true,
})
if (errAlta) {
  console.error('No se pudo crear la cuenta: ' + errAlta.message)
  process.exit(1)
}
const id = creada.user.id
const rastro = { perfiles: [id], evento: null, mesa: null, restaurante: null }
writeFileSync(RASTRO, JSON.stringify(rastro, null, 2))

// La fila de `profiles` hay que crearla: no la pone ningún disparador, y un
// `update` sobre algo que no existe no es un error — afecta a cero filas y
// sigue. Por ahí se fue el primer intento, que reventó tres pasos después
// con una clave foránea.
const { error: errPerfil } = await admin.from('profiles').insert({
  id, email: CORREO, full_name: 'Alex Revisión', display_name: 'Alex', es_prueba: true,
  birthdate: '1992-04-18', gender: 'sin-decir', phone_e164: '+584141112233',
  city_slug: 'caracas', status: 'active', locale: 'es-VE',
})
if (errPerfil) {
  console.error('No se pudo crear el perfil: ' + errPerfil.message)
  console.error('La cuenta quedó a medias. Corre --borrar antes de reintentar.')
  process.exit(1)
}

// Identidad aprobada. Sin cédula real que mirar: lo aprueba Michael, no esto.
const hace2 = new Date(Date.now() - 2 * 86400_000).toISOString()
await admin.from('verifications').insert([
  { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace2, storage_path: id + '/id.jpg' },
  { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace2, storage_path: id + '/selfie.jpg' },
])

// El cuestionario entero, con respuestas que de verdad VALEN.
//
// La lógica es la del banco de pruebas y a propósito: `answers` exige
// `version_id`, y `nacimiento` es una fecha y `nombre` un texto —no tienen
// opciones, así que coger «la primera opción» les mete basura—. Reinventarlo
// aquí ya dejó la cuenta con dieciséis preguntas sin contestar, y como un
// insert fallido no revienta, la cuenta se anunciaba lista estando a medias.
const { data: version } = await admin.from('questionnaire_versions')
  .select('id').eq('is_active', true).maybeSingle()
const { data: preguntas } = await admin.from('questions')
  .select('key, options, input_type, min_select, exclusive_value')
  .eq('version_id', version.id).eq('is_required', true)

const respuestas = (preguntas ?? []).map((q) => {
  // Nunca la opción EXCLUSIVA —«cualquier zona», «ninguna»—: marcarla junto a
  // otra es un estado que la pantalla no deja producir.
  const cods = (q.options || []).map((o) => o.value).filter((c) => c !== q.exclusive_value)
  let valor
  if (q.input_type === 'date') valor = '1992-04-18'
  else if (q.input_type === 'text') valor = 'Alex'
  else if (q.input_type === 'multi') valor = cods.slice(0, Math.max(q.min_select || 1, 1))
  else valor = cods[0] ?? null
  return { profile_id: id, version_id: version.id, question_key: q.key, value: valor }
}).filter((f) => f.value !== null && !(Array.isArray(f.value) && !f.value.length))

if (respuestas.length) {
  const { error } = await admin.from('answers').insert(respuestas)
  if (error) {
    console.error('No se pudieron guardar las respuestas: ' + error.message)
    console.error('La cuenta quedó a medias. Corre --borrar antes de reintentar.')
    process.exit(1)
  }
}

// SIN CRÉDITOS, Y ES A PROPÓSITO.
//
// Antes se le daban cuatro «para que el botón de reservar se vea como lo ve
// un miembro», y eso era justo el problema: con saldo, `/api/reservar` crea
// la reserva YA CONFIRMADA y cobra el crédito en el mismo gesto. Con dos
// fechas reales abiertas, el revisor de Apple podía apuntarse a una cena de
// verdad durante la revisión y entrar al reparto con cinco desconocidos que
// sí van a ir.
//
// Sin saldo, la pantalla manda a Pago en lugar de apuntar, que además es el
// recorrido que hay que grabar para la ficha: reportar un pago es lo que la
// revisión tiene que ver.
//
// El candado de verdad no es esto, es el trigger `prueba_sin_asiento`: una
// cuenta marcada `es_prueba` no se confirma en una fecha real aunque alguien
// le dé créditos otra vez, aunque canjee un cupón o aunque operación apruebe
// por error un pago inventado.

// Su propio restaurante y su propia fecha. Nada de esto toca lo real.
const { data: rest, error: errRest } = await admin.from('restaurants').insert({
  name: 'La Ventana', address: 'Avenida Principal, Las Mercedes',
  zone_slug: 'mercedes', is_active: true,
}).select('id').single()
if (errRest) {
  console.error('No se pudo crear el restaurante: ' + errRest.message)
  console.error('La cuenta quedó a medias. Corre --borrar antes de reintentar.')
  process.exit(1)
}

const ev = oExplota('la fecha', await admin.from('events').insert({
  format: 'dinner',
  starts_at: en(30),
  reveal_at: en(-2),
  booking_closes_at: en(-24),
  restaurant_id: rest.id,
  // `locked`, nunca `open`: /api/proxima filtra por `open`, y una fecha de
  // pruebas abierta saldría contando atrás en la portada pública.
  status: 'locked', price_usd: 8, city_slug: 'caracas',
  // Marcada: no sale en la agenda de nadie, ni en la portada, ni en ningún
  // recuento público. `locked` no bastaba — ese estado dice «no admite gente
  // nueva», que es una decisión sobre una fecha REAL, y la de pruebas se
  // colaba cada vez que alguien ampliaba una consulta con buen criterio.
  es_prueba: true,
}).select('id').single())

const reserva = oExplota('la reserva', await admin.from('bookings')
  .insert({ profile_id: id, event_id: ev.id, status: 'confirmed' }).select('id').single())

const mesa = oExplota('la mesa', await admin.from('dinner_tables')
  .insert({ event_id: ev.id, table_number: 1, restaurant_id: rest.id }).select('id').single())

oExplota('el asiento', await admin.from('table_members')
  .insert({ table_id: mesa.id, profile_id: id, booking_id: reserva.id, seat_order: 1 })
  .select('table_id').single())

// Los otros cinco. Correos `@prueba.aro.club`, que el remitente tiene vetados:
// montar una mesa no puede acabar escribiéndole a nadie.
const OTROS = [
  ['Daniela', 'diseno'], ['Andrés', 'tecnologia'], ['Gabriela', 'salud'],
  ['José', 'finanzas'], ['Andreína', 'educacion'],
]
let asiento = 2
for (const [nombre, sector] of OTROS) {
  const correo = 'revision-' + nombre.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') + '@' + DOMINIO_MESA
  const { data: u } = await admin.auth.admin.createUser({
    email: correo, password: 'Aro-' + randomBytes(9).toString('base64url'), email_confirm: true,
  })
  if (!u?.user) continue
  rastro.perfiles.push(u.user.id)
  await admin.from('profiles').insert({ es_prueba: true,
    id: u.user.id, email: correo, full_name: nombre, display_name: nombre,
    city_slug: 'caracas', gender: 'sin-decir', status: 'active', locale: 'es-VE',
  })
  // Con `version_id`: sin él la fila entra pero la pantalla no la encuentra,
  // y los cinco salían sin sector debajo del nombre.
  await admin.from('answers').insert({
    profile_id: u.user.id, version_id: version.id, question_key: 'sector', value: sector,
  })
  const { data: b } = await admin.from('bookings')
    .insert({ profile_id: u.user.id, event_id: ev.id, status: 'confirmed' }).select('id').single()
  await admin.from('table_members')
    .insert({ table_id: mesa.id, profile_id: u.user.id, booking_id: b.id, seat_order: asiento++ })
}

rastro.evento = ev.id
rastro.mesa = mesa.id
rastro.restaurante = rest.id
writeFileSync(RASTRO, JSON.stringify(rastro, null, 2))

console.log('')
console.log('Cuenta de revisión lista. Esto es lo que se le da a Apple:')
console.log('')
console.log('   Usuario:     ' + CORREO)
console.log('   Contraseña:  ' + CLAVE)
console.log('')
console.log('Se imprime UNA vez y no queda en ningún fichero: el repositorio es público.')
console.log('Tiene el perfil completo, la identidad aprobada, cuatro créditos y una mesa')
console.log('ya revelada en La Ventana, con cinco acompañantes, dentro de 30 h.')
console.log('')
console.log('El día que mandes a revisar, y otra vez si Apple la devuelve:')
console.log('   node scripts/cuenta-revision.mjs --refrescar')
