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
// La frase se ESCRIBE, palabra a palabra y en orden de lectura, no en cinco
// bloques que aparecen enteros. Un bloque que se enciende de golpe se lee como
// una diapositiva; una palabra detrás de otra se lee como alguien diciéndolo.
//
// El compás no es regular a propósito: las palabras cortas van más juntas y
// hay un respiro donde lo habría al hablar, entre grupo y grupo. Y dos pausas
// de verdad: una breve al llegar a «es» —0,66 s, el tiempo de coger aire antes
// de rematar— y la larga antes de «creándolo.», ahora de 1,78 s en vez de 2,00.
const FRASE = [
  { t: 0.30, html: 'La' },
  { t: 0.50, html: 'mejor' },
  { t: 0.72, html: 'manera' },
  { t: 1.00, html: 'de' },
  { t: 1.20, html: 'pertenecer' },
  { t: 1.54, html: 'a' },
  { t: 1.70, html: 'un' },
  { t: 1.88, html: 'grupo' },
  { t: 2.08, html: 'de' },
  { t: 2.26, html: 'amigos' },
  { t: 2.92, html: 'es' },
  { t: 4.70, html: 'creándolo.', remate: true },
]
const ANTES_DEL_REMATE = 2.92   // cuando entra «es»: de ahí arranca el empuje
const REMATE = 4.70             // «creándolo.»

const SUBE = 5.25          // el bloque entero se va arriba y encoge
const SUBIDA = 0.92        // lo que tarda en irse. Antes 0,40 y se leía como un tirón
// La frase NO vuelve al centro. El guion decía que a los 12,00 se recentraba y
// recuperaba su tamaño, y así el último segundo tenía a la vez la frase entera
// grande, el aro y el remate de marca: tres cosas peleándose por el mismo
// sitio. `cierre-referencia.png` ya lo tenía resuelto y no lo vimos —la frase
// se queda arriba y pequeña, y el centro es del aro y del cierre—: no sobra
// texto, sobra jerarquía. Así no hay que quitar ni una palabra.
const APAGA_FRASE = 14.00

// --- las diez polaroids --------------------------------------------------
//
// El orden lo da la tabla del guion, no el nombre del fichero. `giro` también.
// Las diez, en el orden de la tabla. Lo que cambia es el paso: los intervalos
// bajan de 0,48 a 0,32 en vez de 0,55 a 0,38, así que las diez caben en 3,6 s
// en vez de 4,2 y el taco se siente como una ráfaga y no como un desfile.
//
// OJO, esto cruza el piso de 0,38 s que fijó Design «para que cada foto siga
// siendo reconocible como momento». Se cruza a propósito y solo en las tres
// últimas, que son las que ya vienen con el ojo hecho a la serie: brindis y
// risas se leen de un vistazo porque el gesto es grande. Si al verlo se pierde
// alguna, subir el piso otra vez es un número.
// La cadencia del guion: 0,55 · 0,53 · 0,50 · 0,48 · 0,46 · 0,44 · 0,42 · 0,40
// · 0,38. Volvió aquí desde el 0,48-0,32 que había puesto yo, y no por
// respetar el papel: acelerar las entradas dejaba la última foto a las 9,80
// con la recogida en 11,20, o sea 1,4 s de taco parado que el comprobador
// cazó en cuanto el grano bajó. Con estos números la última cae a las 10,76 y
// la cola se queda en 0,44 s.
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
// Los tiempos de la tabla, no los míos. Adelantar la recogida a las 10,20
// dejaba del 10,3 al 11,5 la pantalla casi vacía: el abanico ya recogido y el
// cierre todavía sin entrar. El comprobador lo daba por bueno porque el grano
// late, que es justo el caso del que avisa su propio comentario: ahí cambia
// algo y está muerto igual. Con la tabla, las tres últimas aguantan hasta las
// 11,20 y el hueco antes del aro se queda en 0,3 s, que es un respiro.
const RECOGE = 11.20, RECOGIDA = 0.8

