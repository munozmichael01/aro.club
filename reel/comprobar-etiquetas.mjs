/**
 * Caza etiquetas que se salen del cuadro o se pisan entre ellas.
 *
 * Existe por lo que `comprobar-repetidos.mjs` NO puede ver. Aquel mide si la
 * imagen cambia; una etiqueta mal puesta cambia igual que una bien puesta, así
 * que pasa la medida sin despeinarse. Lo mismo que el solapamiento del titular
 * de `reel-01-ritmo`, que se coló entero.
 *
 * Y hay una razón para que sea justo en esta pieza. Las coordenadas de Design
 * son porcentajes sobre la imagen en su estado FINAL, a `scale(1.00)`, pero la
 * imagen se aleja de 1,14 a 1,00 durante los quince segundos. A 1,14 solo se ve
 * el 87,7% central. Una etiqueta puede estar perfecta en el fotograma final y
 * salirse del cuadro al principio, así que mirar el resultado no sirve: hay que
 * mirar varios momentos.
 *
 *   node reel/comprobar-etiquetas.mjs reel-05-ventanas.html
 *   node reel/comprobar-etiquetas.mjs reel-05-ventanas.html --momentos 1,5,10,15
 *
 * Devuelve 1 si algo se sale o se pisa.
 */
import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const FICHERO = process.argv[2] || 'reel-05-ventanas.html'
const ruta = path.isAbsolute(FICHERO) ? FICHERO : path.join(AQUI, FICHERO)
if (!fs.existsSync(ruta)) { console.error(`No existe: ${ruta}`); process.exit(1) }

const iM = process.argv.indexOf('--momentos')
const MOMENTOS = (iM > 0 ? process.argv[iM + 1].split(',').map(Number) : [1, 5, 10, 15])
  .map((s) => Math.max(0, s * 1000 - 1))

// El margen de seguridad que fija Design: ninguna etiqueta lo cruza por ningún
// lado. No es estética: por debajo de eso Instagram mete su propio cromo.
const MARGEN = +(process.env.MARGEN ?? 6)

const nav = await chromium.launch()
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 } })
await pag.goto('file://' + ruta)
await pag.evaluate(() => document.fonts.ready)
// A tamaño real: medir sobre el lienzo escalado a la ventana daría porcentajes
// buenos y píxeles que no son los del vídeo.
await pag.evaluate(() => {
  const r = document.documentElement.style
  r.setProperty('--s', 1); r.setProperty('--w', '1080px'); r.setProperty('--h', '1920px')
})

let fallos = 0
for (const ms of MOMENTOS) {
  await pag.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t }), ms)

  const filas = await pag.evaluate((margen) => {
    const lim = {
      x0: 1080 * margen / 100, x1: 1080 * (100 - margen) / 100,
      y0: 1920 * margen / 100, y1: 1920 * (100 - margen) / 100,
    }
    const out = []
    document.querySelectorAll('.et').forEach((e, i) => {
      // `getBoundingClientRect` ya trae aplicada la transformación de la
      // cámara, que es justo lo que hay que medir: dónde cae en el vídeo, no
      // dónde está en el papel.
      const r = e.getBoundingClientRect()
      const vis = +getComputedStyle(e).opacity > 0.02
      out.push({
        i, texto: e.textContent, vis,
        x0: +r.left.toFixed(1), x1: +r.right.toFixed(1),
        y0: +r.top.toFixed(1), y1: +r.bottom.toFixed(1),
        fuera: vis && (r.left < lim.x0 || r.right > lim.x1 || r.top < lim.y0 || r.bottom > lim.y1),
      })
    })
    return out
  }, MARGEN)

  const visibles = filas.filter((f) => f.vis)
  const fuera = visibles.filter((f) => f.fuera)
  const pisan = []
  for (let a = 0; a < visibles.length; a++) {
    for (let b = a + 1; b < visibles.length; b++) {
      const A = visibles[a], B = visibles[b]
      if (A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1) pisan.push([A.texto, B.texto])
    }
  }

  console.log(`\n── ${((ms + 1) / 1000).toFixed(1)}s · ${visibles.length} etiquetas en pantalla ──`)
  for (const f of fuera) {
    console.log(`   ✗ SE SALE  «${f.texto}»   x ${f.x0}→${f.x1}   y ${f.y0}→${f.y1}`)
  }
  for (const [a, b] of pisan) console.log(`   ✗ SE PISAN  «${a}» / «${b}»`)
  if (!fuera.length && !pisan.length) {
    console.log(`   ✓ ninguna cruza el margen del ${MARGEN}%, ninguna encima de otra`)
  }
  fallos += fuera.length + pisan.length
}

await nav.close()
console.log(fallos ? `\n${fallos} problemas` : '\nlimpio en los cuatro momentos')
process.exit(fallos ? 1 : 0)
