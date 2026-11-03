# Brief para Design · Cómo se ve la carga

**De:** Michael, con el agente de la app
**Para:** Design
**Fecha:** 03-11-2026
**Para:** app y web

## El problema

Michael: «necesitamos skeletons que funcionen mejor y un loading más serio, a
la altura del producto».

Hoy cada pantalla resuelve la espera a su manera. No hay un sistema:

- **Inicio:** un esqueleto genérico. Bloques grises que laten y no se parecen
  a lo que va a salir.
- **Mi mesa:** nada. La pantalla se queda en blanco hasta que llega la
  respuesta.
- **Pago, Cancelar, Cambiar de fecha, Estás dentro, Pasadas, la invitación
  del +1, Legal, Entrar, el alta:** el aro de la marca girando (`AroCarga`)
  en medio de la pantalla.
- **Al arrancar la app, Datos, Cuestionario y Verificación:** un velo
  completo con el aro (`Velo`).
- **Botones mientras se guarda:** el texto cambia («Apuntándote»,
  «Guardando…») o sale el aro pequeño en su lugar.
- **Sin conexión:** un aviso con «Reintentar», distinto en cada pantalla.

**Lo que ya está resuelto sin Design (03-11):** Inicio y Mi mesa enseñan al
instante lo último que vio la persona y se actualizan por detrás. La espera
de verdad solo queda para la primera vez, sin red, o en las pantallas que
siempre piden algo nuevo (Pago, Estás dentro…). Así que lo que pedimos es
para esos casos, no para cada visita.

## Lo que pedimos

1. **Un lenguaje de carga único** para la app y la web. ¿Cuándo esqueleto,
   cuándo el aro, cuándo nada? Por ejemplo: esqueleto si sabemos qué forma
   va a tener la pantalla; el aro si es un paso (pagar, guardar); nada si
   tarda menos de medio segundo.
2. **Esqueletos con la forma real** de cada pantalla principal: Inicio (la
   tarjeta de estado, la agenda con sus filas), Mi mesa (cerrada, abierta),
   Pasadas, Pago y Estás dentro. Que al llegar los datos no salte nada de
   sitio.
3. **El aro de la marca como carga:** cómo se mueve, en qué tamaños y sobre
   qué fondos (crema y verde). Hoy gira; ¿debería «llenarse» como el aro de
   la mesa, punto a punto?
4. **La transición** de esqueleto a contenido: aparece de golpe, con
   fundido o por partes.
5. **Los botones mientras trabajan:** el texto que cambia, el aro dentro o
   el botón apagado.
6. **Sin conexión y «no pudimos cargar»:** un solo estado, con su texto y su
   botón de reintentar.
7. **Movimiento reducido:** qué se ve si la persona tiene activado «reducir
   movimiento» (hoy los latidos ya se apagan).

## Reglas que no cambian

- Sin emojis: iconos del sistema.
- Colores del sistema: crema `#FAF3E4`, verde profundo `#14342A`, cuerpo
  `#33513F`.
- Copy en venezolano, neutro y sin guiones largos. Los textos los aprueba
  Michael.
- Una espera nunca dice algo que no es verdad: nada de «Casi listo» si no
  sabemos cuánto falta.
