# Brief para Design · «Cómo funciona» en tres tarjetas

**De:** Michael, con el agente de la app
**Para:** Design
**Fecha:** 29-10-2026
**Referencia:** la cena de Timeleft que vio Michael (captura IMG_2483 a IMG_2485
en `Product features & Content Ideas/TIMELEFT APP/Reserva Dinner Timeleft | Antes - Durante - Después/`).

## Qué es

Timeleft explica la cena en tres tarjetas cortas: **Antes, Durante, Después**.
Por ejemplo: «al llegar, dile a quien recibe que vienes de Timeleft», «pidan
rápido, la conversación sale sola, y si hace falta está el juego», «si
quieren, un último trago».

Nosotros ya tenemos el **paso a paso** de Mi mesa revelada (los 7 momentos
con su hora, `pruebas/guion.test.ts`), que es la versión DETALLADA de la noche.
La idea es **fusionar**: un solo texto con dos versiones.

- **La corta, de tres tarjetas:** antes de reservar (en la hoja de reservar,
  como «¿Cómo funciona?») y la primera vez que alguien tiene puesto.
- **La larga, el paso a paso:** se queda donde está, en Mi mesa revelada.

Que digan lo mismo: la corta resume a la larga, no cuenta otra cosa.

## Qué necesitamos

1. Las **tres tarjetas** (Antes, Durante, Después), en carrusel o como
   ustedes vean, con su icono.
2. **Dónde viven:** el enlace desde la hoja de reservar, y cuándo se enseñan
   solas (una vez, la primera vez que tiene puesto).
3. La versión de **brunch** y de los planes de movimiento (la voz cambia:
   «mesa» o «grupo»).
4. La versión **web**.

## Reglas que no cambian

- No prometer el número de personas.
- Sin emojis: iconos del sistema.
- Copy en venezolano y en neutro, sin guiones largos.
- El texto lo proponemos nosotros a partir del paso a paso, y lo aprueba
  Michael. Design puede proponer otro.

## Entrega

`.dc.html` con sus estados en `app-mobile/Entregas/entrega como-funciona/`.
