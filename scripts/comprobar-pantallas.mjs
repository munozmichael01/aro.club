/**
 * Vigila las diecinueve pantallas, que es donde nada miraba.
 *
 * `src/` tiene `tsc` y eslint encima. Las pantallas son ficheros estáticos:
 * Next ni las compila ni las mira, no hay tests, y ahí viven unas quince mil
 * líneas — la mayoría lógica, no maquetación. Todo lo que se rompió en
 * silencio esta semana salió de ahí.
 *
 * Lo que comprueba, y de dónde sale cada comprobación:
 *
 *  1. LAS PIEZAS COMUNES. Que cada pantalla cargue `errores.js` y `gtm.js`,
 *     y en ese orden. El contenido vive una vez; lo que se copia diecinueve
 *     veces es la referencia, y la pantalla veinte nace sin ella. Ya pasó con
 *     el favicon: se quedó una fuera y hubo que volver.
 *
 *  2. QUE EL HTML CIERRE. Un `</sc-if>` cerrado con dos `div` abiertos dejó
 *     el pie del cuestionario —Atrás y Continuar— sin pintarse durante
 *     semanas. El navegador reanida en silencio: no hay excepción, no hay
 *     nada en consola, el capturador de errores no tiene qué avisar. Solo se
 *     ve contando etiquetas.
 *
 *  3. QUE CIERRE TAMBIÉN AL REPETIR. Un `{{#cada}}` a caballo de una tabla se
 *     lee perfecto y escupe basura a partir del segundo elemento. Pasó en el
 *     correo de la mesa. Por eso las listas se pintan con cinco.
 *
 *  4. QUE NO QUEDE NINGÚN `{{ }}` SUELTO. Una llave sin cerrar sale impresa
 *     en la pantalla tal cual.
 *
 *  5. QUE LOS ENLACES INTERNOS EXISTAN. `/mi-mesa` devolvía 404 en el correo
 *     de la mesa y en «Cómo llegar» de Mi cuenta. La ruta era `/mesa`.
 *
 *   node scripts/comprobar-pantallas.mjs            las rutas contra el mapa
 *   node scripts/comprobar-pantallas.mjs --sitio X  y además pidiéndolas
 *
 * Devuelve 1 si algo falla, para poder ponerlo en CI. Y va en CI y no solo
 * antes de un push a propósito: si depende de que alguien se acuerde, es el
 * mismo modo de fallo que viene a quitar.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const iSitio = args.indexOf('--sitio')
const SITIO = iSitio >= 0 && (args[iSitio + 1] || '').startsWith('http') ? args[iSitio + 1] : null

const dir = fileURLToPath(new URL('../public/', import.meta.url))
const config = readFileSync(fileURLToPath(new URL('../next.config.ts', import.meta.url)), 'utf8')

/** Las piezas que TODA pantalla tiene que cargar, en este orden. */
const COMUNES = ['./errores.js', './gtm.js']

/** Etiquetas que no cierran. */
const VACIAS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'area', 'base', 'col', 'source', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'stop', 'use', 'ellipse'])

/** Las rutas limpias que declara `next.config.ts`, que son las que existen. */
const RUTAS = new Set(
  [...config.matchAll(/\['(\/[^']*)',\s*'\/[^']*'\]/g)].map((m) => m[1]),
)
// Las rutas que sirve Next por fichero, no por reescritura.
for (const extra of ['/estado']) RUTAS.add(extra)

/**
 * Y las rutas de API, que no son reescrituras: las sirve el App Router por
 * fichero. Se comprueban igual —que exista su `route.ts`— porque un enlace a
 * una API que no existe rompe lo mismo que uno a una pantalla que no existe.
 */
