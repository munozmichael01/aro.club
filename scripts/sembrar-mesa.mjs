/**
 * Siembra gente de prueba para poder repartir una mesa.
 *
 * Lo que hace y lo que NO hace, porque esta cabecera estuvo mintiendo:
 * crea las cuentas, las deja verificadas y apuntadas a una fecha, y ahí
 * para. **No asigna mesa ni publica nada**: eso lo decide el reparto desde
 * el panel, que es justo lo que se quiere probar.
 *
 *   node scripts/sembrar-mesa.mjs
 *       Monta su propio restaurante («Cardenal») y su propia fecha —el
 *       jueves que viene— y siembra DOCE personas. Para probar el reparto
 *       en frío, sin tocar ninguna fecha real.
 *
 *   node scripts/sembrar-mesa.mjs --fecha <uuid>
 *       Siembra CINCO acompañantes sobre una fecha que YA EXISTE. Es el
 *       modo para acompañar a un tester que reservó en la fecha abierta de
 *       verdad: con él son seis y la mesa se puede repartir. No crea
 *       restaurante ni fecha, y esa fecha NUNCA se borra: no es suya.
 *
 *   node scripts/sembrar-mesa.mjs --borrar
 *       Deja la base como estaba: quita SOLO lo que sembró este guion.
 *
 * SOBRE EL BORRADO. La versión anterior borraba con
 * `events?city=eq.Caracas&price_usd=eq.8`, un filtro que no distingue lo
 * suyo de lo de nadie: hoy alcanzaría a las tres fechas de la base, las dos
 * abiertas incluidas. No borraba porque la columna se llama `city_slug` y
 * el DELETE fallaba —el filtro estaba roto, no a salvo—. Ahora se borra por
 * **id**, y los ids se anotan en disco al sembrar: se quita exactamente lo
 * que se creó, o no se quita nada.
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const CLAVE = 'AroPrueba2026'
const DOMINIO = 'prueba.aro.club'

/** Lo que creó este guion. Sin este fichero no se borra nada de la base. */
const RASTRO = new URL('../.sembrar-mesa.json', import.meta.url).pathname

async function rest(path, opciones = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H, ...opciones })
  const t = await r.text()
  if (!r.ok) throw new Error(`${path} → ${r.status} ${t}`)
  return t ? JSON.parse(t) : null
}

async function rpc(fn, args) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H, body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`${fn} → ${r.status} ${await r.text()}`)
}

/**
 * Doce personas con trampas a propósito, para que el reparto tenga que
 * trabajar y no le salga bien por casualidad:
 *
 *  - Dos grupos de edad (28-34 y 37-44). Partir por la mitad al azar
 *    rompe el spread de 10 años.
 *  - Banesco y Ridery repetidos: hay que separarlos.
 *  - Dos freelance, que NO cuentan como empresa repetida.
 *  - 6 y 6 de género, así que 3/3 es alcanzable en las dos mesas.
 *  - Dos bloques de intereses, para que la cohesión distinga.
 */
const GENTE = [
  // -- jóvenes, 28 a 34 --
  ['Daniela Pérez',       'Daniela', '1996-03-14', 'mujer',  '4241234501', 'diseno',       'Oficina Nueve',  'volvio',     ['cocinar','viajar','museos']],
  ['Andrés Molina',       'Andrés',  '1994-07-02', 'hombre', '4141234502', 'tecnologia',   'Ridery',         'se-quedo',   ['correr','gimnasio','viajar']],
  ['Gabriela Ríos',       'Gabriela','1992-11-20', 'mujer',  '4121234503', 'salud',        'Banesco',        'se-quedo',   ['cocinar','leer','museos']],
  ['José Manuel Arteaga', 'José',    '1997-05-09', 'hombre', '4161234504', 'finanzas',     'Banesco',        'volvio',     ['correr','playa','viajar']],
  ['Andreína Salas',      'Andreína','1995-01-27', 'mujer',  '4261234505', 'educacion',    'Universidad Metropolitana','interior', ['leer','cocinar','teatro']],
  ['Luis Felipe Bracho',  'Luis',    '1993-09-15', 'hombre', '4221234506', 'construccion', 'Grupo Naranjos', 'interior'   , ['gimnasio','playa','correr']],
  // -- mayores, 37 a 44 --
  ['Mariana Guevara',     'Mariana', '1985-02-11', 'mujer',  '4241234507', 'consultoria',  'Deloitte',       'volvio',     ['viajar','museos','leer']],
  ['Ricardo Peña',        'Ricardo', '1983-06-30', 'hombre', '4141234508', 'medios',       'Ridery',         'se-quedo',   ['cine','musica','viajar']],
  ['Valentina Ochoa',     'Valentina','1987-10-05','mujer',  '4121234509', 'diseno',       'Freelance',      'se-quedo',   ['museos','fotografia','cocinar']],
  ['Carlos Eduardo Sosa', 'Carlos',  '1982-04-22', 'hombre', '4161234510', 'legal',        'Freelance',      'interior',   ['leer','cine','musica']],
  ['Patricia Rangel',     'Patricia','1986-12-08', 'mujer',  '4261234511', 'gastronomia',  'Polar',          'visita',     ['cocinar','viajar','playa']],
  ['Rodrigo Villalba',    'Rodrigo', '1984-08-19', 'hombre', '4221234512', 'energia',      'PDVSA',          'se-quedo',   ['correr','senderismo','gimnasio']],
]

