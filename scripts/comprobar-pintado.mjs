/**
 * Que cada pantalla SE PINTE, no solo que cierre bien.
 *
 * Michael, 17-10, después de que Mi mesa estuviera media hora en blanco en
 * producción: «lo de hoy no lo caza el comprobador porque mira que el HTML
 * cierre bien, no que la pantalla se pinte. Añade una pasada que abra cada
 * .dc.html en Chrome sin ventana y falle si quedan llaves {{ }} en el texto».
 *
 * Y tenía razón: el fallo de hoy era markup que cierra, parsea y no pinta.
 * El comprobador decía 0 problemas y la pantalla no existía. Lo único que lo
 * caza es abrirla.
 *
 * No hace falta simular las rutas: las pantallas traen su propio modo sin
 * datos —`hint-placeholder-val`, `hint-placeholder-count`— que es justo para
 * esto. Si el componente revienta, no pinta nada y las llaves se quedan
 * crudas en el DOM, que es la firma exacta del fallo de hoy.
 *
 *   node scripts/comprobar-pintado.mjs            todas
 *   node scripts/comprobar-pintado.mjs "Mi mesa"  solo las que coincidan
 */
import { createServer } from 'node:http'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../public/', import.meta.url))
const filtro = process.argv[2] ? process.argv[2].toLowerCase() : null

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
}

// Un servidor de `public/` y nada más: lo que no esté, 404, que es lo que
// pasa en producción con las fotos de los locales.
const servidor = createServer((req, res) => {
  const ruta = decodeURIComponent((req.url || '/').split('?')[0])
  const fichero = join(dir, ruta)
  if (!fichero.startsWith(dir) || !existsSync(fichero) || statSync(fichero).isDirectory()) {
    res.writeHead(404).end('no')
    return
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(fichero)] ?? 'application/octet-stream' })
  res.end(readFileSync(fichero))
})

await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo))
const puerto = servidor.address().port

const { PANTALLAS } = await import('./pintado/datos.mjs')
/**
 * Lo que todavía no se puede mirar así, y por qué.
 *
 * Sale como aviso y no como fallo: un comprobador que siempre falla deja de
 * leerse, y un hueco escondido es peor que uno anotado. Lo que NO vale es
 * meter aquí una pantalla para que la pasada quede en verde.
 */
const PENDIENTES = {
  'Aro Club - Datos base.dc.html':
    'servida suelta no pinta y en aro.club/datos sí: le falta algo del entorno real (ruta limpia o token de lead). Sin entender qué, no la doy por mirada.',
}

const { chromium } = await import('playwright')
const navegador = await chromium.launch()
const problemas = []
const avisos = []

const pantallas = readdirSync(dir)
  .filter((f) => f.endsWith('.dc.html'))
  .filter((f) => !filtro || f.toLowerCase().includes(filtro))
  .sort()

for (const nombre of pantallas) {
 // Una pasada por cada estado de esa pantalla. Las que no tienen datos
 // simulados van una vez, con su modo sin datos.
 for (const caso of PANTALLAS[nombre] ?? [{ caso: null, rutas: {} }]) {
  const quien = caso.caso ? `${nombre} · ${caso.caso}` : nombre
  const pagina = await navegador.newPage()
  const fallos = []
  pagina.on('pageerror', (e) => fallos.push(String(e.message).split('\n')[0]))

  // Las rutas, simuladas: la pantalla pide y se le contesta lo que diría el
  // servidor en ese estado. Lo que no esté en la lista responde 404, que es
  // lo que de verdad pasa cuando no hay sesión.
  await pagina.route('**/api/**', (via) => {
    const ruta = new URL(via.request().url()).pathname
    const cuerpo = (caso.rutas ?? {})[ruta]
    if (cuerpo === undefined) return via.fulfill({ status: 404, body: '{}' })
    return via.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) })
  })

  try {
    await pagina.goto(`http://127.0.0.1:${puerto}/${encodeURIComponent(nombre)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    // Se le da tiempo a pintar, y se corta en cuanto no queden llaves: lo
    // normal es medio segundo, y esperar fijo haría la pasada eterna.
    await pagina
      .waitForFunction(() => !/\{\{/.test(document.body.innerText), null, { timeout: 6000 })
      .catch(() => {})

    const { texto, crudas, reventada } = await pagina.evaluate(() => {
      const t = document.body.innerText || ''
      return {
        texto: t.trim().length,
        crudas: (t.match(/\{\{[^}]{0,40}\}\}/g) || []).slice(0, 3),
        // El runtime caza el fallo y pinta el mensaje en la pagina, asi que
        // la pantalla no se queda en blanco ni deja llaves: se queda en una
        // linea de error que pasaba por buena. Me paso con «AroReglas is not
        // defined» en el panel, usando en Operacion algo que esa pantalla no
        // carga.
        reventada: (t.match(/renderVals\(\):[^\n]{0,80}|is not defined|is not a function/) || [])[0] || null,
      }
    })

    if (reventada) problemas.push(`${quien}: la pantalla pinta un error en vez de su contenido → ${reventada}`)

    // Lo que hay en pantalla cuando falla, para no tener que adivinarlo.
    if (process.env.PINTADO_VERBOSO) {
      console.log("   ---", quien, "->", (await pagina.evaluate(() => document.body.innerHTML.slice(0, 400))).replace(/\s+/g, " "))
    }

    if (crudas.length) {
      problemas.push(`${quien}: quedan llaves sin pintar → ${crudas.join(' · ')}`)
    } else if (texto < 40) {
      const porque = PENDIENTES[nombre]
      if (porque) avisos.push(`${quien}: ${porque}`)
      else problemas.push(`${quien}: la pantalla se queda en blanco (${texto} caracteres de texto)`)
    }
    if (fallos.length) {
      problemas.push(`${quien}: el guion revienta al pintar → ${fallos[0]}`)
    }
    if (!crudas.length && texto >= 40 && !fallos.length) console.log(`✓ ${quien}`)
  } catch (e) {
    problemas.push(`${quien}: no se pudo abrir → ${String(e.message).split('\n')[0]}`)
  }

  await pagina.close()
 }
}

await navegador.close()
servidor.close()

if (avisos.length) {
  console.log('\nSin mirar todavía:')
  avisos.forEach((a) => console.log('· ' + a))
}
if (problemas.length) {
  console.error('\nProblemas:')
  problemas.forEach((p) => console.error('✗ ' + p))
}
console.log(`\n${problemas.length} problemas de pintado`)
process.exit(problemas.length ? 1 : 0)
