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


// --- el mazo del juego, en dos sitios ---------------------------------
//
// Las preguntas viven en `reglas.js` —que es lo que leen la app y la web— y
// el mazo aprobado vive en `app-mobile/JUEGO.md`, que es lo que edita
// Michael. Son dos copias a la fuerza, como las FAQ y su JSON-LD, así que se
// cruzan aquí: cambiar una pregunta en el documento y no en el código no
// falla nada visible, simplemente la mesa lee otra cosa que la aprobada.
//
// Y se comprueba que `preguntasDeRonda` sigue siendo determinista, que es lo
// único que sostiene que seis teléfonos vean lo mismo sin servidor.
{
  const juego = reglas.JUEGO
  const doc = fs.readFileSync(
    fileURLToPath(new URL('../app-mobile/JUEGO.md', import.meta.url)), 'utf8')

  const delDoc = (cabecera) => {
    const ini = doc.indexOf(cabecera)
    if (ini < 0) return null
    const resto = doc.slice(ini + cabecera.length)
    const fin = resto.indexOf('\n## ')
    return [...(fin < 0 ? resto : resto.slice(0, fin)).matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => m[1].trim())
  }

  const cabeceras = [
    '## Ronda 1 · Quién eres hoy',
    '## Ronda 2 · Lo que te mueve',
    '## Ronda 3 · Lo que no se suele decir',
  ]

  const distintas = []
  juego.rondas.forEach((r, i) => {
    const enDoc = delDoc(cabeceras[i])
    if (!enDoc) { distintas.push(`${r.clave}: no encuentro su ronda en JUEGO.md`); return }
    if (enDoc.length !== r.preguntas.length) {
      distintas.push(`${r.clave}: el documento tiene ${enDoc.length} y reglas.js ${r.preguntas.length}`)
      return
    }
    r.preguntas.forEach((q, k) => {
      if (q !== enDoc[k]) distintas.push(`${r.clave} #${k + 1}: «${q}» / el documento dice «${enDoc[k]}»`)
    })
  })

  if (distintas.length) {
    errores++
    console.error('\n✗ el mazo del juego: reglas.js y JUEGO.md no coinciden')
    distintas.slice(0, 6).forEach((d) => console.error('    ' + d))
    console.error('  → la mesa leería preguntas distintas de las aprobadas')
  } else {
    console.log(`✓ el juego (${juego.rondas.length} rondas de ${juego.rondas[0].preguntas.length}, iguales al documento)`)
  }

  // Determinista y bien formado: sin esto, cada teléfono vería otra cosa.
  const mesa = 'comprobador-0000-4000-8000-000000000001'
  const malas = []
  juego.rondas.forEach((r, i) => {
    const a = reglas.preguntasDeRonda(mesa, i)
    const b = reglas.preguntasDeRonda(mesa, r.clave)
    if (a.length !== juego.porRonda) malas.push(`${r.clave}: devuelve ${a.length} y no ${juego.porRonda}`)
    if (JSON.stringify(a) !== JSON.stringify(b)) malas.push(`${r.clave}: por índice y por clave da distinto`)
    if (new Set(a).size !== a.length) malas.push(`${r.clave}: repite una pregunta`)
    if (!a.every((q) => r.preguntas.includes(q))) malas.push(`${r.clave}: saca una pregunta de otra ronda`)
  })
  if (malas.length) {
    errores++
    console.error('\n✗ preguntasDeRonda')
    malas.forEach((m) => console.error('    ' + m))
    console.error('  → los teléfonos de una misma mesa dejarían de ver lo mismo')
  } else {
    console.log('✓ preguntasDeRonda (determinista, por índice y por clave)')
  }
}


// --- los campos cortos se seleccionan al enfocarse ---------------------
//
// Un `<input maxlength="2">` con el día ya puesto IGNORA lo que escribas: el
// cursor queda al final, el tope está lleno y no pasa nada. Se lee como un
// campo bloqueado, y no falla nada que se vea. Lo reportaron los testers de
// la app y en la web pasaba igual, en seis campos de tres pantallas.
//
// Se arregla seleccionando el contenido al entrar, y se vigila aquí porque el
// día que alguien añada otro campo de fecha va a volver a pasar.
{
  const sinSeleccion = []
  const carpeta = fileURLToPath(new URL('../public', import.meta.url))
  for (const f of pantallas) {
    const html = fs.readFileSync(`${carpeta}/${f}`, 'utf8')
    for (const m of html.matchAll(/<input\b[^>]*>/g)) {
      const tag = m[0]
      if (!/maxlength="\d+"/.test(tag)) continue
      if (!/inputmode="numeric"/.test(tag)) continue
      if (/onFocus=/.test(tag)) continue
      const id = (tag.match(/(?:id|aria-label)="([^"]*)"/) || [])[1] ?? tag.slice(0, 48)
      sinSeleccion.push(`${f}: ${id}`)
    }
  }
  if (sinSeleccion.length) {
    errores++
    console.error('\n✗ campos cortos sin seleccionar al enfocar')
    sinSeleccion.forEach((x) => console.error('    ' + x))
    console.error('  → con valor puesto, escribir no hace nada: parece bloqueado')
  } else {
    console.log('✓ los campos cortos se seleccionan al enfocarse')
  }
}