function existeApi(ruta) {
  const rel = ruta.replace(/^\/api\//, '')
  try {
    readFileSync(fileURLToPath(new URL(`../src/app/api/${rel}/route.ts`, import.meta.url)))
    return true
  } catch {
    return false
  }
}

const problemas = []
const avisos = []

/**
 * Pinta los bloques del runtime para poder contar etiquetas sobre el
 * resultado.
 *
 * Se resuelve SIEMPRE el bloque más interno primero —de ahí el `(?!<sc-)` en
 * el contenido— y sin recursión. Con `[\s\S]*?` a secas, un `sc-for` anidado
 * casa con el `</sc-for>` del de dentro y el trozo queda cortado por la
 * mitad; y recorriendo el fichero entero en cada vuelta, Operación —223 KB,
 * 50 bucles y 65 condicionales— no termina.
 *
 * `sc-for` se repite DOS veces, no cinco: el fallo de un bucle mal cerrado
 * aparece en la segunda repetición, y cada vuelta de más multiplica el
 * tamaño en los anidados.
 */
function pintarBloques(html) {
  let s = html
  const bloque = /<sc-(if|for)\b[^>]*>((?:(?!<sc-)[\s\S])*?)<\/sc-\1>/
  for (let i = 0; i < 2000; i++) {
    const m = s.match(bloque)
    if (!m) break
    const [todo, tipo, dentro] = m
    s = s.replace(todo, () => (tipo === 'for' ? dentro + dentro : dentro))
  }
  return s
}

function sinCerrar(html) {
  const limpio = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '')
  const pila = []
  const fallos = []
  for (const m of limpio.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const [, cierra, tag, solo] = m
    const t = tag.toLowerCase()
    if (VACIAS.has(t) || solo) continue
    if (!cierra) { pila.push(t); continue }
    const i = pila.lastIndexOf(t)
    if (i < 0) { fallos.push(`</${t}> sin su apertura`); continue }
    if (i !== pila.length - 1) fallos.push(`</${t}> cierra saltándose ${pila.slice(i + 1).join(', ')}`)
    pila.length = i
  }
  if (pila.length) fallos.push(`quedan sin cerrar: ${pila.slice(0, 5).join(', ')}`)
  return fallos
}

/**
 * Cada `{{ nombre }}` del markup tiene que existir en el render.
 *
 * Es la comprobación que faltaba, y la que más ha costado no tener. El
 * runtime pinta un `{{ }}` que no resuelve como CADENA VACÍA —`support.js`:
 * `v == null ? "" : String(v)`— así que no falla, no avisa, y el síntoma
 * depende de dónde estuviera la llave:
 *
 *   - en el `value` de un campo, el campo se borra en cada tecla. Es el
 *     «Crea una contraseña» que no admitía nada: `clave2` estaba en el
 *     render y `clave` no.
 *   - en un `onClick`, el botón no hace nada. Es «Repasar mis respuestas»,
 *     cuyo `reiniciar` aparece una sola vez en todo el fichero: en el
 *     `onClick`.
 *
 * El mismo fallo con dos síntomas que no se parecen en nada, ninguno con
 * error, y los dos encontrados usando la pantalla y no leyéndola.
 *
 * Las claves se leen POR LÍNEAS y no contando llaves a propósito: un regex
 * como `/(\d{3})(?=\d)/` abre una llave que no cierra y descuadra cualquier
 * contador. El objeto de `renderVals()` tiene una clave por línea a sangría
 * fija, que es más simple y no se rompe.
 */
const LITERAL = /^(true|false|null|-?\d+(\.\d+)?|'[^']*'|"[^"]*")$/

/**
 * Parte una linea por las comas de NIVEL CERO.
 *
 * Sin esto, `body: JSON.stringify({ correo, token, clave: clave })` aportaba
 * cuatro claves en vez de una, y una de ellas era `clave` — que es como el
 * comprobador daba por buena la pantalla con el campo de contraseña muerto.
 * Las comillas se vacian antes: una coma dentro de un `font:` de CSS no
 * separa nada.
 */
