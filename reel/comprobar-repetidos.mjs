/**
 * Caza tramos donde el vídeo no cambia: dos fotogramas consecutivos idénticos.
 *
 * Existe por la misma razón que `comprobar-cuestionario.mjs`: la regla de «no
 * repetir fotograma» no sirve de nada si depende de que alguien se acuerde de
 * mirar. Un reel muerto no falla — se ve bien parado y se siente plano en
 * movimiento, que es justo el tipo de defecto que no salta solo.
 *
 *   node reel/comprobar-repetidos.mjs reel-01.mp4
 *   node reel/comprobar-repetidos.mjs                # todos los de reel/
 *
 * Devuelve 1 si encuentra tramos quietos, para poder ponerlo antes de un push.
 *
 * Cómo lo mide, y por qué NO por fotogramas idénticos. La primera versión
 * comparaba firmas: dos fotogramas exactamente iguales. Con esa medida los
 * cuatro reels daban cero — y se sienten muertos igual. La razón es que todos
 * llevan un alejamiento lentísimo de fondo: los píxeles cambian, pero de forma
 * imperceptible. «¿Cambió algo?» no es la pregunta; la pregunta es **cuánto**.
 *
 * Así que se mide la diferencia media entre fotogramas consecutivos, en
 * escala de grises y a tamaño pequeño —el grano no debe contar como cambio—.
 * Por debajo del umbral, el ojo lo ve quieto aunque el fichero diga que no.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
// Se busca en el PATH y solo se cae al de Homebrew si no aparece: escrito a
// mano funciona en este Mac y en ningún otro sitio.
const FFMPEG = (() => {
  for (const c of ['ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
    try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return c } catch {}
  }
  throw new Error('No encuentro ffmpeg. Instálalo con: brew install ffmpeg')
})()
const FPS = 2
// Y una segunda pasada, más fina, SOLO sobre lo que la primera marcó.
//
// A 2 fps se muestrea cada medio segundo, y eso no puede ver un corte de
// 0,30 s: cae dos veces seguidas en la misma fase y lo lee como quieto. Pasó
// de verdad — la apertura de `reel-01-ritmo`, que alterna foto y crema cada
// 0,30 s, salió aquí como «1,5 s casi sin cambiar» estando cortando cinco
// veces en esa ventana. Es el fallo simétrico del que este comprobador vino a
// arreglar: aquel dejaba pasar lo muerto, este condenaba lo vivo.
//
// No se sube FPS a secas porque a 10 fps un alejamiento lento cambia cinco
// veces menos entre fotograma y fotograma, y entonces TODO parecería quieto:
// el umbral está calibrado para medio segundo. Así que la primera pasada
// sigue igual y solo lo que ella marca se vuelve a mirar deprisa. Un tramo se
// declara quieto si lo está en las dos.
const FPS_FINO = 10
// Y solo rescata CORTES SECOS. La segunda pasada no vuelve a juzgar el
// movimiento lento —para eso está calibrada la primera, y bajarle el umbral a
// la quinta parte cambiaba el veredicto de las seis piezas—: solo mira si en
// ese tramo hubo un cambio de plano entero que el muestreo lento se saltó.
// Un corte crema/foto da 185 sobre 255; el movimiento normal se queda por
// debajo de 4. Veinte separa los dos sin tocar nada más.
const CORTE_DURO = +(process.env.CORTE_DURO ?? 20)
// Diferencia media por píxel, sobre 255. Por debajo de esto el ojo lo ve
// quieto: 1,2 deja pasar un alejamiento que se nota y caza el que no.
const UMBRAL = +(process.env.UMBRAL ?? 1.2)

const objetivos = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const ficheros = objetivos.length
  ? objetivos.map((f) => (path.isAbsolute(f) ? f : path.join(AQUI, f)))
  : fs.readdirSync(AQUI).filter((f) => f.endsWith('.mp4')).sort().map((f) => path.join(AQUI, f))

if (!ficheros.length) { console.error('No hay MP4 que mirar.'); process.exit(1) }

let conProblema = 0
const tabla = []

for (const video of ficheros) {
  if (!fs.existsSync(video)) { console.error(`No existe: ${video}`); process.exit(1) }
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'aro-rep-'))

  // Gris y pequeño: a 1080 y en color, un píxel de grano contaría como
  // cambio y esto no avisaría nunca de nada.
  const ANCHO = 64, ALTO = Math.round(ANCHO * 16 / 9)
  const crudo = path.join(tmp, 'g.raw')
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', video,
    '-vf', `fps=${FPS},scale=${ANCHO}:${ALTO},format=gray`, '-f', 'rawvideo', crudo])

  const datos = fs.readFileSync(crudo)
  const px = ANCHO * ALTO
  const total = Math.floor(datos.length / px)
  const quietos = []
  let corrida = 0

  for (let i = 1; i < total; i++) {
    let suma = 0
    for (let k = 0; k < px; k++) suma += Math.abs(datos[i * px + k] - datos[(i - 1) * px + k])
    const dif = suma / px

    if (dif < UMBRAL) {
      corrida++
      // Se anota el segundo del PRIMER fotograma de la corrida: es donde hay
      // que ir a mirar, no donde termina.
      if (corrida === 1) quietos.push({ desde: +((i - 1) / FPS).toFixed(1), cuantos: 2, dif: +dif.toFixed(2) })
      else { const q = quietos[quietos.length - 1]; q.cuantos++; q.dif = Math.max(q.dif, +dif.toFixed(2)) }
    } else corrida = 0
  }
  // Segunda pasada sobre cada candidato. `dif` a 10 fps es naturalmente más
  // pequeña que a 2, así que el umbral se escala igual: la quinta parte.
  const sobreviven = []
  for (const q of quietos) {
    const desde = q.desde
    const dura = +((q.cuantos - 1) / FPS).toFixed(2)
    const fino = path.join(tmp, `f${desde}.raw`)
    // La ventana es EXACTAMENTE el tramo, ni un fotograma más. Con medio
    // segundo de más por el final se colaba el movimiento de al lado y un
    // tramo congelado de verdad —dif 0 a 2 fps, dos fotogramas idénticos—
    // salía «desmentido» con dif 3,2. Un desmentido así es imposible, y es lo
    // que delató el error.
    execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', String(desde), '-t', String(dura + 1 / FPS_FINO), '-i', video,
      '-vf', `fps=${FPS_FINO},scale=${ANCHO}:${ALTO},format=gray`, '-f', 'rawvideo', fino])
    const df = fs.readFileSync(fino)
    const nf = Math.floor(df.length / px)
    let mayor = 0
    for (let i = 1; i < nf; i++) {
      let suma = 0
      for (let k = 0; k < px; k++) suma += Math.abs(df[i * px + k] - df[(i - 1) * px + k])
      mayor = Math.max(mayor, suma / px)
    }
    // Si mirando deprisa hubo un corte de plano, el tramo estaba vivo y la
    // primera pasada se lo perdió por muestrear despacio.
    if (mayor < CORTE_DURO) sobreviven.push({ ...q, difFina: +mayor.toFixed(2) })
    else q.desmentido = +mayor.toFixed(2)
  }
  const desmentidos = quietos.filter((q) => q.desmentido != null)
  quietos.length = 0
  quietos.push(...sobreviven)

  const marcos = { length: total }

  fs.rmSync(tmp, { recursive: true, force: true })
  if (desmentidos.length) {
    tabla.desmentidos = (tabla.desmentidos ?? []).concat(
      desmentidos.map((q) => ({ video: path.basename(video), ...q })))
  }

  const dur = +(marcos.length / FPS).toFixed(1)
  const parado = quietos.reduce((a, q) => a + (q.cuantos - 1) / FPS, 0)
  tabla.push({ nombre: path.basename(video), dur, tramos: quietos.length, parado: +parado.toFixed(1), quietos })
  if (quietos.length) conProblema++
}

const ancho = Math.max(...tabla.map((t) => t.nombre.length))
console.log(`\n${'fichero'.padEnd(ancho)}   dura   tramos quietos   segundos parados`)
console.log('─'.repeat(ancho + 40))
for (const t of tabla) {
  const marca = t.tramos ? '✗' : '✓'
  console.log(`${marca} ${t.nombre.padEnd(ancho)} ${String(t.dur).padStart(5)}s ${String(t.tramos).padStart(10)} ${String(t.parado).padStart(16)}s`)
}

for (const t of tabla.filter((x) => x.tramos)) {
  console.log(`\n${t.nombre} — dónde se queda quieto:`)
  for (const q of t.quietos) {
    console.log(`   desde ${String(q.desde).padStart(5)}s · ${((q.cuantos - 1) / FPS).toFixed(1)}s casi sin cambiar (dif ${q.dif})`)
  }
}

if (tabla.desmentidos?.length) {
  console.log('\nDescartados: a 10 fps se ve que ahí hay un corte de plano.')
  for (const q of tabla.desmentidos) {
    console.log(`   ${q.video} · desde ${q.desde}s · a 2 fps daba ${q.dif}, a 10 fps da ${q.desmentido}`)
  }
}

console.log(`\n${conProblema} de ${tabla.length} con tramos quietos`)
process.exit(conProblema ? 1 : 0)