// --- la fecha del pago se escribe como la escribe la gente -------------
//
// El metodo activo —Pago Movil— declara un campo `tipo: 'fecha'`, y de ahi
// `campoDe` saca la regla `fechaPago`, cuyo `filtrar` se aplica a CADA tecla
// en la pantalla de pagar. Un filtro que se equivoca ahi no da error: deja
// una fecha invalida en el campo, el boton se queda bloqueado y la persona
// no tiene nada que tocar para desbloquearlo. Es el sitio mas caro de todos
// para eso, porque es el que aparta el puesto.
//
// Las dos mitades de la regla, que tiran en sentidos contrarios:
//   · con barras tecleadas se rellena el grupo CERRADO —«7/» es el dia 7—,
//   · y una cifra sola NO se rellena nunca, porque «07» en pantalla impide
//     teclear el 15. Ese es el fallo que la app tuvo que quitar del suyo.
{
  const teclear = (texto) => {
    let v = ''
    for (const k of texto) v = reglas.filtrar('fechaPago', v + k)
    return v
  }
  const malas = []
  for (const forma of ['7/8/2026', '07/08/2026', '16082026', '7/08/2026', '1/1/2026']) {
    const salida = teclear(forma)
    if (!reglas.valido('fechaPago', salida)) malas.push(`${forma} -> ${salida}`)
  }
  // Y al reves: lo que no se cerro se queda como esta.
  for (const suelta of ['7', '1', '3']) {
    if (reglas.filtrar('fechaPago', suelta) !== suelta) {
      malas.push(`rellena «${suelta}» sin que nadie cierre el grupo`)
    }
  }
  if (malas.length) {
    errores++
    console.error('\n✗ fechaPago.filtrar')
    malas.forEach((x) => console.error('    ' + x))
    console.error('  → en la pantalla de pagar el campo se queda invalido y el boton bloqueado')
  } else {
    console.log('✓ fechaPago.filtrar (barra cierra el grupo, cifra sola no se rellena)')
  }
}

// --- la séptima copia: las ciudades --------------------------------------
//
// El catálogo vive en `cities` y lo sirve `/api/ciudades`. La landing lleva
// un respaldo escrito a mano por lo mismo que lo llevan las zonas: si la
// petición falla, nadie deja de poder contestar. Un respaldo es una copia, y
// una copia que nadie vigila es la que diverge.
//
// Lo que se compara son los SLUGS, que es lo que se guarda. Los nombres son
// copy y pueden reescribirse.
//
// Y de paso lo que motivó todo esto: que la lista sea de PARES. Eran dos
// listas sueltas —slugs arriba, nombres abajo— emparejadas solo por el
// índice, el mismo descuadre silencioso que el cuestionario tuvo que
// desmontar: se archiva a la gente en la ciudad equivocada y el servidor lo
// acepta, porque el slug existe.
{
  const fallos = []
  const bloqueCiudades = landing.match(/CIUDADES = \[([\s\S]*?)\];/)

  if (!bloqueCiudades) {
    fallos.push('no encuentro `CIUDADES` en la landing')
  } else {
    const pares = [...bloqueCiudades[1].matchAll(/\['([^']+)',\s*'([^']+)'\]/g)]
    const sueltos = [...bloqueCiudades[1].matchAll(/'([^']+)'/g)].length
    if (pares.length * 2 !== sueltos) {
      fallos.push('`CIUDADES` tiene textos fuera de un par: vuelve a ser dos listas por índice')
    }

    const { data: enBaseCiudades } = await admin.from('cities').select('slug').neq('slug', 'caracas')
    const base = new Set((enBaseCiudades ?? []).map((c) => c.slug))
    const pantalla = new Set(pares.map((m) => m[2]))

    for (const sl of pantalla) if (!base.has(sl)) fallos.push(`la landing ofrece «${sl}», que no está en \`cities\``)
    for (const sl of base) if (!pantalla.has(sl)) fallos.push(`\`cities\` tiene «${sl}» y el respaldo de la landing no`)
  }

  if (fallos.length) {
    errores++
    console.error('\n✗ ciudades')
    fallos.forEach((x) => console.error('    ' + x))
    console.error('  → el respaldo de la landing y la tabla `cities` no dicen lo mismo')
  } else {
    console.log('✓ ciudades (pares, y el respaldo cuadra con `cities`)')
  }
}

