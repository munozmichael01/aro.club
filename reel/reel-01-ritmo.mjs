/**
 * Reel 01 · segunda vuelta: el mismo contenido con ritmo.
 *
 * No sustituye a `reel-01`. Existe para poder COMPARAR: mismo copy, misma
 * duración aproximada, y lo único que cambia es cuándo y cómo entra cada
 * cosa. Si el diagnóstico era correcto, esto se siente vivo y el otro no; si
 * los dos se sienten igual, el diagnóstico estaba mal y mejor saberlo antes
 * de gastar en generar metraje.
 *
 * Las siete reglas, y dónde está cada una:
 *
 *  1 · Ningún fotograma se repite → el grano salta de posición doce veces por
 *      segundo. Es la única forma barata de garantizarlo sin estrobo.
 *  2 · El texto entra por grupos cortos → el gancho llega en tres tiempos y
 *      el cierre en cuatro. Nunca una frase entera de golpe.
 *  3 · La palabra que carga la frase cambia de color dentro de la línea →
 *      «con QUIÉN cenas», «Seis DESCONOCIDOS».
 *  4 · Nada quieto más de 2 s → la lista no se queda puesta: en cuanto entra
 *      la sexta, las viñetas se sueltan y empieza el vuelo.
 *  5 · El compás varía → el gancho respira, la lista acelera (0,46 → 0,36) y
 *      el cierre frena. Eso es lo que hace que se sienta música y no metrónomo.
 *  6 · El fondo siempre tiene una capa viva → grano animado, un alejamiento
 *      lento sobre la foto, y un parpadeo de tres cuadros en el giro del
 *      gancho, que es el único sitio donde un golpe seco significa algo.
 *  7 · Todo cierra, y el cierre también se mueve → el punto naranja late.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const F = JSON.parse(fs.readFileSync(path.join(AQUI, '.fuentes.json'), 'utf8'))

const C = {
  verde: '#14342A', crema: '#FAF3E4', naranja: '#E39C63', salvia: '#9CBBA6',
  terracota: '#8F4515', verdeTexto: '#14342A', subClaro: '#566A5D',
}

const D = 16.6
const p = (t) => +Math.max(0, Math.min(100, t / D * 100)).toFixed(3)

// El aro, con las proporciones del fichero de marca: grosor 0,198 del radio,
// punto 0,221, y el primero a las TRES en punto.
const R = 300, CX = 540, CY = 700
const GROSOR = Math.round(R * 0.198)          // 59
const PUNTO = Math.round(R * 0.221 * 2)       // 133 de diámetro
const silla = (i) => {
  const a = i * 60 * Math.PI / 180
  return [+(CX + R * Math.cos(a)).toFixed(2), +(CY + R * Math.sin(a)).toFixed(2)]
}

// --- el guion, con sus tiempos ------------------------------------------
// Regla 2: el gancho en tres grupos. Regla 3: «quién» carga la frase.
const GANCHO = [
  { t: 0.35, html: 'Ya sabemos' },
  { t: 0.82, html: 'con <em>quién</em> cenas' },
  { t: 1.32, html: 'el jueves.' },
]
const TU_NO = 2.15, TODAVIA = 3.20, SALE_GANCHO = 4.35
const PARPADEO = [TU_NO - 0.12, TODAVIA - 0.12]   // regla 6: un golpe en cada giro

const SIN = [
  ['perfiles', 'No hay nadie a quien mirar antes'],
  ['swipe', 'No eliges, y nadie te elige'],
  ['fotos', 'De ti no se ve ninguna, nunca'],
  ['apellidos', 'Nadie puede buscarte antes de conocerte'],
  ['chat previo', 'La primera conversación es en la mesa'],
  ['saber con quién', 'Hasta el jueves a las doce del mediodía'],
]
// Regla 5: la lista ACELERA. Un compás fijo se oye como metrónomo.
const PASOS = [0.46, 0.44, 0.42, 0.40, 0.38]
const LISTA_0 = 4.72
const ENTRA = SIN.map((_, i) => +(LISTA_0 + PASOS.slice(0, i).reduce((a, b) => a + b, 0)).toFixed(3))
const CREMA_IN = 4.52

// Regla 4: la lista NO se queda puesta. En cuanto entra la sexta, el texto
// se retira y las viñetas se sueltan.
const SALE_LISTA = ENTRA[5] + 1.05
const CREMA_OUT = SALE_LISTA + 0.55
const VUELA = SALE_LISTA + 0.30
const CIERRA = VUELA + 1.45
const FLASH = CIERRA - 0.05

const CIERRE = [
  { t: CIERRA + 0.22, html: 'Seis' },
  { t: CIERRA + 0.62, html: '<em>desconocidos.</em>' },
  { t: CIERRA + 1.12, html: 'Una mesa.' },
  { t: CIERRA + 1.60, html: 'El jueves.' },
]
const SALE_CIERRE = CIERRA + 4.05
const FIRMA = SALE_CIERRE + 0.30
const FIRMA_URL = FIRMA + 1.15

const kf = []

// --- regla 1 y 6: el grano no para -------------------------------------
// Doce saltos por segundo, en pasos: garantiza que no haya dos fotogramas
// iguales sin que se vea un estrobo.
const SALTOS = 12
kf.push(`@keyframes grano{${Array.from({ length: SALTOS }, (_, i) =>
  `${(i / SALTOS * 100).toFixed(2)}%{background-position:${(i * 37) % 200}px ${(i * 61) % 200}px}`).join(' ')} 100%{background-position:0 0}}`)

// --- la foto: alejamiento lento + el parpadeo del giro -------------------
kf.push(`@keyframes foto{
  0%{opacity:1;transform:scale(1.18)}
  ${p(SALE_GANCHO)}%{opacity:1;transform:scale(1.005)}
  ${p(SALE_GANCHO + 1.3)}%,100%{opacity:0;transform:scale(1)}}`)
// El fondo de la apertura ALTERNA entre la foto y el crema, de forma continua
// y con salto seco, como en `docs/referencias-reels/02-cortes-en-crema/`.
//
// Antes eran tres destellos sueltos —2,0 s, 2,2 s y 3,1 s— con huecos de 0,2 s
// y de 0,9 s entre ellos, y el resto del tramo era la misma foto quieta cuatro
// segundos y medio. Tres destellos en cuatro segundos no se leen como un
// ritmo: se leen como un fallo de reproducción. Y de paso eran lo que hacía
// que `comprobar-repetidos` no cazara la apertura congelada: el fondo cambiaba
// tres veces, que basta para la medida y no basta para el ojo. Lo dice el
// comentario del propio comprobador —«¿cambió algo?» no es la pregunta, la
// pregunta es cuánto—, y con el parpadeo continuo deja de ser un problema de
// métrica para dejar de ser un problema.
//
// Cada estado dura entre 0,27 s y 0,33 s, que es lo medido en la referencia
// (8 a 10 fotogramas a 30 fps). No fijo: un compás exacto se oye como
// metrónomo, que es la misma regla 5 que hace acelerar la lista.
const PARP_0 = GANCHO[0].t + 0.10
const DURAS = [0.30, 0.27, 0.33, 0.29, 0.32, 0.28, 0.31, 0.27]
const CORTES = []
for (let t = PARP_0, k = 0; t < SALE_GANCHO; k++) {
  const d = DURAS[k % DURAS.length]
  CORTES.push([+t.toFixed(3), k % 2 === 1])   // impar = crema
  t += d
}
// Salto seco: el valor viejo se mantiene hasta una milésima antes del corte.
const pista = (alto, bajo) => CORTES.map(([t, crema], i) => {
  const v = crema ? alto : bajo
  return i === 0 ? `${p(t - 0.001)}%{${bajo}} ${p(t)}%{${v}}` : `${p(t - 0.001)}%{${CORTES[i - 1][1] ? alto : bajo}} ${p(t)}%{${v}}`
}).join(' ')

kf.push(`@keyframes parpadeo{0%{opacity:0}
 ${pista('opacity:1', 'opacity:0')}
 ${p(SALE_GANCHO - 0.001)}%{opacity:${CORTES[CORTES.length - 1][1] ? 1 : 0}}
 ${p(SALE_GANCHO)}%,100%{opacity:0}}`)

// Y el titular no se mueve: cambia de color para que se lea sobre el crema.
//
// Esto era la otra mitad del fallo. `.gancho` hereda el crema de `#lienzo`, y
// sobre un fondo crema el texto crema no se va: se vuelve invisible. Lo único
// que sobrevivía era lo naranja —el «quién» y el «Tú no.»—, que es exactamente
// lo que se veía en los tres destellos. Se leía como un corte a otra tarjeta y
// vuelta, cuando en la referencia el texto se queda quieto y solo late el
// fondo. Ni la posición ni el contenido se tocan: solo el color.
kf.push(`@keyframes tintaGancho{0%{color:${C.crema}}
 ${pista(`color:${C.verdeTexto}`, `color:${C.crema}`)}
 ${p(SALE_GANCHO - 0.001)}%{color:${CORTES[CORTES.length - 1][1] ? C.verdeTexto : C.crema}}
 ${p(SALE_GANCHO)}%,100%{color:${C.crema}}}`)

// --- el gancho, por grupos ----------------------------------------------
GANCHO.forEach((g, i) => {
  kf.push(`@keyframes g${i}{0%,${p(g.t)}%{opacity:0;transform:translateY(30px)}
   ${p(g.t + 0.32)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_GANCHO)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_GANCHO + 0.40)}%,100%{opacity:0;transform:translateY(14px) scale(.96)}}`)
})
;[['tuno', TU_NO], ['todavia', TODAVIA]].forEach(([n, t]) => {
  kf.push(`@keyframes ${n}{0%,${p(t)}%{opacity:0;transform:translateY(34px)}
   ${p(t + 0.30)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_GANCHO)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_GANCHO + 0.40)}%,100%{opacity:0;transform:translateY(14px) scale(.96)}}`)
})

// --- la lista y sus viñetas ---------------------------------------------
const FILA_Y0 = 452, FILA_H = 182
SIN.forEach((_, i) => {
  const t = ENTRA[i]
  const [x1, y1] = silla(i)
  const x0 = 132, y0 = FILA_Y0 + i * FILA_H
  // Regla 4: la fila sale escalonada al revés — la última en entrar es la
  // primera en irse, así el bloque no se apaga de golpe.
  const sale = SALE_LISTA + (SIN.length - 1 - i) * 0.05
  kf.push(`@keyframes fila${i}{0%,${p(t)}%{opacity:0;transform:translateY(28px)}
   ${p(t + 0.30)}%{opacity:1;transform:translateY(0)}
   ${p(sale)}%{opacity:1;transform:translateY(0)}
   ${p(sale + 0.32)}%,100%{opacity:0;transform:translateY(-16px)}}`)
  // El punto 0 —el naranja, «tú»— lleva el latido del cierre DENTRO de esta
  // misma animación, en vez de en una aparte. Iba aparte (`late`), y las dos
  // animaban `transform`: en CSS gana la última de la lista, así que `late`
  // pisaba el `translate` con su `transform:scale(1)` de partida. Sin
  // translate, el punto se queda en `left:0;top:0` con margen negativo, o sea
  // clavado en la esquina superior izquierda y recortado por el borde. El aro
  // se formaba con CINCO puntos, y el cerrado también, con «Seis» entrando dos
  // segundos después. El sexto no se perdía: nunca salía.
  //
  // Una sola animación dueña de `transform`. El cambio de curva entre el vuelo
  // y el latido va con `animation-timing-function` dentro de los fotogramas
  // clave, que es exactamente para lo que existe.
  const latido = i !== 0 ? '' : [
    [CIERRA + 0.5, 1], [CIERRA + 1.3, 1.13], [CIERRA + 2.1, 1],
    [CIERRA + 2.9, 1.13], [CIERRA + 3.7, 1], [CIERRA + 4.5, 1.13],
  ].map(([tt, e]) =>
    `${p(tt)}%{transform:translate(${x1}px,${y1}px) scale(${e});opacity:1;animation-timing-function:ease-in-out}`
  ).join(' ')
  const finLatido = i !== 0
    ? `100%{transform:translate(${x1}px,${y1}px) scale(1);opacity:1}`
    : `100%{transform:translate(${x1}px,${y1}px) scale(1);opacity:1}`
  kf.push(`@keyframes punto${i}{
   0%,${p(t)}%{transform:translate(${x0}px,${y0}px) scale(.25);opacity:0}
   ${p(t + 0.26)}%{transform:translate(${x0}px,${y0}px) scale(1);opacity:1}
   ${p(VUELA)}%{transform:translate(${x0}px,${y0}px) scale(1);opacity:1}
   ${p(CIERRA)}%{transform:translate(${x1}px,${y1}px) scale(1.3);opacity:1}
   ${p(CIERRA + 0.28)}%{transform:translate(${x1}px,${y1}px) scale(1);opacity:1}
   ${latido}
   ${finLatido}}`)
  kf.push(`@keyframes tam${i}{0%,${p(VUELA)}%{width:44px;height:44px;margin:-22px 0 0 -22px}
   ${p(CIERRA)}%,100%{width:${PUNTO}px;height:${PUNTO}px;margin:-${PUNTO / 2}px 0 0 -${PUNTO / 2}px}}`)
})

kf.push(`@keyframes crema{0%,${p(CREMA_IN)}%{opacity:0} ${p(CREMA_IN + 0.40)}%{opacity:1}
 ${p(CREMA_OUT)}%{opacity:1} ${p(CREMA_OUT + 0.32)}%,100%{opacity:0}}`)
kf.push(`@keyframes tinta{0%,${p(CREMA_IN)}%{background:${C.crema}}
 ${p(CREMA_IN + 0.40)}%{background:${C.terracota}} ${p(CREMA_OUT)}%{background:${C.terracota}}
 ${p(CREMA_OUT + 0.32)}%,100%{background:${C.crema}}}`)
kf.push(`@keyframes tintatu{0%,${p(CREMA_IN)}%{background:${C.crema}}
 ${p(CREMA_IN + 0.40)}%{background:${C.terracota}} ${p(CREMA_OUT)}%{background:${C.terracota}}
 ${p(CREMA_OUT + 0.32)}%{background:${C.crema}} ${p(CIERRA + 0.12)}%{background:${C.crema}}
 ${p(CIERRA + 0.45)}%,100%{background:${C.naranja}}}`)

kf.push(`@keyframes vuelta{
 0%{transform:rotate(0deg) scale(1)}
 ${p(5.4)}%{transform:rotate(0deg) scale(1.014)}
 ${p(6.6)}%{transform:rotate(0deg) scale(1)}
 ${p(7.8)}%{transform:rotate(0deg) scale(1.014)}
 ${p(CIERRA + 0.30)}%{transform:rotate(0deg) scale(1)}
 100%{transform:rotate(58deg) scale(1)}}`)
kf.push(`@keyframes aro{0%,${p(CIERRA - 0.08)}%{opacity:0;transform:scale(.82)}
 ${p(CIERRA + 0.42)}%{opacity:1;transform:scale(1)} 100%{opacity:1;transform:scale(1)}}`)
kf.push(`@keyframes golpe{0%,${p(CIERRA - 0.04)}%{transform:scale(1)}
 ${p(CIERRA + 0.07)}%{transform:scale(1.045)} ${p(CIERRA + 0.55)}%{transform:scale(1)}
 100%{transform:scale(1.035)}}`)
kf.push(`@keyframes flash{0%,${p(FLASH)}%{opacity:0} ${p(FLASH + 0.05)}%{opacity:.92}
 ${p(FLASH + 0.24)}%{opacity:0} 100%{opacity:0}}`)

// Regla 7: el cierre también se mueve. El latido del punto naranja vive
// dentro de `punto0`, arriba, y no en una animación aparte: ver el porqué allí.

CIERRE.forEach((c, i) => {
  kf.push(`@keyframes c${i}{0%,${p(c.t)}%{opacity:0;transform:translateY(30px)}
   ${p(c.t + 0.30)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_CIERRE)}%{opacity:1;transform:translateY(0)}
   ${p(SALE_CIERRE + 0.32)}%,100%{opacity:0;transform:translateY(-18px)}}`)
})
kf.push(`@keyframes firma{0%,${p(FIRMA)}%{opacity:0;transform:translateY(26px)}
 ${p(FIRMA + 0.42)}%,100%{opacity:1;transform:translateY(0)}}`)
kf.push(`@keyframes firmaUrl{0%,${p(FIRMA_URL)}%{opacity:0;transform:translateY(18px)}
 ${p(FIRMA_URL + 0.40)}%,100%{opacity:1;transform:translateY(0)}}`)

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Aro Club · reel 01 ritmo</title>
<style>
@font-face{font-family:'Young Serif';src:url(data:font/ttf;base64,${F.YoungSerif}) format('truetype');font-display:block}
@font-face{font-family:'Inter Tight';font-weight:600;src:url(data:font/ttf;base64,${F.InterTight}) format('truetype');font-display:block}
@font-face{font-family:'Inter Tight';font-weight:500;src:url(data:font/ttf;base64,${F.InterTightM}) format('truetype');font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.verde};height:100%;overflow:hidden}
body{display:grid;place-items:center}
#marco{width:var(--w);height:var(--h);overflow:hidden;position:relative}
#lienzo{width:1080px;height:1920px;position:absolute;inset:0;overflow:hidden;
  background:${C.verde};color:${C.crema};transform-origin:top left;transform:scale(var(--s,1))}

/* El velo va DENTRO de la foto: si fuera una capa aparte con su propia
   animación, al desvanecerse las dos a la vez la foto se aclararía justo
   cuando debe irse. */