/**
 * Los cinco que acompañan a un tester, y por qué esos cinco.
 *
 * Se eligen para que la mesa de seis sea *sentable* y el panel no marque
 * REVISAR por culpa de la siembra: tres hombres y dos mujeres —el tester
 * que motiva este modo es mujer, así que quedan 3/3—, cinco empresas
 * distintas —fuera Gabriela, que comparte Banesco con José Manuel— y todas
 * las edades dentro del bloque joven, con seis años entre la mayor y el
 * menor.
 *
 * Si el tester fuese hombre, el equilibrio de género sale 4/2 y hay que
 * cambiar la selección. Se dice aquí para que no sorprenda en el panel.
 */
const CINCO = [1, 3, 5, 0, 4]

/**
 * La energía social de cada uno de los cinco, por su índice en GENTE.
 *
 * Va en `rol`, dentro de `profile_answers`, y NO en `profile_traits`: los
 * rasgos se derivan solos de las respuestas —lo hace el trigger `trg_rasgos`
 * sobre `answers`—, así que la única manera de mover esta señal es mover la
 * respuesta. Es además lo que produce una persona de verdad, que contesta el
 * cuestionario y no escribe en la tabla de rasgos.
 *
 * Los códigos son los mismos que el enum —`escucha | depende | lleva`—,
 * comprobado contra el catálogo de `questions`.
 *
 * No van los cinco en `depende`. El matcher puntúa esta señal contando
 * cuántos `lleva` hay sentados (`repartir.ts`): con dos o tres saca 1, con
 * cero saca 0,17. Dos `lleva`, dos `depende` y uno `escucha`; con el tester
 * son dos `lleva` de seis, justo la ventana que el código premia.
 */
const ROL = { 1: 'lleva', 3: 'depende', 5: 'lleva', 0: 'escucha', 4: 'depende' }

const RESPUESTAS_BASE = {
  rol: 'depende', motivo: 'ampliar', romance: 'indiferente',
  evitar: ['ninguno'], actividades: ['cocinar', 'viajar', 'correr'],
  planes: ['cena'], peso: 'ambas', gasto: '20-35',
  dieta: ['ninguna'], idiomas: ['es'], momento: 'soltero-sin-hijos',
}

const correoDe = (i) => `mesa${i + 1}@${DOMINIO}`

function leerRastro() {
  if (!existsSync(RASTRO)) return null
  try { return JSON.parse(readFileSync(RASTRO, 'utf8')) } catch { return null }
}

/**
 * Quita lo que sembró este guion. Nada más.
 *
 * Las cuentas se reconocen por el dominio `@prueba.aro.club`, que es
 * nuestro y no tiene buzón. La fecha y el restaurante, por el id anotado al
 * sembrar: si no hay rastro en disco, no se borra ninguna de las dos y se
 * dice. Una fecha pasada por `--fecha` no se anota nunca, así que este
 * borrado no puede alcanzarla.
 */
