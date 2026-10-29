# Brief para Design · El juego de la mesa, por temáticas

**De:** Michael, con el agente de la app
**Para:** Design
**Fecha:** 29-10-2026
**Referencia:** la cena de Timeleft que vio Michael, en
`Product features & Content Ideas/TIMELEFT APP/Reserva Dinner Timeleft | Antes - Durante - Después/`
(los videos de las 15:30 y las 15:31). Es la referencia de QUÉ hacen, no de cómo debe verse lo nuestro.

## Qué cambia y por qué

Hoy el juego (entrega 18) va en **tres rondas fijas, de menos a más**, con
una regla: una persona lee y responden todos. Michael prefiere el modelo de
Timeleft:

- **La mesa elige la temática**, en el orden que quiera y las veces que quiera.
- **Sin reglas de quién lee:** cada quien lo usa como le sirva.
- Es más flexible, y nos deja **quitar las preguntas demasiado profundas**,
  que es de lo que más se ha quejado la gente hasta ahora.

Timeleft tiene cuatro temáticas, de 5 preguntas cada una: «Rápido y
divertido», «Valores», «Historias de vida» e «Hipotéticos». Las nuestras, con
sus preguntas, las propone el agente de la app y las aprueba Michael. Diseñen
pensando en **cuatro temáticas de cinco preguntas**, pero que aguante tres o
cinco.

## Qué necesitamos

1. **Elegir temática:** la lista, cada una con su nombre, una línea que dice
   de qué va y cuántas preguntas tiene. Que se vea cuáles ya se jugaron.
2. **La portada de cada temática**, antes de la primera pregunta.
3. **La pregunta:** «Pregunta 2 de 5», adelante, atrás y volver a las temáticas.
4. **El final de una temática:** otra, o terminar.
5. **La tarjeta del juego en Mi mesa** (cerrada y abierta), que hoy dice
   «3 rondas». Con temáticas tiene que decir otra cosa.

## Lo que se mantiene

- Solo en cenas, y se abre a la hora de la cena (la ventana de
  `AroReglas.JUEGO`).
- La pantalla siempre encendida.
- Cada teléfono recuerda dónde iba.
- El color: cada temática puede tener el suyo, dentro de la paleta de Aro.
  Sin emojis: iconos del sistema.
- Copy en venezolano y en neutro, sin guiones largos.

## Entrega

Un `.dc.html` por pantalla, con sus estados, en
`app-mobile/Juego de la mesa/entrega/entrega tematicas/`.
