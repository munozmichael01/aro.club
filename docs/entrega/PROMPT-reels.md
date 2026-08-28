# Aro Club · Reels · segunda vuelta

Te dejo en `docs/referencias-reels/` cuatro reels de **@timeleft**
despiezados fotograma a fotograma, con su `LEEME.md`. Los vídeos están en
`Aro Club Brand/New Videos/` si hace falta volver a mirarlos.

Dos encargos en uno:

1. **Arreglar el ritmo.** Los cuatro reels que tenemos son correctos y están
   muertos. Abajo está medido por qué.
2. **Dos piezas nuevas** que salen de dos conceptos de las referencias.

Como en los carruseles: no quiero versiones de lo de ellos. Quiero **lo
nuestro contado con esa economía de medios**.

---

## Primero, por qué los nuestros no se mueven

No es la herramienta. `render.mjs` congela animaciones CSS a 30 fps y sale un
MP4 limpio; da para todo lo que hay abajo. Es la coreografía.

Medido sobre `reel/reel-0N.mp4`, un fotograma cada medio segundo:

**El texto llega entero y se queda.** En `reel-01`, «Ya sabemos con quién
cenas el jueves» está completo en el segundo 0,5 y sigue exactamente igual
en el 4,0. Tres segundos y medio de imagen idéntica al principio de la
pieza, que es donde se decide si alguien sigue viendo. La referencia 01 pone
esa misma frase en tres pasos de medio segundo.

**El fondo no se mueve nunca.** `reel-01` abre con una foto cenital fija y
un velo verde encima: la foto está quieta los cuatro segundos. `reel-02`,
`reel-03` y `reel-04` son color plano sin textura ni grano. En las cuatro
referencias el fondo siempre está haciendo algo, aunque sea un alejamiento
de un 15 % en catorce segundos.

**Tres segundos por tarjeta, siempre el mismo compás.** `reel-02` y
`reel-03` reparten 3,0 s a cada ficha: icono, título, subtítulo, y hueco.
Del segundo 4,5 al 6,0 de `reel-03` no cambia un píxel. Seis fichas iguales
seguidas con el mismo compás no son un vídeo, son un carrusel con
temporizador.

**La lista que se llena y se queda.** `reel-01`, del 5,0 al 7,0, va sumando
seis viñetas —bien— y luego las deja puestas dos segundos y medio más. Lo
que se ganó construyendo se pierde esperando.

**Lo que sí funciona y hay que extender:** `reel-04`. La puerta que gira
sobre su bisagra y cambia de color con la hoja cerrada es la única idea de
las cuatro donde el movimiento *significa* algo en vez de decorar. Ese es el
nivel. El problema de `reel-04` es otro: entre puerta y puerta el encuadre
se queda quieto un segundo largo.

---

## Las reglas, que aplican a todo lo que se haga a partir de ahora

1. **Ningún fotograma se repite.** Si dos fotogramas consecutivos a medio
   segundo de distancia son idénticos, ese trozo está roto. Es
   comprobable: `ffmpeg -i reel.mp4 -vf "fps=2" fuera/%03d.jpg` y se miran.
2. **El texto entra por palabra o por grupo corto**, en pasos de 0,3 a 0,5 s.
   Nunca una frase completa de golpe.
3. **La palabra que carga la frase cambia de peso o de color** dentro de la
   misma línea. *Seis* **desconocidos**. Es lo que hace la referencia 01 con
   *friend* y la 02 con *both* y *TOGETHER*.
4. **Ninguna tarjeta pasa de 2,0 s** sin que cambie algo dentro.
5. **El compás varía.** Si la ficha 1 dura 2,0 s, que la 2 dure 1,4 y la 3
   dure 2,4. El compás fijo es lo que hace que se sienta plantilla.
6. **El fondo siempre tiene una capa viva:** grano animado, un alejamiento
   lento, un parpadeo de 0,3 s entre dos imágenes, o metraje. El color plano
   quieto no vuelve a aparecer solo.
7. **Todo cierra.** Pregunta o frase de cierre, aro, `aro.club · Caracas`.
   Y el cierre también se mueve.

---

