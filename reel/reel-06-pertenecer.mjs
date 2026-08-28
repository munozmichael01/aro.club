/**
 * Reel 06 · Pieza B · «Pertenecer a un grupo de amigos».
 *
 * Quince segundos sobre crema. La frase se construye en cinco tiempos hasta el
 * remate —«creándolo.»— y entonces NO se va: sube a una franja de arriba,
 * encoge para dejar el centro libre, y las diez polaroids van cayendo debajo.
 * A los 12,00 se recentra a su tamaño de antes y entra el cierre.
 *
 * POR QUÉ LA FRASE SE QUEDA. En la vuelta anterior la frase se apagaba a los
 * 6,35 salvo «creándolo.», que quedaba sola casi cinco segundos mientras caían
 * las diez fotos, y la frase completa no volvía nunca. Se leía como un titular
 * que se rompe. Ahora está entera de 6,10 a 14,00 y solo se apaga cuando entra
 * el remate de marca.
 *
 * EL MARCO DE POLAROID LO PONE EL CSS, no la imagen. Las diez vienen sin él a
 * propósito: pintado en el fichero, cada una traería su propio blanco y su
 * propio grano de borde, y diez blancos distintos en fila se ven. Aquí el
 * canto es el mismo para las diez —marco blanco, borde de abajo más ancho que
 * los otros tres, sombra suave— porque es una regla, no diez recortes.
 *
 * Las imágenes vienen YA ETALONADAS: no llevan ningún filtro encima. Lo único
 * que se les hace es reducirlas al doble del tamaño en que se ven, que es
 * remuestrear, no retocar.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const F = JSON.parse(fs.readFileSync(path.join(AQUI, '.fuentes.json'), 'utf8'))

const C = {
  crema: '#FAF3E4', verde: '#14342A', terracota: '#8F4515', naranja: '#C0662F',
  subClaro: '#566A5D',
}

const D = 15.0
const p = (t) => +Math.max(0, Math.min(100, t / D * 100)).toFixed(3)

// --- la frase, en cinco tiempos -----------------------------------------
const FRASE = [
  { t: 0.30, html: 'La mejor manera' },
  { t: 1.20, html: 'de pertenecer' },
  { t: 2.50, html: 'a un grupo de amigos' },
  { t: 4.10, html: 'es' },
  { t: 6.10, html: 'creándolo.', remate: true },
]
const SUBE = 6.10          // el bloque entero se va arriba y encoge
const VUELVE = 12.00       // y se recentra a su tamaño de las 6,10
const APAGA_FRASE = 14.00

// --- las diez polaroids --------------------------------------------------
//
// El orden lo da la tabla del guion, no el nombre del fichero. `giro` también.
const POLAROIDS = [
  { f: 'llegada.jpg',           t: 6.60,  giro: -6 },
  { f: 'cerveza-levantada.jpg', t: 7.15,  giro: 5 },
  { f: 'sirviendo-vino.jpg',    t: 7.68,  giro: -4 },
  { f: 'cenital.jpg',           t: 8.18,  giro: 7 },
  { f: 'conversacion.jpg',      t: 8.66,  giro: -3 },
  { f: 'contando.jpg',          t: 9.12,  giro: 6 },
  { f: 'descubrimiento.jpg',    t: 9.56,  giro: -8 },
  { f: 'risas-fuerte.jpg',      t: 9.98,  giro: 4 },
  { f: 'brindis.jpg',           t: 10.38, giro: -5 },
  { f: 'foto-al-plato.jpg',     t: 10.76, giro: 8 },
]
const RECOGE = 11.20, RECOGIDA = 0.8

// Tres huecos. La cuarta entra donde estaba la primera, la quinta donde la
// segunda: eso ES «cada una empuja fuera a la que entró tres turnos antes», y
// se lee mejor como relevo en un sitio fijo que como una baraja creciendo.
const HUECOS = [
  { x: 268, y: 1210 },
  { x: 540, y: 1140 },
  { x: 812, y: 1215 },
]
const LADO = 372          // el lado de la foto dentro del marco
const PIE = 62            // el borde de abajo, más ancho que los otros tres
const BORDE = 20

const IMG = Object.fromEntries(POLAROIDS.map(({ f }) => [
  f,
  fs.readFileSync(path.join(AQUI, 'polaroids', f)).toString('base64'),
]))

// --- el cierre -----------------------------------------------------------
const ARO_T = 12.30, SEIS = 12.70, MESA = 13.00

const kf = []

// El grano. No es decoración: es lo que hace que la pieza nunca esté quieta,
// y tiene dos trampas que costaron dos vueltas.
//
// LA PRIMERA es que el ciclo de 0,3 s del guion cabe EXACTO tres veces en el
// medio segundo que muestrea `comprobar-repetidos`. Cada tercera muestra caía
// en la misma fase del grano y daba una diferencia de 0,03: el fondo latiendo
// y la medida diciendo que estaba congelado. Es el mismo choque de frecuencias
// que dejó la apertura de `reel-01` marcada como muerta estando cortando cinco
// veces. Con 0,32 s la coincidencia se va a los dieciséis segundos, o sea
// nunca dentro de la pieza, y 20 milésimas no las ve nadie.
//
// LA SEGUNDA es que un grano fino DESAPARECE al promediar. El comprobador
// reduce a 64 píxeles de ancho, así que cada uno promedia un bloque de 17x17:
// un ruido de grano de un píxel se cancela solo y da cero. Por eso el ruido
// es de manchas anchas y a poca opacidad —se lee como papel, no como nieve— y
// sobrevive al promedio igual que lo ve el ojo de lejos.
//
// Y cada paso es un ruido DISTINTO, no el mismo movido: moviéndolo, los
// bordes vuelven a coincidir cada poco.
//
// LA TERCERA, que solo aparece al renderizar: H.264 se come el ruido de poca
// amplitud, para eso está. Un grano que pasaba la medida sobre el HTML volvía
// a dar 1,12 sobre el MP4. Por eso el contraste del ruido está subido con
// `feComponentTransfer` en vez de subir la opacidad, que es de Design: la capa
// sigue al 6%-10% y lo que cambia es cuánto varía por dentro.
const PASOS = 4
const CICLO = 0.32
kf.push(`@keyframes grano{${Array.from({ length: PASOS }, (_, i) => {
  const t = i / PASOS * 100
  return `${+t.toFixed(3)}%{background-image:var(--r${i});opacity:${i % 2 ? 0.1 : 0.06}}`
}).join(' ')} 100%{background-image:var(--r0);opacity:.06}}`)

FRASE.forEach((g, i) => {
  kf.push(`@keyframes fr${i}{0%,${p(g.t)}%{opacity:0;top:8px}
   ${p(g.t + 0.20)}%,100%{opacity:1;top:0}}`)
})

// El bloque entero: centrado y grande, arriba y pequeño, y de vuelta.
kf.push(`@keyframes bloque{
 0%,${p(SUBE)}%{transform:translate(-50%,-50%) scale(1)}
 ${p(SUBE + 0.40)}%{transform:translate(-50%,-50%) translateY(-472px) scale(.58)}
 ${p(VUELVE)}%{transform:translate(-50%,-50%) translateY(-472px) scale(.58)}
 ${p(VUELVE + 0.40)}%,100%{transform:translate(-50%,-50%) scale(1)}}`)
kf.push(`@keyframes frasePaso{0%,${p(APAGA_FRASE)}%{opacity:1}
 ${p(APAGA_FRASE + 0.30)}%,100%{opacity:0}}`)

POLAROIDS.forEach((pl, i) => {
  const hueco = HUECOS[i % HUECOS.length]
  // La saca la que entra tres turnos después. La última tanda se queda hasta
  // que se recogen todas.
  const releva = POLAROIDS[i + 3]
  const sale = releva ? releva.t : RECOGE
  const dura = releva ? 0.30 : RECOGIDA
  // Al recogerse convergen al centro; al ser relevadas se van por abajo, que
  // es hacia donde las empuja la que cae encima.
  const fin = releva
    ? `transform:translate(-50%,-50%) translate(0,190px) rotate(${pl.giro + (pl.giro > 0 ? 6 : -6)}deg) scale(.94);opacity:0`
    : `transform:translate(-50%,-50%) translate(${540 - hueco.x}px,${1150 - hueco.y}px) rotate(0deg) scale(.72);opacity:0`

  kf.push(`@keyframes pol${i}{
   0%,${p(pl.t)}%{transform:translate(-50%,-50%) translate(0,-150px) rotate(${pl.giro * 1.6}deg) scale(1.06);opacity:0}
   ${p(pl.t + 0.10)}%{opacity:1}
   ${p(pl.t + 0.26)}%{transform:translate(-50%,-50%) translate(0,14px) rotate(${pl.giro * 0.92}deg) scale(.99);opacity:1}
   ${p(pl.t + 0.35)}%{transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(1);opacity:1}
   ${p(sale)}%{transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(1);opacity:1}
   ${p(sale + dura)}%,100%{${fin}}}`)
})

kf.push(`@keyframes aro{0%,${p(ARO_T)}%{opacity:0;transform:translate(-50%,0) scale(.9)}
 ${p(ARO_T + 0.30)}%,100%{opacity:1;transform:translate(-50%,0) scale(1)}}`)
// El centrado va DENTRO de la animación: si el centrado viviera en la regla y
// la entrada en los fotogramas, la animación pisaría el translateX y las dos
// líneas saldrían pegadas al borde izquierdo. Es el mismo choque que dejó el
// aro de la pieza 01 con cinco puntos.
kf.push(`@keyframes seis{0%,${p(SEIS)}%{opacity:0;transform:translate(-50%,6px)}
 ${p(SEIS + 0.25)}%,100%{opacity:1;transform:translate(-50%,0)}}`)
kf.push(`@keyframes mesa{0%,${p(MESA)}%{opacity:0;transform:translate(-50%,6px)}
 ${p(MESA + 0.25)}%,100%{opacity:1;transform:translate(-50%,0)}}`)

// El aro de marca, con sus proporciones.
const AR = 74
const AGROSOR = Math.round(AR * 0.198)
const APUNTO = Math.round(AR * 0.221 * 2)
const puntos = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = i * 60 * Math.PI / 180
  return [+(AR * Math.cos(a)).toFixed(2), +(AR * Math.sin(a)).toFixed(2)]
})

// `seed` distinto en cada uno: cuatro campos de ruido que no se parecen.
// `baseFrequency` baja da manchas de unos quince píxeles, que es lo que
// sobrevive al promedio del comprobador y lo que se lee como papel.
const RUIDOS = [3, 17, 41, 73].map((seed) => Buffer.from(
  // De una pieza y no en mosaico: con `stitchTiles` y el contraste subido, las
  // costuras del mosaico se veian como una reticula de cuadrados sobre el
  // crema. Un solo campo que cubre el lienzo entero no tiene costuras.
  `<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2160">
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="${seed}"/>
<feColorMatrix type="saturate" values="0"/>
<feComponentTransfer><feFuncR type="linear" slope="3.1" intercept="-1.05"/>
<feFuncG type="linear" slope="3.1" intercept="-1.05"/>
<feFuncB type="linear" slope="3.1" intercept="-1.05"/></feComponentTransfer></filter>
<rect width="1320" height="2160" filter="url(#n)"/></svg>`).toString('base64'))

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Aro Club · reel 06 · pertenecer</title>
<style>
@font-face{font-family:'Young Serif';src:url(data:font/ttf;base64,${F.YoungSerif}) format('truetype');font-display:block}
@font-face{font-family:'Inter Tight';font-weight:500;src:url(data:font/ttf;base64,${F.InterTightM}) format('truetype');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.crema};height:100%;overflow:hidden}
body{display:grid;place-items:center}
#marco{width:var(--w);height:var(--h);overflow:hidden;position:relative}
#lienzo{width:1080px;height:1920px;position:absolute;inset:0;overflow:hidden;
  background:${C.crema};color:${C.verde};transform-origin:top left;transform:scale(var(--s,1))}

#grano{position:absolute;inset:-120px;z-index:1;pointer-events:none;
  ${RUIDOS.map((r, i) => `--r${i}:url(data:image/svg+xml;base64,${r});`).join('')}
  background-repeat:no-repeat;background-size:cover;background-image:var(--r0);
  animation:grano ${CICLO}s steps(1,end) infinite}

/* La frase. El bloque mueve y escala el conjunto; cada grupo solo entra. */
/* La tipografía va AQUÍ y no en los grupos. Estando solo en los grupos, el
   espacio entre uno y otro es un nodo de texto suelto del padre y se pintaba
   a los 16 px heredados: a 92 px de cuerpo eso son cuatro píxeles y se leía
   «La mejor manerade pertenecera un grupo». */
