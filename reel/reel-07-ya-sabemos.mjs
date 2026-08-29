/**
 * Pieza C · «Ya sabemos con quién cenas el jueves» · 15,0 s
 *
 * Guion: `docs/entrega/reels/GUION-C-ya-sabemos.md` (el definitivo, el que
 * sustituye a las tres versiones anteriores).
 * Foto:  `docs/entrega/fotos/mesa-cenital/mesa-sexto-puesto.jpg` (1080x1920)
 *
 * Una sola foto fija los quince segundos: ni un corte, ni un movimiento de
 * camara. La frase entera esta en pantalla desde el segundo cero, luego se
 * suman cuatro voces de la mesa, y al final el velo se levanta sobre «Seis
 * desconocidos verificados» y aparece el puesto vacio.
 *
 * ---------------------------------------------------------------------------
 * DOS DESVIOS DEL GUION, los dos medidos y los dos declarados
 * ---------------------------------------------------------------------------
 *
 * 1 · EL CIERRE NO CABE DONDE LO MANDA EL GUION.
 *
 * El guion pone «una mesa, cada semana» en y 1660-1750, el aro en 1770 y la
 * firma en 1830. El 12% de abajo del lienzo —desde y=1690— es donde Instagram
 * y TikTok ponen su interfaz: esta escrito en `ZONA-SEGURA-A.md` y lo vigila
 * `comprobar-etiquetas.mjs` en todas las piezas. Ahi los tres quedarian
 * debajo del cromo de la aplicacion.
 *
 * De la banda de 340px que da el guion quedan 150px usables, y el bloque de
 * cierre no baja de unos 450px. La escapatoria del guion —«se sube la firma,
 * nunca el aro»— no alcanza: sobran 300px, no 40.
 *
 * Lo que se hace: las DOS LINEAS de la promesa se quedan abajo, que es donde
 * el guion las quiere y por el motivo que da —se leen bajo la silla vacia—, y
 * el aro y la firma suben a la banda de arriba, que con el velo levantado es
 * la zona mas oscura disponible. La marca abre el cuadro, la silla vacia
 * manda en el centro, y la promesa cierra abajo.
 *
 * 2 · EL VELO DEL GUION NO ESCONDE EL PUESTO VACIO.
 *
 * El guion pide 70% sobre la banda del plato. Medido fila por fila sobre la
 * foto: el plato tiene luz media 143 y el resto del cuadro entre 53 y 81. Con
 * 70% el plato queda en 64 y todo lo demas en 39: sigue siendo lo mas claro
 * del cuadro, que es exactamente lo que el propio guion prohibe. Para que
 * quede a la altura del resto hace falta 91%.
 *
 * Se respeta todo lo demas de su degradado —continuo, sin bordes, y con la
 * banda de bruschettas como la mas tapada— y se corrige solo ese tramo.
 *
 * ---------------------------------------------------------------------------
 * Y UNA COSA QUE NO ESTA EN EL GUION: el velo respira.
 *
 * Sin eso la pieza son once segundos de imagen congelada —la primera version
 * daba 9,5 s parados—. La luz se abre y se cierra despacio, como la de un
 * comedor. No es movimiento de camara ni es un corte: es la unica capa que el
 * concepto deja viva.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const F = JSON.parse(fs.readFileSync(path.join(AQUI, '.fuentes.json'), 'utf8'))

const MESA = fs.readFileSync(
  path.join(AQUI, '..', 'docs', 'entrega', 'fotos', 'mesa-cenital', 'mesa-sexto-puesto.jpg'),
).toString('base64')

const C = {
  crema: '#FAF3E4', verde: '#14342A', naranja: '#E39C63', dominio: '#C0662F',
}

const D = 15.0
const p = (t) => +Math.max(0, Math.min(100, t / D * 100)).toFixed(3)

/** Los tamanos del guion vienen en otra referencia; un solo numero los sube. */
const ESCALA = 2.55
const px = (n) => Math.round(n * ESCALA)

/** El 12% de arriba y de abajo es de la aplicacion, no nuestro. */
const SEGURA_ARRIBA = Math.round(1920 * 0.12)   // 230
const SEGURA_ABAJO = 1920 - SEGURA_ARRIBA       // 1690

