/**
 * Sumar a cada persona las zonas de las fechas que YA reservó.
 *
 * Michael, 31-10: «¿y esto no lo has hecho con todos los que reservaron en
 * una zona que no tienen marcada? Eso es lo que dijimos desde el principio».
 * Tiene razón: la regla —reservar una fecha de una zona es elegir esa zona—
 * se aplicaba solo a lo que se reservara a partir de hoy, y a medias antes:
 *
 *  - con una zona en común no se sumaba ninguna de las demás;
 *  - y reservando con crédito no se sumaba nada, nunca.
 *
 * Así que hay gente que reservó «Chacao o Los Palos Grandes» con solo Chacao
 * marcado y no recibe los avisos de Los Palos Grandes. Esto lo pone al día.
 *
 * Usa `sumarZonasAlPerfil`, la MISMA pieza que la reserva: no hay una regla
 * para el pasado y otra para el futuro.
 *
 *   npm_config_cache=/tmp/npmcache npx --yes tsx --conditions=react-server \
 *     scripts/sumar-zonas-reservadas.mts             en seco: a quién y qué
 *   … scripts/sumar-zonas-reservadas.mts aplicar     lo escribe
 *
 * QUÉ RESERVAS CUENTAN: las que no se cancelaron, de fechas de verdad, desde
 * el 12-10. Una cancelada es alguien que se echó atrás: no eligió esa zona.
 * Una de antes del 12-10 es de cuando todo era de prueba.
 *
 * Y cada cambio queda en `ops_audit_log` como respuesta corregida, con lo que
 * se sumó: se puede deshacer persona a persona.
 */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l.includes('=')) continue
  const k = l.slice(0, l.indexOf('=')).trim()
  if (!process.env[k]) process.env[k] = l.slice(l.indexOf('=') + 1).trim()
}

const { createClient } = await import('@supabase/supabase-js')
const { sumarZonasAlPerfil, zonasQueSeAnaden } = await import('../src/lib/zonas-declaradas')
const { DESDE_QUE_ES_REAL } = await import('../src/lib/ops')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const aplicar = process.argv.includes('aplicar')

/** De mil en mil: PostgREST no devuelve más, y aquí hay más. */
async function todas<T>(armar: (d: number, h: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await armar(d, d + 999)
    if (error) throw new Error(String((error as { message?: string }).message ?? error))
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  return out
}

const fechas = await todas<{ id: string }>((d, h) => admin.from('events')
  .select('id').eq('es_prueba', false).gte('starts_at', DESDE_QUE_ES_REAL).order('id').range(d, h))
const idsFechas = new Set(fechas.map((f) => f.id))

const reservas = (await todas<{ profile_id: string; event_id: string; status: string }>((d, h) => admin.from('bookings')
  .select('profile_id, event_id, status')
  .not('status', 'in', '(cancelled_by_user,cancelled_by_ops)')
  .order('id').range(d, h)))
  .filter((r) => idsFechas.has(r.event_id))

const sedes = await todas<{ event_id: string; zone_slug: string | null }>((d, h) => admin.from('event_venues')
  .select('event_id, zone_slug').order('event_id').range(d, h))

const zonasDeFecha = new Map<string, string[]>()
for (const s of sedes) {
  if (!s.zone_slug || !idsFechas.has(s.event_id)) continue
  const z = zonasDeFecha.get(s.event_id) ?? []
  if (!z.includes(s.zone_slug)) z.push(s.zone_slug)
  zonasDeFecha.set(s.event_id, z)
}

// Las de prueba, fuera: sus cuentas no cuentan para nada de verdad.
const pruebas = new Set((await todas<{ id: string }>((d, h) => admin.from('profiles')
  .select('id').eq('es_prueba', true).order('id').range(d, h))).map((p) => p.id))

// Todas las zonas que reservó cada persona, juntas.
const reservadasPor = new Map<string, Set<string>>()
for (const r of reservas) {
  if (pruebas.has(r.profile_id)) continue
  const z = zonasDeFecha.get(r.event_id) ?? []
  const s = reservadasPor.get(r.profile_id) ?? new Set<string>()
  z.forEach((x) => s.add(x))
  reservadasPor.set(r.profile_id, s)
}

const { data: version } = await admin.from('questionnaire_versions').select('id').eq('is_active', true).maybeSingle()
const respuestas = await todas<{ profile_id: string; value: unknown }>((d, h) => admin.from('answers')
  .select('profile_id, value').eq('version_id', version!.id).eq('question_key', 'zonas').order('profile_id').range(d, h))
const suyasDe = new Map(respuestas.map((r) => [r.profile_id, Array.isArray(r.value) ? (r.value as string[]) : []]))

const cambios: { perfil: string; antes: string[]; suma: string[] }[] = []
for (const [perfil, reservadas] of reservadasPor) {
  const antes = suyasDe.get(perfil) ?? []
  const suma = zonasQueSeAnaden(antes, [...reservadas])
  if (suma.length) cambios.push({ perfil, antes, suma })
}

const porZona = new Map<string, number>()
for (const c of cambios) for (const z of c.suma) porZona.set(z, (porZona.get(z) ?? 0) + 1)

console.log('reservas que cuentan:', reservas.length, '· personas:', reservadasPor.size)
console.log('personas a las que les falta alguna zona que reservaron:', cambios.length)
console.log('zonas que se sumarían:', [...porZona.entries()].sort((a, b) => b[1] - a[1]).map(([z, n]) => z + ' ' + n).join(' · ') || 'ninguna')

if (!aplicar) {
  console.log('\n(en seco: no se ha escrito nada. Añade `aplicar` al final)')
  process.exit(0)
}

let hechos = 0
for (const c of cambios) {
  const sumadas = await sumarZonasAlPerfil(c.perfil, c.suma)
  if (!sumadas.length) continue
  hechos++
  await admin.from('ops_audit_log').insert({
    actor_id: null,
    action: 'respuesta_corregida',
    entity: 'perfil',
    entity_id: c.perfil,
    payload: {
      aMano: 'scripts/sumar-zonas-reservadas.mts',
      pregunta: 'zonas',
      antes: c.antes,
      sumadas,
      porque: 'Reservó fechas en esas zonas (regla de Michael, 31-10)',
    },
  } as never)
}

console.log('\nsumadas a ' + hechos + ' personas. Cada cambio queda en ops_audit_log.')
