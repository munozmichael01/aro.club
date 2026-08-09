/**
 * Corre el reparto sobre el pool real de una fecha y enseña el resultado
 * sin escribir nada. Es la forma de ver si el algoritmo cuadra antes de
 * dejarle tocar la base.
 *
 *   node scripts/probar-reparto.mjs [idDeLaFecha]
 *
 * Usa `construirPool`, el MISMO que usan proponer y retocar. Antes armaba
 * su propia copia del pool y se quedó atrás: cuando las zonas entraron en
 * el modelo, este script siguió construyendo personas sin `zonas` y llevaba
 * días reventando en el primer sort. Un test que no corre no avisa de nada,
 * y este era el único test del algoritmo.
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
const { construirPool } = await import('../src/lib/reparto/pool.ts')
const { createClient } = await import('@supabase/supabase-js')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let eventoId = process.argv[2]
if (!eventoId) {
  const { data } = await admin
    .from('events')
    .select('id, starts_at, status')
    .in('status', ['open', 'locked', 'matched'])
    .order('starts_at')
    .limit(1)
  if (!data?.length) {
    console.log('\nNo hay ninguna fecha abierta ni cerrada. Nada que repartir.\n')
    process.exit(0)
  }
  eventoId = data[0].id
  console.log(`\nFecha: ${data[0].starts_at.slice(0, 10)} · ${data[0].status}`)
}

const { personas, sedes, porMesa } = await construirPool(admin, eventoId)

console.log(`Zonas abiertas: ${sedes.length ? sedes.map((s) => s.zonaNombre).join(', ') : 'ninguna'}`)
console.log(`Pool elegible: ${personas.length} personas · mesas de ${porMesa}`)
console.log(`             ${personas.length} ÷ ${porMesa} = ${Math.floor(personas.length / porMesa)} mesas · ${personas.length % porMesa} en espera\n`)

if (!personas.length) {
  console.log('Pool vacío: nadie verificado, con rasgos y con zona que cuadre.\n')
  process.exit(0)
}

const r = repartir(personas, porMesa)

r.mesas.forEach((mesa, i) => {
  const fallos = roturas(mesa)
  const d = desglose(mesa)
  const edades = mesa.map((p) => p.edad).filter((e) => e != null)
  const m = mesa.filter((p) => p.genero === 'mujer').length
  const h = mesa.filter((p) => p.genero === 'hombre').length
  console.log(`MESA ${i + 1}  ${fallos.length ? 'REVISAR' : 'CUADRA'}   puntuación ${r.puntuaciones[i].toFixed(3)}`)
  console.log(`   ${mesa.map((p) => `${p.nombre} (${p.edad})`).join(', ')}`)
  console.log(`   género ${m}/${h} · edades ${Math.min(...edades)}-${Math.max(...edades)} (spread ${Math.max(...edades) - Math.min(...edades)}) · empresas ${mesa.map((p) => p.empresa || 'propia').join(', ')}`)
  console.log(`   sectores ${[...new Set(mesa.map((p) => p.sector))].length} distintos · zonas ${[...new Set(mesa.flatMap((p) => p.zonas))].join(', ')}`)
  console.log(`   desglose  cohesión ${d.cohesion.toFixed(2)} · sector ${d.sector.toFixed(2)} · arraigo ${d.arraigo.toFixed(2)} · energía ${d.energia.toFixed(2)} · novedad ${d.novedad.toFixed(2)}`)
  if (fallos.length) fallos.forEach((f) => console.log(`   ROTO: ${f.regla} — ${f.detalle}`))
  console.log()
})

if (r.espera.length) console.log(`En espera: ${r.espera.map((p) => p.nombre).join(', ')}\n`)
console.log(`Media: ${r.media.toFixed(3)}   Pesos: ${JSON.stringify(PESOS)}`)
