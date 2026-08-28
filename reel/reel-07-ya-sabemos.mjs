/**
 * Pieza C · «Ya sabemos con quién cenas el jueves» · 15,0 s
 *
 * Guion: `docs/entrega/reels/GUION-C-ya-sabemos.md`
 * Foto:  `docs/entrega/fotos/mesa-cenital/mesa-sexto-puesto.jpg` (1080x1920)
 *
 * Una sola foto fija los quince segundos. Ni un corte de plano, ni un
 * movimiento de camara. Lo unico que cambia es el velo verde que la tapa, y
 * cambia una sola vez: a los 11,80 baja y aparece el sexto puesto vacio.
 *
 * Esa es toda la pieza. El texto dice tres cosas que sabemos de la mesa, luego
 * «Tu no.», luego dos segundos de nada, y entonces el velo se levanta y llega
 * «Todavia». El vacio del medio no es un descuido: es el tramo que decide si
 * «Tu no.» suena a burla o a invitacion.
 *
 * Dos decisiones mias que conviene ver, porque no estan en el guion:
 *
 *  1. Los tamanos de Design vienen en otra referencia. El guion pide el
 *     titular en Young Serif 44px, y en un lienzo de 1080 eso son unos 16px
 *     en un telefono: ilegible en el feed. El titular de la pieza A, que sale
 *     del mismo Design, es 92px. Se escalan todos por igual con `ESCALA`, que
 *     es un solo numero: si Design dice otro, se cambia ahi y no en once
 *     sitios.
 *  2. El texto que afirma va a la izquierda; el que gira —«Tu no.»,
 *     «Todavia»— va centrado y en el mismo sitio, uno encima del otro. La
 *     respuesta ocupa el lugar exacto de la duda.
 *
 * Y todo el cierre vive en la MITAD DE ARRIBA. Cuando el velo baja, lo que
 * tiene que verse es el plato vacio de abajo: taparlo con el aro justo cuando
 * se descubre seria apagar el unico gesto de la pieza.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const F = JSON.parse(fs.readFileSync(path.join(AQUI, '.fuentes.json'), 'utf8'))

// La foto se lee del entregable y se incrusta. No entra en `.fuentes.json`:
// ese fichero lo comparten los reels anteriores y esta foto es de esta pieza.
const MESA = fs.readFileSync(
  path.join(AQUI, '..', 'docs', 'entrega', 'fotos', 'mesa-cenital', 'mesa-sexto-puesto.jpg'),
).toString('base64')

const C = {
  crema: '#FAF3E4', verde: '#14342A', terracota: '#8F4515', naranja: '#E39C63',
}

const D = 15.0
const p = (t) => +Math.max(0, Math.min(100, t / D * 100)).toFixed(3)

/** Ver la nota 1 de la cabecera. Un solo numero, y de aqui salen todos. */
const ESCALA = 2.55
const px = (n) => Math.round(n * ESCALA)

// --- el guion, con sus tiempos -------------------------------------------
//
// SEGUNDA ESTRUCTURA. La primera ponia el titular delante, luego tres frases,
// y el remate al final. Eso parte la frase por la mitad: entre «Ya sabemos» y
// «Tu no.» habia seis segundos y tres frases ajenas.
//
// Y «Tu no.» es una ELIPSIS. No significa nada sin su antecedente cerca: para
// que se lea «tu no sabes», el «sabemos» tiene que seguir en la cabeza de
// quien mira. A seis segundos ya no esta, y la frase se queda sin chiste. No
// era un problema de ritmo, era gramatical.
//
// Ahora las tres frases van PRIMERO, sin presentacion, como un acertijo: no
// sabes de quien hablan. Y la frase entera es la respuesta, junta y seguida.
//
// Con un anadido: la frase y «Tu no.» CONVIVEN en pantalla, no se sustituyen.
// Asi el antecedente esta literalmente delante cuando llega el latigazo. Se
// apagan las dos juntas y «Todavia.» entra sola, con la mesa ya abierta.
const FRASES = [
  { de: 0.60, a: 2.40, html: 'Otro va a pedir exactamente lo mismo que tú.' },
  { de: 2.40, a: 4.20, html: 'Una se ríe antes de que termines el chiste.' },
  // La larga respira un pelo mas: es la que tiene que dejar la pregunta en el
  // aire justo antes del respiro.
  { de: 4.20, a: 6.30, html: 'Uno vivió tres años en tu misma ciudad y ninguno de los dos lo sabe.' },
]

