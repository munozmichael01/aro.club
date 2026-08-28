# Pieza A · la zona segura, y por qué se caen tres etiquetas

Para Design. Esto no cambia ninguna coordenada: es el dato que hace falta para
recalcularlas.

## El listón

**Ninguna etiqueta puede quedar en el 12% de arriba ni en el 12% de abajo del
cuadro, contando la caja entera y no el punto de anclaje.** Ahí es donde
Instagram y TikTok ponen su propio cromo: la cabecera arriba; el pie de foto,
el nombre de cuenta y la música abajo. Una etiqueta a 26 px del borde superior
no queda apretada, queda *debajo de la interfaz de la app*, y eso no se ve en
el MP4 — se ve al publicar, que es tarde.

A los lados el listón sigue siendo el 6% tipográfico, y ahí sí hay margen para
decidir: no hay cromo de nadie encima. «Escribiéndole a la ex» cruza por la
izquierda a 35 px y se queda, aceptado a propósito.

`reel/comprobar-etiquetas.mjs` lo vigila solo, en todas las piezas: el 12%
tumba, el 6% lateral avisa.

## Y no es un porcentaje fijo

Aquí está la trampa. Las coordenadas son porcentajes sobre la imagen en su
estado final, a `scale(1.00)`, pero la imagen se aleja de 1,14 a 1,00 durante
los quince segundos. A más zoom, más se aleja del centro cualquier punto, así
que **la banda útil se ensancha con el tiempo**: una etiqueta que aparece
pronto tiene menos sitio que una que aparece tarde, aunque estén a la misma
altura.

| Aparece a | Escala del fondo | Banda útil en y |
|---|---|---|
| 0 s | 1,140 | 16,7% – 83,3% |
| 2 s | 1,121 | 16,1% – 83,9% |
| 4 s | 1,103 | 15,5% – 84,5% |
| 6 s | 1,084 | 14,9% – 85,1% |
| 8 s | 1,065 | 14,3% – 85,7% |
| 10 s | 1,047 | 13,7% – 86,3% |
| 12 s | 1,028 | 13,0% – 87,0% |

La caja de una etiqueta mide 31 px de alto, o sea 1,6%, así que la `y` de la
tabla —que es el borde superior— tiene que estar dentro de la banda y además
dejar ese 1,6% por debajo.

## Las doce de hoy

| # | y | Etiqueta | Entra | Banda ahí | |
|---|---|---|---|---|---|
| W1 | 7% | Cancelando planes | 0,6 s | 16,5 – 83,5% | **se cae** |
| W2 | 17% | Cenando sola | 2,0 s | 16,1 – 83,9% | ✓ |
| W3 | 26% | Viendo fotos viejas | 3,3 s | 15,7 – 84,3% | ✓ |
| W4 | 35% | Overthinking | 4,5 s | 15,4 – 84,6% | ✓ |
| W5 | 46% | Pidiendo delivery | 5,6 s | 15,1 – 84,9% | ✓ |
| W6 | 55% | Escribiéndole a la ex | 6,6 s | 14,8 – 85,2% | ✓ |
| W7 | 55% | Buscando quién esté libre | 7,5 s | 14,5 – 85,5% | ✓ |
| W8 | 64% | Diciendo «otro día» | 8,3 s | 14,2 – 85,8% | ✓ |
| W9 | 73% | Repasando el grupo sin escribir | 9,0 s | 14,0 – 86,0% | ✓ |
| W10 | 82% | Viendo stories | 9,6 s | 13,8 – 86,2% | ✓ |
| W11 | 92% | Comiendo de pie | 10,1 s | 13,7 – 86,3% | **se cae** |
| W12 | 92% | Poniéndose al día | 10,5 s | 13,5 – 86,5% | **se cae** |

**Quedan nueve.** No se mueve ninguna: las tres que se caen lo hacen porque su
VENTANA está en la franja de cromo, y acercarlas al centro las despegaría de
su ventana entre 77 y 96 px, que es lo único que la pieza tiene que sostener.

Michael: «prefiero nueve bien puestas que doce flotando».

## Lo que hace falta de vuelta

- El guion con las etiquetas que queden y sus tiempos recalculados. Con nueve,
  el goteo de 0,60 a 10,50 se reparte distinto; la cadencia acelerando (de
  1,40 s a 0,40 s) es la que manda, no los segundos concretos.
- `_verificacion-posiciones-A.png` repintada con las que queden.
- Si alguna ventana encendida de la zona central se queda sin etiqueta y hay
  texto que rescatar de las tres que se caen, esa es la decisión de Design, no
  nuestra.

## De paso, dos cosas que ya están arregladas en el montaje

- **La sombra de abajo tapa el rótulo.** El guion pedía «45% de opacidad» y con
  un 45% plano «EDIFICIO CARACAS 72» se seguía leyendo. El 45% se queda en el
  cuerpo de la banda y solo la última franja llega a sólido.
- **Y es negra, no verde de marca.** En verde se leía como una neblina subiendo
  por la fachada; sobre una foto nocturna una caída a negro es invisible como
  recurso y solo se ve el efecto.