## Pieza A · «Las ventanas de Caracas»

Sale de la referencia 04, que es la que mejor cuenta lo que vendemos: no
vendemos una cena, vendemos que dejes de estar solo un jueves.

**Fondo.** Una fachada nocturna de Caracas, un edificio residencial de los
setenta con muchas ventanas, unas encendidas y otras no. **Una sola imagen
fija**, sin metraje. El movimiento es un `transform: scale(1.14 → 1.00)`
durante toda la pieza, lineal, sin cortes. Cero cortes en toda la pieza: eso
es parte del concepto, la cámara se aleja y va cabiendo más gente sola.

**Duración:** 15 s.

**Las etiquetas.** Serif blanca pequeña —Young Serif—, una por ventana
encendida, apareciendo escalonadas cada 0,45 s, con un fundido corto de
0,25 s. Doce o catorce, no veinte: en vertical y en Caracas hay menos sitio.
En venezolano, y que suenen de aquí:

> Cancelando planes · Cenando sola · Viendo fotos viejas · Overthinking ·
> Pidiendo delivery · Escribiéndole a la ex · Buscando quién esté libre ·
> Diciendo «otro día» · Repasando el grupo sin escribir · Viendo stories ·
> Comiendo de pie · Poniéndose al día con la mamá

Las últimas dos o tres entran más juntas, cada 0,25 s, para que el final se
acelere.

**El cierre, que es lo que le falta a la referencia.** A los 11 s la imagen
sigue alejándose y aparece centrada, sobre el edificio:

> **¿Por qué no juntarlos?**

Y a los 13 s, el aro y `Aro Club · aro.club · Caracas`. Las etiquetas se
apagan una a una mientras entra la pregunta —el edificio se queda a oscuras
salvo las ventanas—, y ese apagado es el movimiento del cierre.

---

## Pieza B · «Pertenecer a una comunidad»

Sale de la referencia 03. Del concepto, no de la tarjeta.

**El copy, ya cerrado:**

> **La mejor manera de pertenecer a un grupo de amigos es creándolo.**

«Comunidad» suena a marca; «grupo de amigos» es lo que la gente dice de
verdad. No se abre otra vez.

**Lo que NO se hace:** verde plano con sans condensada negra ocupando la
lámina entera. Esa es literalmente la tarjeta de Timeleft y nuestro verde es
casi el mismo. Se cae en el parecido sin querer.

**Lo que se hace en su lugar.** Crema `#FAF3E4` con la textura de papel del
sistema. La frase en Young Serif, **entrando palabra por palabra** en pasos
de 0,4 s —aquí no es un titular fijo, y es la diferencia principal con la
referencia—. Cuando llega a **creándolo**, esa palabra entra en terracota
`#8F4515` y un punto más grande que el resto.

**Las polaroids.** Empiezan a caer al terminar la frase, no antes. Un taco
en el centro-bajo, cada una girada entre −8° y +8°, entrando cada 0,45 s con
un rebote corto; a partir de la quinta, la de arriba se va hacia un lado
mientras entra la siguiente. Marco blanco, borde inferior más ancho, sombra
suave. Cenas, brindis, risas, una mesa vista desde arriba, alguien
sirviendo. Ocho o diez.

**Duración:** 14 s. **Cierre:** las polaroids se recogen en abanico, queda
la frase completa, entra el aro y `Seis desconocidos. Una mesa. El jueves.`

---

## Las imágenes: qué se genera y con qué

Casi nada de esto necesita vídeo. Por orden de lo que hay que pedir:

### Nano Banana · fachada de Caracas (pieza A) · 1 imagen

> Fotografía nocturna de la fachada de un edificio residencial de doce pisos
> en Caracas, arquitectura moderna venezolana de los años setenta, hormigón
> y bloques de ventilación, vegetación tropical asomando por los balcones.
> Encuadre frontal, plano, sin perspectiva forzada, la fachada llena todo el
> cuadro. Unas veinte ventanas encendidas con luz cálida de interior y el
> resto a oscuras; en algunas se intuye una silueta. Sin gente en la calle,
> sin coches, sin texto. Luz nocturna azulada, grano fino de película,
> contraste medio, sin cielo visible. Formato vertical 9:16, 1080x1920.