#foto{position:absolute;inset:0;animation:foto ${D}s linear infinite;
  will-change:opacity,transform;
  background:linear-gradient(180deg,rgba(20,52,42,.80) 0%,rgba(20,52,42,.86) 42%,rgba(20,52,42,.94) 100%),
             url(data:image/jpeg;base64,${F.mesa}) center/cover no-repeat}
#parpadeo{position:absolute;inset:0;background:${C.crema};opacity:0;z-index:2;
  animation:parpadeo ${D}s steps(1,end) infinite}
#crema{position:absolute;inset:0;background:${C.crema};z-index:1;animation:crema ${D}s ease infinite}
#golpe{position:absolute;inset:0;animation:golpe ${D}s ease-out infinite}
#flash{position:absolute;inset:0;background:${C.crema};opacity:0;z-index:8;pointer-events:none;
  animation:flash ${D}s linear infinite}

.punto{position:absolute;top:0;left:0;width:44px;height:44px;margin:-22px 0 0 -22px;
  border-radius:999px;background:${C.crema};opacity:0;z-index:4;will-change:transform}
${SIN.map((_, i) => `.pt${i}{animation:punto${i} ${D}s cubic-bezier(.3,1.1,.4,1) infinite, tam${i} ${D}s cubic-bezier(.3,1.1,.4,1) infinite, tinta ${D}s linear infinite}`).join('')}
/* Tres animaciones, no cuatro, y una sola toca la transformacion. La cuarta
   era el latido y le pisaba la trayectoria: ver el comentario de punto0. */
