# Guion · Pieza A · «Las ventanas de Caracas» · 15,0 s

Fondo: `fachada-ventanas.jpg` (1080×1920), imagen fija. Movimiento de fondo:
`scale(1.14 → 1.00)`, lineal, sobre los 15,0 s enteros, sin cortes.

Referencia de cierre: `entrega/reels/cierre-referencia.png` (panel izquierdo).
**Imagen de comprobación de posiciones, ya repintada sobre la foto real:
`entrega/reels/_verificacion-posiciones-A.png`.** Las doce etiquetas están
verificadas contra la imagen, no de memoria.

## Corrección de coordenadas

Las posiciones anteriores no coincidían con las ventanas reales. Repintadas
sobre `fachada-ventanas.jpg` y comprobadas una a una:

| # | Ventana (x%,y%) | Etiqueta en (x%,y%) | Alineado |
|---|---|---|---|
| W1 | 53, 8 | 65, 7 | izquierda |
| W2 | 94, 18 | 80, 17 | derecha |
| W3 | 2, 27 | 14, 26 | izquierda |
| W4 | 95, 36 | 80, 35 | derecha |
| W5 | 50, 47 | 62, 46 | izquierda |
| W6 | 55, 56 | 34, 55 | derecha |
| W7 | 95, 56 | 80, 55 | derecha |
| W8 | 2, 65 | 14, 64 | izquierda |
| W9 | 2, 74 | 14, 73 | izquierda |
| W10 | 75, 83 | 58, 82 | derecha |
| W11 | 53, 93 | 40, 92 | derecha |
| W12 | 95, 93 | 82, 92 | derecha |

Sin etiqueta: dos ventanas encendidas, a propósito.

W6 y W7 comparten fila (y=55): W6 va a la mitad izquierda del cuadro, W7 a la
derecha, con la ventana de W6 quedando en el hueco entre las dos etiquetas.
W11 y W12 comparten fila (y=92): mismo criterio.

**«Poniéndose al día con la mamá» se acorta a «Poniéndose al día».** Es la
etiqueta más larga cayendo en la ventana más pegada al borde derecho —no hay
columna con sitio para las treinta letras completas sin invadir a W11 o
salirse del 6% de margen—. El resto de las once mantiene el texto aprobado
completo.

Tipografía de etiqueta: Young Serif, 30px sobre el lienzo de 1080 de ancho,
blanco `#FAF3E4`, sin negrita. Ninguna etiqueta cruza el margen de 6% por
ningún lado.

## Guion

Las doce etiquetas ya no se agrupan al principio: se reparten desde el 0,60
hasta el 10,50, acelerando hacia el final (intervalos de 1,40 s bajando a
0,40 s), para que el goteo dure la pieza entera en vez de acabar a los 5 s.

| Segundo | Qué aparece | Cómo entra | Hasta |
|---|---|---|---|
| 0,00 | Fondo, `scale(1.14)` | arranca zoom-out lineal a 15,0 s | 15,00 |
| 0,60 | «Cancelando planes» (W1) | fundido 0,25 s + subida 6 px | 11,00 |
| 2,00 | «Cenando sola» (W2) | igual | 11,15 |
| 3,30 | «Viendo fotos viejas» (W3) | igual | 11,30 |
| 4,50 | «Overthinking» (W4) | igual | 11,42 |
| 5,60 | «Pidiendo delivery» (W5) | igual | 11,52 |
| 6,60 | «Escribiéndole a la ex» (W6) | igual | 11,62 |
| 7,50 | «Buscando quién esté libre» (W7) | igual | 11,72 |
| 8,30 | «Diciendo “otro día”» (W8) | igual | 11,82 |
| 9,00 | «Repasando el grupo sin escribir» (W9) | igual | 11,92 |
| 9,60 | «Viendo stories» (W10) | fundido 0,25 s, cadencia ya acelerada | 12,05 |
| 10,10 | «Comiendo de pie» (W11) | igual | 12,20 |
| 10,50 | «Poniéndose al día» (W12) | igual | 12,35 |
| 11,00 | Entra «¿Por qué no» | fundido 0,3 s + subida 10 px, Young Serif 92px, centrado | 13,00 |
| 11,00 | Empieza a apagarse W1 | fundido a 0 en 0,15 s | 11,15 |
| 11,15 | Apaga W2 | igual | 11,30 |
| 11,30 | Apaga W3 | igual | 11,45 |
| 11,42 | Apaga W4 | igual | 11,57 |
| 11,52 | Apaga W5 | igual | 11,67 |
| 11,60 | Entra «juntarlos?» (segunda línea) | fundido 0,3 s + subida 10 px | 13,00 |
| 11,62 | Apaga W6 | igual | 11,77 |
| 11,72 | Apaga W7 | igual | 11,87 |
| 11,82 | Apaga W8 | igual | 11,97 |
| 11,92 | Apaga W9 | igual | 12,07 |
| 12,00 | Capa de sombra inferior sube a 45% opacidad (tapa el rótulo del edificio) | fundido 1,0 s | 15,00 |
| 12,05 | Apaga W10 | igual | 12,20 |
| 12,20 | Apaga W11 | igual | 12,35 |
| 12,35 | Apaga W12 (última) | igual | 12,50 |
| 13,00 | Aro (ícono) | fundido 0,4 s + escala 0,9→1,0 | 15,00 |
| 13,30 | «Aro Club · aro.club · Caracas» | fundido 0,4 s + subida 6 px | 15,00 |
| 15,00 | Corte | — | — |

Ningún tramo queda sin evento más de 1,4 s (el mayor hueco es el propio
compás de entrada de etiquetas, 0,60→2,00), y el fondo en zoom continuo
cubre cualquier resto.