// El respiro. Pantalla sin texto: la pausa antes de que alguien conteste.
const RESPIRO_HASTA = 7.20

const FRASE = 7.20                      // «Ya sabemos con quién cenas el jueves.»
const TU_NO = 8.75                      // el latigazo, con la frase todavia puesta
const VELO_BAJA = 11.30, VELO_TARDA = 0.80
const SALE_BLOQUE = 11.60               // se apagan las dos, ya con el velo subiendo
const TODAVIA = 12.15
const ARO = 13.15, FIRMA = 13.65

// El silencio: de que «Tu no.» termina de entrar hasta que el velo se mueve.
// Es la excepcion declarada a la regla de los 2 s, y ahora cae donde estaba
// pensada —dentro de la frase, entre sus dos mitades— y no entre dos ideas
// distintas.
const SILENCIO = +(VELO_BAJA - (TU_NO + 0.25)).toFixed(2)
if (SILENCIO < 2.0) throw new Error(`El silencio se quedo en ${SILENCIO}s y tiene que pasar de 2`)

// El velo empieza a levantarse ANTES de que la frase se apague, a proposito:
// asi se ve primero el gesto —la mesa aclarandose— y «Todavia» llega con la
// mesa ya abierta, no a oscuras. Idea del guion, y es buena.
if (VELO_BAJA >= SALE_BLOQUE) throw new Error('El velo tiene que empezar antes de que se apague la frase')

const kf = []

// --- el velo -------------------------------------------------------------
//
// El velo RESPIRA, y esto no estaba en el guion. El guion da por hecho que la
// regla 6 —el fondo siempre tiene una capa viva— la cumple el velo; pero el
// velo se mueve una sola vez, en el 11,80. Los otros once segundos y pico la
// imagen esta literalmente congelada, y se nota: la primera version daba 9,5 s
// parados en siete tramos, de los cuales solo 2,0 s eran el silencio querido.
//
// Asi que la luz respira, despacio, como la de un comedor. No es un
// movimiento de camara ni un corte: es la unica capa que el concepto de la
// pieza deja viva. Y el levantamiento final deja de ser un evento suelto para
// ser esa misma respiracion yendose del todo.
//
// La amplitud se eligio mirando el resultado, no calculandola: lo bastante
// para que la imagen este viva, lo bastante poco para que no se lea como un
// parpadeo.
const MEDIO = 1.2          // medio ciclo, en segundos
const HONDO = 0.10         // cuanto se abre la luz con el velo puesto
const HONDO_FIN = 0.08     // y despues, ya con la mesa descubierta

const respiro = []
respiro.push('0%{opacity:0}')
respiro.push(`${p(0.30)}%{opacity:1}`)
for (let t = 0.30 + MEDIO, arriba = false; t < VELO_BAJA; t += MEDIO, arriba = !arriba) {
  respiro.push(`${p(t)}%{opacity:${arriba ? 1 : (1 - HONDO).toFixed(2)}}`)
}
// El levantamiento. Sale de donde estuviera la respiracion, no de un valor
// fijo: si saltara a 1 para bajar, ese salto seria el corte que la pieza no
// puede tener.
respiro.push(`${p(VELO_BAJA)}%{opacity:1}`)
respiro.push(`${p(VELO_BAJA + VELO_TARDA)}%{opacity:.25}`)
for (let t = VELO_BAJA + VELO_TARDA + MEDIO, arriba = false; t < D; t += MEDIO, arriba = !arriba) {
  respiro.push(`${p(t)}%{opacity:${arriba ? '.25' : (0.25 - HONDO_FIN).toFixed(2)}}`)
}
respiro.push('100%{opacity:.25}')
kf.push(`@keyframes velo{${respiro.join(' ')}}`)

// --- las tres frases, ahora de entrada ------------------------------------
FRASES.forEach((f, i) => {
  kf.push(`@keyframes f${i}{
   0%,${p(f.de)}%{opacity:0;transform:translateY(${px(5)}px)}
   ${p(f.de + 0.20)}%{opacity:1;transform:translateY(0)}
   ${p(f.a - 0.20)}%{opacity:1;transform:translateY(0)}
   ${p(f.a)}%,100%{opacity:0;transform:translateY(0)}}`)
})