.punto.tu{animation-name:punto0,tam0,tintatu !important;
  animation-duration:${D}s,${D}s,${D}s !important;
  animation-timing-function:cubic-bezier(.3,1.1,.4,1),cubic-bezier(.3,1.1,.4,1),linear !important;
  animation-iteration-count:infinite !important}

/* Gira el conjunto, no cada punto: el origen es el centro del aro y el
   giro se compone sobre la transformacion que ya lleva cada vineta. */
#conjunto{position:absolute;inset:0;z-index:4;transform-origin:${CX}px ${CY}px;
  animation:vuelta ${D}s linear infinite}
#aro{position:absolute;left:${CX}px;top:${CY}px;
  width:${R * 2 + GROSOR}px;height:${R * 2 + GROSOR}px;margin:-${R + GROSOR / 2}px 0 0 -${R + GROSOR / 2}px;
  border-radius:999px;border:${GROSOR}px solid ${C.crema};opacity:0;z-index:3;
  animation:aro ${D}s cubic-bezier(.3,1.1,.4,1) infinite}

.gancho{position:absolute;left:90px;right:90px;opacity:0;z-index:5;transform-origin:left center;
  white-space:nowrap;
  font-family:'Young Serif',Georgia,serif;font-size:118px;line-height:1;letter-spacing:-.04em}