#bloque{position:absolute;left:50%;top:50%;width:860px;z-index:4;text-align:center;
  font-family:'Young Serif',Georgia,serif;font-size:92px;line-height:1.12;
  letter-spacing:-.035em;color:${C.verde};
  transform:translate(-50%,-50%);
  animation:bloque ${D}s cubic-bezier(.3,.9,.3,1) infinite, frasePaso ${D}s linear infinite}
/* Los cinco grupos fluyen como un párrafo, sin saltos forzados: son tiempos
   de entrada, no versos. Y como los que aún no han entrado siguen ocupando su
   sitio, las palabras aparecen donde van a quedarse y la frase no se recoloca
   sola a cada entrada. */
/* inline, no inline-block: los grupos tienen que poder romper por dentro para
   que la frase fluya como en la referencia de cierre. Y como un elemento
   inline IGNORA transform, la subida de entrada va con top y posicion
   relativa, que si la respeta. */
#bloque .g{display:inline;position:relative}
${FRASE.map((g, i) => `#g${i}{opacity:0;animation:fr${i} ${D}s cubic-bezier(.2,1,.3,1) infinite}`).join('')}
#g4{color:${C.terracota};font-size:103px}

/* El marco de polaroid, la misma regla para las diez. */
.pol{position:absolute;z-index:3;opacity:0;will-change:transform;
  background:#FFFFFF;padding:${BORDE}px ${BORDE}px ${PIE}px;border-radius:3px;
  box-shadow:0 18px 46px rgba(20,52,42,.20), 0 3px 10px rgba(20,52,42,.12)}