function porComas(linea) {
  const s = linea.replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""')
  const trozos = []
  let hondo = 0, desde = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(' || c === '[' || c === '{') hondo++
    else if (c === ')' || c === ']' || c === '}') hondo--
    else if (c === ',' && hondo === 0) { trozos.push(s.slice(desde, i).trim()); desde = i + 1 }
  }
  trozos.push(s.slice(desde).trim())
  return trozos.filter(Boolean)
}

/**
 * Las claves que `renderVals()` pone a disposicion del markup.
 *
 * Las diecinueve pantallas componen las props de cuatro maneras distintas
 * —devolviendo un objeto, con `return` anidados, juntando un `const marco =
 * {...}`, y con `Object.assign(marco, {...})`— y enumerarlas fue una carrera
 * que perdi cuatro veces. La regla que las cubre todas es mas tonta: vale
 * cualquier linea que ABRA un objeto al final.
 *
 * Lo que queda fuera, que es lo unico que importa dejar fuera: el objeto que
 * viaja como ARGUMENTO en una sola linea. En `Datos base` hay un
 * `JSON.stringify({ correo, token, clave: clave })` dentro de un manejador, y
 * contar ese `clave:` como clave del render era justo lo que impedia cazar el
 * campo de contraseña congelado — el fallo para el que existe esto. Lo
 * descubri reintroduciendolo a proposito, no leyendolo.
 */
function clavesDelRender(guiones) {
  const lineas = guiones.split('\n')
  const i = lineas.findIndex((l) => /^\s*renderVals\s*\(\s*\)\s*\{/.test(l))
  if (i < 0) return null

  const claves = new Set()
  for (let k = i + 1; k < lineas.length; k++) {
    const m = lineas[k].match(/^(\s*).*\{\s*$/)
    if (!m) continue
    const dentro = m[1]
    for (let j = k + 1; j < lineas.length; j++) {
      const sangria = lineas[j].match(/^\s*/)[0].length
      // El cierre, a la sangria de quien abrio: `};`, `}`, `});`, `}),`.
      if (lineas[j].trim().startsWith('}') && sangria === dentro.length) break
      if (sangria !== dentro.length + 2) continue
      for (const trozo of porComas(lineas[j].slice(dentro.length + 2))) {
        // La clave va DELANTE. `esListo: f === 5, esFallo: f === 6` son dos
        // trozos y por tanto dos claves; `body: JSON.stringify({ ..., clave:
        // clave })` es uno solo, y su clave es `body` — el `clave:` de dentro
        // es un dato que viaja al servidor, no algo que el markup pueda usar.
        const m2 = trozo.match(/^([A-Za-z_$][\w$]*)\s*:/)
        if (m2) { claves.add(m2[1]); continue }
        // Abreviada: el trozo es un nombre a secas.
        const m3 = trozo.match(/^([A-Za-z_$][\w$]*)$/)
        if (m3) claves.add(m3[1])
      }
    }
  }
  return claves
}

function llavesHuerfanas(html) {
  const guiones = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n')
  const claves = clavesDelRender(guiones)
  // Sin `renderVals` no hay contrato que comprobar: es una pantalla estatica.
  if (!claves) return []

  const markup = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  // Los nombres que abre un `sc-for`: `as="p"` hace validos `p` y `p.loQueSea`.
  const alcance = new Set([...html.matchAll(/\bas="([A-Za-z_$][\w$]*)"/g)].map((m) => m[1]))

  const faltan = new Map()
  for (const m of markup.matchAll(/\{\{\{?\s*([^}]+?)\s*\}?\}\}/g)) {
    const expr = m[1].trim()
    if (LITERAL.test(expr)) continue
    // Solo nombres simples y rutas con punto. Una llamada o un operador no
    // se juzgan: no sabria hacerlo sin equivocarme, y un falso positivo se
    // ignora a la semana.
    if (!/^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(expr)) continue
    const raiz = expr.split('.')[0]
    if (alcance.has(raiz) || claves.has(raiz)) continue
    if (!faltan.has(raiz)) faltan.set(raiz, expr)
  }
  return [...faltan.values()]
}

const pantallas = readdirSync(dir).filter((f) => f.endsWith('.dc.html')).sort()
const rutasUsadas = new Map()

/**
 * Las pantallas que no sirve ninguna ruta.
 *
 * No es un error —tener una de repuesto es legítimo— pero sí un aviso: es
 * código que nadie ve y que nadie va a mantener. `Aro Club - Clave.dc.html`
 * lleva así desde que `/clave` pasó a servir `Sin sesion.dc.html`, y le
 * faltaba el `</body>` sin que importara, porque no lo abre nadie.
 */
for (const nombre of pantallas) {
  if (!config.includes(`/${nombre}`)) avisos.push(`${nombre}: ninguna ruta la sirve`)
}

for (const nombre of pantallas) {
  const html = readFileSync(dir + nombre, 'utf8')
  const di = (t) => problemas.push(`${nombre}: ${t}`)

  // --- 1 · las piezas comunes -----------------------------------------
  const pos = COMUNES.map((c) => html.indexOf(`src="${c}"`))
  COMUNES.forEach((c, i) => { if (pos[i] < 0) di(`no carga ${c}`) })
  if (pos[0] >= 0 && pos[1] >= 0 && pos[0] > pos[1]) {
    di('carga gtm.js ANTES que errores.js — el capturador va primero, o no captura lo que falle antes')
  }

  // --- 2 · que el HTML cierre EN CRUDO --------------------------------
  //
  // Con `sc-if` y `sc-for` contados como etiquetas normales. Esto es lo que
  // caza el CRUCE —un `</sc-if>` cerrado con un `div` todavía abierto— y es
  // el fallo que dejó el pie del cuestionario sin pintarse durante semanas.
  //
  // Y tiene que ir en crudo a la fuerza: al pintar los bloques, el `sc-if`
  // desaparece y los `div` cuadran solos. Pintar ESCONDE este fallo. Lo
  // comprobé volviéndolo a introducir a mano: la pasada sobre lo pintado
  // decía que todo estaba bien.
  const cruzadas = sinCerrar(html)
  if (cruzadas.length) di(`el HTML no cierra:\n      → ${cruzadas.slice(0, 4).join('\n      → ')}`)

  // --- 3 · y que cierre también AL REPETIR ----------------------------
  //
  // Un `sc-for` cuyo contenido abre y cierra a caballo se lee perfecto y
  // escupe basura a partir del segundo elemento. Eso solo se ve repitiendo.
  const alRepetir = sinCerrar(pintarBloques(html))
  if (alRepetir.length && !cruzadas.length) {
    di(`el HTML no cierra al repetir una lista:\n      → ${alRepetir.slice(0, 4).join('\n      → ')}`)
  }

  // --- 4 · llaves sueltas ---------------------------------------------
  // Una `{{` sin su `}}` en la misma línea. El runtime no sustituye y sale
  // impresa tal cual.
  for (const l of html.split('\n')) {
    const abre = (l.match(/\{\{/g) || []).length
    const cierra = (l.match(/\}\}/g) || []).length
    if (abre !== cierra) { di(`llave sin cerrar: ${l.trim().slice(0, 70)}`); break }
  }

  // --- 6 · que cada `{{ }}` exista en el render -----------------------
  const huerfanas = llavesHuerfanas(html)
  if (huerfanas.length) {
    di(`llaves que el render no define, se pintan vacias:\n      -> ${huerfanas.join('\n      -> ')}`)
  }

  // --- 5 · los enlaces internos ---------------------------------------
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const r = m[1].replace(/\/$/, '') || '/'
    if (r.startsWith('//')) { di(`enlace raro: ${m[1]}`); continue }
    // Ficheros de `public/` —iconos, imágenes— no son rutas.
    if (/\.[a-z0-9]{2,4}$/i.test(r)) continue
    if (!rutasUsadas.has(r)) rutasUsadas.set(r, new Set())
    rutasUsadas.get(r).add(nombre)
  }
}

console.log(`${pantallas.length} pantallas · ${rutasUsadas.size} rutas internas distintas\n`)

for (const [ruta, quien] of [...rutasUsadas].sort()) {
  const declarada = ruta.startsWith('/api/') ? existeApi(ruta) : (RUTAS.has(ruta) || ruta === '/')
  let http = ''
  if (SITIO) {
    try {
      const r = await fetch(SITIO + ruta, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
      http = ` · ${r.status}`
      if (r.status >= 400) problemas.push(`${ruta} responde ${r.status} · la usan ${[...quien].join(', ')}`)
    } catch { http = ' · sin respuesta' }
  }
  if (!declarada) {
    problemas.push(
      `${ruta} no existe · la usan ${[...quien].join(', ')}`
      + (ruta.startsWith('/api/') ? ' (no hay src/app' + ruta + '/route.ts)' : ' (no está en next.config.ts)'),
    )
  }
  console.log(`${declarada ? '✓' : '✗'} ${ruta.padEnd(18)}${http}`)
}

if (avisos.length) {
  console.log('\nAvisos:')
  avisos.forEach((a) => console.log('· ' + a))
}
if (problemas.length) {
  console.error('\nProblemas:')
  problemas.forEach((p) => console.error('✗ ' + p))
}
console.log(`\n${problemas.length} problemas`)
process.exit(problemas.length ? 1 : 0)
