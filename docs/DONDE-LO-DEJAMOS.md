# Dónde lo dejamos · web y servidor

Lo que está a medias y lo que está decidido pero sin hacer, con el porqué.
Igual que el «Dónde lo dejamos» de la app, para que retomar no sea volver a
preguntar.

**Última vez: 31-10-2026, mediodía.**

---

## 1 · Lo que quedó hecho y vivo hoy

- **Seis cenas abiertas** para el jueves 5, viernes 6 y sábado 7, a las 7:00,
  10 ref, seis por mesa. Hasta 44 en Chacao y Los Palos Grandes; +45 en Los
  Naranjos y El Hatillo. Sus 1.438 avisos salieron el 31 a las 10:20.
- **Dos drinks abiertos**, viernes 6 y sábado 7 **a las 8:00**, Vista Bar,
  **Chacao o Los Palos Grandes**, **ocho personas, 7 ref, sin banda de edad**.
  Decidido por Michael el 31-10.
- La agenda dice cuántos son **por fecha** y ya no promete seis en la
  cabecera. Drinks estrena icono propio (la copa).
- Las cenas nacen a las 7:00 por defecto, no a las 7:30.

---

## 2 · Drinks: lo que falta antes del viernes

1. **Vista Bar no tiene el formato `drinks` marcado.** Sin eso el panel se
   niega a publicar la mesa el viernes al mediodía. Es un clic en Locales. Lo
   intenté y el permiso me lo bloquea: editar un local es «modificar un
   recurso compartido».
2. **El aviso de los drinks no ha salido.** Se encoló y se retiró a propósito
   el 31-10: Michael quiere que las cenas salieran solas y los drinks tengan
   su propia comunicación.
3. **A quién llega ese aviso, que es el punto que hay que decidir.** El correo
   de apertura solo escribe a quien marcó **esa zona** *y* **ese plan** *y*
   **ese día**: para los drinks del viernes eran **39 personas**, no las 618
   que marcaron Drinks en el cuestionario. Si lo que se quiere es hablarle a
   los 618 estén donde estén, **es otro correo**, no el de apertura. Está sin
   escribir.

---

## 3 · El segundo acto, sin cerrar

Michael, 31-10: quiere hacer segundo acto esta semana **en el mismo sitio que
los drinks**, y preguntó si unir los dos grupos o mantenerlos separados.

**Lo propuesto, pendiente de su sí:** dos planes, mismo bar, y dicho en voz
alta.

- El grupo de drinks mantiene su plan: ocho personas escogidas. No se le
  mezcla con tres mesas de cena, porque eso es lo que compró.
- Las cenas de esa noche llevan Vista Bar como **sitio para seguir**, que es
  un mecanismo que ya existe (`restaurant_after_venues`, y Mi mesa lo pinta
  con los minutos a pie).
- Y el copy de los drinks lo dice: *a partir de las diez y media van llegando
  las mesas de la noche*. Quien quiera eso elige drinks por eso; quien no, lo
  sabe antes de pagar.

**Por qué los drinks a las 8 y no a las 9:** las cenas son a las 7 y acaban
cerca de las 9. Con los drinks a las 9 el grupo de ocho no tiene un minuto
para conocerse antes de que llegue el resto; a las 8 tienen hora y media.

**Lo que falta para que funcione:** marcar Vista Bar como sitio para seguir
de los restaurantes de esas cenas, y escribir esa línea de copy.

---

## 4 · Lo siguiente que pidió Michael: las tarjetas de la agenda

**Lo que dijo el 31-10:** «darle más info a cada uno de los formatos al
momento de reservar, ahora es solo una card con el nombre y pasa directo a
reservar» y «ponerle precios también a los planes (con los signos)».

**Lo que la tarjeta enseña hoy** (`public/Aro Club - Agenda.dc.html`, y el
servidor en `src/app/api/agenda/route.ts`): el formato, las etiquetas de edad
y de idioma, el día, el precio en ref, la hora, las zonas, cuántos son y
cuándo se sabe el sitio. Y un botón que lleva a reservar.

**Lo que falta, tal como lo pidió:**

- **Qué es cada formato**, dicho en la tarjeta o al abrirla: qué pasa en unos
  drinks, en un brunch, en una caminata. Hoy el nombre es todo lo que hay, y
  quien no conoce el club tiene que deducirlo.
- **Qué incluye y qué no**: la plaza cubre armar el grupo, la verificación de
  todos y el sitio reservado; el consumo va aparte. Está escrito en el correo
  de la revelación y en Pago, no antes de decidir.
- **El precio del sitio en signos** (`budget_tier` de `restaurants`, que ya
  existe y Mi mesa usa). Ojo con lo que Michael dijo el 22-10: «"Caro" no lo
  podemos mostrar con esta clasificación» — por eso en Mi mesa salen signos y
  no palabras. Lo mismo aquí.
- Y el precio del plan ya sale, pero sin contexto: 7 ref y 10 ref uno al lado
  del otro no explican por qué.

**Lo que hay que decidir antes de escribir código:** si esa información vive
en la tarjeta (más alta, más densa) o en una pantalla de formato que se abre
antes de reservar. Lo segundo da sitio para la foto del formato, que ya
existe en `AroReglas.FAMILIAS`.

---

## 5 · Lo demás que está pedido y sin empezar

- **El premio de los referidos** (Michael, 31-10): reserva gratis para quien
  invite a tres personas **que vayan a su primera cena**, no que reserven. La
  cuenta ya está hecha y se ve en Perfil (`cuentaDe`, `premiosQueFaltan` en
  `src/lib/referidos.ts`); lo que falta es dar el crédito al marcar la
  asistencia y los **dos correos** de la sección 7 de `REFERIDOS.md`. Michael
  los quiere ver compuestos antes de que salga ninguno.
- **«Estás dentro» en la web** (Michael, 31-10): la pantalla, el calendario y
  «Compartir mi plan», fiel a la entrega `estas-dentro`, como ya está en la
  app. Hoy la web no la tiene en ningún camino: lo que hay es el final de
  Pago, que desde el 31-10 dice las mismas palabras pero no es la pantalla.
- **Las nueve personas** a las que el correo de cancelación les dijo que
  recuperaban un crédito que habían perdido, entre el 16 y el 30-10. El fallo
  está arreglado; falta decidir si se les escribe.
- Y lo que ya está en `BACKLOG.md`: la encuesta que pregunta por «la comida»
  también en unos drinks, y el sello de «PRÓXIMAMENTE» de la portada.