.gancho em{font-style:normal;color:${C.naranja}}
/* Dos animaciones que no se pisan: una mueve, la otra tine. El color va con
   pasos para que el cambio sea seco, igual que el del fondo de debajo.
   Ni tuno ni todavia la llevan: son naranjas y se leen sobre los dos. */
#g0{top:470px;animation:g0 ${D}s cubic-bezier(.2,1,.3,1) infinite, tintaGancho ${D}s steps(1,end) infinite}
#g1{top:596px;animation:g1 ${D}s cubic-bezier(.2,1,.3,1) infinite, tintaGancho ${D}s steps(1,end) infinite}
#g2{top:722px;animation:g2 ${D}s cubic-bezier(.2,1,.3,1) infinite, tintaGancho ${D}s steps(1,end) infinite}
#tuno{top:1150px;color:${C.naranja};animation:tuno ${D}s cubic-bezier(.2,1,.3,1) infinite}
#todavia{top:1288px;color:${C.naranja};animation:todavia ${D}s cubic-bezier(.2,1,.3,1) infinite}

.fila{position:absolute;left:196px;right:56px;opacity:0;z-index:5;white-space:nowrap;
  color:${C.verdeTexto};font-family:'Young Serif',Georgia,serif;font-size:82px;line-height:1;letter-spacing:-.034em}
