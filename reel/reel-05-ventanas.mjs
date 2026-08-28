/**
 * Reel 05 · Pieza A · «Las ventanas de Caracas».
 *
 * Quince segundos, una sola foto fija de una fachada nocturna que se aleja de
 * `scale(1.14)` a `scale(1.00)`, lineal, sin un solo corte. Doce etiquetas van
 * apareciendo junto a ventanas encendidas: cada una es una persona sola un
 * jueves. A los 11 s se apagan una a una y entra «¿Por qué no juntarlos?». A
 * los 13 s, el aro.
 *
 * CERO CORTES, y no es una restricción técnica: es lo que dice la pieza. La
 * cámara se aleja y va cabiendo más gente sola. Un corte y deja de decirlo.
 *
 * LA TRAMPA, que es la parte importante
 *
 * Las coordenadas de Design son porcentajes sobre la imagen de 1080x1920 en su
 * estado FINAL, o sea a `scale(1.00)`. Pero la imagen se está moviendo los
 * quince segundos.
 *
 * Por eso las etiquetas van DENTRO de la capa que se transforma, no fuera.
 * Fuera, la fachada se movería por detrás y cada etiqueta se despegaría de su
 * ventana, que es lo único que esta pieza tiene que sostener. Que crezcan y
 * encojan un 14% con el edificio no es un defecto: es lo que hace que se
 * sientan pegadas a la ventana.
 *
 * La consecuencia es que a `scale(1.14)` solo se ve el 87,7% central de la
 * imagen —de 6,1% a 93,9% en los dos ejes— y las etiquetas van de 14% a 78% en
 * x y de 11% a 92% en y. Entra todo, pero por poco, así que la comprobación no
 * es mirar el fotograma final: hay que mirar 1 s, 5 s, 10 s y 15 s.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const F = JSON.parse(fs.readFileSync(path.join(AQUI, '.fuentes.json'), 'utf8'))

// La fachada se lee del entregable de Design y se incrusta. No entra en
// `.fuentes.json` a propósito: ese fichero lo comparten los cuatro reels
// anteriores y esta foto es de esta pieza.
const FACHADA = fs.readFileSync(
  path.join(AQUI, '..', 'docs', 'entrega', 'fotos', 'fachadas', 'fachada-ventanas.jpg'),
).toString('base64')

const C = {
  crema: '#FAF3E4', verde: '#14342A', naranja: '#C0662F',
}

const D = 15.0
const p = (t) => +Math.max(0, Math.min(100, t / D * 100)).toFixed(3)

// El alejamiento. Lineal y sobre los quince segundos enteros: si se acelerara
// al final se leería como un empujón de cámara, y esto es alejarse.
const Z0 = 1.14, Z1 = 1.00

// --- las doce ventanas ---------------------------------------------------
//
// `x`/`y` son la ETIQUETA en porcentaje sobre el lienzo final, tal cual la
// tabla de Design. `lado` dice hacia dónde crece el texto desde ese punto:
// 'izquierda' lo ancla por su borde izquierdo, 'derecha' por el derecho. Es lo
// que evita que W6 y W7 —misma fila— se pisen, y lo mismo con W11 y W12.
const VENTANAS = [
  { t: 0.60, x: 65, y: 7,  lado: 'izquierda', texto: 'Cancelando planes' },
  { t: 2.00, x: 80, y: 17, lado: 'derecha',   texto: 'Cenando sola' },
  { t: 3.30, x: 14, y: 26, lado: 'izquierda', texto: 'Viendo fotos viejas' },
  { t: 4.50, x: 80, y: 35, lado: 'derecha',   texto: 'Overthinking' },
  { t: 5.60, x: 62, y: 46, lado: 'izquierda', texto: 'Pidiendo delivery' },
  { t: 6.60, x: 34, y: 55, lado: 'derecha',   texto: 'Escribiéndole a la ex' },
  { t: 7.50, x: 80, y: 55, lado: 'derecha',   texto: 'Buscando quién esté libre' },
  { t: 8.30, x: 14, y: 64, lado: 'izquierda', texto: 'Diciendo «otro día»' },
  { t: 9.00, x: 14, y: 73, lado: 'izquierda', texto: 'Repasando el grupo sin escribir' },
  { t: 9.60, x: 58, y: 82, lado: 'derecha',   texto: 'Viendo stories' },
  { t: 10.10, x: 40, y: 92, lado: 'derecha',  texto: 'Comiendo de pie' },
  // Se acorta a propósito: es la etiqueta más larga en la ventana más pegada
  // al borde derecho, y las treinta letras completas invadían a W11 o se
  // salían del margen del 6%.
  { t: 10.50, x: 82, y: 92, lado: 'derecha',  texto: 'Poniéndose al día' },
]

// Se apagan en el mismo orden en que entraron, escalonadas, mientras entra la
// pregunta. La tabla de Design da el segundo exacto de cada una.
const APAGA = [11.00, 11.15, 11.30, 11.42, 11.52, 11.62, 11.72, 11.82, 11.92, 12.05, 12.20, 12.35]

const PREGUNTA_1 = 11.00, PREGUNTA_2 = 11.60
const SOMBRA = 12.00
const ARO = 13.00, FIRMA = 13.30

const kf = []

VENTANAS.forEach((v, i) => {
  const fuera = APAGA[i]
  // Entra con fundido de 0,25 s y sube 6 px. Sale con fundido de 0,15 s y sin
  // moverse: al apagarse no tiene que llamar la atención, tiene que dejar de
  // estar.
  kf.push(`@keyframes et${i}{0%,${p(v.t)}%{opacity:0;transform:translateY(6px)}
   ${p(v.t + 0.25)}%{opacity:1;transform:translateY(0)}
   ${p(fuera)}%{opacity:1;transform:translateY(0)}
   ${p(fuera + 0.15)}%,100%{opacity:0;transform:translateY(0)}}`)
})

kf.push(`@keyframes fondo{0%{transform:scale(${Z0})} 100%{transform:scale(${Z1})}}`)

kf.push(`@keyframes preg1{0%,${p(PREGUNTA_1)}%{opacity:0;transform:translateY(10px)}
 ${p(PREGUNTA_1 + 0.30)}%,100%{opacity:1;transform:translateY(0)}}`)
kf.push(`@keyframes preg2{0%,${p(PREGUNTA_2)}%{opacity:0;transform:translateY(10px)}
 ${p(PREGUNTA_2 + 0.30)}%,100%{opacity:1;transform:translateY(0)}}`)

// La sombra de abajo tapa el rótulo del edificio —«EDIFICIO CARACAS 72»,
// grabado en el hormigón—, que es el nombre de otro dentro de nuestra pieza.
//
// El guion pide «sube a 45% opacidad», y con un 45% plano NO tapa: se
// comprobó recortando la banda del rótulo del vídeo y el texto se sigue
// leyendo, solo que más oscuro. Un 45% no puede tapar nada, por definición.
//
// Así que el 45% se queda donde se ve —el cuerpo de la banda, que es lo que
// da el aspecto de sombra suave que pide el diseño— y solo la última franja,
// los cincuenta píxeles donde está el rótulo, llega a sólido. La capa sube a
// 1 y el degradado lleva la rampa. De lejos es la misma sombra; de cerca, el
// rótulo no está.
kf.push(`@keyframes sombra{0%,${p(SOMBRA)}%{opacity:0} ${p(SOMBRA + 1.0)}%,100%{opacity:1}}`)

kf.push(`@keyframes aro{0%,${p(ARO)}%{opacity:0;transform:scale(.9)}
 ${p(ARO + 0.40)}%,100%{opacity:1;transform:scale(1)}}`)
kf.push(`@keyframes firma{0%,${p(FIRMA)}%{opacity:0;transform:translateY(6px)}
 ${p(FIRMA + 0.40)}%,100%{opacity:1;transform:translateY(0)}}`)

// El aro de la marca, con sus proporciones: grosor 0,198 del radio y punto
// 0,221, el primero a las tres en punto.
const AR = 96
const AGROSOR = Math.round(AR * 0.198)
const APUNTO = Math.round(AR * 0.221 * 2)
const puntos = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = i * 60 * Math.PI / 180
  return [+(AR * Math.cos(a)).toFixed(2), +(AR * Math.sin(a)).toFixed(2)]
})

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Aro Club · reel 05 · ventanas</title>
<style>
@font-face{font-family:'Young Serif';src:url(data:font/ttf;base64,${F.YoungSerif}) format('truetype');font-display:block}
@font-face{font-family:'Inter Tight';font-weight:500;src:url(data:font/ttf;base64,${F.InterTightM}) format('truetype');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.verde};height:100%;overflow:hidden}
body{display:grid;place-items:center}
#marco{width:var(--w);height:var(--h);overflow:hidden;position:relative}
#lienzo{width:1080px;height:1920px;position:absolute;inset:0;overflow:hidden;
  background:${C.verde};color:${C.crema};transform-origin:top left;transform:scale(var(--s,1))}

/* La capa que se mueve. Las etiquetas van DENTRO: si fueran hermanas del
   fondo se despegarían de su ventana en cuanto empezara el alejamiento. */