async function borrar() {
  // Se listan desde auth y no desde profiles: si una siembra fallo a medias,
  // puede haber usuario sin perfil y ese es justo el que bloquea el correo.
  const r = await fetch(`${BASE}/auth/v1/admin/users?per_page=200`, { headers: H })
  const { users = [] } = await r.json()
  const mios = users.filter((u) => (u.email || '').endsWith(`@${DOMINIO}`))
  // EL ORDEN DE ABAJO NO ES ARBITRARIO. Borrar el usuario de auth a secas
  // —lo que hacía antes— no funciona en cuanto la siembra pasó de la mitad:
  //
  //  1. `waitlist.converted_profile_id` apunta al perfil y su FK bloquea el
  //     borrado (es NO ACTION, no cascada). Se suelta a null primero.
  //  2. `answers` va antes que `profile_traits`, y no al revés: borrar
  //     respuestas dispara `trg_rasgos`, que REINSERTA la fila de rasgos y
  //     vuelve a bloquear. Al revés no converge nunca.
  //  3. Y por eso tampoco vale dejar que el borrado del perfil arrastre las
  //     respuestas en cascada: la cascada dispara el mismo trigger.
  //
  // El resto —bookings, payments, credit_ledger, verifications— sí cae con
  // el perfil, que es de donde cuelgan.
  for (const u of mios) {
    await rest(`waitlist?converted_profile_id=eq.${u.id}`, {
      method: 'PATCH', body: JSON.stringify({ converted_profile_id: null }),
    })
    await rest(`answers?profile_id=eq.${u.id}`, { method: 'DELETE' })
    await rest(`profile_traits?profile_id=eq.${u.id}`, { method: 'DELETE' })
    await rest(`profiles?id=eq.${u.id}`, { method: 'DELETE' })
    const d = await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
    if (!d.ok) throw new Error(`no se pudo borrar ${u.email}: ${d.status} ${await d.text()}`)
  }
  await rest(`waitlist?email=like.*@${DOMINIO}`, { method: 'DELETE' })
  console.log(`Cuentas de prueba borradas: ${mios.length}.`)

  const rastro = leerRastro()
  if (!rastro) {
    console.log('Sin rastro en disco: no se toca ninguna fecha ni ningún restaurante.')
    return
  }

  if (rastro.evento) {
    await rest(`events?id=eq.${rastro.evento}`, { method: 'DELETE' })
    console.log(`Fecha borrada: ${rastro.evento}`)
  }
  if (rastro.restaurante) {
    await rest(`restaurants?id=eq.${rastro.restaurante}`, { method: 'DELETE' })
    console.log(`Restaurante borrado: ${rastro.restaurante}`)
  }
  unlinkSync(RASTRO)
}

/** Comprueba que la fecha de `--fecha` existe antes de sembrar contra ella. */
async function fechaExistente(id) {
  const filas = await rest(`events?id=eq.${id}&select=id,starts_at,status,city_slug,seats_per_table`)
  if (!filas?.length) throw new Error(`no existe ninguna fecha con id ${id}`)
  return filas[0]
}

