# Brief para Design: el juego de la mesa

Para la app y la web, dentro de **Mi mesa**. Sale con la primera versión.
El mazo está aprobado por Michael (05-10-2026) en `app-mobile/JUEGO.md`. Este
brief es solo la pantalla.

## Qué es

Preguntas para romper el hielo **durante** la cena. Van de la vida, no de
datos sobre la mesa: lo que te gustaría saber de alguien y casi nunca te
atreves a preguntar. Tres rondas que suben de profundidad, y después se
guarda el teléfono.

## Cómo se juega (lo que la pantalla tiene que hacer posible)

- **Una persona lleva el juego desde su propio teléfono y no lo suelta.** Lee
  en voz alta. Nadie le pasa su teléfono a desconocidos.
- **Todos responden**, empezando por quien leyó.
- **Siempre se puede pasar**, sin explicar nada.
- **Se puede cambiar de lector entre rondas:** otra persona abre el juego en
  su teléfono y sigue en la ronda que toca. Todos los teléfonos de la mesa
  ven las mismas preguntas en el mismo orden.
- Cada ronda tiene 2 preguntas (`porRonda` de `reglas.js`), que salen del mazo de la ronda.

## Pantallas y estados

1. **La entrada, dentro de Mi mesa (fase abierta).**
   - **Antes de la cena:** visible pero cerrada, con algo como «Se abre a la
     hora de la cena».
   - **A la hora:** se abre. Más o menos media hora antes de empezar y hasta
     unas horas después; la cifra exacta vive en `reglas.js`.
   - Es una invitación, no una obligación. No puede competir con lo
     principal de Mi mesa: el sitio, la hora y los otros cinco.
2. **Las reglas,** una vez, en cuatro líneas: una persona lee, todos
   responden, se puede pasar, tres rondas. Un botón: «Empezar».
3. **La pregunta.**
   - En grande y legible a la luz de un restaurante, porque se lee en voz
     alta.
   - Arriba: la ronda y su nombre («Ronda 2 · Lo que te mueve») y en qué
     pregunta van (2 de 2).
   - Acciones: «Siguiente» y volver atrás. «Pasar» no hace falta en pantalla:
     pasa la persona, no la pregunta.
4. **El cambio de ronda.** Una pausa breve con el nombre y la bajada de la
   ronda que empieza; la ronda 3 recuerda que se puede pasar. Aquí se puede
   cambiar de lector: «Si otra persona quiere leer, que lo abra en su
   teléfono en la ronda N».
5. **El final.** «Hasta aquí el juego. Lo demás es suyo.» Que invite a
   guardar el teléfono, no a seguir en la app.

## Lo que pedimos del diseño

- **Que se sienta Aro, no un juego de fiesta.** Nada de dados, confeti ni
  colores chillones: el sistema de siempre, con tipografía protagonista.
- **Pensado para leer en voz alta y en penumbra:** contraste alto, la
  pregunta muy grande, sin elementos que distraigan.
- **Una mano:** se sostiene el teléfono mientras se habla.
- **Sobre verde profundo o crema:** a criterio de Design. Para leer de noche,
  el verde parece natural.
- **Iconos SVG del sistema,** sin emojis. Copy neutro de género y en
  venezolano.
- **Se entrega como siempre:** un `.dc.html` con todos los estados (cerrada,
  reglas, pregunta, cambio de ronda, final), para la web y como referencia
  de la app.

## Fuera de alcance

- Datos de la mesa («tres de ustedes…»). Descartado: el juego va de la vida.
- Filtro por temas: quien no quiera, pasa.
- Sincronizar teléfonos en tiempo real: no hace falta, el orden es el mismo
  en todos.