Pedir tres o cuatro variantes y quedarse con la que tenga las ventanas mejor
repartidas: hacen falta huecos donde quepan las etiquetas sin taparse entre
ellas.

### Nano Banana · polaroids (pieza B) · 8 a 10 imágenes

Una por escena, misma coletilla de estilo en todas para que el taco se lea
como un mismo rollo:

> …Fotografía tipo polaroid con flash, marco blanco con el borde inferior
> ancho, colores cálidos ligeramente lavados, grano visible, encuadre
> descuidado, como una foto de teléfono de madrugada. Interior de restaurante
> de Caracas, luz cálida, sin logotipos ni texto legible. Formato cuadrado.

Escenas: seis personas alrededor de una mesa vista desde arriba con platos a
medio terminar · dos desconocidos riéndose de algo que dijo un tercero ·
alguien sirviendo vino a la copa de al lado · una mesa desde el borde, gente
inclinada hacia el centro · manos chocando copas · alguien contando algo con
las manos y tres escuchando · la mesa ya vacía con las sillas movidas ·
alguien fotografiando el plato mientras el resto habla.

**Sin caras reconocibles en primer plano** y sin que parezcan fotos de banco:
si sale demasiado limpio, pedir más grano y peor encuadre.

### Higgsfield · metraje, solo si se hace una tercera pieza al estilo 01

Ocho clips de 3 s, mismo tratamiento:

> Metraje tipo archivo de los años setenta, grano de película 16 mm, color
> desaturado con dominante verde y ámbar, poca luz, cámara en mano con
> movimiento leve, profundidad de campo corta. Sin texto. Vertical 9:16.

Escenas: gente cenando alrededor de una mesa larga en penumbra · dos
personas hablando en una esquina de un bar · una mano sirviendo de una
botella · alguien entrando por una puerta a un sitio con gente · risas en
un plano medio, la cara medio fuera de cuadro · una mesa vista de lejos a
través de una ventana con reflejo · alguien esperando solo en una mesa ·
la calle desde dentro del restaurante.

Con el estilo de la referencia 01 —oscuro, con grano, sin primeros planos—
la IA aguanta bien; es el pedido más fácil de los tres.

---

## Nota técnica para Code

`render.mjs` pausa `document.getAnimations()` y fija `currentTime`. **Eso no
controla un `<video>`.** Si se mete metraje directamente en el HTML, todos
los fotogramas van a salir con el vídeo en el mismo instante y no se va a
notar hasta ver el MP4 entero, que es exactamente el fallo del `<head>` de
las pantallas: silencioso.

Dos salidas, y prefiero la segunda:

1. Dentro de `congela(t)`, además de las animaciones, poner
   `v.currentTime = t` en cada `<video>` y esperar el evento `seeked` antes
   de la captura.
2. **Componer en dos capas.** Renderizar el HTML —texto, aro, etiquetas—
   sobre fondo transparente a PNG con alfa, y superponerlo al metraje en
   ffmpeg con `overlay`. El HTML se mantiene determinista, el metraje se
   cambia sin volver a renderizar, y las piezas A y B ni siquiera necesitan
   esta ruta porque su fondo es una imagen fija.

Las piezas A y B se hacen **enteras con CSS** sobre una imagen de fondo. No
hace falta tocar `render.mjs` para ninguna de las dos.

Y una comprobación que quiero en el flujo, al estilo de
`comprobar-cuestionario.mjs`: sacar los fotogramas a 2 fps y comparar cada
uno con el anterior. Si hay dos idénticos seguidos, avisar con el segundo en
que pasa. La regla 1 no sirve de nada si depende de que alguien se acuerde
de mirar.

---

## Orden

1. Pieza A. Es la que mejor cuenta el producto y la que menos piezas
   necesita: una imagen y CSS.
2. Arreglar `reel-01` con las siete reglas, que es el que abre.
3. Pieza B.
4. `reel-02` y `reel-03`, que son los dos que más lo necesitan pero también
   los menos importantes.

Si no dan los cuatro, se para donde sea y se dice dónde.
