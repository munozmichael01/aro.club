/**
 * Comprueba que los botones de los catorce correos llevan a algún sitio.
 *
 * Existe por dos fallos del mismo día. `03-mesa-asignada` y `04-recordatorio`
 * apuntaban a `/mi-mesa`, que devuelve 404 en producción: la ruta es `/mesa`.
 * Es el peor botón posible para tenerlo roto —«avísale a la mesa», el que se
 * pulsa cuando vas tarde— y llevaba así desde que se escribieron.
 *
 * Lo otro no se ve ni abriendo el correo: si una variable de enlace llega
 * vacía, el `href` queda en blanco y el botón deja de hacer nada. No falla,
 * no avisa, no sale en ningún registro. Simplemente no pasa nada al pulsar.
 *
 * Y por un tercero, del mismo día y de la misma familia: en
 * `03-mesa-asignada` el `{{#cada gente}}` abría DENTRO de la tabla del avatar
 * y cerraba DESPUÉS del `</tr>` de fuera. Cada comensal a partir del segundo
 * escupía un `</table></td>` de más y dos celdas huérfanas: el avatar se
 * comía el ancho entero y el nombre y el sector se salían de la tarjeta. En
 * un navegador casi se sostiene; Gmail de Android lo reordena y la parte que
 * más se lee del correo —con quién cenas— salía ilegible.
 *
 * Eso no se ve leyendo la plantilla, porque la plantilla está bien indentada.
 * Se ve al REPETIRLA. Por eso esto la pinta con una lista de cinco y cuenta
 * las etiquetas.
 *
 * Mira cuatro cosas:
 *
 *   1. Que ningún `href` esté vacío o sea solo `#`.
 *   2. Que las rutas internas EXISTAN, pidiéndolas de verdad a producción.
 *   3. Que cada variable de enlace la sirva `correos-datos.ts` para el tipo
 *      que usa esa plantilla — si no, ese botón sale en blanco.
 *   4. Que la plantilla PINTADA cierre todas sus etiquetas.
 *
 * Lo tercero se comprueba leyendo el `case` del tipo en `correos-datos.ts`,
 * que es aproximado a propósito: prefiere avisar de más a callarse un botón
 * muerto. Lo definitivo sigue siendo el ensayo en seco, que cuenta los huecos
 * de verdad al armar el correo:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" '<sitio>/api/cron/correos?seco=1'
 *
 *   node scripts/comprobar-correos.mjs [--sitio https://aro.club]
 *
 * Devuelve 1 si hay algún enlace roto.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const SITIO = (args[args.indexOf('--sitio') + 1] || '').startsWith('http')
  ? args[args.indexOf('--sitio') + 1]
  : 'https://aro.club'

const dir = fileURLToPath(new URL('../src/lib/correos-plantillas/', import.meta.url))
const datos = readFileSync(
  fileURLToPath(new URL('../src/lib/correos-datos.ts', import.meta.url)), 'utf8')
const remitente = readFileSync(
  fileURLToPath(new URL('../src/lib/remitente.ts', import.meta.url)), 'utf8')

// --- qué tipo usa cada plantilla --------------------------------------
// Del mapa PLANTILLA, que es donde vive. Escribirlo otra vez aquí sería la
// copia que se queda vieja, que es el fallo que persigue todo este guion.
const tipoDe = new Map()
for (const m of remitente.matchAll(/^\s*([a-z_]+):\s*'([0-9]{2}-[a-z-]+\.html)',/gm)) {
  tipoDe.set(m[2], m[1])
}

/** El cuerpo del `case` de un tipo, para ver qué claves sirve. */
function sirve(tipo, clave) {
  // `base` va en todos, así que primero se mira ahí. Y ojo con la forma
  // corta: en `base`, `enlaceAjustes` se escribe sin `:` porque la variable
  // ya se llama igual. Buscando solo `clave:` daba por muerto el botón de
  // «Ajustes de correo» de los catorce correos, que es de los pocos que hay
  // que tener bien por ley.
  const base = datos.slice(datos.indexOf('const base: Valores = {'), datos.indexOf('switch (fila.kind)'))
  if (new RegExp(`\\b${clave}\\s*[:,\\n]`).test(base)) return true

  const i = datos.indexOf(`case '${tipo}':`)
  if (i < 0) return null
  // Hasta el siguiente `case` de primer nivel.
  const j = datos.indexOf("\n    case '", i + 10)
  const cuerpo = datos.slice(i, j < 0 ? datos.length : j)
  return new RegExp(`\\b${clave}\\s*:`).test(cuerpo)
    // Los `...mesa`, `...pago`: la clave la trae un pedazo entero.
    || /\.\.\.[a-z]/i.test(cuerpo)
}

