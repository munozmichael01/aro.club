# Guion · Pieza A · «Las ventanas de Caracas» · 15,0 s

Fondo: `fachada-ventanas.jpg`, `scale(1.14 → 1.00)` lineal sobre los 15,0 s.

Imagen de comprobación: `entrega/reels/_verificacion-posiciones-A.png`, con
las bandas marcadas — rojo el 12% de arriba/abajo (prohibido), amarillo el
75%–88% (dentro de zona segura, antes vacío).

## Corrección: se recupera una etiqueta en el tercio de abajo

Al quitar las cuatro que cruzaban el margen, ninguna quedó entre el 73% y el
88%, y esa franja SÍ es zona segura. Se recupera **«Viendo stories» (W10, 75%,
83%)**, sobre la ventana con la figura caminando a 84% de altura — la única
candidata de la franja amarilla con ventana encendida y sitio para su caja de
texto sin invadir el 12% inferior. «Comiendo de pie» no vuelve: su ventana
cae ya dentro del 12%, sin margen para una caja de ese largo.

Quedan nueve etiquetas:

| # | Ventana (x%,y%) | Etiqueta en (x%,y%) | Alineado |
|---|---|---|---|
| W2 | 94, 18 | 80, 17 | derecha |
| W3 | 2, 27 | 14, 26 | izquierda |
| W4 | 95, 36 | 80, 35 | derecha |
| W5 | 50, 47 | 62, 46 | izquierda |
| W6 | 55, 56 | 34, 55 | derecha |
| W7 | 95, 56 | 80, 55 | derecha |
| W8 | 2, 65 | 14, 64 | izquierda |
| W9 | 2, 74 | 14, 73 | izquierda |
| W10 | 75, 83 | 73, 82 | derecha |

## Corrección: la sombra final

Sube a **negro**, no verde — el 45% dejaba una neblina verde subiendo por la
fachada. Y solo llega a sólido en los últimos fotogramas: Code ya ajustó la
curva para que el rótulo del edificio deje de leerse antes de que la sombra
llegue a su punto medio; el guion recoge esa curva para que no se devuelva al
45% plano en otra vuelta.

## Guion

| Segundo | Qué aparece | Cómo entra | Hasta |
|---|---|---|---|
| 0,00 | Fondo, `scale(1.14)` | zoom-out lineal a 15,0 s | 15,00 |
| 0,60 | «Cenando sola» (W2) | fundido 0,25 s + subida 6 px | 11,00 |
| 2,10 | «Viendo fotos viejas» (W3) | igual | 11,12 |
| 3,50 | «Overthinking» (W4) | igual | 11,24 |
| 4,80 | «Pidiendo delivery» (W5) | igual | 11,36 |
| 6,00 | «Escribiéndole a la ex» (W6) | igual | 11,48 |
| 7,10 | «Buscando quién esté libre» (W7) | igual | 11,60 |
| 8,10 | «Diciendo “otro día”» (W8) | igual | 11,72 |
| 9,00 | «Repasando el grupo sin escribir» (W9) | igual | 11,84 |
| 9,80 | «Viendo stories» (W10) | igual | 11,96 |
| 11,00 | Entra «¿Por qué no» | fundido 0,3 s + subida 10 px, Young Serif 92px, centrado | 13,00 |
| 11,00 | Apaga W2 | fundido a 0, 0,15 s | 11,15 |
| 11,12 | Apaga W3 | igual | 11,27 |
| 11,24 | Apaga W4 | igual | 11,39 |
| 11,36 | Apaga W5 | igual | 11,51 |
| 11,48 | Apaga W6 | igual | 11,63 |
| 11,60 | Apaga W7; entra «juntarlos?» (2ª línea) | fundido 0,3 s + subida 10 px | 13,00 |
| 11,72 | Apaga W8 | fundido a 0, 0,15 s | 11,87 |
| 11,84 | Apaga W9 | igual | 11,99 |
| 11,96 | Apaga W10 (última) | igual | 12,11 |
| 12,00 | Sombra inferior a negro, sólida solo en los últimos fotogramas (curva de Code) | fundido 1,0 s | 15,00 |
| 13,00 | Aro (ícono) | fundido 0,4 s + escala 0,9→1,0 | 15,00 |
| 13,30 | «Aro Club · aro.club · Caracas» | fundido 0,4 s + subida 6 px | 15,00 |
| 15,00 | Corte | — | — |

Intervalos de entrada: 1,50 → 1,40 → 1,30 → 1,20 → 1,10 → 1,00 → 0,90 → 0,80 s
— acelerando, regla 4 intacta con nueve etiquetas.