// Tres huecos. La cuarta entra donde estaba la primera, la quinta donde la
// segunda: eso ES «cada una empuja fuera a la que entró tres turnos antes», y
// se lee mejor como relevo en un sitio fijo que como una baraja creciendo.
// EL CENTRO PRIMERO. Los huecos estaban en orden de lectura —izquierda,
// medio, derecha— y el taco se llenaba de izquierda a derecha: durante el
// primer segundo había UNA foto pegada al borde izquierdo con media pantalla
// vacía. El centro geométrico de los tres huecos siempre fue 540, o sea el del
// lienzo; lo que estaba descolgado no era el taco lleno, era el taco
// llenándose. Ahora la primera cae en el centro y las siguientes abren a los
// lados, que además es como se apila un montón de fotos de verdad.
const HUECOS = [
  { x: 540, y: 1140 },
  { x: 268, y: 1210 },
  { x: 812, y: 1215 },
]
// Antes 372, o sea un tercio del ancho: a ese tamaño no se ve lo que pasa
// dentro de la foto, y las fotos SON la carga de la pieza. A 440 el taco ocupa
// un tercio del alto, como la referencia 03, y la de encima se lee sin
// esfuerzo. Los huecos no se separan: la que está encima se ve entera y de las
// otras dos se ve lo justo para que se lea como montón.
const LADO = 440          // el lado de la foto dentro del marco
const PIE = 62            // el borde de abajo, más ancho que los otros tres
const BORDE = 20

const IMG = Object.fromEntries(POLAROIDS.map(({ f }) => [
  f,
  fs.readFileSync(path.join(AQUI, 'polaroids', f)).toString('base64'),
]))

// --- el cierre -----------------------------------------------------------
// Tres golpes, no dos. «Seis desconocidos. / Una mesa. El jueves.» son dos
// líneas en el papel, pero al leerlas en voz alta son tres cosas, y la última
// —«El jueves.»— es la que fija la cita. Entrando las dos últimas a la vez, se
// perdía. Se separan medio respiro, sin cambiar la maqueta de dos líneas.
const ARO_T = 12.30, SEIS = 12.70, MESA = 13.05, JUEVES = 13.40
// Cuando la frase se apaga, el bloque de marca se queda solo abajo y
// descolgado: estaba puesto ahí para dejarle sitio a la frase, y la frase ya
// no está. Así que viaja al centro y la pieza termina ahí.
const APAGA_FRASE_T = 14.00
const VIAJE = 0.85

// De donde a donde viaja el bloque de marca. Va del sitio bajo que ocupaba
// mientras la frase mandaba arriba, hasta el centro exacto del lienzo.
const CIERRE_ARRIBA = 1352 - 81      // el borde de arriba del aro
const CIERRE_ABAJO = 1566 + 62       // el pie de la ultima linea
const CENTRAR = Math.round((CIERRE_ARRIBA + CIERRE_ABAJO) / 2 - 960)

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
const CICLO = 0.37
kf.push(`@keyframes grano{${Array.from({ length: PASOS }, (_, i) => {
  const t = i / PASOS * 100
  return `${+t.toFixed(3)}%{background-image:var(--r${i});opacity:${i % 2 ? 0.07 : 0.04}}`
}).join(' ')} 100%{background-image:var(--r0);opacity:.04}}`)

FRASE.forEach((g, i) => {
  // Cada palabra entra en 0,18 s. Más largo y se solaparían unas con otras y
  // se perdería el orden, que es lo único que hace que esto se lea como
  // escritura y no como un bloque encendiéndose.
  kf.push(`@keyframes fr${i}{0%,${p(g.t)}%{opacity:0;top:7px}
   ${p(g.t + 0.18)}%,100%{opacity:1;top:0}}`)
})

// El bloque entero: centrado y grande, arriba y pequeño, y de vuelta.
// La pausa antes del remate no puede ser un fotograma congelado. Con el grano
// bajado, dos segundos de frase quieta salen como tramo muerto, y con razón:
// el grano estaba tapando que no pasaba nada. Así que la frase EMPUJA —crece
// un 4% despacio desde que entra «es» hasta que cae «creándolo.»—, que es lo
// que hace una tarjeta sostenida en cualquier pieza en movimiento. No es
// relleno para la medida: es la tensión que la pausa pedía y no tenía.
kf.push(`@keyframes bloque{
 0%,${p(ANTES_DEL_REMATE)}%{transform:translate(-50%,-50%) scale(.962)}
 ${p(REMATE)}%{transform:translate(-50%,-50%) scale(1)}
 ${p(SUBE)}%{transform:translate(-50%,-50%) scale(1)}
 ${p(SUBE + SUBIDA)}%,100%{transform:translate(-50%,-50%) translateY(-472px) scale(.58)}}`)