// --- las rutas que abren la app, en dos repositorios -------------------
//
// `src/lib/enlaces-app.ts` las publica en `/.well-known/`, que es lo que hace
// que el telefono acepte abrir la app. `app-mobile/src/enlaces.ts` decide a
// que pantalla va cada una. Son la misma lista y no se pueden juntar: una la
// sirve el servidor y la otra se compila dentro de la app.
//
// Y los dos descuadres son silenciosos. Una ruta aqui y no alli: el telefono
// abre la app y la app no sabe que enseñar. Una ruta alli y no aqui: el
// enlace abre el navegador y nadie se entera de que debia abrir la app.
{
  const fallos = []
  const leer = (ruta, patron, nombre) => {
    let texto
    try {
      texto = fs.readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8')
    } catch {
      fallos.push(`no encuentro ${nombre}`)
      return null
    }
    const bloque = texto.match(patron)
    if (!bloque) { fallos.push(`no encuentro la lista en ${nombre}`); return null }
    return [...bloque[1].matchAll(/'(\/[a-z-]*)'/g)].map((m) => m[1])
  }

  const web = leer('../src/lib/enlaces-app.ts',
    /RUTAS_QUE_ABREN_LA_APP = \[([\s\S]*?)\]/, 'enlaces-app.ts')
  // En la app son pares `'/ruta': '/pantalla'`, asi que se cogen las CLAVES:
  // las de la izquierda de cada linea.
  const app = (() => {
    let texto
    try {
      texto = fs.readFileSync(fileURLToPath(new URL('../app-mobile/src/enlaces.ts', import.meta.url)), 'utf8')
    } catch { return null }   // sin la app al lado, no se comprueba y no se falla
    const bloque = texto.match(/RUTAS_DE_LA_WEB: Record<string, string> = \{([\s\S]*?)\n\}/)
    if (!bloque) { fallos.push('no encuentro RUTAS_DE_LA_WEB en la app'); return null }
    return [...bloque[1].matchAll(/^\s*'(\/[a-z-]*)':/gm)].map((m) => m[1])
  })()

  if (web && app) {
    for (const r of web) if (!app.includes(r)) fallos.push(`la web publica «${r}» y la app no la reparte`)
    for (const r of app) if (!web.includes(r)) fallos.push(`la app reparte «${r}» y la web no la publica`)
  }

  if (fallos.length) {
    errores++
    console.error('\n✗ rutas que abren la app')
    fallos.forEach((x) => console.error('    ' + x))
    console.error('  → `/.well-known/` y `app-mobile/src/enlaces.ts` no dicen lo mismo')
  } else if (app) {
    console.log(`✓ rutas que abren la app (${web.length}, web y app iguales)`)
  } else {
    console.log('✓ rutas que abren la app (sin app-mobile al lado, no se cruza)')
  }
}

