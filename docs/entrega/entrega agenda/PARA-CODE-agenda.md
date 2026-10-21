# /agenda (pública) y franja de la home

Diseño: `Aro Club - Agenda.dc.html` (página) y `Aro Club - Agenda (estados).dc.html` (celular y computadora, tres estados, y la franja en contexto).

No es solo cenas. Es la agenda pública de todos los formatos: cena, brunch, drinks, movimiento y coffee. Ruta propuesta: `/agenda`. Si queréis mantener `/cenas`, que sea `/agenda?formato=cena`.

## Reglas
- **Una tarjeta por fecha (evento), no por mesa.** No sabemos cuántos puestos faltan en cada mesa porque repartimos al cerrar la fecha.
- **El cupo sale del evento.** «Quedan N puestos» es el cupo del evento menos las reservas confirmadas y pendientes. Si queda 1: «Queda 1 puesto». Con 3 o menos va en terracota con el punto melocotón. Con 0: «Completa», y el botón pasa a «Apuntarme a la lista de espera».
- **Formato, día, hora, zona y precio salen del evento.** La zona va tal como viene («Chacao o Los Palos Grandes»). El sitio nunca aparece antes de las 12:00 del día. «10 ref» es un ejemplo.
- **Filtro:** es la fila de polaroids de Mi cuenta (entrega 19), el mismo componente y las mismas reglas.
  - Si hay varios formatos con fechas, «Todos» va primero y entra marcado.
  - Si solo hay un formato con fechas, no se muestra «Todos» y las polaroids hacen de escaparate.
  - Los formatos sin fechas van apagados, con «Próximamente», y no se pueden tocar.
  - En computadora la fila se queda quieta, con polaroids más grandes.
- Usa los mismos datos de agenda que Mi cuenta.
- **Botón:** «Reservar mi puesto». Sin sesión lleva al registro. Con sesión abre la reserva de esa fecha.
- **Sin fechas abiertas:** se muestra el bloque «Esta semana ya se llenó» con «Apúntate para la próxima», que lleva al registro.
- **En los textos:** nada de punto y coma ni de guiones.

## SEO
- **Un solo H1** («Cenas y planes en Caracas.») con tamaño responsive. No duplicarlo para celular y computadora.
- **Title:** `Cenas y planes en Caracas esta semana · Aro Club`. Meta description con «Caracas», «cenas» y «desconocidos verificados».
- **Ruta:** `/agenda`.
- **Pregunta «¿Dónde son los planes?»:** la lista de zonas sale de las zonas con fechas abiertas, no escrita a mano.
- **Schema Event, una entrada por fecha:**
  - Lugar: la zona y Caracas, nunca el restaurante.
  - `endDate`: la duración del formato (cena, unas 2 h 30; brunch, unas 2 h). Si el evento tiene duración propia, manda esa.
- **En la agenda pública el filtro solo muestra formatos con fechas**, sin polaroids de «Próximamente». La landing ya enseña lo que viene. Si solo hay un formato activo, no hay filtro.

## Header y menú
- **Celular:** logo, «Empezar» (solo sin sesión) y botón de menú. Nada más en la barra. «Aro Club» nunca parte en dos líneas.
- **Menú sin sesión:** Agenda, Cómo funciona, Entrar y botón «Encuentra tu mesa».
- **Menú con sesión:** Agenda, Mi cuenta, Mi perfil y «Cerrar sesión» en texto pequeño al final.
- La página actual va en terracota.
- **Computadora sin sesión:** Agenda, Entrar y Empezar. **Con sesión:** Agenda y Mi cuenta.
- **Operación no aparece nunca en el header del miembro**, ni para el equipo. Se entra por su propia dirección.
- Es el mismo header en la landing, la agenda y las pantallas públicas.

## Accesos desde la landing v4 (sin franja)
- El hero no se toca.
- **Header fijo:** «Agenda» va antes de «Entrar», con el mismo estilo de texto. Dentro de /agenda va marcado en terracota.
- **Bloque «Hoy son cenas. Después, lo que pida la gente.»:** lleva un botón secundario con borde, «Ver la agenda →».
  - En celular va debajo de las polaroids, a todo el ancho.
  - En computadora va a la derecha del titular.
  - El primario «Encuentra tu mesa» sigue siendo el único relleno.
