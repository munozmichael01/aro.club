/**
 * Compara las opciones del cuestionario con el catálogo de la base.
 *
 * Existe por un fallo concreto y por el tipo de fallo que es. La pantalla
 * ofrecía `extranjero` —un código que la entrega 7 retiró a propósito, y que
 * la columna rechaza— y no ofrecía `mismos` ni `remoto`, que la misma entrega
 * añadió. Estuvo así seis entregas. Nadie lo vio porque no falla nada visible:
 * la respuesta se pierde al guardar y la persona sigue adelante.
 *
 * La causa no fue descuido, fue que había TRES copias de la misma lista: el
 * catálogo en la base, los códigos en la pantalla y los textos en la pantalla.
 * El refactor de `OPC` juntó las dos de la pantalla. Esto vigila la tercera,
 * que no se puede juntar porque una vive en Postgres.
 *
 * Los CÓDIGOS son un error: si la pantalla ofrece uno que la base no conoce,
 * esa respuesta se pierde; si la base tiene uno que la pantalla no ofrece, es
 * una opción inalcanzable.
 *
 * Los TEXTOS son solo un aviso: el copy lo decide Design y puede reescribirse
 * sin romper nada. Lo que no puede cambiar es a qué código apunta.
 *
 *   node scripts/comprobar-cuestionario.mjs
 *
 * Devuelve 1 si hay códigos descuadrados, para poder ponerlo antes de un push.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const env = Object.fromEntries(
  fs.readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

// --- lo que ofrece la pantalla ----------------------------------------
// fileURLToPath y no `.pathname`: el nombre lleva espacios y `.pathname` los
// devuelve como %20, que fs no sabe abrir.
const html = fs.readFileSync(
  fileURLToPath(new URL('../public/Aro Club - Cuestionario.dc.html', import.meta.url)), 'utf8')

const ini = html.indexOf('  OPC = {')
const fin = html.indexOf('\n  };', ini)
if (ini < 0 || fin < 0) {
  console.error('No encuentro el bloque OPC en el cuestionario.')
  process.exit(1)
}
// eslint-disable-next-line no-eval
const OPC = eval('({' + html.slice(html.indexOf('{', ini) + 1, fin) + '})')

// --- lo que dice el catálogo ------------------------------------------
const { data: catalogo, error } = await admin.from('questions').select('key, options, input_type')
if (error) {
  console.error('No pude leer el catálogo:', error.message)
  process.exit(1)
}

const enBase = new Map(
  (catalogo ?? [])
    .filter((q) => Array.isArray(q.options) && q.options.length)
    .map((q) => [q.key, q.options]),
)

let errores = 0
let avisos = 0

for (const [id, pares] of Object.entries(OPC)) {
  const opciones = enBase.get(id)
  if (!opciones) {
    // No todas las preguntas de la pantalla tienen que estar en el catálogo
    // —`idiomas` y `sector` se resuelven de otra forma—, así que esto se
    // cuenta como aviso y no como error.
    console.log(`· ${id}: no está en el catálogo de la base`)
    avisos++
    continue
  }

  // Los códigos null son opciones que a propósito no son respuesta: hoy solo
  // «Cualquier zona de la ciudad», que es un atajo.
  const pantalla = pares.filter((o) => o[1] !== null).map((o) => o[1])
  const base = opciones.map((o) => o.value)

  const sobran = pantalla.filter((c) => !base.includes(c))
  const faltan = base.filter((c) => !pantalla.includes(c))

  if (sobran.length || faltan.length) {
    errores++
    console.error(`\n✗ ${id}`)
    if (sobran.length) {
      console.error(`  la pantalla ofrece y la base no conoce: ${sobran.join(', ')}`)
      console.error('  → esas respuestas se PIERDEN al guardar')
    }
    if (faltan.length) {
      console.error(`  la base tiene y la pantalla no ofrece: ${faltan.join(', ')}`)
      console.error('  → opciones que nadie puede elegir')
    }
    continue
  }

  // Mismos códigos: ¿apunta cada uno al texto que le corresponde?
  const textoEnBase = new Map(opciones.map((o) => [o.value, o.label]))
  const distintos = pares
    .filter((o) => o[1] !== null && textoEnBase.get(o[1]) !== o[0])
    .map((o) => `${o[1]}: «${o[0]}» / base dice «${textoEnBase.get(o[1])}»`)

  if (distintos.length) {
    avisos += distintos.length
    console.log(`\n· ${id}: mismo código, texto distinto (copy, no rompe nada)`)
    distintos.forEach((d) => console.log('    ' + d))
  } else {
    console.log(`✓ ${id}`)
  }
}

// --- las preguntas de tipo fecha --------------------------------------
//
// `nacimiento` no tiene opciones, así que el cotejo de códigos de arriba no
// la mira: no hay nada que comparar. Pero sí hay algo que puede desalinearse
// —que el catálogo pida una fecha y la pantalla no la ofrezca, o al revés— y
// eso no falla en ningún sitio: la pregunta simplemente no sale, y quien
// llegue al final se encontrará con que le falta una respuesta que nunca vio.
const fechasEnBase = (catalogo ?? [])
  .filter((q) => q.input_type === 'date')
  .map((q) => q.key)

const fechasEnPantalla = [...html.matchAll(/id:\s*'([a-z_]+)'[^}]*tipo:\s*'fecha'/g)].map((m) => m[1])

const fechaSinPantalla = fechasEnBase.filter((k) => !fechasEnPantalla.includes(k))
const pantallaSinFecha = fechasEnPantalla.filter((k) => !fechasEnBase.includes(k))

if (fechaSinPantalla.length || pantallaSinFecha.length) {
  errores++
  console.error('\n✗ preguntas de tipo fecha')
  if (fechaSinPantalla.length) {
    console.error(`  la base pide fecha y la pantalla no la ofrece: ${fechaSinPantalla.join(', ')}`)
    console.error('  → obligatoria que nadie puede contestar')
  }
  if (pantallaSinFecha.length) {
    console.error(`  la pantalla ofrece fecha y la base no la conoce: ${pantallaSinFecha.join(', ')}`)
    console.error('  → esa respuesta se PIERDE al guardar')
  }
} else if (fechasEnBase.length) {
  console.log(`✓ fecha (${fechasEnBase.join(', ')})`)
}

// --- la cuarta copia: el reparto de planes en familias ----------------
//
// `profile_traits.formats` guarda el código de `planes` tal cual, y la
// pestaña Gente pregunta por FAMILIA —cenas, drinks, movimiento, coffee—.
// Ese reparto es una decisión de producto y vive en `src/lib/formatos.ts`,
// que es una lista más que puede quedarse vieja.
//
// Un plan sin familia no rompe nada visible: no entra en ningún filtro y la
// pantalla dice cero sin quejarse, que es exactamente el fallo de siempre
// con otra ropa. Por eso cuenta como error y no como aviso.
const ts = fs.readFileSync(
  fileURLToPath(new URL('../src/lib/formatos.ts', import.meta.url)), 'utf8')
const iniF = ts.indexOf('export const PLANES_DE_FAMILIA')
const abre = ts.indexOf('{', iniF)
const cierra = ts.indexOf('\n}', abre)
if (iniF < 0 || cierra < 0) {
  console.error('No encuentro PLANES_DE_FAMILIA en src/lib/formatos.ts.')
  process.exit(1)
}
// eslint-disable-next-line no-eval
const PLANES_DE_FAMILIA = eval('(' + ts.slice(abre, cierra + 2) + ')')
const conFamilia = Object.values(PLANES_DE_FAMILIA).flat()

const planes = (enBase.get('planes') ?? []).map((o) => o.value)
const sinFamilia = planes.filter((c) => !conFamilia.includes(c))
const familiaFantasma = conFamilia.filter((c) => !planes.includes(c))

if (sinFamilia.length || familiaFantasma.length) {
  errores++
  console.error('\n✗ planes → familias (src/lib/formatos.ts)')
  if (sinFamilia.length) {
    console.error(`  la base ofrece y ninguna familia recoge: ${sinFamilia.join(', ')}`)
    console.error('  → quien lo marque no sale en ningún filtro de formato de Gente')
  }
  if (familiaFantasma.length) {
    console.error(`  la familia incluye y la base no conoce: ${familiaFantasma.join(', ')}`)
    console.error('  → filtro que no puede encontrar a nadie')
  }
} else if (planes.length) {
  console.log('✓ planes → familias')
}

console.log(`\n${errores} descuadres de código · ${avisos} avisos de texto`)
process.exit(errores ? 1 : 0)