// --- tiempos, tal cual el guion ------------------------------------------
const FRASE = 0.00, TU_NO = 1.60, TODAVIA = 3.20
const SALE_BLOQUE = 4.60
const CUATRO = [
  { t: 5.20, html: 'Una se ríe antes de que termines el chiste.' },
  { t: 6.50, html: 'Otro va a pedir exactamente lo mismo que tú.' },
  // La mas larga: mas tiempo antes de la siguiente.
  { t: 7.90, html: 'Uno vivió 3 años en tu misma zona y ninguno de los dos lo sabe.' },
  { t: 9.60, html: 'La que propone el segundo sitio.' },
]
const SALE_CUATRO = 11.00
// El velo arranca 0,3 s antes de que la linea sea legible, no a la vez: si
// entran juntos se lee la linea primero y el gesto de sinceridad se pierde.
const VELO_SUBE = 11.00, VELO_TARDA = 0.90
const CIERRE1 = 11.30, CIERRE2 = 11.90
const ARO = 13.30, FIRMA = 13.80

if (VELO_SUBE >= CIERRE1) throw new Error('El velo tiene que arrancar antes de la linea de cierre')

// --- posiciones, con la geografia medida delante -------------------------
// Bandas reales de la foto, medidas fila por fila (luz media sobre 255):
//   0-570     53   fondo de mesa: brazos, platos, copas
//   570-1010  81   la tabla de bruschettas — pico 127, la mas ocupada
//   1010-1540 143  el puesto vacio — pico 190, lo mas claro del cuadro
//   1540-1690  20  limpia y usable
//   1690-1920   0  negra, pero DEBAJO de la interfaz
const Y_ARO = 280, Y_FIRMA = 470
const Y_CIERRE1 = 1508, Y_CIERRE2 = 1588
const ALTO_CIERRE = 70   // cada linea, con su interlineado

for (const [que, y, alto] of [['aro', Y_ARO, px(72)], ['firma', Y_FIRMA, px(15)],
  ['cierre1', Y_CIERRE1, ALTO_CIERRE], ['cierre2', Y_CIERRE2, ALTO_CIERRE]]) {
  if (y < SEGURA_ARRIBA || y + alto > SEGURA_ABAJO) {
    throw new Error(`El cierre «${que}» cae en el 12% de la aplicación: ${y}–${y + alto}`)
  }
  // La banda 570–1010 es la tabla con la comida: ahi el aro se dibuja encima
  // del pan y pierde los puntos contra la miga. Ya paso una vez.
  if (y + alto > 570 && y < 1010) throw new Error(`«${que}» cae sobre la comida: ${y}–${y + alto}`)
}

const kf = []

// --- el velo -------------------------------------------------------------
// Un solo degradado continuo de altura completa, sin punto donde termine: la
// legibilidad sale del velo y no de un rectangulo con el canto a la vista.
const VELO = `linear-gradient(180deg,
  rgba(20,52,42,.58) 0%,
  rgba(20,52,42,.66) 30%,
  rgba(20,52,42,.82) 52%,
  rgba(20,52,42,.91) 62%,
  rgba(20,52,42,.91) 78%,
  rgba(20,52,42,.62) 88%,
  rgba(20,52,42,.45) 100%)`

const MEDIO = 1.2, HONDO = 0.09, HONDO_FIN = 0.07
const respiro = ['0%{opacity:0}', `${p(0.20)}%{opacity:1}`]
for (let t = 0.20 + MEDIO, arriba = false; t < VELO_SUBE; t += MEDIO, arriba = !arriba) {
  respiro.push(`${p(t)}%{opacity:${arriba ? 1 : (1 - HONDO).toFixed(2)}}`)
}
respiro.push(`${p(VELO_SUBE)}%{opacity:1}`)
respiro.push(`${p(VELO_SUBE + VELO_TARDA)}%{opacity:.28}`)
for (let t = VELO_SUBE + VELO_TARDA + MEDIO, arriba = false; t < D; t += MEDIO, arriba = !arriba) {
  respiro.push(`${p(t)}%{opacity:${arriba ? '.28' : (0.28 - HONDO_FIN).toFixed(2)}}`)
}
respiro.push('100%{opacity:.28}')
kf.push(`@keyframes velo{${respiro.join(' ')}}`)

// La segunda capa, y por que existe.
//
// Con el velo levantado NO queda ningun sitio oscuro arriba para la marca:
// medido por parches, el centro de la banda 240-560 va de 64 a 97 —ahi esta
// la comida del fondo—, y mi «media 53» de antes promediaba los bordes
// oscuros y lo escondia. El aro y la firma quedaban en blanco sobre claro.
//
// Asi que en vez de un rectangulo con el canto a la vista —lo que el guion
// prohibe, y con razon: se veia cruzar la tabla— va otro DEGRADADO de altura
// completa, sin punto donde termine, que solo pesa arriba y llega a cero
// mucho antes del plato. La legibilidad sigue saliendo del velo.
kf.push(`@keyframes velo2{
  0%,${p(VELO_SUBE)}%{opacity:0}
  ${p(VELO_SUBE + VELO_TARDA)}%,100%{opacity:.85}}`)

