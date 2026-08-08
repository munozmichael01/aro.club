/**
 * Siembra una mesa de prueba completa: restaurante, fecha, seis personas
 * con cuenta real y la asignación ya publicada.
 *
 * Los seis están elegidos para que las tres señales del panel CUADREN:
 * 3 mujeres y 3 hombres, edades dentro de 10 años, y seis empresas
 * distintas. Si el cálculo del panel marca REVISAR sobre estos datos, el
 * fallo es del cálculo.
 *
 *   node scripts/sembrar-mesa.mjs            siembra
 *   node scripts/sembrar-mesa.mjs --borrar   deja la base como estaba
 */
import { readFileSync } from 'node:fs'

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
  ['Daniela Pérez',       'Daniela', '1996-03-14', 'mujer',  '4241234501', 'arquitectura', 'Oficina Nueve',  'volvio',     ['cocinar','viajar','museos']],
  ['Andrés Molina',       'Andrés',  '1994-07-02', 'hombre', '4141234502', 'tecnologia',   'Ridery',         'se-quedo',   ['correr','gimnasio','viajar']],
  ['Gabriela Ríos',       'Gabriela','1992-11-20', 'mujer',  '4121234503', 'salud',        'Banesco',        'se-quedo',   ['cocinar','leer','museos']],
  ['José Manuel Arteaga', 'José',    '1997-05-09', 'hombre', '4161234504', 'finanzas',     'Banesco',        'volvio',     ['correr','playa','viajar']],
  ['Andreína Salas',      'Andreína','1995-01-27', 'mujer',  '4261234505', 'educacion',    'Universidad Metropolitana','interior', ['leer','cocinar','teatro']],
  ['Luis Felipe Bracho',  'Luis',    '1993-09-15', 'hombre', '4221234506', 'construccion', 'Grupo Naranjos', 'extranjero', ['gimnasio','playa','correr']],
  // -- mayores, 37 a 44 --
  ['Mariana Guevara',     'Mariana', '1985-02-11', 'mujer',  '4241234507', 'consultoria',  'Deloitte',       'volvio',     ['viajar','museos','leer']],
  ['Ricardo Peña',        'Ricardo', '1983-06-30', 'hombre', '4141234508', 'medios',       'Ridery',         'se-quedo',   ['cine','musica','viajar']],
  ['Valentina Ochoa',     'Valentina','1987-10-05','mujer',  '4121234509', 'diseno',       'Freelance',      'se-quedo',   ['museos','fotografia','cocinar']],
  ['Carlos Eduardo Sosa', 'Carlos',  '1982-04-22', 'hombre', '4161234510', 'legal',        'Freelance',      'interior',   ['leer','cine','musica']],
  ['Patricia Rangel',     'Patricia','1986-12-08', 'mujer',  '4261234511', 'gastronomia',  'Polar',          'visita',     ['cocinar','viajar','playa']],
  ['Rodrigo Villalba',    'Rodrigo', '1984-08-19', 'hombre', '4221234512', 'energia',      'PDVSA',          'se-quedo',   ['correr','senderismo','gimnasio']],
]

const RESPUESTAS_BASE = {
  rol: 'depende', motivo: 'ampliar', romance: 'indiferente',
  evitar: ['ninguno'], actividades: ['cocinar', 'viajar', 'correr'],
  planes: ['cena'], peso: 'ambas', gasto: '20-35',
  dieta: ['ninguna'], idiomas: ['es'], momento: 'soltero-sin-hijos',
}

const correoDe = (i) => `mesa${i + 1}@${DOMINIO}`

async function borrar() {
  // Se listan desde auth y no desde profiles: si una siembra fallo a medias,
  // puede haber usuario sin perfil y ese es justo el que bloquea el correo.
  const r = await fetch(`${BASE}/auth/v1/admin/users?per_page=200`, { headers: H })
  const { users = [] } = await r.json()
  const mios = users.filter((u) => (u.email || '').endsWith(`@${DOMINIO}`))
  for (const u of mios) {
    const d = await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
    if (!d.ok) throw new Error(`no se pudo borrar ${u.email}: ${d.status} ${await d.text()}`)
  }
  await rest(`waitlist?email=like.*@${DOMINIO}`, { method: 'DELETE' })
  await rest('events?city=eq.Caracas&price_usd=eq.8', { method: 'DELETE' })
  await rest('restaurants?name=eq.Cardenal', { method: 'DELETE' })
  console.log(`Limpieza: ${mios.length} cuentas de prueba, su fecha y el restaurante.`)
}

async function sembrar() {
  // --- restaurante y fecha ---
  const [rest1] = await rest('restaurants', {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      name: 'Cardenal', zone_slug: 'mercedes',
      address: 'Calle Madrid con avenida Principal, Las Mercedes',
      avg_check_usd: 28, budget_tier: 2, noise_level: 2,
      max_tables: 4, is_active: true,
    }),
  })

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
      zone_slug: 'mercedes', city: 'Caracas',
    }),
  })

  // --- las seis personas ---
  const perfiles = []
  for (let i = 0; i < GENTE.length; i++) {
    const [nombre, trato, nacimiento, genero, tel, sector, empresa, arraigo, intereses] = GENTE[i]
    const correo = correoDe(i)

    await rest('waitlist', {
      method: 'POST',
      body: JSON.stringify({
        email: correo, city: 'caracas', source: 'siembra',
        full_name: nombre, display_name: trato, birthdate: nacimiento,
        gender: genero, phone_e164: `+58${tel}`,
        rootedness: arraigo, zones: ['mercedes', 'chacao'], days: ['jue'],
        conversation_topics: ['cocina', 'viajes'],
        profile_answers: { ...RESPUESTAS_BASE, sector, empleador: empresa, actividades: intereses },
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

    // Traits: es lo que lee el matcher, no las respuestas crudas.
    await rest('profile_traits', {
      method: 'POST',
      body: JSON.stringify({
        profile_id: usuario.id, version_id: 3,
        age: new Date().getFullYear() - Number(nacimiento.slice(0, 4)),
        gender: genero, rootedness: arraigo, industry: sector, employer: empresa,
        life_stage: 'soltero-sin-hijos', social_energy: 'balanced',
        intention: 'ampliar', romantic_openness: 'indiferente',
        dining_focus: 'both', budget_tier: 2,
        interests: intereses,
        conversation_topics: ['cocina', 'viajes'],
        dietary: ['ninguna'], languages: ['es'],
        zones: ['mercedes', 'chacao'], availability: ['jue'],
      }),
    })

    // Cuatro créditos comprados, uno gastado en esta fecha.
    await rest('credit_ledger', {
      method: 'POST',
      body: JSON.stringify({ profile_id: usuario.id, delta: 4, reason: 'pack_purchase' }),
    })

    const [reserva] = await rest('bookings', {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        event_id: evento.id, profile_id: usuario.id,
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

  console.log(`\nFecha: jueves ${jueves.toLocaleDateString('es-VE')} · 7:00 p.m. · Cardenal, Las Mercedes`)
  console.log(`${perfiles.length} personas apuntadas y verificadas. Sin repartir: eso lo decide el algoritmo.\n`)
  console.log('Cuentas (misma contraseña para todas):\n')
  for (const p of perfiles) console.log(`   ${p.correo.padEnd(28)} ${p.nombre}`)
  console.log(`\n   contraseña: ${CLAVE}\n`)
}

const borrarPrimero = process.argv.includes('--borrar')
await borrar()
if (!borrarPrimero) await sembrar()
