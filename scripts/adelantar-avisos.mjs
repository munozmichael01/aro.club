/**
 * Adelantar los avisos de apertura que están en cola para hoy.
 *
 * Los «abrimos fecha en tu zona» no salen al abrir la fecha: salen en una
 * TANDA, a las 12:00 o a las 18:00 de Caracas, con una hora de margen antes
 * de cada una. Eso es a propósito y vive en `src/lib/tandas.ts`: una persona
 * recibe UN aviso al día, y abrir tres fechas seguidas no le manda tres
 * correos.
 *
 * Pero la tanda es una regla, no una ley: el 31-10 Michael abrió las fechas
 * de la semana a las nueve y quería el correo a las diez, no al mediodía.
 * Esto mueve la hora de lo que YA está encolado y sin enviar, sin tocar el
 * contenido ni a quién va.
 *
 *   node scripts/adelantar-avisos.mjs                 qué hay en cola para hoy
 *   node scripts/adelantar-avisos.mjs 10:00           en seco, dice a cuántos
 *   node scripts/adelantar-avisos.mjs 10:00 aplicar   lo mueve
 *   node scripts/adelantar-avisos.mjs 12:00 aplazar aplicar   lo FRENA hasta esa hora
 *
 * LO QUE NO HACE: encolar nada. Si una fecha se abrió callada, aquí no hay
 * nada suyo que mover; eso se avisa desde el panel, en la fecha.
 *
 * Y la hora tiene que ser FUTURA. Poner una que ya pasó es mandar los
 * correos en la siguiente vuelta del cron, o sea ahora mismo, pero
 * creyendo que se programaron: si es eso lo que se quiere, se dice con la
 * hora de dentro de un minuto y se ve venir.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CARACAS = 4
const car = (s) => (s
  ? new Date(new Date(s).getTime() - CARACAS * 3600e3).toISOString().slice(0, 16).replace('T', ' ')
  : '—')

/** Hoy en Caracas, a esas horas y minutos. */
function hoyALas(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm).trim())
  if (!m) return null
  const ccs = new Date(Date.now() - CARACAS * 3600e3)
  const hoy = Date.UTC(ccs.getUTCFullYear(), ccs.getUTCMonth(), ccs.getUTCDate(), Number(m[1]), Number(m[2]))
  return new Date(hoy + CARACAS * 3600e3)
}

/**
 * De mil en mil, que es lo que devuelve PostgREST.
 *
 * Sin esto la cuenta se queda clavada en 1000 y —peor— se moverían solo
 * mil: el resto saldría a su hora original y el aviso de una apertura
 * llegaría en dos tandas distintas. Un envío a medio club pasa de mil
 * filas con facilidad; este empezó con mil cuatrocientas.
 */
const cola = []
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await admin
    .from('scheduled_emails')
    .select('id, kind, email, profile_id, event_id, send_at')
    .eq('kind', 'abrimos_zona')
    .is('sent_at', null)
    .order('id')
    .range(desde, desde + 999)

  if (error) { console.log('No se pudo leer la cola: ' + error.message); process.exit(1) }
  cola.push(...data)
  if (data.length < 1000) break
}
if (!cola.length) { console.log('No hay ningún «abrimos zona» en cola sin enviar.'); process.exit(0) }

const porHora = {}
for (const r of cola) porHora[car(r.send_at)] = (porHora[car(r.send_at)] ?? 0) + 1
console.log('en cola sin enviar, por hora de Caracas:')
for (const [h, n] of Object.entries(porHora)) console.log('  ' + h + '  ' + n)
console.log('fechas distintas:', new Set(cola.map((r) => r.event_id)).size)

const args = process.argv.slice(2)
const hora = (args[0] ?? '').trim()
if (!hora) {
  console.log('\n(en seco: `node scripts/adelantar-avisos.mjs 10:00` para moverlos)')
  process.exit(0)
}

const cuando = hoyALas(hora)
if (!cuando) { console.log('\nLa hora se escribe como 10:00.'); process.exit(1) }
if (cuando.getTime() <= Date.now()) {
  console.log('\nEsa hora ya pasó hoy en Caracas (' + car(cuando.toISOString()) + ').')
  console.log('Moverlos ahí es mandarlos en la próxima vuelta del cron, que pasa cada cuarto de hora.')
  process.exit(1)
}

/**
 * Adelantar mueve solo lo que saldría DESPUÉS; con `aplazar`, al revés.
 *
 * Son dos cosas distintas y conviene decir cuál: adelantar sin querer un
 * aviso que ya iba a salir antes lo retrasa, y retrasar sin querer uno que
 * ya salía después lo adelanta. Aplazar es lo que se usa para FRENAR un
 * envío que está a punto de salir: el 31-10, con los correos de las seis
 * fechas a diecinueve minutos de las diez, Michael pidió revisar una cosa
 * antes. Frenar se deshace; mandar, no.
 */
const aplazar = args.includes('aplazar')
const mover = aplazar
  ? cola.filter((r) => new Date(r.send_at).getTime() < cuando.getTime())
  : cola.filter((r) => new Date(r.send_at).getTime() > cuando.getTime())
console.log('\nse ' + (aplazar ? 'aplazarían' : 'moverían') + ' a ' + car(cuando.toISOString()) + ': ' + mover.length
  + ' de ' + cola.length + (aplazar
    ? ' (los que ya salían después se quedan como están)'
    : ' (los que ya salían antes se quedan como están)'))

/**
 * Y juntarlos en una hora los junta en UN correo.
 *
 * El cron agrupa por persona lo que le toque en la misma vuelta: quien
 * tenga dos o tres aperturas recibe un «avisos del día» con todas las
 * fechas dentro, no tres correos. Por eso adelantarlos no multiplica nada:
 * al contrario, es lo que hace que la semana se cuente de una vez.
 */
const porPersona = new Map()
for (const r of mover) porPersona.set(r.profile_id, (porPersona.get(r.profile_id) ?? 0) + 1)
const conVarias = [...porPersona.values()].filter((n) => n > 1).length
console.log('personas distintas: ' + porPersona.size
  + (conVarias ? ' · ' + conVarias + ' reciben UN correo con varias fechas dentro' : ''))

if (!args.includes('aplicar')) {
  console.log('\n(en seco: no se ha escrito nada. Añade `aplicar` al final)')
  process.exit(0)
}

for (let i = 0; i < mover.length; i += 200) {
  const trozo = mover.slice(i, i + 200).map((r) => r.id)
  const { error: e } = await admin
    .from('scheduled_emails')
    .update({ send_at: cuando.toISOString() })
    .in('id', trozo)
    .is('sent_at', null)
  if (e) { console.log('ERROR al mover: ' + e.message); process.exit(1) }
}

console.log((aplazar ? 'aplazados ' : 'movidos ') + mover.length + ' para ' + car(cuando.toISOString()) + ' de Caracas')
console.log('salen en la vuelta del cron siguiente a esa hora, dentro de los quince minutos.')