.pol img{display:block;width:${LADO}px;height:${LADO}px;object-fit:cover;border-radius:1px}
${POLAROIDS.map((pl, i) => {
  const h = HUECOS[i % HUECOS.length]
  return `#pol${i}{left:${h.x}px;top:${h.y}px;animation:pol${i} ${D}s cubic-bezier(.24,1.24,.4,1) infinite}`
}).join('\n')}

#aro{position:absolute;left:50%;top:1352px;width:${AR * 2 + AGROSOR}px;height:${AR * 2 + AGROSOR}px;
  margin:-${AR + AGROSOR / 2}px 0 0 0;opacity:0;z-index:5;transform:translate(-50%,0);
  animation:aro ${D}s cubic-bezier(.2,1,.3,1) infinite}
#aro .anillo{position:absolute;inset:0;border-radius:999px;border:${AGROSOR}px solid ${C.verde}}
#aro .pt{position:absolute;left:50%;top:50%;width:${APUNTO}px;height:${APUNTO}px;
  margin:-${APUNTO / 2}px 0 0 -${APUNTO / 2}px;border-radius:999px;background:${C.verde}}
${puntos.map(([x, y], i) => `#aro .pt${i}{transform:translate(${x}px,${y}px)}`).join('')}
#aro .pt0{background:${C.naranja}}