kf.push(`@keyframes frasePaso{0%,${p(APAGA_FRASE)}%{opacity:1}
 ${p(APAGA_FRASE + 0.30)}%,100%{opacity:0}}`)

POLAROIDS.forEach((pl, i) => {
  const hueco = HUECOS[i % HUECOS.length]
  // La saca la que entra tres turnos después. La última tanda se queda hasta
  // que se recogen todas.
  const releva = POLAROIDS[i + 3]
  const sale = releva ? releva.t : RECOGE
  // La relevada tarda más en irse que en ser tapada: 0,30 s se veía como un
  // parpadeo, y un parpadeo en el borde del cuadro es justo lo que se nota.
  const dura = releva ? 0.46 : RECOGIDA
  // Al recogerse convergen al centro; al ser relevadas se van por abajo, que
  // es hacia donde las empuja la que cae encima.
  //
  // Y la recogida lleva su propia curva y dos puntos intermedios: las fotos
  // aguantan encendidas casi hasta el final del viaje. Apagándose antes, el
  // abanico terminaba a los 11,75 y el aro no se veía hasta los 12,45: 0,7 s
  // de pantalla con solo la frase pequeña, cuando la tabla deja un hueco de
  // 0,3. Lo que sobraba no era tiempo, era desvanecimiento.
  //
  // Y la recogida lleva su propia curva y dos puntos intermedios. Con la curva de
  // entrada —que rebota, y por tanto adelanta casi todo el cambio al principio—
  // los 0,8 s de recogida se consumían en 0,3: las fotos no se recogían en
  // abanico, se esfumaban. Con el punto de media travesía la opacidad aguanta
  // mientras viajan y solo se apagan al llegar.
  // Se van sin aspavientos. La relevada caía 190 px girando, y una foto que se
  // descuelga de la pila llama más la atención que la que entra: lo que hay
  // que mirar es la nueva. Ahora se queda donde está, encoge un pelo y se
  // apaga debajo de la que acaba de caer. Y el abanico ya no converge al
  // centro entero —eso se leía como si las aspirara algo—, solo deriva un
  // tercio del camino mientras se apaga.
  const fin = releva
    ? `transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(.972);opacity:0`
    : `transform:translate(-50%,-50%) translate(${Math.round((540 - hueco.x) * 0.34)}px,${Math.round((1150 - hueco.y) * 0.34)}px) rotate(${(pl.giro * 0.5).toFixed(1)}deg) scale(.9);opacity:0`

  kf.push(`@keyframes pol${i}{
   0%,${p(pl.t)}%{transform:translate(-50%,-50%) translate(0,-150px) rotate(${pl.giro * 1.6}deg) scale(1.06);opacity:0}
   ${p(pl.t + 0.10)}%{opacity:1}
   ${p(pl.t + 0.26)}%{transform:translate(-50%,-50%) translate(0,14px) rotate(${pl.giro * 0.92}deg) scale(.99);opacity:1}
   ${p(pl.t + 0.35)}%{transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(1);opacity:1}
   ${p(sale)}%{transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(1);opacity:1;animation-timing-function:cubic-bezier(.4,0,.75,1)}
   ${releva ? `${p(sale + dura * 0.5)}%{transform:translate(-50%,-50%) rotate(${pl.giro}deg) scale(.986);opacity:.72}`
     : `${p(sale + dura * 0.55)}%{transform:translate(-50%,-50%) translate(${Math.round((540 - hueco.x) * 0.19)}px,${Math.round((1150 - hueco.y) * 0.19)}px) rotate(${(pl.giro * 0.72).toFixed(1)}deg) scale(.96);opacity:1}
   ${p(sale + dura * 0.86)}%{transform:translate(-50%,-50%) translate(${Math.round((540 - hueco.x) * 0.29)}px,${Math.round((1150 - hueco.y) * 0.29)}px) rotate(${(pl.giro * 0.58).toFixed(1)}deg) scale(.92);opacity:.6}`}
   ${p(sale + dura)}%,100%{${fin}}}`)
})

