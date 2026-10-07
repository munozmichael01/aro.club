# El juego de la mesa: borrador del mazo

Borrador del 05-10-2026, para que Michael lo edite. Sale con la primera
versión, dentro de Mi mesa: se desbloquea a la hora de la cena.

**La idea:** lo que de verdad te gustaría saber de alguien y casi nunca te
atreves a preguntar. Va de la vida, no de datos sobre la mesa. El tono es
universal; lo venezolano está en la voz, no en el tema.

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
5. **Tres rondas, de menos a más.** Al final: «Ahora
   guarden el teléfono».

Cada ronda saca **2 preguntas** de sus 10 (`porRonda: 2` en `reglas.js`; manda la constante, no este número), las mismas en toda la mesa. **No
se filtra por temas** (Michael): quien no quiera responder una, pasa.

**Dónde vive el mazo:** en `public/reglas.js` (por ejemplo
`AroReglas.JUEGO`), como `FRECUENTES`. Así la app y la web leen el mismo, y
cambiar una pregunta es cambiarla en los dos. El juego no necesita nada del
servidor por mesa.

---

## Ronda 1 · Quién eres hoy

Fácil. Para abrir la mesa sin exigir nada.

1. ¿Qué te tiene con ilusión estos días, aunque sea algo pequeño?
2. ¿Qué haces que te hace perder la noción del tiempo?
3. ¿Cuándo fue la última vez que te reíste hasta llorar, y de qué?
4. Si mañana tuvieras el día libre y sin compromisos, ¿qué harías desde que te levantas?
5. ¿Qué cosa simple te arregla un mal día?
6. ¿Qué aprendiste este año que no esperabas aprender?
7. ¿Cuál es el plan que siempre dices que vas a hacer y nunca haces?
8. ¿Qué canción, libro o serie te tiene enganchado o enganchada ahora?
9. ¿En qué eres mejor de lo que la gente imagina?
10. ¿Qué te gustaba de chamo o chama que todavía te gusta?

## Ronda 2 · Lo que te mueve

Decisiones, cambios, lo que importa.

1. ¿Qué decisión tomaste que la gente no entendió y hoy volverías a tomar?
2. ¿En qué has cambiado de opinión en los últimos años?
3. ¿Qué te da miedo intentar, aunque te gustaría?
4. ¿Quién te enseñó algo que todavía usas todos los días?
5. ¿Qué es lo más valiente que has hecho?
6. ¿Qué te hace sentir en casa, estés donde estés?
7. ¿Qué te gustaría que te salga bien en el próximo año?
8. ¿A qué le dices que sí con demasiada facilidad?
9. ¿Qué haces cuando nadie te ve que dice mucho de ti?
10. ¿De qué estás orgulloso u orgullosa y casi nunca lo cuentas?

## Ronda 3 · Lo que no se suele decir

Más profunda. Aquí más que nunca: cualquiera puede pasar.

1. ¿Qué piensa la gente de ti que no es verdad?
2. ¿Cuándo fue la última vez que te sentiste en soledad de verdad?
3. ¿Qué le dirías a la persona que eras hace diez años?
4. ¿Qué te gustaría que esta mesa supiera de ti y nadie te pregunta?
5. ¿Qué te cuesta pedir?
6. ¿Qué te gustaría que te preguntaran más seguido?
7. ¿Qué conversación tienes pendiente con alguien?
8. ¿Qué parte de ti estás aprendiendo a querer?
9. ¿Qué te gustaría hacer antes de que se te pase el momento?
10. Si esta fuera la última cena que compartes con gente nueva, ¿qué te llevarías de ella?

---

## Decidido con Michael (05-10-2026)

- Nadie pasa su teléfono: lo lleva una persona, y se cambia de lector entre rondas.
- Sin marcas ni filtro de temas: se puede pasar cualquier pregunta.
- Se quitó «¿Qué pérdida te cambió la forma de ver las cosas?». «¿Cuándo te sentiste en soledad de verdad?» se queda.
- **El final:** cuando se acaba la ronda 3, la pantalla dice algo como «Hasta aquí el juego. Lo demás es suyo». Y el teléfono, a guardar.
