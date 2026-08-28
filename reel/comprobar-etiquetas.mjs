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
 * Devuelve 1 si algo cae bajo el cromo de la app, se sale del cuadro o pisa a
 * otra etiqueta. Los avisos laterales no tumban: ver MARGEN_V y MARGEN_H.
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

// LA ZONA SEGURA. Dos números distintos porque son dos problemas distintos.
//
// Arriba y abajo, 12%. No es tipografía: es donde Instagram y TikTok ponen su
// PROPIO cromo —la cabecera arriba; el pie de foto, el nombre de cuenta y la
// música abajo—. Una etiqueta a 26 px del borde superior no queda apretada,
// queda DEBAJO de la interfaz de la app. Y eso no se ve en el MP4: se ve al
// publicar, que es tarde. Por eso este listón manda y no se rebaja, y por eso
// es el que decide el código de salida.
//
// A los lados, 6%: el margen tipográfico de Design. Ahí no hay cromo de nadie
// encima, así que cruzarlo aprieta la composición pero no esconde nada. Se
// avisa y no se tumba: la pieza A lleva «Escribiéndole a la ex» cruzando por
// la izquierda a 35 px, aceptado a propósito.
const MARGEN_V = +(process.env.MARGEN_V ?? 12)
const MARGEN_H = +(process.env.MARGEN_H ?? 6)

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

  const filas = await pag.evaluate(({ mv, mh }) => {
    const lim = {
      x0: 1080 * mh / 100, x1: 1080 * (100 - mh) / 100,
      y0: 1920 * mv / 100, y1: 1920 * (100 - mv) / 100,
    }
    const out = []
    document.querySelectorAll('.et').forEach((e, i) => {
      // `getBoundingClientRect` ya trae aplicada la transformación de la
      // cámara, que es justo lo que hay que medir: dónde cae en el vídeo, no
      // dónde está en el papel. Y se mide la CAJA ENTERA, no el punto de
      // anclaje: lo que tapa la interfaz es el texto, no su coordenada.
      const r = e.getBoundingClientRect()
      const vis = +getComputedStyle(e).opacity > 0.02
      out.push({
        i, texto: e.textContent, vis,
        x0: +r.left.toFixed(1), x1: +r.right.toFixed(1),
        y0: +r.top.toFixed(1), y1: +r.bottom.toFixed(1),
        bajoCromo: vis && (r.top < lim.y0 || r.bottom > lim.y1),
        apretada: vis && (r.left < lim.x0 || r.right > lim.x1),
        seSale: vis && (r.left < 0 || r.right > 1080 || r.top < 0 || r.bottom > 1920),
      })
    })
    return out
  }, { mv: MARGEN_V, mh: MARGEN_H })

  const visibles = filas.filter((f) => f.vis)
  const fuera = visibles.filter((f) => f.bajoCromo || f.seSale)
  const apretadas = visibles.filter((f) => f.apretada && !f.bajoCromo && !f.seSale)
  const pisan = []
  for (let a = 0; a < visibles.length; a++) {
    for (let b = a + 1; b < visibles.length; b++) {
      const A = visibles[a], B = visibles[b]
      if (A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1) pisan.push([A.texto, B.texto])
    }
  }

  console.log(`\n── ${((ms + 1) / 1000).toFixed(1)}s · ${visibles.length} etiquetas en pantalla ──`)
  for (const f of fuera) {
    const por = f.seSale ? 'SE SALE DEL CUADRO'
      : f.y0 < 1920 * MARGEN_V / 100 ? `BAJO EL CROMO DE ARRIBA (a ${f.y0}px, ${(f.y0 / 19.2).toFixed(1)}%)`
      : `BAJO EL CROMO DE ABAJO (a ${(1920 - f.y1).toFixed(1)}px del borde)`
    console.log(`   ✗ ${por}  «${f.texto}»   x ${f.x0}→${f.x1}   y ${f.y0}→${f.y1}`)
  }
  for (const [a, b] of pisan) console.log(`   ✗ SE PISAN  «${a}» / «${b}»`)
  for (const f of apretadas) {
    const lado = f.x0 < 1080 * MARGEN_H / 100 ? `${f.x0}px por la izquierda` : `${(1080 - f.x1).toFixed(1)}px por la derecha`
    console.log(`   · aviso: «${f.texto}» aprieta el margen lateral (${lado})`)
  }
  if (!fuera.length && !pisan.length) {
    console.log(`   ✓ ninguna en el ${MARGEN_V}% de arriba ni de abajo, ninguna encima de otra`)
  }
  fallos += fuera.length + pisan.length
}

await nav.close()
console.log(fallos
  ? `\n${fallos} problemas · los avisos laterales no cuentan`
  : `\nlimpio: nadie en la zona de cromo del ${MARGEN_V}%`)
process.exit(fallos ? 1 : 0)
