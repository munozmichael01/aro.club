/**
 * Mandar el «abrimos fecha en tu zona» de fechas ya abiertas.
 *
 * Es el gemelo de `abrir-fechas.mjs`: aquel abre y este cuenta. Separados a
 * propósito, porque abrir seis fechas y escribirle a medio club son dos
 * decisiones y la segunda no se toma sin mirar a cuántos va.
 *
 * NO decide nada por su cuenta: llama a `avisarDeLaApertura`, la misma pieza
 * que usa el panel, que es quien sabe a quién le sirve una fecha —su zona,
 * su edad, el idioma de la mesa, quién apagó ese aviso— y en qué tanda sale.
 * Por eso está en TypeScript y se corre con `tsx`: para importar el código
 * de verdad en vez de copiarlo.
 *
 *   npm_config_cache=/tmp/npmcache npx --yes tsx --conditions=react-server \
 *     scripts/avisar-apertura.mts <id de fecha> [más ids…]
 *
 *   … con `aplicar` al final para que escriba de verdad.
 *
 * El `--conditions=react-server` es lo que hace que `import 'server-only'`
 * no reviente fuera de Next: resuelve al módulo vacío, que es justo lo que
 * esa marca significa.
 *
 * Los avisos quedan EN COLA para su tanda —mediodía o seis de la tarde— y
 * los manda el cron. Para adelantarlos a otra hora, `adelantar-avisos.mjs`.
 */
import fs from 'node:fs'

// El entorno ANTES de cargar nada: `src/lib/env.ts` lo valida al importarse.
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  if (!l.includes('=')) continue
  const k = l.slice(0, l.indexOf('=')).trim()
  if (!process.env[k]) process.env[k] = l.slice(l.indexOf('=') + 1).trim()
}

const { createClient } = await import('@supabase/supabase-js')
const { avisarDeLaApertura } = await import('../src/lib/avisar-apertura')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const CARACAS = 4
const car = (s: string) =>
  new Date(new Date(s).getTime() - CARACAS * 3600e3).toISOString().slice(0, 16).replace('T', ' ')

const args = process.argv.slice(2)
const aplicar = args.includes('aplicar')
const ids = args.filter((a) => /^[0-9a-f-]{36}$/.test(a))

if (!ids.length) {
  console.log('Dime de qué fechas: sus ids, separados por espacios.')
  process.exit(1)
}

let total = 0
for (const id of ids) {
  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, status, age_band_min, age_band_max')
    .eq('id', id)
    .maybeSingle()

  if (!evento) { console.log(id + ': esa fecha no existe.'); continue }
  if (evento.status !== 'open') { console.log(id + ': está en «' + evento.status + '», no se avisa.'); continue }

  // Las zonas salen de la fecha, no de lo que se escriba aquí: avisar de
  // una zona en la que la fecha no cae es mandar a gente a algo que no
  // existe.
  const { data: zonas } = await admin
    .from('event_venues')
    .select('zone_slug')
    .eq('event_id', id)

  const slugs = (zonas ?? []).map((z) => z.zone_slug).filter((z): z is string => !!z)
  if (!slugs.length) { console.log(id + ': sin zonas, no hay a quién avisar.'); continue }

  const dia = car(evento.starts_at).slice(0, 10)
  const n = await avisarDeLaApertura(id, slugs, dia, !aplicar)
  total += n
  console.log((aplicar ? 'encolados ' : 'en seco ') + String(n).padStart(4) + ' · ' + dia
    + ' · ' + slugs.join(', ')
    + (evento.age_band_min || evento.age_band_max
      ? ' · ' + (evento.age_band_max ? 'hasta ' + evento.age_band_max : '+' + evento.age_band_min)
      : ''))
}

console.log('\n' + (aplicar ? 'encolados' : 'en seco') + ': ' + total + ' avisos')
if (!aplicar) console.log('(añade `aplicar` al final para encolarlos)')
else console.log('Salen en su tanda. `adelantar-avisos.mjs <hora>` los mueve.')
