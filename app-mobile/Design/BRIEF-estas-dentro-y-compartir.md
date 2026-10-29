# Brief para Design · «Estás dentro» y la tarjeta para compartir

**De:** Michael, con el agente de la app y el agente de la web
**Para:** Design
**Fecha:** 29-10-2026
**Referencia:** lo que vio Michael en una cena de Timeleft, en
`Product features & Content Ideas/TIMELEFT APP/Reserva Dinner Timeleft | Antes - Durante - Después/`
(capturas IMG_2477 a IMG_2486). Es la referencia de QUÉ hacen, no de cómo debe verse lo nuestro.

Queremos que sean creativos: no hace falta calcar a Timeleft, y si ven un camino mejor, propónganlo.

---

## El problema que resuelve

Hoy, cuando alguien reserva, no pasa nada que se sienta como un logro: queda un
estado de «pago en revisión» y, horas después, un correo. No hay un siguiente
paso, ni nada que la persona quiera enseñarle a nadie.

Timeleft cierra la reserva con tres cosas en una pantalla:
1. **«¡Ya estás dentro!»** con el aviso de lo que pasa si cancelas tarde.
2. **Añadir al calendario.**
3. **Compartir:** cuatro tarjetas verticales para historias de Instagram
   («I've got dinner plans», fecha, ciudad, su código de referido, «etiquétanos»).

Las tres nos sirven: la primera da tranquilidad, la segunda baja las ausencias
y la tercera nos trae gente nueva sin pagar publicidad.

## Lo que nos diferencia, y tienen que resolver: el ida y vuelta del pago

En Timeleft pagas con tarjeta y la confirmación es inmediata. En Aro **no**:

| Cómo paga | Qué pasa | Cuándo está confirmado |
|---|---|---|
| Con crédito o con cupón del 100 % | Al instante | Al tocar «Reservar» |
| Pago Móvil, transferencia, Zelle o Bizum | Reporta el pago y una persona del equipo lo revisa | Horas después; llega el correo «pago confirmado» |

Al **reportar** el pago, el puesto ya queda apartado. Pero si el pago no
cuadra, se cae. Así que hay dos momentos, y queremos que propongan qué se
enseña en cada uno:

- **Momento A · al reportar el pago:** el puesto está apartado y falta la
  confirmación. ¿Celebramos ya o esperamos? Nuestra propuesta es una versión
  tranquila («Tu puesto está apartado. Te avisamos al confirmar el pago»),
  con el calendario y sin compartir todavía.
- **Momento B · al confirmar** (o al instante, si pagó con crédito o cupón):
  la celebración de verdad, con «Estás dentro», calendario y compartir.
  ¿Cómo la ve quien ya cerró la app? Ideas para valorar: se abre la primera
  vez que entra tras la confirmación, la push de «pago confirmado» lleva
  directo ahí, y el correo trae un botón a la misma pantalla.

Que no se vea dos veces, y que quien no la vio la pueda encontrar en Mi mesa
(«Compartir mi plan»).

## Qué necesitamos de Design

1. **La pantalla «Estás dentro»** (momento B) y su versión tranquila (momento A).
   Con el calendario, compartir y «ver mi mesa». Y el recordatorio de
   cancelación que ya usamos: con más de 24 horas recuperas el crédito.
2. **Las tarjetas para historias:** 1080 × 1920, de 3 a 4 variantes con la
   voz de Aro. Llevan el plan (cena o brunch), el día, la zona o la ciudad
   (**nunca el restaurante**: es sorpresa hasta la revelación), el código de
   la persona, «aro.club» y la mención @aroclub. Que funcionen sin foto de la
   persona.
3. **Cómo se elige y se comparte:** el carrusel, y los botones de guardar
   imagen, historias de Instagram, WhatsApp y más.
4. **«Compartir mi plan» dentro de Mi mesa**, para quien cerró la pantalla.
5. Los estados de **brunch** y de los demás formatos (la voz cambia: «mesa» o
   «grupo»), y la versión **web**, que es la misma pantalla en el navegador.

## Reglas que no cambian

- Sin emojis: iconos del sistema.
- Copy en venezolano, en neutro (nada de masculino genérico) y sin guiones largos.
- **No prometer el número de personas ni la mezcla de géneros** (Michael, 29-10):
  nada de «cenas con cinco» en las tarjetas.
- El precio se dice en USD en lo que sale de la app.
- El código de referido está definido en `REFERIDOS.md`. Las tarjetas lo
  muestran, pero el canje no es de Design.

## Entrega

Un `.dc.html` por pantalla, como siempre, con los estados por separado
(A, B con crédito, B con pago confirmado, brunch, web). Mandarlo a
`app-mobile/Entregas/entrega estas-dentro/`.
