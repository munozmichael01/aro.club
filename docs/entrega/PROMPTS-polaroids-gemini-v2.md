# Prompts de polaroids para Gemini · v2, las ocho definitivas

La v1 acertó las composiciones y falló el estilo. **La culpa fue de una línea
mía:** en la primera tanda escribí «amateur flash snapshot», que es lo que
daba el look de polaroid, y en los prompts para Gemini lo cambié por «warm
tungsten light, no flash bouncing off faces». Lo hice para evitar el error
del móvil con flash de frente y me pasé: al quitar el flash se fue el estilo
entero y salieron fotos de marketing de restaurante.

Aquí el flash vuelve, y el casting y las composiciones se quedan como
estaban, que funcionaron.

**Después del flash va el etalonaje.** Aunque salgan perfectas, las ocho
pasan por `reel/etalonar-polaroids.sh`, que levanta negros, desatura, añade
viñeta y grano. Es lo único que garantiza que las ocho se lean como un mismo
rollo y no como ocho fotos de tandas distintas.

**Formato:** cuadrado, 1:1, **sin marco blanco**. El marco, el borde inferior
ancho y la sombra los pone Code en CSS.

**Revisión de cada una:** seis personas donde toque, tres y tres, nadie
vestido igual, nadie parecido a otro, ninguno con traje, y al menos dos
conectando entre sí. La que falle se rehace.

---

## El bloque de estilo

Va **al final de cada uno** de los ocho prompts, tal cual:

> Amateur snapshot taken with a direct on-camera flash by someone sitting at
> the table: the people nearest the camera are brightly lit and slightly
> blown out, and the light falls off fast into darkness toward the edges of
> the frame. Imperfect framing, someone cropped by the edge, slight motion
> blur, visible grain, warm slightly washed colours, raised blacks. Interior
> of a restaurant in Caracas at night. No brand logos, no readable text or
> signage, no watermarks, no white border or frame around the image. Square
> format.

---

## 1 · La mesa desde arriba

> Overhead photo looking straight down at a round wooden table. Exactly six
> people seated around it: three women and three men, all between 25 and 35,
> all clearly different from one another — different skin tones from light to
> dark brown, different hair, different builds, Venezuelan. Each dressed
> differently in relaxed casual clothes for a night out: an untucked shirt, a
> good t-shirt, a simple dress, jeans. No suits, no ties, no blazers, nobody
> dressed alike. Half-finished plates, wine glasses, beer bottles, bread,
> hands reaching across. Two of them leaning toward each other
> mid-conversation, one laughing. Nobody sitting silent or staring at their
> plate.
>
> [bloque de estilo]

## 2 · Las risas

> Two people in their late twenties laughing hard at something a third person
> just said: one has thrown their head back, the other is covering their
> mouth. They are clearly different from each other in skin tone, hair and
> clothing, both in relaxed casual clothes, no suits or blazers. The person
> who spoke is in the foreground, out of focus, seen from behind over their
> shoulder. They only met tonight and it shows.
>
> [bloque de estilo]

## 3 · Sirviendo vino

> A hand tilting a wine bottle to pour into the glass of the person sitting
> next to them, both seen from chest height with their faces cropped out of
> the top of the frame. Close on the bottle, the glass and the wooden table.
> Different skin tones on the two arms, casual sleeves, no formal jackets.
>
> [bloque de estilo]

## 4 · La mesa desde el borde

> A long dinner table photographed from its short edge at table height,
> running away from the camera, six people seated along both sides all
> leaning in toward the centre listening to someone. Three women and three
> men between 25 and 35, all visibly different from one another, each dressed
> differently in relaxed casual clothes, no suits. Faces small and partly
> turned away.
>
> [bloque de estilo]

## 5 · El brindis

> Six hands raising and clinking glasses together over the middle of the
> table, caught at the moment of contact with a little motion blur. Wine,
> beer and one glass of water. The arms belong to different people: different
> skin tones from light to dark brown, some with bracelets, sleeves rolled
> up, one bare arm, one light linen shirt. No suit sleeves, no cufflinks, no
> ties, no formal jackets anywhere in the frame. Below, half-finished plates
> and crumpled napkins. No faces in frame, only forearms and hands.
>
> [bloque de estilo]

## 6 · Contando algo

> One person telling a story with both hands up mid-gesture, seen from the
> side with their face partly turned away. Three people around them listening,
> completely caught up in it: one leaning in, one with a hand over their
> mouth, one starting to laugh. Mixed group of women and men between 25 and
> 35, all visibly different in skin tone, hair and build, each dressed
> differently in relaxed casual clothes. No suits, no ties, no blazers.
>
> [bloque de estilo]

## 7 · El descubrimiento *(escena nueva, sustituye a la mesa vacía)*

> Two people at the table who have just discovered they have something in
> common: one is pointing at the other, both surprised and starting to laugh,
> leaning toward each other across the corner of the table. Three other
> people around them have stopped to watch, amused. They met tonight and this
> is the moment it stops being strangers. Mixed group between 25 and 35, all
> visibly different from one another, each dressed differently in relaxed
> casual clothes, no suits.
>
> [bloque de estilo]

## 8 · La foto al plato

> One person holding their phone above their plate to photograph the food,
> while the four other people around the table keep talking and ignore them.
> Seen from the side, faces partly turned away. Mixed group, all different
> from one another, casual clothes, no suits. **The flash in this photograph
> comes from the camera taking it, not from the phone inside the frame: the
> phone's screen glows faintly down onto the plate and does not light anyone's
> face.**
>
> [bloque de estilo]

---

## Dónde van

`docs/entrega/polaroids/`, como `polaroid-1.png` a `polaroid-8.png`, en este
mismo orden, que es el del guion B de Design.

Las etalono yo al recibirlas y dejo las finales en
`docs/entrega/polaroids/etalonadas/`, que son las que usa Code.
