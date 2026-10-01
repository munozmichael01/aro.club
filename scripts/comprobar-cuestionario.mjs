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
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

/** Las reglas compartidas, una sola vez: las usan varias comprobaciones. */
const reglas = createRequire(import.meta.url)('../public/reglas.js')

/**
 * Con la llave PUBLICA, no con la de servicio.
 *
 * Esto solo lee `questions`, que RLS deja leer a cualquiera —tiene que, o el
 * cuestionario no se pintaria— y la llave publica ya viaja a todos los
 * navegadores que abren aro.club. O sea que aqui no aporta ningun secreto.
 *
 * La de servicio si: es la que salta RLS entera y lee y escribe cualquier
 * tabla. Tenerla en el CI de un repositorio para comprobar un catalogo
 * publico es poner la llave maestra en la puerta de al lado del recibidor,
 * y ademas sobra: sin ella el comprobador se saltaba, que es como se ha
 * pasado un mes sin correr.
 *
 * `.env.local` es opcional: si no esta —en el CI no esta— se leen las
 * variables del entorno.
 */
let deFichero = {}
try {
  deFichero = Object.fromEntries(
    fs.readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
      .split('\n').filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
} catch { /* en el CI no hay fichero: van por el entorno */ }

const env = { ...deFichero, ...process.env }
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const LLAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL_BASE || !LLAVE) {
  console.error('\n\u2717 faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  console.error('  Las dos son publicas: viajan al navegador en cada visita.')
  process.exit(1)
}

const admin = createClient(URL_BASE, LLAVE,
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

// Un catálogo vacío NO es un catálogo sin descuadres.
//
// Sin esto, una lectura que devuelve cero filas —el proyecto equivocado, una
// política de RLS nueva, la tabla vaciada, un filtro que se lleva por delante
// lo que buscaba— hacía que TODAS las preguntas cayeran en «no está en el
// catálogo», que se cuenta como aviso. Cero errores, salida 0, «todo bien»: el
// comprobador pasaba más fuerte cuanto menos podía comprobar.
//
// Y es exactamente la clase de fallo que este script vino a impedir, con otra
// ropa. Un `error` de la consulta sí se cazaba; una consulta que va bien y no
// trae nada, no.
if (!enBase.size) {
  console.error('\n✗ el catálogo volvió vacío: ninguna pregunta con opciones.')
  console.error('  No es que la pantalla esté bien: es que no hay con qué compararla.')
  process.exit(1)
}

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

// Ni media docena de avisos «no está en el catálogo» son media docena de
// coincidencias: si NINGUNA de las preguntas de la pantalla aparece, lo que
// falla es la lectura —otra versión del cuestionario, otro proyecto— y no las
// quince pantallas a la vez.
const encontradas = Object.keys(OPC).filter((id) => enBase.has(id)).length
if (Object.keys(OPC).length && !encontradas) {
  console.error('\n✗ ninguna pregunta de la pantalla está en el catálogo leído.')
  console.error('  Eso no son quince descuadres: es que se leyó el catálogo equivocado.')
  process.exit(1)
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

// --- la quinta copia: las preguntas frecuentes, dos veces -------------
//
// Las FAQ estan en la landing DOS veces y no se puede evitar: una en
// `faqDefs`, que es lo que pinta la pantalla, y otra dentro del JSON-LD del
// <head>, que es lo que leen los buscadores y los asistentes de IA.
//
// No vale generarlas en el navegador: un rastreador no ejecuta JavaScript,
// asi que si el JSON-LD se armara al vuelo, para el no existiria. Y no vale
// dejar solo el JSON-LD: la persona tiene que verlas.
//
// Asi que hay dos copias a la fuerza, y por eso hacen falta vigiladas. Ya se
// separaron una vez: la pregunta de la edad decia «si tienes 24 te sientas
// con gente de 20 a 34» —catorce anos, con la regla en diez— y al corregirla
// habia que acordarse de tocar las dos.
const landing = fs.readFileSync(
  fileURLToPath(new URL('../public/Aro Club - Landing v4.dc.html', import.meta.url)), 'utf8')

// La lista que ven las personas ya no esta escrita en la landing: vive en
// `reglas.js`, que comparten la landing, la pagina de ayuda y la app. Con tres
// pantallas enseñandolas, tenerlas literales en una de ellas era pedir que se
// separaran. Las dos copias que quedan —la compartida y el JSON-LD— siguen
// vigiladas aqui, que es lo que importa.
const enPantalla = reglas.FRECUENTES

const ld = landing.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
if (!ld) {
  console.error('\n✗ la landing no tiene JSON-LD: los buscadores no ven nada')
  errores++
} else {
  const grafo = JSON.parse(ld[1])['@graph'] ?? []
  const enEsquema = (grafo.find((n) => n['@type'] === 'FAQPage')?.mainEntity ?? [])
    .map((q) => [q.name, q.acceptedAnswer?.text])

  const distintas = []
  if (enPantalla.length !== enEsquema.length) {
    distintas.push(`la pantalla tiene ${enPantalla.length} y el esquema ${enEsquema.length}`)
  }
  enPantalla.forEach(([p, r], i) => {
    const e = enEsquema[i]
    if (!e) return
    if (e[0] !== p) distintas.push(`${i + 1}: pregunta distinta`)
    else if (e[1] !== r) distintas.push(`${i + 1}: «${p}» tiene otra respuesta en el esquema`)
  })

  if (distintas.length) {
    errores++
    console.error('\n✗ preguntas frecuentes: pantalla y JSON-LD no coinciden')
    distintas.forEach((d) => console.error('    ' + d))
    console.error('  → la gente lee una cosa y los buscadores otra')
  } else if (enPantalla.length) {
    console.log(`✓ preguntas frecuentes (${enPantalla.length}, pantalla y esquema iguales)`)
  }
}

// --- la sexta copia: el favicon, una vez por pantalla ------------------
//
// Las pantallas son ficheros estaticos servidos por reescritura, asi que el
// `metadata.icons` del layout de Next NO les llega: cada `<head>` tiene que
// declararlo. Solo lo hacia la landing, y las otras dieciocho ensenaban el
// favicon por defecto de `create-next-app` —el triangulo de Vercel— desde el
// 2 de agosto. Se vio en /privacidad, tres semanas despues.
//
// No se puede unificar en un sitio: son ficheros sueltos. Asi que se vigila.
const pantallas = fs.readdirSync(
  fileURLToPath(new URL('../public', import.meta.url))).filter((f) => f.endsWith('.dc.html'))

const sinIcono = pantallas.filter((f) => !fs.readFileSync(
  fileURLToPath(new URL(`../public/${f}`, import.meta.url)), 'utf8').includes('rel="icon"'))

if (sinIcono.length) {
  errores++
  console.error('\n\u2717 pantallas sin favicon')
  sinIcono.forEach((f) => console.error(`    ${f}`))
  console.error('  \u2192 ensenan el favicon por defecto de Next, que es el de Vercel')
} else {
  console.log(`\u2713 favicon (${pantallas.length} pantallas)`)
}

// --- las cuatro preguntas de la puerta --------------------------------
//
// `AroReglas.PUERTA` son las que se hacen ANTES de tener cuenta: la portada y
// la entrada de la app leen las dos ese mismo fichero. Sus códigos tienen que
// existir en el catálogo, porque son los que se guardan en `waitlist` y los
// que deciden con quién se sienta la persona.
//
// Esto no falla a la vista. Un código que el catálogo no conoce se escribe
// igual —la columna es texto— y lo que se rompe es el reparto, semanas
// después, cuando nadie lo relaciona con haber tocado una lista.
//
// Las zonas no se miran: van vacías a propósito y las trae `/api/zonas`.
// `reglas.js` es UMD a propósito —el navegador lo carga con un <script>—,
// así que se lee con `require`, no con `import`: el import trae el módulo
// entero en `default` y los nombres sueltos vienen vacíos.
const { PUERTA, ORDEN_PUERTA } = reglas

const codigosMalos = []
const textosDistintos = []

for (const clave of ORDEN_PUERTA) {
  const d = PUERTA[clave]
  if (!d.opciones.length) continue
  const cat = enBase.get(clave)
  if (!cat) { codigosMalos.push(`${clave}: no está en el catálogo`); continue }
  const porCodigo = new Map(cat.map((o) => [o.value, o.label]))
  for (const [texto, codigo] of d.opciones) {
    if (!porCodigo.has(codigo)) { codigosMalos.push(`${clave} · «${texto}» → '${codigo}'`); continue }
    if (porCodigo.get(codigo) !== texto) {
      textosDistintos.push(`${clave} · '${codigo}': puerta «${texto}» · catálogo «${porCodigo.get(codigo)}»`)
    }
  }
}

if (codigosMalos.length) {
  errores++
  console.error('\n✗ códigos de la puerta que el catálogo no conoce')
  codigosMalos.forEach((l) => console.error(`    ${l}`))
  console.error('  → se guardan igual y el reparto no sabe leerlos')
} else {
  console.log(`✓ puerta (${ORDEN_PUERTA.length} preguntas, códigos en el catálogo)`)
}

// La redacción distinta NO es un fallo: la puerta es más corta a propósito.
// Pero se dice, porque la misma pregunta con dos redacciones se ve.
if (textosDistintos.length) {
  avisos += textosDistintos.length
  console.log('\n· la puerta y el catálogo redactan distinto')
  textosDistintos.forEach((l) => console.log(`    ${l}`))
}

// --- «Catorce preguntas más» ------------------------------------------
//
// La portada promete cuántas preguntas quedan después de apuntarse. Era una
// cifra escrita a mano: decía diez cuando eran catorce, y antes de eso
// diecisiete. Nadie la mira al añadir una pregunta al catálogo.
const CIFRAS = ['Cero', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete',
  'Ocho', 'Nueve', 'Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince',
  'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve', 'Veinte']

// Las que NO se preguntan antes: las cuatro de la puerta y las dos que pide
// la pantalla de datos personales.
const YA_PREGUNTADAS = [...ORDEN_PUERTA, 'nacimiento', 'genero']
const restantes = (catalogo ?? []).filter((q) => !YA_PREGUNTADAS.includes(q.key)).length
const prometidas = landing.match(/'(\w+) preguntas más/)

if (!prometidas) {
  errores++
  console.error('\n✗ la portada ya no dice cuántas preguntas quedan')
} else if (prometidas[1] !== CIFRAS[restantes]) {
  errores++
  console.error(`\n✗ la portada promete «${prometidas[1]} preguntas más» y quedan ${restantes}`)
  console.error(`  → deberia decir «${CIFRAS[restantes] ?? restantes} preguntas más»`)
} else {
  console.log(`✓ «${prometidas[1]} preguntas más» (${restantes} en el catálogo)`)
}

// --- el reloj del navegador no decide qué día es --------------------
//
// `getDay()`, `getDate()`, `getMonth()` y `getHours()` son la hora LOCAL del
// navegador. La cena del sábado 3 a las ocho de la noche de Caracas es
// medianoche del domingo 4 en Madrid, así que a quien esté fuera de Venezuela
// —o a cualquiera que viaje— la pantalla le dice el día equivocado.
//
// Lo encontró el agente de la app comparando su Inicio con el de la web desde
// Madrid. Estaba en cuarenta y seis sitios de diez pantallas. Se usa
// `AroReglas.partesDe(iso, zona)`, que formatea en la zona de la ciudad de esa
// fecha, y la zona viaja en las respuestas como `zonaHoraria`.
//
// Las pantallas de PENDIENTES siguen teniéndolo y están listadas para que no
// se olviden y para que la cuenta no pueda subir. Cuando una se arregle, se
// quita de aquí; si alguna sube, esto falla.
const RELOJ = /\.(getDay|getDate|getMonth|getHours)\(\)/g
const PENDIENTES = {
  // Las que pintan fechas de EVENTOS. Estas dicen el día equivocado fuera de
  // Venezuela y hay que migrarlas: Mi cuenta ya está, estas cuatro no.
  'Aro Club - Operacion.dc.html': 15,
  'Aro Club - Pago.dc.html': 12,
  'Aro Club - Mi mesa.dc.html': 10,
  'Aro Club - Cancelar.dc.html': 5,
  // Estas dos miran fechas de NACIMIENTO, que no llevan hora ni zona: ahí
  // el reloj del navegador no cambia nada y el `Date` vale.
  //
  // Mi perfil estaba aquí por error mío: su `getDate()` no era un
  // nacimiento, era el HISTORIAL DE CENAS, y una cena del 3 a las ocho de
  // la noche se leía «4 de octubre» desde Madrid. Ya está migrada.
  'Aro Club - Datos base.dc.html': 6,
  'Aro Club - Cuestionario.dc.html': 6,
  'Aro Club - Mi perfil.dc.html': 0,
  // El alta de un local: «desde» es un día sin hora.
  'Aro Club - Locales.dc.html': 1,
  // La portada vieja, que sigue viva en /v3.
  'Aro Club - Landing v3.dc.html': 4,
}

const relojes = []
for (const f of pantallas) {
  const texto = fs.readFileSync(
    fileURLToPath(new URL(`../public/${f}`, import.meta.url)), 'utf8')
  // Sin los comentarios: varios explican precisamente por qué ya no se usan.
  const sinComentarios = texto.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const n = (sinComentarios.match(RELOJ) ?? []).length
  const tope = PENDIENTES[f] ?? 0
  if (n > tope) relojes.push(`${f}: ${n}, y el tope es ${tope}`)
}

if (relojes.length) {
  errores++
  console.error('\n✗ pantallas que sacan el día del reloj del navegador')
  relojes.forEach((l) => console.error(`    ${l}`))
  console.error('  → usa AroReglas.partesDe(iso, zona); fuera de Venezuela dicen otro día')
} else {
  const quedan = Object.values(PENDIENTES).reduce((a, b) => a + b, 0)
  console.log(`✓ el reloj del navegador no decide el día (quedan ${quedan} por migrar, listados)`)
}

console.log(`\n${errores} descuadres de código · ${avisos} avisos de texto`)
process.exit(errores ? 1 : 0)