// --- el giro -------------------------------------------------------------
// La frase y «Tu no.» comparten salida: se apagan a la vez, como una sola
// cosa dicha por una sola voz.
kf.push(`@keyframes frase{
  0%,${p(FRASE)}%{opacity:0;transform:translateY(${px(8)}px)}
  ${p(FRASE + 0.35)}%{opacity:1;transform:translateY(0)}
  ${p(SALE_BLOQUE)}%{opacity:1;transform:translateY(0)}
  ${p(SALE_BLOQUE + 0.30)}%,100%{opacity:0;transform:translateY(0)}}`)

kf.push(`@keyframes tuno{
  0%,${p(TU_NO)}%{opacity:0;transform:scale(.95)}
  ${p(TU_NO + 0.25)}%{opacity:1;transform:scale(1)}
  ${p(SALE_BLOQUE)}%{opacity:1;transform:scale(1)}
  ${p(SALE_BLOQUE + 0.30)}%,100%{opacity:0;transform:scale(1)}}`)

kf.push(`@keyframes todavia{
  0%,${p(TODAVIA)}%{opacity:0;transform:translateY(${px(6)}px)}
  ${p(TODAVIA + 0.35)}%,100%{opacity:1;transform:translateY(0)}}`)

// La cortina del cierre. Cuando el velo baja, la foto se vuelve clara y
// ocupada justo donde va la marca: «Todavia» se perdia entre la pasta, el aro
// quedaba encima de la tabla de bruschettas y la firma peleaba con los platos.
// Esto le da suelo SOLO a la mitad de arriba —la de abajo, que es el plato que
// acabamos de descubrir, se queda limpia—.
kf.push(`@keyframes cortina{
  0%,${p(VELO_BAJA + 0.30)}%{opacity:0}
  ${p(TODAVIA)}%,100%{opacity:1}}`)

kf.push(`@keyframes aro{
  0%,${p(ARO)}%{opacity:0;transform:scale(.9)}
  ${p(ARO + 0.30)}%,100%{opacity:1;transform:scale(1)}}`)

kf.push(`@keyframes firma{
  0%,${p(FIRMA)}%{opacity:0;transform:translateY(${px(6)}px)}
  ${p(FIRMA + 0.30)}%,100%{opacity:1;transform:translateY(0)}}`)

// El grano salta doce veces por segundo. Es textura, no ritmo: aqui no
// sustituye a nada, porque a tamano pequeno el ruido se promedia y no cuenta
// como cambio —esta medido en `comprobar-repetidos.mjs`—.
const SALTOS = 12
kf.push(`@keyframes grano{${Array.from({ length: SALTOS }, (_, i) =>
  `${(i / SALTOS * 100).toFixed(2)}%{background-position:${(i * 37) % 200}px ${(i * 61) % 200}px}`).join(' ')} 100%{background-position:0 0}}`)

// --- el aro, con las proporciones del fichero de marca -------------------
// Grosor 0,198 del radio, punto 0,221, seis cada 60 grados empezando a las
// tres, y el naranja a las tres en punto.
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
@font-face{font-family:'Inter Tight';font-weight:500;src:url(data:font/ttf;base64,${F.InterTightM}) format('truetype');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.verde};height:100%;overflow:hidden}
body{display:grid;place-items:center}
#marco{width:var(--w);height:var(--h);overflow:hidden;position:relative}
#lienzo{width:1080px;height:1920px;position:absolute;inset:0;overflow:hidden;
  background:${C.verde};transform-origin:top left;transform:scale(var(--s,1))}

/* La foto. Fija: ni zoom ni desplazamiento. El concepto es que la camara no
   se mueve y lo unico que cambia es lo que nos dejamos ver. */
#foto{position:absolute;inset:0;background:url(data:image/jpeg;base64,${MESA}) center/cover no-repeat}

/* El velo. Mas peso abajo, donde esta el plato vacio: si no, lo mas luminoso
   del cuadro desde el segundo cero seria justo lo que queremos guardar. */