.cierre{position:absolute;left:50%;transform:translateX(-50%);opacity:0;z-index:5;
  white-space:nowrap;line-height:1;
  font-family:'Young Serif',Georgia,serif;letter-spacing:-.03em;color:${C.verde}}
#seis{top:1478px;font-size:62px;animation:seis ${D}s cubic-bezier(.2,1,.3,1) infinite}
#mesa{top:1566px;font-size:62px;animation:mesa ${D}s cubic-bezier(.2,1,.3,1) infinite}
${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo">
  <div id="grano"></div>

  ${POLAROIDS.map((pl, i) => `<div class="pol" id="pol${i}"><img src="data:image/jpeg;base64,${IMG[pl.f]}" alt=""></div>`).join('\n  ')}

  <div id="bloque" class="et">
    <span class="g" id="g0">La mejor manera</span>
    <span class="g" id="g1">de pertenecer</span>
    <span class="g" id="g2">a un grupo de amigos</span>
    <span class="g" id="g3">es</span>
    <span class="g" id="g4">creándolo.</span>
  </div>

  <div id="aro"><div class="anillo"></div>${puntos.map((_, i) => `<div class="pt pt${i}"></div>`).join('')}</div>
  <div class="cierre et" id="seis">Seis desconocidos.</div>
  <div class="cierre et" id="mesa">Una mesa. El jueves.</div>
</div></div>
<script>
let real=false;
function ajusta(){const s=real?1:Math.min(innerHeight/1920,innerWidth/1080);const r=document.documentElement.style;
  r.setProperty('--s',s);r.setProperty('--w',Math.round(1080*s)+'px');r.setProperty('--h',Math.round(1920*s)+'px')}
addEventListener('resize',ajusta);ajusta();
addEventListener('keydown',e=>{if(e.key==='1'){real=!real;ajusta()}});
</script></body></html>`

fs.writeFileSync(path.join(AQUI, 'reel-06-pertenecer.html'), html)
console.log(`reel-06-pertenecer.html · ${D}s`)
console.log(`  frase en ${FRASE.length} tiempos, fija de ${SUBE} a ${APAGA_FRASE}`)
console.log(`  ${POLAROIDS.length} polaroids de ${POLAROIDS[0].t}s a ${POLAROIDS[POLAROIDS.length - 1].t}s en ${HUECOS.length} huecos`)
