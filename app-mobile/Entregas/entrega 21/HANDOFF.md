# Entrega 21 · juego, brunch y avisos del día

Responde a tres pedidos: el juego antes de la hora y jugado entero, la familia brunch y el correo que junta los avisos del día. No toca nada de las entregas anteriores.

Maqueta: `Aro Club - Juego, brunch y avisos.dc.html`, con ids por pieza (1a–1c, 2a–2c, 3a–3c).

Archivos que se montan tal cual:
- `correo/23-avisos-del-dia.html` → `src/lib/correos-plantillas/`
- `brunch/filtro-brunch.jpg` y `brunch/filtro-brunch-apagada.jpg` → `app-mobile/assets/fotos/` (y su equivalente en web)
- `brunch/icono-brunch.svg` → la geometría va en `Iconos.tsx` como `IconoBrunch`

`ref/` y `correo/ejemplo-*.html` son solo para comparar; no se montan.

## 1 · El juego en Mi mesa (app y web)

**1a · Antes de la hora de la cena.** Las rondas se ven al 45 % de opacidad, sin «Ir» y sin poder pulsarse. En el sitio del botón va una píldora con borde, el candado (IconoCandado) en melocotón y «Se abre a las 7:30 p.m., a la hora de la cena.». La hora sale de la fecha. La línea de debajo del título es «3 rondas · se abre a la hora de la cena». La tarjeta no se despliega: todo se ve ya abierto.

**1b · Jugado entero.** La tarjeta muestra «Jugado · 3 de 3 rondas» y la etiqueta «Hecho» a la derecha, con el estilo de la píldora «hecha». Debajo va «Hasta aquí el juego. Lo demás es suyo.» en Young Serif 26, con la segunda frase en melocotón. No hay botón principal. «Volver a jugar» va como enlace subrayado (el mismo estilo que el antiguo «Empezar de nuevo») y abre la tarjeta con las rondas y su «Ir», como en la 4c y la 4d de la entrega 20.

**1c · «Terminar aquí».** Igual que 1b, pero con «Jugado · N de 3 rondas».

## 2 · Brunch

- `brunch/filtro-brunch.jpg` y `brunch/filtro-brunch-apagada.jpg`, de 360 × 360, como las otras. Giro de 1.6deg.
- `brunch/icono-brunch.svg` (viewBox 16):
  - `<path d="M3.4 10.6a4.6 4.6 0 0 1 9.2 0z" fill={color} />`
  - `<path d="M2 13h12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />`
- MARCAS.brunch = `{ tinta: '#8F4515', fondo: 'rgba(227,156,99,.24)' }`

La foto es de Pexels (licencia libre, Viktoria Alipatova). Cuando tengan fotos propias de brunch, se cambia.

## 3 · Correo 23 · Los avisos del día

`correo/23-avisos-del-dia.html`. Sigue la misma sintaxis que los otros veintidós.

Variables:
- `resumen`: el preheader.
- `titular` y `titularAcento`: la segunda va en quemado.
- `trato`.
- `hayAbiertas` y `abiertas[]`, con los campos `dia`, `plan`, `hora`, `zonas` y `precio`.
- `masAbiertas`: el número escrito en letra («dos»). Solo existe si hay más de tres aperturas.
- `hayCierran` y `cierran[]`, con los mismos campos que `abiertas[]` más `cierra` («mañana a las 7:30 p.m.»).

Reglas:
- Se muestran como mucho tres aperturas; el resto se cuenta en `masAbiertas`. Las fechas que cierran mañana salen todas.
- El botón lleva a `/cuenta#agenda`.

Ejemplos del titular:
- Si hay de las dos clases: «Tres planes» / «en tus zonas.»
- Si solo hay aperturas: «Se abrieron» / «cinco fechas.»
- Si solo hay plazos: «Dos fechas» / «cierran mañana.»

Los dos ejemplos ya rellenados, para comprobar el resultado: `correo/ejemplo-mezcla.html` y `correo/ejemplo-cuatro-o-mas.html`.