#velo{position:absolute;inset:0;opacity:0;
  /* Mucho mas peso abajo que en el guion (.94 y no .88). Con .88 el plato
     vacio seguia siendo lo mas luminoso del cuadro desde el segundo cero, y
     entonces el levantamiento del 11,80 no revela nada: solo aclara algo que
     ya se veia. Comprobado sacando el fotograma del 9,8. */
  background:linear-gradient(180deg,rgba(20,52,42,.66) 0%,rgba(20,52,42,.74) 35%,rgba(20,52,42,.88) 58%,rgba(20,52,42,.96) 100%);
  /* linear y no ease: con ease la animacion se frena en CADA fotograma
     clave, y en una respiracion eso son seis medios segundos planos por
     pieza. La luz de un comedor no se para en los extremos. */
  animation:velo ${D}s linear infinite}

/* Las tres frases, a la izquierda: son observaciones, no la voz de la marca.
   Y ahora abren la pieza sin presentacion, como un acertijo. */
#frases{position:absolute;left:${px(43)}px;right:${px(43)}px;top:${px(240)}px;z-index:4}
#frases div{position:absolute;left:0;right:0;top:0;opacity:0;
  font-family:'Inter Tight',sans-serif;font-weight:500;font-size:${px(26)}px;line-height:1.42;
  color:${C.crema};text-wrap:pretty}
${FRASES.map((_, i) => `#f${i}{animation:f${i} ${D}s ease infinite}`).join('')}

/* La frase entera y su latigazo. Centradas, una encima de otra y a la vez en
   pantalla: «Tu no.» es una elipsis y necesita su antecedente delante. */
#frase{position:absolute;left:${px(43)}px;right:${px(43)}px;top:${px(120)}px;
  text-align:center;z-index:5;opacity:0;
  font-family:'Young Serif',Georgia,serif;font-size:${px(44)}px;line-height:1.06;
  letter-spacing:-.03em;color:${C.crema};animation:frase ${D}s ease infinite}

#tuno,#todavia{position:absolute;left:${px(43)}px;right:${px(43)}px;
  text-align:center;z-index:5;opacity:0;
  font-family:'Young Serif',Georgia,serif;line-height:1.04;letter-spacing:-.035em}
#tuno{top:${px(272)}px;font-size:${px(52)}px;color:${C.crema};animation:tuno ${D}s ease infinite}
#todavia{top:${px(157)}px;font-size:${px(60)}px;color:${C.naranja};animation:todavia ${D}s ease infinite}

/* El cierre, todo en la mitad de arriba: abajo esta el plato que el velo
   acaba de descubrir, y taparlo seria apagar el gesto. */
#aro{position:absolute;left:0;right:0;top:${px(250)}px;display:flex;justify-content:center;z-index:5;
  opacity:0;animation:aro ${D}s cubic-bezier(.3,1.4,.4,1) infinite}
#firma{position:absolute;left:0;right:0;top:${px(360)}px;text-align:center;z-index:5;opacity:0;
  font-family:'Inter Tight',sans-serif;font-weight:600;font-size:${px(17)}px;letter-spacing:.14em;
  color:${C.crema};animation:firma ${D}s ease infinite}

#cortina{position:absolute;left:0;right:0;top:0;height:52%;z-index:3;opacity:0;
  /* Densa, y cortada justo donde empieza el plato (52% = y 998). Con menos
     densidad el aro perdia la silueta contra la tabla y los platos; con mas
     altura empezaria a apagar el plato, que es lo unico que no se puede
     tocar. */
  background:linear-gradient(180deg,rgba(20,52,42,.86) 0%,rgba(20,52,42,.74) 60%,rgba(20,52,42,0) 100%);
  animation:cortina ${D}s ease infinite}

#grano{position:absolute;inset:0;z-index:8;pointer-events:none;opacity:.06;mix-blend-mode:overlay;
  animation:grano 1s steps(1,end) infinite;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo">

  <div id="foto"></div>
  <div id="velo"></div>

  <div id="frase">Ya sabemos con quién cenas el jueves.</div>
  <div id="frases">${FRASES.map((f, i) => `<div id="f${i}">${f.html}</div>`).join('\n    ')}</div>

  <div id="cortina"></div>

  <div id="tuno">Tú no.</div>
  <div id="todavia">Todavía.</div>
  <div id="aro">${aro(C.crema, C.naranja, px(100))}</div>
  <div id="firma">ARO CLUB · ARO.CLUB · CARACAS</div>

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
console.log(`reel-07-ya-sabemos.html · ${D}s · velo baja en ${VELO_BAJA}s · escala de texto x${ESCALA}`)