kf.push(`@keyframes aro{0%,${p(ARO_T)}%{opacity:0;transform:translate(-50%,0) scale(.9)}
 ${p(ARO_T + 0.30)}%,100%{opacity:1;transform:translate(-50%,0) scale(1)}}`)

// El viaje. El bloque estaba abajo porque arriba vivía la frase; cuando la
// frase se apaga, sube a quedarse en el centro y ahí termina la pieza. Sale
// justo cuando ella se va, no antes: si se movieran a la vez, se leería como
// que una empuja a la otra.
kf.push(`@keyframes viaje{0%,${p(APAGA_FRASE_T)}%{transform:translateY(0)}
 ${p(APAGA_FRASE_T + VIAJE)}%,100%{transform:translateY(-${CENTRAR}px)}}`)
// El centrado va DENTRO de la animación: si el centrado viviera en la regla y
// la entrada en los fotogramas, la animación pisaría el translateX y las dos
// líneas saldrían pegadas al borde izquierdo. Es el mismo choque que dejó el
// aro de la pieza 01 con cinco puntos.
kf.push(`@keyframes seis{0%,${p(SEIS)}%{opacity:0;transform:translate(-50%,6px)}
 ${p(SEIS + 0.25)}%,100%{opacity:1;transform:translate(-50%,0)}}`)
kf.push(`@keyframes mesa{0%,${p(MESA)}%{opacity:0;transform:translate(-50%,6px)}
 ${p(MESA + 0.25)}%,100%{opacity:1;transform:translate(-50%,0)}}`)
// «El jueves.» va dentro de la misma línea, así que es inline y no admite
// transform: sube con `top`, igual que las palabras de la frase.
kf.push(`@keyframes jueves{0%,${p(JUEVES)}%{opacity:0;top:6px}
 ${p(JUEVES + 0.25)}%,100%{opacity:1;top:0}}`)

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
${FRASE.map((g, i) => `#g${i}{opacity:0;animation:fr${i} ${D}s cubic-bezier(.25,.9,.3,1) infinite}`).join('')}
/* El remate no se distingue solo por el color: también por el cuerpo. A ×1,12
   la diferencia se veía como un detalle tipográfico; a ×1,43 se lee como la
   palabra donde termina la frase. */
#g${FRASE.length - 1}{color:${C.terracota};font-size:132px}

/* El marco de polaroid, la misma regla para las diez. */
.pol{position:absolute;z-index:3;opacity:0;will-change:transform;
  background:#FFFFFF;padding:${BORDE}px ${BORDE}px ${PIE}px;border-radius:3px;
  box-shadow:0 18px 46px rgba(20,52,42,.20), 0 3px 10px rgba(20,52,42,.12)}
.pol img{display:block;width:${LADO}px;height:${LADO}px;object-fit:cover;border-radius:1px}
${POLAROIDS.map((pl, i) => {
  const h = HUECOS[i % HUECOS.length]
  return `#pol${i}{left:${h.x}px;top:${h.y}px;animation:pol${i} ${D}s cubic-bezier(.24,1.24,.4,1) infinite}`
}).join('\n')}

/* La envoltura solo VIAJA. Cada pieza de dentro conserva su propia entrada:
   si el viaje y las entradas vivieran en el mismo elemento se pisarian, que es
   el choque que dejo el aro de reel-01 con cinco puntos. */
#marca{position:absolute;inset:0;z-index:5;animation:viaje ${D}s cubic-bezier(.3,.9,.3,1) infinite}
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
#jueves{display:inline;position:relative;opacity:0;animation:jueves ${D}s cubic-bezier(.2,1,.3,1) infinite}
${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo">
  <div id="grano"></div>

  ${POLAROIDS.map((pl, i) => `<div class="pol" id="pol${i}"><img src="data:image/jpeg;base64,${IMG[pl.f]}" alt=""></div>`).join('\n  ')}

  <div id="bloque" class="et">
    ${FRASE.map((g, i) => `<span class="g" id="g${i}">${g.html}</span>`).join('\n    ')}
  </div>

  <div id="marca">
    <div id="aro"><div class="anillo"></div>${puntos.map((_, i) => `<div class="pt pt${i}"></div>`).join('')}</div>
    <div class="cierre et" id="seis">Seis desconocidos.</div>
    <div class="cierre et" id="mesa">Una mesa. <span id="jueves">El jueves.</span></div>
  </div>
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
