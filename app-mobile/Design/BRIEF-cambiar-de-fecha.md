# Brief para Design · Cambiar de fecha, y las acciones de Mi mesa

**De:** Michael, con el agente de la app y el agente de la web
**Para:** Design
**Fecha:** 29-10-2026

## Qué es

Desde hoy, quien tiene puesto puede **cambiarse de fecha uno mismo**, sin
cancelar ni volver a reservar. Antes de la revelación y con más de 24 horas,
a otra fecha abierta que le corresponda por edad e idioma. Lo pagado se va
con la reserva: no se cobra ni se devuelve nada.

Está construido en la app con las piezas que ya teníamos, para no esperar.
Las capturas están en `app-mobile/Entregas/vistas-29-10/` (5, 6 y 7). A
Michael no le convencen: los enlaces sueltos se ven flotando y los botones
son pobres. Queremos la versión de Design.

## Qué necesitamos

1. **Mi mesa antes de la revelación** (la tarjeta con la cuenta atrás).
   Hoy tiene dos acciones: «Cambiar de fecha» y «Cancelar mi puesto». Las
   pusimos dentro de la tarjeta de la fecha porque son acciones sobre ESA
   fecha. Propongan cómo van, con estas reglas:
   - «Cambiar de fecha» **solo aparece si hay fechas a las que irse**.
   - Cancelar es grave y no debe competir con cambiar: mucha gente cancela
     cuando lo que quería era moverse.
2. **«¿A qué fecha te cambias?»**: la fecha de ahora, la lista de las que
   puede elegir (día, hora, plan, zonas y, si toca, «En inglés») y el botón.
   Si no hay ninguna, o ya es tarde, la pantalla dice por qué.
3. **La confirmación:** «Antes», tachada, y «Ahora», como el correo
   `fecha_cambiada`, que va en ese mismo orden. Lo primero que hace la gente
   es comprobar que no perdió su cena.
4. Los mismos tres en **la web** (Mi mesa) y la versión para **brunch** y los
   demás planes (la voz cambia: «mesa» o «grupo»).

## Reglas que no cambian

- Sin emojis: iconos del sistema.
- Copy en venezolano y en neutro, sin guiones largos.
- No prometer el número de personas de la mesa.
- El margen (24 horas) sale de la regla compartida: no lo escriban a mano en
  las maquetas como si fuera fijo.

## Entrega

Un `.dc.html` por pantalla con sus estados (hay fechas, no hay, es tarde,
confirmación) en `app-mobile/Entregas/entrega cambiar-fecha/`.
