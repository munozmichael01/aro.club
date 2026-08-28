# Pedido a Code · Reels, segunda vuelta

Contexto en `docs/entrega/PROMPT-reels.md`, con el diagnóstico medido de por
qué nuestros cuatro reels se sienten estáticos. Las referencias despiezadas
están en `docs/referencias-reels/` con su `LEEME.md`: son fotogramas, no
videos, así que puedes verlas directamente.

**En esta ronda no se montan las piezas nuevas.** Las piezas A y B esperan a
que existan la imagen de fondo y el guion cronometrado de Design. Lo que te
toca ahora son dos cosas que no dependen de nadie.

---

## 0 · Regla de trabajo: no se toca lo que ya existe

**No modifiques `reel-01`, ni ningún otro reel existente.** Ni el `.mjs`, ni
el `.html`, ni el `.mp4`. Se quedan exactamente como están.

Lo que hagas va en ficheros nuevos, siguiendo la convención que ya usa
`reel-01-crema`: **`reel-01-ritmo.mjs`**, que genera `reel-01-ritmo.html` y
`reel-01-ritmo.mp4`. El renderizador ya guarda las láminas en una subcarpeta
por versión, así que `fotogramas/reel-01-ritmo/` sale solo y no pisa nada.

La razón es que el objetivo de esta ronda no es entregar un reel mejor, es
**poder comparar**. Si sobreescribes el original perdemos el término de
comparación y no hay forma de saber si las siete reglas funcionaron o si
simplemente nos acostumbramos a la versión nueva. Los dos MP4 tienen que
poder verse uno al lado del otro, y las dos tiras de fotogramas también.

Al terminar, deja los dos juegos de láminas sacados y dime dónde están.

---

## 1 · `reel-01-ritmo`: el mismo contenido con las siete reglas

Va primero a propósito, aunque sea lo menos vistoso: no necesita imagen
generada, no necesita a Design, y es la prueba barata de si el diagnóstico
es correcto. Si las siete reglas no reviven `reel-01`, tampoco van a salvar
las piezas nuevas, y mejor saberlo antes de gastar en generación.

**Mismo copy, mismo contenido, misma duración aproximada.** Lo único que
cambia es cuándo y cómo entra cada cosa. No inventes texto nuevo: si cambia
el copy, la comparación deja de medir el ritmo y pasa a medir dos piezas
distintas, que es justo lo que no queremos.

Lo que está mal hoy, medido sobre el MP4 a 2 fps:

- La frase de apertura está completa en el segundo 0,5 y sigue idéntica en
  el 4,0. Tres segundos y medio sin que cambie un píxel, justo donde se
  decide si alguien sigue viendo.
- La foto cenital del fondo está quieta con un velo verde encima.
- La lista de «Sin perfiles / Sin swipe / …» se construye del 5,0 al 7,0
  —bien— y luego se queda puesta dos segundos y medio más.
- El cierre son cuatro segundos y medio de aro fijo con un fundido.

Las siete reglas:

1. Ningún fotograma se repite. Dos fotogramas consecutivos a medio segundo
   de distancia no pueden ser idénticos.
2. El texto entra por palabra o grupo corto, en pasos de 0,3 a 0,5 s. Nunca
   una frase completa de golpe.
3. La palabra que carga la frase cambia de peso o de color dentro de la
   misma línea: *Seis* **desconocidos**.
4. Ninguna tarjeta pasa de 2,0 s sin que cambie algo dentro.
5. El compás varía. Nada de 3,0 s fijos por ficha.
6. El fondo siempre tiene una capa viva: grano animado, un alejamiento
   lento, un parpadeo de 0,3 s entre dos imágenes, o metraje. El color plano
   quieto no vuelve a aparecer solo.
7. Todo cierra, y el cierre también se mueve.

Para la regla 6, lo más barato que funciona está medido en la referencia 02:
**alternar dos fondos cada 8 a 10 fotogramas a 30 fps** —o sea cada 0,27 a
0,33 s— con salto seco, sin fundido. En esa referencia no hay video: son dos
imágenes fijas y un temporizador. La foto cenital que ya tenemos y el crema
del sistema sirven como el par.

## 2 · Comprobador de fotogramas repetidos

Al estilo de `comprobar-cuestionario.mjs`, y por la misma razón: la regla 1
no sirve de nada si depende de que alguien se acuerde de mirar.

Saca los fotogramas del MP4 a 2 fps, compara cada uno con el anterior, y si
hay dos idénticos seguidos avisa con el segundo exacto en que pasa. Que
acepte el fichero por argumento y que salga con código distinto de cero
cuando encuentre algo, para poder meterlo en el flujo de antes de cada push.

Pásalo por los cinco MP4 que van a existir —los cuatro de ahora y el nuevo—
y enséñame la tabla. Esa tabla es la comparación: si `reel-01` sale con
tramos repetidos y `reel-01-ritmo` sale limpio, el diagnóstico se sostiene.

---

## Nota técnica, para cuando toque meter metraje

`render.mjs` pausa `document.getAnimations()` y fija `currentTime`. **Eso no
controla un `<video>`.** Si se mete metraje directamente en el HTML, todos
los fotogramas salen con el video congelado en el mismo instante, y no se
nota hasta ver el MP4 entero: es el mismo tipo de fallo silencioso que el
`<head>` de las pantallas.

Dos salidas, y prefiero la segunda:

1. Dentro de `congela(t)`, además de las animaciones, poner
   `v.currentTime = t` en cada `<video>` y esperar el evento `seeked` antes
   de capturar.
2. **Componer en dos capas.** Renderizar el HTML —texto, aro, etiquetas—
   sobre fondo transparente a PNG con alfa, y superponerlo al metraje en
   ffmpeg con `overlay`. El HTML se mantiene determinista, el metraje se
   cambia sin volver a renderizar todo.

**No lo construyas todavía.** Esto solo hace falta si confirmamos la pieza
de metraje, y las piezas A y B no lo necesitan: su fondo es una imagen fija
y se resuelven enteras con CSS. Lo dejo escrito para que no te sorprenda.

Y si tocas `render.mjs` en algún momento, que sea sin cambiar su
comportamiento actual: los reels existentes tienen que seguir renderizando
igual que hoy.

---

## Cómo se verifica

- `npx tsc --noEmit && node scripts/comprobar-cuestionario.mjs` antes del
  push, como siempre. Y `npm run build` nunca con el dev server vivo.
- El reel se mira **en el navegador y en el MP4**, no en el diff. El diff no
  te dice si un reel está muerto.
- Antes de darlo por hecho:
  `ffmpeg -i reel-01-ritmo.mp4 -vf "fps=2" fuera/%03d.jpg` y revisar la
  secuencia entera. Es exactamente lo que hicimos para diagnosticarlo.
- **Comprobar que `reel-01.mp4` sigue siendo bit a bit el de antes.** Si
  cambió, algo se tocó que no debía.
- Criterios de aceptación uno por uno, no de corrido. Si algo no se pudo
  probar, dilo.

Commit y push juntos. Si algo falla por sesión de CLI, se dice y se para:
nada de bucles esperando.