#camara{position:absolute;inset:0;transform-origin:50% 50%;will-change:transform;
  animation:fondo ${D}s linear infinite}
#foto{position:absolute;inset:0;
  background:url(data:image/jpeg;base64,${FACHADA}) center/cover no-repeat}

.et{position:absolute;opacity:0;white-space:nowrap;z-index:3;
  font-family:'Young Serif',Georgia,serif;font-size:30px;line-height:1;
  color:${C.crema};letter-spacing:-.01em;
  text-shadow:0 2px 14px rgba(0,0,0,.72), 0 0 3px rgba(0,0,0,.55)}
${VENTANAS.map((v, i) => {
  const lado = v.lado === 'izquierda' ? `left:${v.x}%` : `right:${100 - v.x}%`
  return `.e${i}{${lado};top:${v.y}%;animation:et${i} ${D}s ease infinite}`
}).join('\n')}

/* Tapa el rótulo del edificio. Dentro de la cámara, para que suba con él. */
#sombra{position:absolute;left:0;right:0;bottom:0;height:26%;opacity:0;z-index:2;
  /* Negra, no verde. En verde de marca esto se leía como una neblina
     subiendo por la fachada en los últimos segundos, y una neblina de color
     sobre una foto nocturna se nota y parece un fallo de etalonaje. Una
     caída a negro sobre noche es invisible como recurso: se ve el efecto
     —el rótulo desaparece— y no se ve la capa. Mismo perfil de opacidad. */
  background:linear-gradient(180deg,
    rgba(0,0,0,0) 0%,
    rgba(0,0,0,.30) 55%,
    rgba(0,0,0,.45) 78%,
    rgba(0,0,0,.86) 92%,
    rgba(0,0,0,1) 97%,
    rgba(0,0,0,1) 100%);
  animation:sombra ${D}s ease infinite}

