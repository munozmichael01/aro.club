# Aro Club · Gente: la octava pestaña del panel

Hoy operación solo ve a una persona si cae en una mesa. No hay forma de buscar
a alguien por su nombre, ni de responder «¿cuántas mujeres de 30 a 40 aceptan
Las Mercedes?», que es exactamente la pregunta que decide si abrimos una fecha
ahí. La única vista de la base es a través del reparto, y el reparto solo
enseña a quien ya está sentado.

Con 22 perfiles y 25 leads ya se nota. Con 300 es el trabajo entero.

---

## Lo que tiene que responder, en este orden

**1 · ¿Dónde hay gente suficiente?**
Cuántas personas verificadas aceptan cada zona, cruzado con formato. Es lo que
decide abrir o no abrir una fecha, y hoy se decide a ojo.

**2 · ¿Quién es esta persona?**
Buscar por nombre o correo y abrir su ficha. Hoy, si alguien escribe
preguntando por su cuenta, no hay forma de encontrarla.

**3 · ¿Cómo es este segmento?**
Cruzar filtros y que **el número sea la respuesta**: «34 personas» arriba,
grande, y debajo la lista. La combinación de dos filtros *es* la pregunta.

**4 · ¿Dónde se nos cae la gente?**
El embudo con sus cifras:

```
dejó el correo → completó datos → contestó el cuestionario
   → subió cédula → verificada → reservó → fue
```

Cada escalón con cuántos se quedaron ahí, y poder pinchar en uno para ver
quiénes son. Ese es el número que dice si el problema es que no llega gente o
que la perdemos por el camino.

---

## Los filtros salen de lo que ya guardamos

No de una lista inventada. Están en la base y se llenan con el cuestionario:

**De `profile_traits`** — `age`, `gender`, `rootedness` (se quedó / volvió / de
visita), `industry`, `employer`, `life_stage`, `social_energy`, `intention`,
`dining_focus`, `budget_tier`, `interests`, `conversation_topics`, `dietary`,
`languages`, `zones`, `availability`, `formats`.

**De `profiles`** — `status`, `city_slug`, `created_at`, `events_attended`,
`first_event_at`, `last_event_at`.

**Del histórico** — créditos sin usar, cuántas veces ha ido, y cuántas veces se
apuntó sin llegar a sentarse.

Los filtros son **acumulativos**, y cada uno dice cuánta gente deja dentro
antes de aplicarlo. Un filtro que deja cero no se esconde: se dice que deja
cero, porque eso también es una respuesta.

---

## Tres segmentos que valen por sí solos

Conviene que tengan atajo, porque son los que se miran cada semana:

- **Tiene créditos y no ha reservado.** Dinero nuestro parado y alguien que ya
  dijo que sí una vez.
- **Se apunta y nunca entra en una mesa.** Siempre en espera. Es una señal
  mala **nuestra**, no suya: o no abrimos su zona o no cuadra con nadie.
- **No vuelve desde hace más de dos meses.** El producto es la segunda vez.

---

## La ficha

`Aro Club - Perfil miembro.dc.html` ya existe y está cableada contra
`/api/operacion/miembro?id=`. Lo que falta es que **desde aquí se llegue a
ella**, y revisar que enseñe lo que hace falta para decidir: su recorrido, sus
mesas, sus créditos, sus reportes.

---

## La línea de privacidad, que es la parte delicada

El **listado** enseña nombre, trato, edad, zonas, estado y su recorrido.

**No** enseña el documento, ni la selfie, ni el teléfono, ni el correo
completo. Eso se abre en la ficha, de una en una. La cédula sigue viéndose solo
desde la cola de verificaciones, con enlace firmado que caduca.

Los `dealbreakers` y la apertura romántica se contestaron para emparejar, no
para ojearlos. Si aparecen, que sea dentro de la ficha y nunca como columna de
una tabla.

**No hay exportar.** Un botón que baja 500 teléfonos a un CSV es la forma más
fácil de que esta base acabe donde no debe.

---

## Lo que no es

No es una herramienta de envío. Aquí no se le escribe a nadie, ni se
selecciona gente para mandarle nada. Es para **saber**, no para disparar.

---

---

# Y dos pantallas más, pequeñas, que van en el mismo encargo

Las dos existen por lo mismo: el correo ya sale de verdad desde el 17 de
agosto, y eso destapa huecos que antes no se veían porque no llegaba nada.

## A · Darse de baja de los correos

Cada correo lleva **«Ajustes de correo»** en el pie, y hoy apunta a `/cuenta`,
que exige sesión. El problema es que **quien recibe la bienvenida no tiene
cuenta**: dejó su correo y se quedó a medias. Ese enlace no lleva a ningún
sitio para él.

Y un enlace de baja que no funciona no es solo feo: en varias jurisdicciones
no es legal.

Son **dos destinos según quién abre**, y esa distinción es lo que hay que
diseñar:

- **Tiene cuenta** → sus ajustes de correo, dentro de Mi cuenta. Ahí ya hay
  un interruptor por tipo de aviso; solo falta que el pie del correo lleve
  hasta él.
- **No tiene cuenta** → una pantalla suelta, sin sesión, a la que se llega
  con un enlace firmado. Dice de qué dirección se trata, la da de baja, y
  ofrece deshacerlo por si se pulsó sin querer.

La segunda es una pantalla nueva y es la que necesito de ti. Que sea corta:
una frase, un botón, y la vuelta atrás. No es un sitio donde retener a nadie.

## B · Poner una contraseña nueva

**Esta ya existe y la hice yo**, en `/clave`, y quiero que la revises.

La monté deprisa porque el agujero era grave: el correo de recuperación se
mandaba desde el principio, pero no había NINGUNA pantalla que recogiera el
enlace. Con Google y Apple sin conectar, la contraseña es la única puerta —
quien la olvidaba perdía la cuenta con su verificación, sus créditos y su
historial dentro.

Seguí el sistema —fondo verde, Young Serif, el campo y el botón de Entrar— y
tiene tres estados: el enlace vale, el enlace caducó, y hecho. Un solo campo,
sin «mostrar» ni confirmación, como quedamos.

No hay diseño detrás, así que dime qué le falta.

---

## Qué hay ya de mi lado

Los datos están todos. Monto la ruta que devuelve conteos y listas con los
filtros aplicados en el servidor —no se traen 500 filas al navegador para
filtrarlas ahí—.

Lo que necesito de ti es la pantalla: cómo se busca, cómo se cruzan los filtros
sin que parezca un formulario de aduana, y cómo se lee el embudo de un vistazo.