// --- la frase, entera desde el arranque ----------------------------------
// Fundido cortisimo a proposito: quien abre el reel tiene que encontrarse la
// frase ya puesta, no verla aparecer.
kf.push(`@keyframes frase{
  0%{opacity:0} ${p(0.20)}%{opacity:1}
  ${p(SALE_BLOQUE)}%{opacity:1}
  ${p(SALE_BLOQUE + 0.30)}%,100%{opacity:0}}`)

;[['tuno', TU_NO], ['todavia', TODAVIA]].forEach(([n, t]) => {
  kf.push(`@keyframes ${n}{
   0%,${p(t)}%{opacity:0;transform:translateY(${px(6)}px)}
   ${p(t + 0.28)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_BLOQUE)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_BLOQUE + 0.30)}%,100%{opacity:0;transform:translateY(0)}}`)
})

// --- las cuatro, acumulandose --------------------------------------------
// Se SUMAN, no se sustituyen. Con cuatro frases —una de trece palabras— dando
// a cada una su lectura completa no caben quince segundos; y ademas cuatro
// voces sumandose son la mesa llenandose, que es lo que la pieza dice.
// Las anteriores bajan a media luz para que la ultima sea siempre la que mas
// suena.
const MEDIA_LUZ = 0.55
CUATRO.forEach((f, i) => {
  const sig = CUATRO[i + 1]
  const baja = sig
    ? `${p(sig.t)}%{opacity:1} ${p(sig.t + 0.30)}%{opacity:${MEDIA_LUZ}}
       ${p(SALE_CUATRO)}%{opacity:${MEDIA_LUZ}}`
    : `${p(SALE_CUATRO)}%{opacity:1}`
  kf.push(`@keyframes c${i}{
   0%,${p(f.t)}%{opacity:0;transform:translateY(${px(8)}px)}
   ${p(f.t + 0.30)}%{opacity:1;transform:translateY(0)}
   ${baja}
   ${p(SALE_CUATRO + 0.30)}%,100%{opacity:0;transform:translateY(0)}}`)
})

// --- el cierre -----------------------------------------------------------
;[['cierre1', CIERRE1], ['cierre2', CIERRE2], ['firma', FIRMA]].forEach(([n, t]) => {
  kf.push(`@keyframes ${n}{
   0%,${p(t)}%{opacity:0;transform:translateY(${px(6)}px)}
   ${p(t + 0.30)}%,100%{opacity:1;transform:translateY(0)}}`)
})
kf.push(`@keyframes aro{
  0%,${p(ARO)}%{opacity:0;transform:scale(.9)}
  ${p(ARO + 0.30)}%,100%{opacity:1;transform:scale(1)}}`)

const SALTOS = 12
kf.push(`@keyframes grano{${Array.from({ length: SALTOS }, (_, i) =>
  `${(i / SALTOS * 100).toFixed(2)}%{background-position:${(i * 37) % 200}px ${(i * 61) % 200}px}`).join(' ')} 100%{background-position:0 0}}`)

// Grosor 0,198 del radio, punto 0,221, seis cada 60 grados desde las tres.
const aro = (trazo, acento, lado) => {
  const r = 27, gr = (r * 0.198).toFixed(2), pr = (r * 0.221).toFixed(2)
  return `<svg viewBox="0 0 100 100" width="${lado}" height="${lado}">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${trazo}" stroke-width="${gr}"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => {
      const rad = a * Math.PI / 180
      return `<circle cx="${(50 + r * Math.cos(rad)).toFixed(2)}" cy="${(50 + r * Math.sin(rad)).toFixed(2)}" r="${pr}" fill="${a === 0 ? acento : trazo}"/>`
    }).join('')}</svg>`
}

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Aro Club · pieza C</title>
<style>
@font-face{font-family:'Young Serif';src:url(data:font/ttf;base64,${F.YoungSerif}) format('truetype');font-display:block}
@font-face{font-family:'Inter Tight';font-weight:600;src:url(data:font/ttf;base64,${F.InterTight}) format('truetype');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.verde};height:100%;overflow:hidden}
body{display:grid;place-items:center}
#marco{width:var(--w);height:var(--h);overflow:hidden;position:relative}
#lienzo{width:1080px;height:1920px;position:absolute;inset:0;overflow:hidden;
  background:${C.verde};transform-origin:top left;transform:scale(var(--s,1))}

#foto{position:absolute;inset:0;background:url(data:image/jpeg;base64,${MESA}) center/cover no-repeat}
#velo{position:absolute;inset:0;opacity:0;background:${VELO};animation:velo ${D}s linear infinite}
#velo2{position:absolute;inset:0;z-index:2;opacity:0;animation:velo2 ${D}s ease infinite;
  background:linear-gradient(180deg,
    rgba(20,52,42,.95) 0%, rgba(20,52,42,.80) 12%, rgba(20,52,42,.45) 24%,
    rgba(20,52,42,.12) 34%, rgba(20,52,42,0) 46%, rgba(20,52,42,0) 100%)}

