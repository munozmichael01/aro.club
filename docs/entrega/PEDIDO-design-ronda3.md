# A Design · Zona segura en la A, y el guion B con diez polaroids

Versión final. Sustituye a `PEDIDO-design-cierre-B.md` y a
`PEDIDO-design-guion-B-diez.md`, que no llegaron a enviarse. Manda solo este.

Las dos partes están desbloqueadas: la foto que faltaba ya está generada y
etalonada, así que el número de polaroids es definitivo, diez, y no vas a
tener que recalcular dos veces.

---

# A · La zona segura manda sobre el número de etiquetas

Code montó la pieza A con tus coordenadas literales y midió las cajas de
texto en el navegador, con la transformación aplicada. **Ninguna etiqueta se
sale del cuadro.** Pero cuatro cruzan el margen del 6%, y una de ellas,
«Cancelando planes», lo cruza toda su vida: su borde superior llega a 26 px
del borde del vídeo.

Hay un error de lectura que era mío y lo aclaro, porque te lo pasé mal: cuando
escribí que «el recorte a 1,14 deja visible de 6,1% a 93,9%» estaba hablando
del **borde del cuadro**, no de un margen de seguridad dentro del cuadro. Son
cosas distintas. Con margen del 6% a escala 1,14 la ventana útil es de 11,4%
a 88,6%, bastante más estrecha.

## Por qué importa, que no es una manía tipográfica

El 12% de arriba y el 12% de abajo del cuadro es donde Instagram y TikTok
ponen su propio cromo: la cabecera arriba; el pie de foto, el nombre de cuenta
y la música abajo. Una etiqueta ahí no queda «apretada», queda **debajo de la
interfaz de la app**, y eso no se ve en el MP4: se ve al publicar.

## La regla

Ninguna etiqueta puede quedar en el 12% superior ni en el 12% inferior del
cuadro final, contando la caja de texto entera y no su punto de anclaje.

**Y la consecuencia, que es la parte incómoda: el número de etiquetas se
ajusta a las ventanas que queden dentro, no al revés.**

**Lo que no vale es mover una etiqueta lejos de su ventana.** Code midió que
para meterlas dentro habría que despegarlas entre 77 y 96 px, y ahí se rompe
lo único que sostiene la pieza: que cada texto pertenece a una persona
concreta. Prefiero nueve etiquetas bien puestas que doce flotando.

## Cómo resolverlo

Recuenta qué ventanas encendidas quedan dentro de la zona segura. Recuerda que
W4 está libre —la dejaste muda— y puede entrar si cae dentro. Reasigna las
etiquetas a las ventanas que sirvan, en el orden que mejor lea, y **quita las
que sobren**. Las que se caigan se caen: no las sustituyas por otra ventana
peor.

Al quitar etiquetas cambia el reparto en el tiempo. Mantén lo que ya
funcionaba: que empiecen sobre el 0,60 s, que el goteo llegue hasta el 10,50 y
que la cadencia **acelere** hacia el final.

Una excepción: **«Escribiéndole a la ex» se queda como está.** Cruza el margen
por la izquierda, a 35 px del borde, y ese lado no lo tapa nada. El problema
es arriba y abajo, no a los lados.

Devuélvelo con la imagen de comprobación actualizada, como la otra vez.

---

# B · El guion pasa a diez polaroids

## Las imágenes

Las diez están listas y etalonadas en
`docs/entrega/polaroids/final-etalonadas/`, con **nombres de contenido y no de
posición**: `llegada.jpg`, `cenital.jpg`, `brindis.jpg`. Es a propósito. El
orden es tuyo y vive en el guion; si lo cambias, no hay que renombrar nada ni
arriesgarse a que la fila 7 apunte a la foto equivocada.

Las carpetas `seleccion/`, `etalonadas/`, `final/_descartadas/` y
`final-etalonadas/_viejas/` son de vueltas anteriores y se pueden borrar.

## El orden propuesto

| # | Fichero | Momento |
|---|---|---|
| 1 | `llegada.jpg` | Alguien llega y los otros se giran a saludar |
| 2 | `cerveza-levantada.jpg` | Tres levantan la cerveza hacia quien llega |
| 3 | `sirviendo-vino.jpg` | Alguien le sirve vino al de al lado |
| 4 | `cenital.jpg` | La mesa entera desde arriba, ya servida |
| 5 | `conversacion.jpg` | Dos escuchándose de verdad, sin reírse |
| 6 | `contando.jpg` | Alguien cuenta algo con las manos |
| 7 | `descubrimiento.jpg` | Dos descubren que tienen algo en común |
| 8 | `risas-fuerte.jpg` | La risa grande |
| 9 | `brindis.jpg` | Seis manos chocando las copas |
| 10 | `foto-al-plato.jpg` | Alguien fotografía el plato, el resto sigue |

Llegan, brindan, se sirven, se ve la mesa entera, se escuchan, alguien cuenta
algo, se descubren, se ríen, brindan alto, y el cierre relajado. El taco
cuenta una noche, no diez momentos sueltos.

**Dos cosas del orden que conviene no romper.** La 5 es la única foto quieta
del lote, gente escuchándose sin reírse, y está ahí para que la risa de la 8
valga más: si la mueves, el taco vuelve a ser diez fotos de gente pasándolo
bien. Y la 1 tiene que ir primera, porque es la única que empieza algo.

## Lo que tienes que recalcular

Las ocho entraban de 6,60 a 9,75 cada 0,45 s, con el abanico en 10,30. Con
diez no cabe igual.

**No lo resuelvas apretando.** Por debajo de 0,38 s entre entradas el taco
deja de ser una serie de momentos reconocibles y se convierte en un parpadeo
de caras. En la referencia 03 el cambio es de ~0,50 s, y allí solo hay que
reconocer una escena, no diez.

Prefiero **estirar la pieza a 15,0 s** antes que comprimir el taco. La A dura
15,0 y funciona.

Y que las entradas **aceleren** en vez de ir a intervalo fijo, como hiciste en
la A: empezar sobre 0,55 s e ir cerrando hacia 0,38 s, de modo que el taco se
anime hacia el brindis. Es la regla 4 y además es lo que hace la noche.

## Lo que no cambia

El compás de la frase, con los intervalos que crecen y el silencio de 2,00 s
antes de «creándolo.», está bien. El cierre tampoco.

Los giros: reasigna a diez manteniendo el criterio de alternar entre −8° y 8°
sin repetir dos seguidos en el mismo sentido.