/* La pregunta y el cierre NO van en la cámara: son nuestros, no del edificio,
   y escalarlos un 14% los haría bailar sin motivo. */
.preg{position:absolute;left:80px;right:80px;text-align:center;opacity:0;z-index:6;
  font-family:'Young Serif',Georgia,serif;font-size:92px;line-height:1.08;
  letter-spacing:-.03em;color:${C.crema};
  text-shadow:0 3px 22px rgba(0,0,0,.7)}
#p1{top:770px;animation:preg1 ${D}s cubic-bezier(.2,1,.3,1) infinite}
#p2{top:880px;animation:preg2 ${D}s cubic-bezier(.2,1,.3,1) infinite}

#aro{position:absolute;left:540px;top:1240px;width:${AR * 2 + AGROSOR}px;height:${AR * 2 + AGROSOR}px;
  margin:-${AR + AGROSOR / 2}px 0 0 -${AR + AGROSOR / 2}px;opacity:0;z-index:6;
  animation:aro ${D}s cubic-bezier(.2,1,.3,1) infinite}
#aro .anillo{position:absolute;inset:0;border-radius:999px;border:${AGROSOR}px solid ${C.crema}}
#aro .pt{position:absolute;left:50%;top:50%;width:${APUNTO}px;height:${APUNTO}px;
  margin:-${APUNTO / 2}px 0 0 -${APUNTO / 2}px;border-radius:999px;background:${C.crema}}
${puntos.map(([x, y], i) => `#aro .pt${i}{transform:translate(${x}px,${y}px)}`).join('')}
#aro .pt0{background:${C.naranja}}

#firma{position:absolute;left:0;right:0;top:1400px;text-align:center;opacity:0;z-index:6;
  font-family:'Inter Tight',system-ui,sans-serif;font-weight:500;font-size:40px;
  color:${C.crema};letter-spacing:-.01em;
  animation:firma ${D}s ease infinite}
#firma span{color:${C.naranja}}

${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo">
  <div id="camara">
    <div id="foto"></div>
    <div id="sombra"></div>
    ${VENTANAS.map((v, i) => `<div class="et e${i}">${v.texto}</div>`).join('\n    ')}
  </div>

  <div class="preg" id="p1">¿Por qué no</div>
  <div class="preg" id="p2">juntarlos?</div>

  <div id="aro"><div class="anillo"></div>${puntos.map((_, i) => `<div class="pt pt${i}"></div>`).join('')}</div>
  <div id="firma">Aro Club · <span>aro.club · Caracas</span></div>
</div></div>
<script>
let real=false;
function ajusta(){const s=real?1:Math.min(innerHeight/1920,innerWidth/1080);const r=document.documentElement.style;
  r.setProperty('--s',s);r.setProperty('--w',Math.round(1080*s)+'px');r.setProperty('--h',Math.round(1920*s)+'px')}
addEventListener('resize',ajusta);ajusta();
addEventListener('keydown',e=>{if(e.key==='1'){real=!real;ajusta()}});
</script></body></html>`

fs.writeFileSync(path.join(AQUI, 'reel-05-ventanas.html'), html)
console.log(`reel-05-ventanas.html · ${D}s`)
console.log(`  ${VENTANAS.length} etiquetas de ${VENTANAS[0].t}s a ${VENTANAS[VENTANAS.length - 1].t}s`)
console.log(`  alejamiento ${Z0} → ${Z1} lineal, sin cortes`)
