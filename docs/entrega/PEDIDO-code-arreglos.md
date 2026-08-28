# A Code · Dos arreglos en `reel-01-ritmo`

El reel mejoró de verdad y las reglas se ven aplicadas: el texto entra por
palabra, «quién» y «desconocidos» cambian a naranja, el parpadeo entre la
foto y el crema está puesto, y la lista sale en vez de quedarse pegada. Tu
comprobador además está bien razonado: medir **cuánto** cambia en vez de
**si** cambia es la decisión correcta, y el comentario que la explica también.

Dos cosas antes de darlo por cerrado. La primera es bloqueante.

## 1 · El titular se solapa · bloqueante

Del segundo **1,5 al 4,0**, «cenas» y «el jueves.» se pintan encima uno del
otro en la misma línea. Se lee «eljnaesves.». Son dos segundos y medio de
titular ilegible justo en la apertura, que es donde se decide si alguien
sigue viendo.

Sácalo tú mismo y míralo:

```
ffmpeg -ss 1.5 -i reel/reel-01-ritmo.mp4 -frames:v 1 detalle.png
```

Es el fallo silencioso de siempre, el mismo del pie del cuestionario: no
lanza excepción, el comprobador no lo caza porque el fotograma sí cambia, y
en el diff no se ve. Solo se ve mirándolo.

Lo más probable es que «cenas» y «el jueves.» compartan caja de línea y que
la salida de una no libere el sitio antes de que entre la otra. Al
arreglarlo, revisa las tres transiciones de palabra del titular, no solo esa.

## 2 · El cierre sigue muerto

Tu propio comprobador lo dice: **3,0 segundos parados desde el 13,0**. Es el
último quinto de la pieza, con el aro y el wordmark completamente fijos. La
regla 7 dice que el cierre también se mueve, y es la única de las siete que
no cumpliste.

No hace falta gran cosa: que el aro siga girando lentísimo, que el fondo
tenga el mismo grano que usaste antes, o que `aro.club · Caracas` entre
escalonado en vez de de golpe. Lo que sea, pero que se mueva.

## Criterio de cierre

`node reel/comprobar-repetidos.mjs reel/reel-01-ritmo.mp4` tiene que salir
con **código 0**. Ahora mismo sale con 1 contra tu propio reel: bajaste de
6 tramos y 7,5 s parados a 5 y 5,5 s, que es mejora real, pero no es
cumplirlo.

Y después de arreglarlo, saca los fotogramas a 2 fps y **míralos uno a uno**.
El comprobador no habría cazado el solapamiento; el ojo sí.

## Nota menor, no es fallo

`comprobar-repetidos.mjs` tiene `/opt/homebrew/bin/ffmpeg` escrito a mano,
igual que `render.mjs`. En el Mac de Michael funciona. Solo apúntalo por si
alguna vez hay que correrlo en otro sitio.

## Lo que NO toca todavía

Las piezas A y B esperan. El guion de A tiene las coordenadas de las
etiquetas mal y vuelve a Design; el de B tiene el compás por corregir. No
empieces a montarlas hasta que lleguen los guiones revisados.