async function sembrar(fechaAjena) {
  let eventoId
  let rastro = { evento: null, restaurante: null }

  if (fechaAjena) {
    const ev = await fechaExistente(fechaAjena)
    eventoId = ev.id
    // A propósito NO se anota en el rastro: no la creó este guion y el
    // borrado no debe poder alcanzarla nunca.
    console.log(`Sembrando sobre una fecha que ya existía: ${ev.starts_at} · ${ev.status}`)
    console.log('Esa fecha no se anota y `--borrar` no la tocará.\n')
  } else {
    // --- restaurante y fecha propios ---
    const [rest1] = await rest('restaurants', {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        name: 'Cardenal', zone_slug: 'mercedes',
        address: 'Calle Madrid con avenida Principal, Las Mercedes',
        avg_check_usd: 28, budget_tier: 2, noise_level: 2,
        max_tables: 4, is_active: true,
        // Sin contacto ni formatos el pool lo descarta —un sitio al que no se
        // puede llamar esa noche no se le da a nadie— y la fecha se queda sin
        // ninguna zona abierta.
        contact_name: 'Marielena Ruiz', contact_phone: '+58 212 993 4410',
        formats: ['dinner'],
      }),
    })
    rastro.restaurante = rest1.id

    const jueves = new Date()
    jueves.setDate(jueves.getDate() + ((4 - jueves.getDay() + 7) % 7 || 7))
    jueves.setHours(19, 0, 0, 0)
    const revela = new Date(jueves); revela.setHours(12, 0, 0, 0)
    const cierra = new Date(jueves.getTime() - 48 * 3600 * 1000)

    const [evento] = await rest('events', {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        format: 'dinner', starts_at: jueves.toISOString(),
        booking_closes_at: cierra.toISOString(), reveal_at: revela.toISOString(),
        restaurant_id: rest1.id, status: 'locked', seats_per_table: 6,
        min_tables: 1, max_seats: 36, price_usd: 8, credit_cost: 1,
        // La columna es `city_slug`. `city` no existe: el insert entero
        // fallaba con 400 y el guion no sembraba nada.
        zone_slug: 'mercedes', city_slug: 'caracas',
      }),
    })
    eventoId = evento.id
    rastro.evento = evento.id
    writeFileSync(RASTRO, JSON.stringify(rastro, null, 2))
    console.log(`Fecha propia: jueves ${jueves.toLocaleDateString('es-VE')} · 7:00 p.m. · Cardenal, Las Mercedes\n`)
  }

  // --- la gente ---
  const indices = fechaAjena ? CINCO : GENTE.map((_, i) => i)
  const perfiles = []

  for (const i of indices) {
    const [nombre, trato, nacimiento, genero, tel, sector, empresa, arraigo, intereses] = GENTE[i]
    const correo = correoDe(i)

    await rest('waitlist', {
      method: 'POST',
      body: JSON.stringify({
        email: correo, city_slug: 'caracas', source: 'siembra',
        full_name: nombre, display_name: trato, birthdate: nacimiento,
        gender: genero, phone_e164: `+58${tel}`,
        rootedness: arraigo, zones: ['mercedes', 'chacao'], days: ['jue'],
        conversation_topics: ['cocina', 'viajes'],
        profile_answers: {
          ...RESPUESTAS_BASE,
          sector, empleador: empresa, actividades: intereses,
          // De aquí sale `profile_traits.social_energy`. Ver ROL.
          rol: ROL[i] ?? RESPUESTAS_BASE.rol,
        },
        quiz_completed_at: new Date().toISOString(),
        profile_completed_at: new Date().toISOString(),
        base_completed_at: new Date().toISOString(),
        questionnaire_screen: 4,
      }),
    })

    const r = await fetch(`${BASE}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email: correo, password: CLAVE, email_confirm: true }),
    })
    if (!r.ok) throw new Error(`auth ${correo} → ${await r.text()}`)
    const usuario = await r.json()

    await rpc('convertir_lead', {
      p_profile_id: usuario.id, p_lead_email: correo, p_auth_email: correo,
    })

    // Verificada y activa: sin esto no entra al reparto, que es la razón
    // por la que verificar bloquea reservar.
    await rest(`profiles?id=eq.${usuario.id}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'active' }),
    })
    for (const kind of ['id_document', 'selfie']) {
      await rest('verifications', {
        method: 'POST',
        body: JSON.stringify({
          profile_id: usuario.id, kind, status: 'approved',
          name_matches: true, age_confirmed: true,
          reviewed_at: new Date().toISOString(),
        }),
      })
    }

    // Los rasgos NO se escriben aquí.
    //
    // Este guion los insertaba a mano y chocaba: los deriva el trigger
    // `trg_rasgos` sobre `answers`, así que la fila ya existe cuando se llega
    // aquí y el POST devolvía 409 en la PRIMERA persona —con la cuenta ya
    // creada y el lead ya convertido: una siembra a medias que encima el
    // borrado no sabía limpiar.
    //
    // Y estaban escritos dos veces con valores distintos: el guion ponía
    // `balanced`, que ni existe en el enum, mientras la derivación sacaba el
    // valor bueno de la respuesta. Un rasgo con dos dueños siempre acaba
    // divergiendo; el dueño es la respuesta.

    // Cuatro créditos comprados, uno gastado en esta fecha.
    await rest('credit_ledger', {
      method: 'POST',
      body: JSON.stringify({ profile_id: usuario.id, delta: 4, reason: 'pack_purchase' }),
    })

    const [reserva] = await rest('bookings', {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        event_id: eventoId, profile_id: usuario.id,
        status: 'confirmed', confirmed_at: new Date().toISOString(),
      }),
    })
    await rest('credit_ledger', {
      method: 'POST',
      body: JSON.stringify({
        profile_id: usuario.id, delta: -1, reason: 'event_charge', booking_id: reserva.id,
      }),
    })

    perfiles.push({ id: usuario.id, correo, nombre, trato, reserva: reserva.id })
  }

  console.log(`${perfiles.length} personas apuntadas y verificadas. Sin repartir: eso lo decide el algoritmo.\n`)
  console.log('Cuentas (misma contraseña para todas):\n')
  for (const p of perfiles) console.log(`   ${p.correo.padEnd(28)} ${p.nombre}`)
  console.log(`\n   contraseña: ${CLAVE}\n`)
}

// --- argumentos -------------------------------------------------------
const args = process.argv.slice(2)
const soloBorrar = args.includes('--borrar')
const iFecha = args.indexOf('--fecha')
const fechaAjena = iFecha >= 0 ? args[iFecha + 1] : null

if (iFecha >= 0 && !fechaAjena) {
  console.error('--fecha necesita el uuid de una fecha que ya exista')
  process.exit(1)
}

await borrar()
if (!soloBorrar) await sembrar(fechaAjena)