.fila em{font-style:normal;color:${C.terracota}}
.fila .sub{display:block;font-family:'Inter Tight',system-ui,sans-serif;font-weight:500;
  font-size:36px;line-height:1.28;color:${C.subClaro};margin-top:13px;letter-spacing:-.005em}
${SIN.map((_, i) => `.f${i}{top:${FILA_Y0 - 52 + i * FILA_H}px;animation:fila${i} ${D}s cubic-bezier(.2,1,.3,1) infinite}`).join('')}

.cie{position:absolute;left:96px;right:96px;opacity:0;z-index:6;
  font-family:'Young Serif',Georgia,serif;font-size:140px;line-height:.98;letter-spacing:-.035em}
.cie em{font-style:normal;color:${C.naranja}}
${CIERRE.map((_, i) => `#c${i}{top:${1180 + i * 150}px;animation:c${i} ${D}s cubic-bezier(.2,1,.3,1) infinite}`).join('')}

#firma{position:absolute;left:0;right:0;top:1230px;text-align:center;opacity:0;z-index:6;
  font-family:'Young Serif',Georgia,serif;font-size:112px;letter-spacing:-.035em;
  animation:firma ${D}s cubic-bezier(.2,1,.3,1) infinite}
#firmaUrl{position:absolute;left:0;right:0;top:1385px;text-align:center;opacity:0;z-index:6;
  font-family:'Inter Tight',system-ui,sans-serif;font-weight:500;font-size:44px;color:${C.naranja};
  letter-spacing:-.01em;animation:firmaUrl ${D}s ease infinite}