// --- lo que el panel manda y lo que la ruta espera ---------------------
//
// Dos acciones del panel de operacion llevaban rotas sin que nadie lo
// supiera: cerrar un reporte mandaba `id` donde la ruta espera
// `incidenciaId`, y despublicar una mesa mandaba `eventoId` donde espera
// `corridaId`. Las dos devolvian 400 y las dos en silencio, porque el panel
// no pintaba el error — y una de ellas era «Sacar del club».
//
// Esto no comprueba tipos ni ramas: comprueba que cada NOMBRE de campo que
// el panel manda aparezca en el fichero de su ruta. Es un heuristico y
// basta: los dos fallos reales eran nombres que la ruta no menciona en
// ninguna parte.
{
  const fallos = []
  const panel = fs.readFileSync(
    fileURLToPath(new URL('../public/Aro Club - Operacion.dc.html', import.meta.url)), 'utf8')

  // `this.mandar('/api/operacion/X', { a: 1, b: 2 })` con cuerpo literal.
  const llamadas = [...panel.matchAll(/this\.mandar\(\s*'\/api\/operacion\/([a-z-]+)'\s*,\s*\{([^}]*)\}/g)]

  // Y las que pasan una VARIABLE, que antes se saltaban en silencio. Eran
  // cuatro —publicar, abrir fecha, mover a alguien a mano— y justo las que
  // arman el cuerpo en varios pasos, que es donde es mas facil escribir un
  // nombre que la ruta no conoce. Se busca el `const X = { … }` de antes de
  // la llamada y los `X.campo = …` que le cuelgan despues.
  for (const m of panel.matchAll(/this\.mandar\(\s*'\/api\/operacion\/([a-z-]+)'\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[,)]/g)) {
    const [todo, ruta, nombre] = m
    const antes = panel.slice(Math.max(0, m.index - 1400), m.index)
    const decl = [...antes.matchAll(new RegExp(`const\\s+${nombre}\\s*=\\s*\\{([^}]*)\\}`, 'g'))].pop()
    if (!decl) continue   // no es un cuerpo armado aqui: no hay nada que cruzar
    // Y solo si es EL cuerpo de esta llamada. `cuerpo` es el nombre de media
    // docena de metodos distintos: si entre la declaracion y la llamada hay
    // otro `mandar`, esa declaracion era del metodo de arriba. Sin esto, el
    // `cuerpo.cargo` de mover a alguien se contaba como campo de abrir fecha.
    const entre = antes.slice(decl.index + decl[0].length)
    if (entre.includes('this.mandar(')) continue
    const sueltos = [...entre.matchAll(new RegExp(`${nombre}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*=[^=]`, 'g'))]
      .map((x) => x[1] + ':').join(' ')
    llamadas.push([todo, ruta, decl[1] + ' ' + sueltos])
  }

  // Y las que pasan el cuerpo por una funcion intermedia, que es justo donde
  // estaba el fallo de los reportes: `resolverIncidencia(cuerpo)` reenvia a
  // `/api/operacion/incidencias`, asi que mirar solo las llamadas directas lo
  // dejaba fuera. Se saca el mapa envoltorio → ruta del propio fichero.
  const envoltorios = new Map()
  for (const m of panel.matchAll(
    /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*cuerpo\s*\)\s*\{[\s\S]{0,120}?this\.mandar\(\s*'\/api\/operacion\/([a-z-]+)'/gm)) {
    envoltorios.set(m[1], m[2])
  }
  for (const [nombre, ruta] of envoltorios) {
    for (const m of panel.matchAll(new RegExp(`this\\.${nombre}\\(\\s*\\{([^}]*)\\}`, 'g'))) {
      llamadas.push([m[0], ruta, m[1]])
    }
  }

  for (const m of llamadas) {
    const ruta = m[1]
    // Con dos puntos —`eventoId: f.id`— y ABREVIADAS, `{ accion, correo }`,
    // que no los llevan. Sin las segundas, mover a alguien a mano mandaba
    // tres campos y solo se miraba uno: `correo` no estaba en el esquema de
    // su ruta y esto decia que todo cuadraba.
    const campos = [...m[2].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)].map((c) => c[1])
    for (const trozo of m[2].split(',')) {
      const solo = trozo.trim()
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(solo)) campos.push(solo)
    }
    let fuente
    try {
      fuente = fs.readFileSync(
        fileURLToPath(new URL(`../src/app/api/operacion/${ruta}/route.ts`, import.meta.url)), 'utf8')
    } catch {
      fallos.push(`el panel llama a /api/operacion/${ruta} y esa ruta no existe`)
      continue
    }
    // Solo los nombres que declara un `z.object`, no el fichero entero.
    // Mirando el fichero, `id` pasaba siempre —aparece en `actor.id`, en un
    // `.eq('id', …)`— y ese era justo uno de los dos fallos reales.
    //
    // El cuerpo de cada `z.object({ … })` se recorta CONTANDO LLAVES, no con
    // un `[\s\S]*?` hasta el primer `})`. Un mensaje propio dentro del
    // esquema —`z.enum([…], { error: '…' })`— tiene un `})` en medio, y el
    // recorte perezoso se paraba ahi: `cancelar-fecha` declara `motivo` tres
    // lineas mas abajo y esto juraba que no.
    const aceptados = new Set()
    for (const inicio of [...fuente.matchAll(/z\.object\(\{/g)].map((x) => x.index)) {
      let i = inicio + 'z.object({'.length
      let hondo = 1
      while (i < fuente.length && hondo > 0) {
        if (fuente[i] === '{') hondo++
        else if (fuente[i] === '}') hondo--
        i++
      }
      const dentro = fuente.slice(inicio + 'z.object({'.length, i - 1)
      for (const k of dentro.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm)) aceptados.add(k[1])
    }
    if (!aceptados.size) continue   // ruta sin zod: no hay nada que cruzar

    for (const campo of campos) {
      if (!aceptados.has(campo)) {
        fallos.push(`${ruta}: el panel manda «${campo}» y su esquema no lo declara`)
      }
    }
  }

  if (fallos.length) {
    errores++
    console.error('\n✗ lo que el panel manda')
    fallos.forEach((x) => console.error('    ' + x))
    console.error('  → el zod devuelve 400 y la accion no hace nada')
  } else {
    console.log(`✓ lo que el panel manda (${llamadas.length} llamadas, todas con campos que su ruta conoce)`)
  }
}

console.log(`\n${errores} descuadres de código · ${avisos} avisos de texto`)
process.exit(errores ? 1 : 0)