/* La frase entera y sus dos mitades. Conviven: «Tú no.» es una elipsis y
   necesita su antecedente delante. */
#frase,#tuno,#todavia{position:absolute;left:${px(43)}px;right:${px(43)}px;text-align:center;z-index:5;
  font-family:'Young Serif',Georgia,serif;line-height:1.06;letter-spacing:-.03em}
#frase{top:300px;font-size:${px(44)}px;color:${C.crema};opacity:0;animation:frase ${D}s ease infinite}
#tuno{top:700px;font-size:${px(52)}px;color:${C.naranja};opacity:0;animation:tuno ${D}s ease infinite}
#todavia{top:880px;font-size:${px(60)}px;color:${C.naranja};opacity:0;animation:todavia ${D}s ease infinite}

/* Las cuatro. En flujo normal y no absolutas: asi cada una nace justo debajo
   de la anterior sin que yo tenga que adivinar cuantas lineas ocupa ninguna. */
#cuatro{position:absolute;left:${px(43)}px;right:${px(43)}px;top:240px;z-index:4}
#cuatro div{opacity:0;margin-bottom:${px(11)}px;
  font-family:'Young Serif',Georgia,serif;font-size:${px(32)}px;line-height:1.14;
  letter-spacing:-.02em;color:${C.crema};text-wrap:pretty}
${CUATRO.map((_, i) => `#c${i}{animation:c${i} ${D}s ease infinite}`).join('')}

/* El cierre. La promesa abajo, bajo la silla vacía; la marca arriba, que con
   el velo levantado es la zona más oscura que queda. */
#aro{position:absolute;left:0;right:0;top:${Y_ARO}px;display:flex;justify-content:center;z-index:5;
  opacity:0;animation:aro ${D}s cubic-bezier(.3,1.4,.4,1) infinite}
#firma{position:absolute;left:0;right:0;top:${Y_FIRMA}px;text-align:center;z-index:5;opacity:0;
  font-family:'Inter Tight',sans-serif;font-weight:600;font-size:${px(15)}px;letter-spacing:.02em;
  color:${C.crema};animation:firma ${D}s ease infinite}
/* Igual que en A: «aro.club · Caracas» juntos en el acento, no solo
   el dominio. */
#firma em{font-style:normal;color:${C.dominio}}
.cierre{position:absolute;left:${px(24)}px;right:${px(24)}px;text-align:center;z-index:5;opacity:0;
  font-family:'Young Serif',Georgia,serif;font-size:${px(24)}px;line-height:1.15;
  letter-spacing:-.02em;color:${C.crema}}
#cierre1{top:${Y_CIERRE1}px;animation:cierre1 ${D}s ease infinite}
#cierre2{top:${Y_CIERRE2}px;animation:cierre2 ${D}s ease infinite}

#grano{position:absolute;inset:0;z-index:8;pointer-events:none;opacity:.06;mix-blend-mode:overlay;
  animation:grano 1s steps(1,end) infinite;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo">

  <div id="foto"></div>
  <div id="velo"></div>
  <div id="velo2"></div>

  <div id="frase">Ya sabemos con quién cenas el jueves.</div>
  <div id="tuno">Tú no.</div>
  <div id="todavia">Todavía.</div>

  <div id="cuatro">${CUATRO.map((f, i) => `<div id="c${i}">${f.html}</div>`).join('\n    ')}</div>

  <div class="cierre" id="cierre1">Seis desconocidos verificados,</div>
  <div class="cierre" id="cierre2">una mesa, cada semana.</div>
  <div id="aro">${aro(C.crema, C.naranja, px(72))}</div>
  <div id="firma">Aro Club · <em>aro.club · Caracas</em></div>

  <div id="grano"></div>
</div></div>
<script>
let real=false;
function ajusta(){const s=real?1:Math.min(innerHeight/1920,innerWidth/1080);const r=document.documentElement.style;
  r.setProperty('--s',s);r.setProperty('--w',Math.round(1080*s)+'px');r.setProperty('--h',Math.round(1920*s)+'px')}
addEventListener('resize',ajusta);ajusta();
addEventListener('keydown',e=>{if(e.key==='1'){real=!real;ajusta()}});
</script></body></html>`

fs.writeFileSync(path.join(AQUI, 'reel-07-ya-sabemos.html'), html)
console.log(`reel-07-ya-sabemos.html · ${D}s · cierre dentro de la zona segura (${SEGURA_ARRIBA}–${SEGURA_ABAJO})`)