/**
 * Pinta la plantilla con una lista de cinco y comprueba que el HTML cierra.
 *
 * Solo necesita `{{#cada}}` y `{{#si}}`, que es donde puede romperse la
 * estructura: las sustituciones sueltas no pueden desbalancear nada.
 */
const VACIAS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'area', 'base', 'col', 'source'])

function pintarBloques(html) {
  let s = html
  const bloque = /\{\{#(si|no|cada)\s+([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/
  for (let i = 0; i < 200; i++) {
    const m = s.match(bloque)
    if (!m) break
    const [todo, tipo, , dentro] = m
    // `cada` se repite CINCO veces, que es el tamaño de una mesa: con una
    // sola pasada un bucle mal cerrado parece correcto.
    const out = tipo === 'cada' ? pintarBloques(dentro).repeat(5) : dentro
    s = s.replace(todo, () => out)
  }
  return s
}

function sinCerrar(html) {
  const pila = []
  const fallos = []
  // Los comentarios fuera antes de contar. El de `03-mesa-asignada` explica
  // el fallo citando `</tr>` y `</table></td>`, y sin esto el propio
  // comentario que cuenta la avería la vuelve a dar por rota.
  const limpio = html.replace(/<!--[\s\S]*?-->/g, '')
  for (const m of limpio.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const [, cierra, tag, solo] = m
    const t = tag.toLowerCase()
    if (VACIAS.has(t) || solo) continue
    if (!cierra) { pila.push(t); continue }
    const i = pila.lastIndexOf(t)
    if (i < 0) { fallos.push(`</${t}> sin su apertura`); continue }
    if (i !== pila.length - 1) fallos.push(`</${t}> cierra saltándose ${pila.slice(i + 1).join(', ')}`)
    pila.length = i
  }
  if (pila.length) fallos.push(`quedan sin cerrar: ${pila.join(', ')}`)
  return fallos
}

const rutas = new Map()
const problemas = []
const avisos = []

for (const fichero of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  const html = readFileSync(dir + fichero, 'utf8')
  const tipo = tipoDe.get(fichero)
  if (!tipo) {
    avisos.push(`${fichero}: no lo usa ningún tipo de correo`)
    continue
  }

  const rotas = sinCerrar(pintarBloques(html))
  if (rotas.length) {
    problemas.push(`${fichero}: el HTML no cierra al repetir la lista`
      + rotas.slice(0, 4).map((r) => `\n      → ${r}`).join(''))
  }

  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    const href = m[1].trim()

    if (!href || href === '#') {
      problemas.push(`${fichero}: hay un href vacío`)
      continue
    }

    // `{{{ sitioWeb }}}/loquesea` → una ruta que se puede pedir.
    const interna = href.match(/^\{\{\{\s*sitioWeb\s*\}\}\}(\/[^"]*)$/)
    if (interna) {
      const ruta = interna[1].split('#')[0]
      if (!rutas.has(ruta)) rutas.set(ruta, new Set())
      rutas.get(ruta).add(`${fichero} (${tipo})`)
      continue
    }

    // Un href que es SOLO una variable: depende del dato.
    const variable = href.match(/^\{\{\{?\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}?\}\}$/)
    if (variable) {
      const clave = variable[1]
      const ok = sirve(tipo, clave)
      if (ok === false) {
        problemas.push(
          `${fichero}: el botón usa {{{ ${clave} }}} y correos-datos no la sirve para '${tipo}'`
          + '\n      → el href sale en blanco y el botón no hace nada')
      } else if (ok === null) {
        avisos.push(`${fichero}: '${tipo}' no tiene case propio; {{{ ${clave} }}} sin comprobar`)
      }
      continue
    }

    if (!/^(https?:|mailto:|tel:)/.test(href)) {
      avisos.push(`${fichero}: href que no sé clasificar → ${href}`)
    }
  }
}

// --- que las rutas internas existan de verdad -------------------------
console.log(`Pidiendo ${rutas.size} rutas a ${SITIO}\n`)
for (const [ruta, quien] of [...rutas].sort()) {
  let code = 0
  try {
    const r = await fetch(SITIO + ruta, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
    code = r.status
  } catch {
    code = 0
  }
  const bien = code >= 200 && code < 400
  const lista = [...quien].join(', ')
  console.log(`${bien ? '✓' : '✗'} ${String(code).padEnd(4)} ${ruta.padEnd(16)} ${lista}`)
  if (!bien) {
    problemas.push(`${ruta} responde ${code || 'nada'} · lo usan: ${lista}`)
  }
}

if (avisos.length) {
  console.log('\nAvisos:')
  avisos.forEach((a) => console.log('· ' + a))
}

if (problemas.length) {
  console.error('\nEnlaces rotos:')
  problemas.forEach((p) => console.error('✗ ' + p))
}

console.log(`\n${problemas.length} enlaces rotos · ${avisos.length} avisos`)
process.exit(problemas.length ? 1 : 0)