/* Regla 1: el grano salta doce veces por segundo. Con esto no hay dos
   fotogramas idénticos ni cuando todo lo demás está quieto. */
#grano{position:absolute;inset:-200px;z-index:9;pointer-events:none;opacity:.13;mix-blend-mode:soft-light;
  animation:grano 1s steps(1,end) infinite;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")}
${kf.join('\n')}
</style></head><body>
<div id="marco"><div id="lienzo"><div id="golpe">
  <div id="foto"></div><div id="crema"></div><div id="parpadeo"></div>
  <div id="conjunto">
    <div id="aro"></div>
    ${SIN.map((_, i) => `<div class="punto ${i === 0 ? 'tu ' : ''}pt${i}"></div>`).join('')}
  </div>

  ${GANCHO.map((g, i) => `<div class="gancho" id="g${i}">${g.html}</div>`).join('\n  ')}
  <div class="gancho" id="tuno">Tú no.</div>
  <div class="gancho" id="todavia">Todavía.</div>

  ${SIN.map(([t, s], i) => `<div class="fila f${i}"><em>Sin</em> ${t}<span class="sub">${s}</span></div>`).join('\n  ')}

  ${CIERRE.map((c, i) => `<div class="cie" id="c${i}">${c.html}</div>`).join('\n  ')}
  <div id="firma">Aro Club</div><div id="firmaUrl">aro.club · Caracas</div>

  <div id="flash"></div><div id="grano"></div>
</div></div></div>
<script>
let real=false;
function ajusta(){const s=real?1:Math.min(innerHeight/1920,innerWidth/1080);const r=document.documentElement.style;
  r.setProperty('--s',s);r.setProperty('--w',Math.round(1080*s)+'px');r.setProperty('--h',Math.round(1920*s)+'px')}
addEventListener('resize',ajusta);ajusta();
addEventListener('keydown',e=>{if(e.key==='1'){real=!real;ajusta()}});
</script></body></html>`

fs.writeFileSync(path.join(AQUI, 'reel-01-ritmo.html'), html)
console.log(`reel-01-ritmo.html · ${D}s`)
console.log(`  gancho en ${GANCHO.length} tiempos · lista acelerando ${PASOS[0]}→${PASOS[PASOS.length - 1]}`)
console.log(`  cierre en ${CIERRE.length} tiempos + firma en 2`)
