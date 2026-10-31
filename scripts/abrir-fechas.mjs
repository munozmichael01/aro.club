/**
 * Abrir fechas desde la terminal, cuando el panel no está a mano.
 *
 * El panel sigue siendo el sitio: valida cosas que esto no mira —que no
 * haya dos fechas iguales el mismo día en la misma zona, que el local
 * elegido abra ese día del mes— y deja el rastro con el nombre de quien la
 * abrió. Esto existe porque el 31-10 el club se quedó sin ninguna fecha
 * abierta un sábado por la mañana y abrir seis a mano, una por una, era
 * media hora de formularios.
 *
 *   node scripts/abrir-fechas.mjs                                      en seco
 *   node scripts/abrir-fechas.mjs aplicar
 *   node scripts/abrir-fechas.mjs --dias=2026-11-05,2026-11-06 aplicar
 *   node scripts/abrir-fechas.mjs --hora=20:00 --precio=12 aplicar
 *
 * Por defecto abre, para cada día, DOS cenas: una de hasta 44 en Chacao y
 * Los Palos Grandes y otra de +45 en Los Naranjos y El Hatillo, que es lo
 * que pidió Michael el 31-10. Se cambia con `--planes`:
 *
 *   --planes="-44:chacao,palos-grandes|45+:naranjos,hatillo"
 *   --planes="todos:mercedes,altamira"
 *
 * LO QUE NO HACE: avisar. El correo de «abrimos fecha en tu zona» sale
 * aparte, con `avisar-apertura.mts`, que usa la misma pieza que el panel
 * para decidir a quién se le escribe y cuándo. Separarlos es a propósito:
 * abrir seis fechas y escribirle a medio club son dos decisiones.
 *
 * Las tres horas salen de las mismas reglas que el panel: empieza a la hora
 * que se diga, cierra a medianoche de su día (`AroReglas.cierreDe`) y se
 * revela a mediodía si empieza después del mediodía.
 */
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
// La MISMA función que usan el panel y el servidor, no una copia.
const reglas = require('../public/reglas.js')

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CARACAS = 4
const car = (s) => new Date(new Date(s).getTime() - CARACAS * 3600e3).toISOString().slice(0, 16).replace('T', ' ')
/** Caracas a UTC, como el `enUTC` de la ruta. */
const enUTC = (dia, h, m = 0) => new Date(Date.parse(dia + 'T00:00:00Z') + (h + CARACAS) * 3600e3 + m * 60e3)

const args = process.argv.slice(2)
const bandera = (nombre, pordefecto) => {
  const b = args.find((a) => a.startsWith('--' + nombre + '='))
  return b ? b.slice(nombre.length + 3).replace(/^["']|["']$/g, '') : pordefecto
}
const aplicar = args.includes('aplicar')

const dias = bandera('dias', '2026-11-05,2026-11-06,2026-11-07').split(',').map((d) => d.trim()).filter(Boolean)
const [horaN, minN] = bandera('hora', '19:00').split(':').map(Number)
const precio = Number(bandera('precio', '10'))
const porMesa = Number(bandera('mesa', '6'))

/** `-44:zona,zona|45+:zona,zona|todos:zona` */
const planes = bandera('planes', '-44:chacao,palos-grandes|45+:naranjos,hatillo')
  .split('|').map((trozo) => {
    const [banda, zonas] = trozo.split(':')
    const b = banda.trim()
    return {
      etiqueta: b,
      edadMinima: b.endsWith('+') ? Number(b.slice(0, -1)) : null,
      edadMaxima: b.startsWith('-') ? Number(b.slice(1)) : null,
      zonas: (zonas ?? '').split(',').map((z) => z.trim()).filter(Boolean),
    }
  })

for (const p of planes) {
  if (!p.zonas.length) { console.log('El plan «' + p.etiqueta + '» no trae zonas.'); process.exit(1) }
}
if (!dias.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) { console.log('Los días se escriben 2026-11-05.'); process.exit(1) }

// Las zonas tienen que existir: un slug mal escrito abre una fecha a la que
// no se puede apuntar nadie, y eso no falla en ningún sitio hasta el reparto.
const { data: zonasVivas } = await admin.from('zones').select('slug, name')
const slugs = new Set((zonasVivas ?? []).map((z) => z.slug))
for (const p of planes) {
  for (const z of p.zonas) {
    if (!slugs.has(z)) {
      console.log('La zona «' + z + '» no existe. Las que hay: ' + [...slugs].join(', '))
      process.exit(1)
    }
  }
}

const abiertas = []
for (const dia of dias) {
  for (const plan of planes) {
    const empieza = enUTC(dia, horaN, minN || 0)
    const cierra = new Date(reglas.cierreDe(empieza.toISOString()))
    // La revelación: a mediodía si empieza después, y si no, a las seis de
    // la tarde del día anterior. Lo mismo que `revelacionDe` de la ruta.
    const revela = horaN >= 12 ? enUTC(dia, 12, 0) : new Date(enUTC(dia, 18).getTime() - 24 * 3600e3)

    if (cierra.getTime() <= Date.now()) {
      console.log(dia + ' · ' + plan.etiqueta + ': cierra en el pasado, no se abre.')
      continue
    }

    console.log(car(empieza.toISOString()), '· cena ·', plan.etiqueta.padEnd(6),
      '· cierra', car(cierra.toISOString()), '· revela', car(revela.toISOString()),
      '·', plan.zonas.join(', '))

    if (!aplicar) continue

    const { data: evento, error } = await admin.from('events').insert({
      format: 'dinner',
      starts_at: empieza.toISOString(),
      booking_closes_at: cierra.toISOString(),
      reveal_at: revela.toISOString(),
      city_slug: 'caracas',
      price_usd: precio,
      seats_per_table: porMesa,
      age_band_min: plan.edadMinima,
      age_band_max: plan.edadMaxima,
      status: 'open',
      es_prueba: false,
    }).select('id').single()

    if (error) { console.log('  ERROR: ' + error.message); continue }

    const { error: eZonas } = await admin.from('event_venues').insert(
      plan.zonas.map((z) => ({ event_id: evento.id, zone_slug: z, restaurant_id: null, max_tables: null })),
    )
    // Sin zonas es un evento al que nadie puede apuntarse: se deshace, como
    // hace la ruta.
    if (eZonas) {
      console.log('  ERROR en las zonas: ' + eZonas.message + ' — se deshace la fecha')
      await admin.from('events').delete().eq('id', evento.id)
      continue
    }

    await admin.from('ops_audit_log').insert({
      actor_id: null, action: 'fecha_abierta', entity: 'evento', entity_id: evento.id,
      payload: { aMano: 'scripts/abrir-fechas.mjs', dia, zonas: plan.zonas, porMesa, precioUsd: precio },
    })

    abiertas.push({ id: evento.id, dia, zonas: plan.zonas })
    console.log('  abierta ' + evento.id)
  }
}

if (!aplicar) {
  console.log('\n(en seco: no se ha escrito nada. Añade `aplicar` al final)')
  process.exit(0)
}

console.log('\nabiertas ' + abiertas.length + ' fechas.')
console.log('NADIE lo sabe todavía: el aviso va aparte.')
for (const a of abiertas) console.log('  ' + a.id + '  ' + a.dia + '  ' + a.zonas.join(','))
