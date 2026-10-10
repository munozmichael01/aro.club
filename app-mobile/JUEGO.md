# El juego de la mesa · el mazo en uso (V2)

Mazo V2, aprobado por Michael el **10-10-2026** y aplicado en `reglas.js` ese
mismo día. Sustituye al borrador del 05-10, que se quedó corto en la mesa de
prueba del 09-10. La propuesta y el porqué de cada cambio están en
`JUEGO-v2.md`; este fichero es el que manda y el que cruza el comprobador.

**La idea:** lo que de verdad te gustaría saber de alguien y casi nunca te
atreves a preguntar. Va de la vida, no de datos sobre la mesa. El tono es
universal; lo venezolano está en la voz, no en el tema.

**Y es un RECURSO, no una parte obligada de la cena.** Se ofrece «por si hace
falta romper el hielo». Una mesa que está conversando bien no lo necesita, y
el producto no debe empujarla a abrirlo.

## Las reglas (se enseñan antes de empezar)

1. **Una persona lleva el juego desde SU teléfono, y no lo suelta.** Lee en
   voz alta. Nadie le pasa su teléfono a cinco desconocidos (Michael,
   05-10-2026). Si otra persona quiere llevar la ronda siguiente, la abre en
   su propio teléfono.
2. **Todos los teléfonos de la mesa ven las mismas preguntas, en el mismo
   orden.** El orden sale de la mesa misma (semilla = id de la mesa + ronda),
   sin que el servidor sincronice nada. Por eso se puede cambiar de lector
   entre rondas.
3. **Una pregunta, responden todos**, empezando por quien la leyó: quien
   pregunta también se expone. Nadie le pregunta a otro directamente.
4. **Siempre se puede pasar**, sin explicar nada.
5. **Tres rondas, de menos a más**, y la tercera es OPCIONAL: antes de
   empezarla la pantalla pregunta, con «Seguir con la ronda 3» y «Terminar
   aquí». Al final: «Hasta aquí el juego. Lo demás es suyo».

Cada ronda saca **2 preguntas** de las suyas (`porRonda: 2` en `reglas.js`;
manda la constante, no este número), las mismas en toda la mesa. **No se
filtra por temas** (Michael): quien no quiera responder una, pasa.

**Dónde vive el mazo:** en `public/reglas.js` (`AroReglas.JUEGO`), como
`FRECUENTES`. Así la app y la web leen el mismo, y cambiar una pregunta es
cambiarla en los dos. El juego no necesita nada del servidor por mesa.

---

## Ronda 1 · Para arrancar

Ligera. Que cualquiera responda sin pensarlo dos veces.

1. ¿Cuál es tu plan perfecto de domingo en Caracas?
2. ¿Qué comida no dejarías de comer nunca?
3. ¿Playa o montaña, y por qué?
4. Si pudieras vivir un año en cualquier ciudad, ¿cuál sería?
5. ¿Qué canción pones cuando necesitas ánimo?
6. ¿Cuál es tu talento más inútil?
7. ¿Qué serie o película le recomiendas a todo el mundo?
8. ¿Qué te gustaba de chamo o chama que todavía te gusta?
9. Si mañana tuvieras el día libre, ¿qué harías primero?
10. ¿A qué le dices que sí con demasiada facilidad?

## Ronda 2 · Un poco más de ti

Personal, pero sin exponerse.

1. ¿Qué te tiene con ilusión estos días, aunque sea algo pequeño?
2. ¿Qué haces que te hace perder la noción del tiempo?
3. ¿Qué aprendiste este año que no esperabas aprender?
4. ¿En qué eres mejor de lo que la gente imagina?
5. ¿Qué plan llevas tiempo diciendo que vas a hacer?
6. ¿Quién te enseñó algo que todavía usas?
7. ¿Qué te hace sentir en casa, estés donde estés?
8. ¿Qué decisión tomaste que hoy volverías a tomar?
9. ¿En qué has cambiado de opinión en los últimos años?
10. ¿Qué te gustaría que te salga bien este año?
11. ¿Qué te cuesta pedir?

## Ronda 3 · Si la mesa quiere ir más hondo

Más hondo, y cualquiera puede pasar.

> La bajada NO repite el aviso. La pausa de antes de esta ronda ya dice
> «Esta ronda es más personal. Solo si a la mesa le provoca», y las dos
> juntas lo dirían dos veces seguidas en la misma pantalla.

1. ¿Qué es lo más valiente que has hecho?
2. ¿Qué piensa la gente de ti que no es del todo así?
3. ¿Qué le dirías a la persona que eras hace diez años?
4. ¿De qué te sientes orgulloso u orgullosa y casi nunca lo cuentas?
5. ¿Qué te gustaría que te preguntaran más seguido?
6. ¿Qué cosa pequeña te arregló un mal día hace poco?
7. ¿Qué te gustaría hacer antes de que se te pase el momento?
8. ¿Qué momento de tu vida te gustaría volver a vivir?
9. ¿Quién ha sido importante en tu vida sin saberlo?
10. ¿Qué te costó mucho y hoy agradeces?
11. ¿Qué te da miedo intentar?

---

## Decidido con Michael

**05-10-2026**

- Nadie pasa su teléfono: lo lleva una persona, y se cambia de lector entre rondas.
- Sin marcas ni filtro de temas: se puede pasar cualquier pregunta.
- **El final:** cuando se acaba la última ronda, la pantalla dice «Hasta aquí
  el juego. Lo demás es suyo». Y el teléfono, a guardar.

**10-10-2026 (V2)**

- El juego es un recurso, no una parte obligada: la tarjeta dice «Por si hace
  falta romper el hielo» y la push, «Por si hace falta».
- **Menos intensidad.** Con seis desconocidos, la ronda 3 del 05-10 pedía
  demasiado. Ahora la 1 es ligera, la 2 es personal sin exponerse, y la 3 es
  opcional y avisada.
- Salen del mazo: «¿Cuándo fue la última vez que te sentiste en soledad de
  verdad?», «¿Qué conversación tienes pendiente con alguien?», «¿Qué parte de
  ti estás aprendiendo a querer?», «¿Qué haces cuando nadie te ve que dice
  mucho de ti?» y «Si esta fuera la última cena que compartes con gente
  nueva, ¿qué te llevarías de ella?».
- Las rondas pasan a 10, 11 y 11 preguntas. `porRonda` sigue en 2.
