/**
 * Corre el reparto sobre el pool real de una fecha y enseña el resultado
 * sin escribir nada. Es la forma de ver si el algoritmo cuadra antes de
 * dejarle tocar la base.
 *
 *   node scripts/probar-reparto.mjs
 */
import { readFileSync } from 'node:fs'
import { register } from 'node:module'

register('data:text/javascript,' +
  encodeURIComponent(`
    export async function resolve(s, c, next) {
      if (s === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }
      return next(s, c)
    }
  `), import.meta.url)

const { repartir, roturas, desglose, PESOS } = await import('../src/lib/reparto/repartir.ts')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
const q = (p) => fetch(`${BASE}/rest/v1/${p}`, { headers: H }).then((r) => r.json())

const pool = await q('v_matching_pool?select=*')
const perfiles = await q('profiles?select=id,display_name,full_name')
const nombreDe = (id) => {
  const p = perfiles.find((x) => x.id === id)
  return p?.display_name || p?.full_name || id.slice(0, 6)
}

const encuentros = await q('pair_encounters?select=profile_a,profile_b')
const exclusiones = await q('exclusions?select=profile_a,profile_b')
const vetos = new Map()
for (const { profile_a, profile_b } of [...encuentros, ...exclusiones]) {
  if (!vetos.has(profile_a)) vetos.set(profile_a, new Set())
  if (!vetos.has(profile_b)) vetos.set(profile_b, new Set())
  vetos.get(profile_a).add(profile_b)
  vetos.get(profile_b).add(profile_a)
}

const personas = pool.map((p) => ({
  profileId: p.profile_id,
  bookingId: p.booking_id,
  nombre: nombreDe(p.profile_id),
  edad: p.age,
  genero: p.gender,
  arraigo: p.rootedness,
  sector: p.industry,
  empresa: p.employer_key,
  energia: p.social_energy,
  tramoGasto: p.budget_tier,
  intereses: p.interests ?? [],
  temas: p.conversation_topics ?? [],
  idiomas: p.languages ?? ['es'],
  vetados: vetos.get(p.profile_id) ?? new Set(),
}))

console.log(`\nPool elegible: ${personas.length} personas`)
console.log(`Aritmética:  ${personas.length} apuntados − 0 sin verificar = ${personas.length} elegibles`)
console.log(`             ${personas.length} ÷ 6 = ${Math.floor(personas.length / 6)} mesas · ${personas.length % 6} en espera\n`)

const r = repartir(personas)

r.mesas.forEach((mesa, i) => {
  const fallos = roturas(mesa)
  const d = desglose(mesa)
  const edades = mesa.map((p) => p.edad)
  const m = mesa.filter((p) => p.genero === 'mujer').length
  const h = mesa.filter((p) => p.genero === 'hombre').length
  console.log(`MESA ${i + 1}  ${fallos.length ? 'REVISAR' : 'CUADRA'}   puntuación ${r.puntuaciones[i].toFixed(3)}`)
  console.log(`   ${mesa.map((p) => `${p.nombre} (${p.edad})`).join(', ')}`)
  console.log(`   género ${m}/${h} · edades ${Math.min(...edades)}-${Math.max(...edades)} (spread ${Math.max(...edades) - Math.min(...edades)}) · empresas ${mesa.map((p) => p.empresa || 'propia').join(', ')}`)
  console.log(`   sectores ${[...new Set(mesa.map((p) => p.sector))].length} distintos · arraigo ${mesa.map((p) => p.arraigo).join(', ')}`)
  console.log(`   desglose  cohesión ${d.cohesion.toFixed(2)} · sector ${d.sector.toFixed(2)} · arraigo ${d.arraigo.toFixed(2)} · energía ${d.energia.toFixed(2)} · novedad ${d.novedad.toFixed(2)}`)
  if (fallos.length) fallos.forEach((f) => console.log(`   ROTO: ${f.regla} — ${f.detalle}`))
  console.log()
})

if (r.espera.length) console.log(`En espera: ${r.espera.map((p) => p.nombre).join(', ')}\n`)
console.log(`Media: ${r.media.toFixed(3)}   Pesos: ${JSON.stringify(PESOS)}`)
