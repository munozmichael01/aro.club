# A Code · Montar la pieza A · «Las ventanas de Caracas»

Primero: **esto va después de `PEDIDO-code-arreglo-aro.md`**, que tiene dos
fallos pendientes en `reel-01-ritmo` —el aro que se forma con cinco puntos y
el parpadeo de la apertura—. Arregla esos dos y luego vuelve aquí. Lo que
ya está bien de ese reel no se toca: el titular se lee limpio y bajaste de
6 tramos y 7,5 s parados a 1 tramo de 0,5 s.

Ahora lo nuevo. Todo lo que necesitas ya existe:

- Guion cronometrado: `docs/entrega/reels/GUION-A-ventanas-de-caracas.md`
- Fondo: `docs/entrega/fotos/fachadas/fachada-ventanas.jpg`, 1080×1920 exactos
- Comprobación de posiciones de Design: `docs/entrega/reels/_verificacion-posiciones-A.png`

Ficheros nuevos, siguiendo la convención: **`reel-05-ventanas.mjs`**, que
genera su `.html` y su `.mp4`. No toques ningún reel existente.

## Lo que es la pieza

Quince segundos. Una foto fija de una fachada nocturna que se aleja con un
`scale(1.14 → 1.00)` lineal durante los quince segundos enteros. Doce
etiquetas en Young Serif blanca que van apareciendo junto a ventanas
encendidas, cada una es una persona sola un jueves. A los 11 s las etiquetas
se apagan una a una y entra «¿Por qué no juntarlos?». A los 13 s, el aro.

**Cero cortes en toda la pieza.** No es una restricción técnica, es el
concepto: la cámara se aleja y va cabiendo más gente sola. Si aparece un
corte, la pieza deja de decir lo que dice.

## La trampa, y es la parte importante

Las coordenadas de Design son porcentajes sobre la imagen de 1080×1920 **en
su estado final**, o sea a `scale(1.00)`. Pero la imagen se está moviendo.

Eso obliga a una decisión que quiero explícita: **las etiquetas van dentro de
la capa que se transforma, no fuera.** Tienen que escalar con el edificio.
Si las dejas fuera, la fachada se mueve por detrás y cada etiqueta se
despega de su ventana, que es justo lo único que la pieza tiene que
sostener. Que crezcan y encojan un 14% con el edificio no es un defecto: es
lo que hace que se sientan pegadas a la ventana.

La consecuencia es que a `scale(1.14)` solo se ve el 87,7% central de la
imagen, así que hay margen pero es estrecho. Los números salen: las etiquetas
van de 14% a 78% en x y de 11% a 92% en y, y el recorte a 1,14 deja visible
de 6,1% a 93,9%. Entra todo, pero por poco.

Por eso la comprobación no es mirar el fotograma final. Hay que mirar
**varios momentos del zoom**: a 1 s, a 5 s, a 10 s y a 15 s. Una etiqueta
puede estar perfecta al final y salirse del cuadro al principio.

## Criterios de aceptación, uno por uno

1. `node reel/comprobar-repetidos.mjs reel/reel-05-ventanas.mp4` sale con
   código 0. Aquí no hay excusa: el fondo está en zoom continuo los quince
   segundos, así que no debería haber ni un tramo quieto.
2. Ninguna etiqueta se sale del cuadro ni pisa a otra **en ningún momento**,
   comprobado a 1 s, 5 s, 10 s y 15 s.
3. Cada etiqueta cae junto a su ventana encendida y nunca encima de la luz.
   Compara contra `_verificacion-posiciones-A.png`.
4. Cero cortes: la luminancia media no da ningún salto brusco.
5. La capa de sombra inferior del segundo 12 tapa el rótulo del edificio.
6. Los tiempos son los de la tabla de Design, no aproximaciones.

Y como siempre: los fotogramas a 2 fps y **míralos**. El comprobador no caza
una etiqueta mal puesta, igual que no cazó el solapamiento del titular.

Commit y push juntos.
