# El juego de la mesa · V3 por temáticas (APROBADO, 29-10-2026)

Cerrado por Michael el 29-10, después de la cena de Timeleft. Sustituye a la
V2 de rondas (`JUEGO-v2.md`), que se queda escrita por si alguna pregunta
vuelve.

**Cómo se juega**

- La mesa **elige la temática**, en el orden que quiera. No hay rondas de
  menos a más.
- **Sin regla de quién lee.** Solo una nota: «Si a alguien no le provoca, pasa».
- **Cinco temáticas de cinco preguntas.** Todas están disponibles; ninguna es
  opcional ni se desbloquea.
- **Ligero.** Fuera lo que la gente sintió demasiado profundo.
- Lo visual (color e icono) lo pone la app por posición, así que el orden de
  aquí es el orden de la pantalla: rayo, brújula, libro, cruce de caminos y
  luna.

**Dónde vive:** en `public/reglas.js`, como `AroReglas.JUEGO.tematicas`,
`[{ clave, nombre, linea, preguntas[] }]`. La app y la web lo leen de ahí. En
la app, el juego por temáticas se enciende solo cuando existe esa lista; sin
ella sigue el de rondas.

---

## 1 · Rápido y ligero
`clave: rapido` · *Para romper el hielo sin pensarlo.*

1. ¿Arepa de qué?
2. ¿Playa o montaña, y por qué?
3. ¿Cuál es tu talento más inútil?
4. ¿Qué canción pones cuando necesitas ánimo?
5. ¿Qué serie o película le recomiendas a todo el mundo?

## 2 · Lo de aquí
`clave: aqui` · *Caracas y lo que tiene.*

1. ¿Cuál es tu plan perfecto de domingo en Caracas?
2. ¿Qué tiene Caracas que no cambiarías por nada?
3. ¿A qué sitio llevarías a alguien que acaba de llegar a la ciudad?
4. ¿Cuál es la mejor comida de calle que has probado aquí?
5. ¿Qué es lo más raro que te ha pasado en Caracas?

## 3 · Historias
`clave: historias` · *Las anécdotas que se cuentan solas.*

1. ¿Cuál es la peor comida que has probado en un viaje?
2. ¿Cuál es el regalo más extraño que te han hecho?
3. ¿Qué hobby empezaste con todo y dejaste al mes?
4. ¿Cuál fue tu primer trabajo, y qué tenía de raro?
5. ¿Qué es lo último que te dio un ataque de risa?

## 4 · ¿Y si…?
`clave: ysi` · *Para imaginar, votar y discutir.*

1. Si pudieras vivir un año en cualquier ciudad, ¿cuál sería?
2. ¿Quién de esta mesa propondría un plan loco, y quién diría que sí primero?
3. Si mañana nos fuéramos todos de viaje, ¿adónde iríamos?
4. Si esta mesa montara un negocio juntos, ¿de qué sería y quién hace qué?
5. Si pudieras cenar con cualquier persona, de cualquier época, ¿con quién?

## 5 · Lo que te mueve
`clave: temueve` · *Un poco más de ti, sin exponerte.*

1. ¿Qué te tiene con ilusión estos días, aunque sea algo pequeño?
2. ¿Qué haces que te hace perder la noción del tiempo?
3. ¿Qué plan llevas tiempo diciendo que vas a hacer?
4. ¿Cuál es el mejor consejo que te han dado?
5. ¿Qué es lo más espontáneo que has hecho?

---

## Por qué así

- **Los nombres son los de Design**, salvo «Lo de aquí», que es nuestro: es
  lo que Timeleft no puede tener.
- **«¿Y si…?» habla de la mesa**, no solo de cada uno (2, 3 y 4): la mesa se
  señala, vota y discute. Es lo que mejor hace el juego de Timeleft.
- **«¿Qué tiene Caracas que no cambiarías por nada?»** la puede contestar
  cualquiera, sea de aquí o no. Sustituye a «¿Qué te trajo a Caracas, o qué te
  hizo quedarte?», que no servía en una mesa donde todos son de aquí (Michael,
  29-10).
- **«Lo que te mueve» va al final y sin preguntas de valores.** Las de Design
  («¿A quién le pides consejo?», «¿Qué no negocias en una amistad?») eran las
  más parecidas a lo profundo de lo que se quejó la gente.
- **«Para cerrar» no entra.** «¿Qué te sorprendió de alguien hoy?» pide hablar
  de alguien delante de esa persona.

## Lo que sale de la V2

- ¿Qué momento de tu vida te gustaría volver a vivir?
- ¿Qué es lo más valiente que has hecho?
- ¿Qué te gustaría que te preguntaran más seguido?
- ¿Qué te hace sentir en casa, estés donde estés?
- ¿Qué aprendiste este año que no esperabas aprender?
- ¿En qué eres mejor de lo que la gente imagina?
- ¿Quién te enseñó algo que todavía usas?
- ¿A qué le dices que sí con demasiada facilidad?
- Si mañana tuvieras el día libre, ¿qué harías primero?
- Te ganas la lotería: ¿qué haces en las primeras 24 horas?
- Si pudieras aprender algo de un día para otro, ¿qué sería?
- ¿Qué comida no dejarías de comer nunca? (la cubre «¿Arepa de qué?»)
- ¿Qué te gustaba de chamo o chama que todavía te gusta?
- Y las de la ronda 2 de la V2 que no están arriba.
