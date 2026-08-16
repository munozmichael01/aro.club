# Entrega 14 · El panel de operación completo

Siete pestañas contra tus doce rutas, más el alta de local y los trece correos.

**Cuatro cosas que faltaban del panel y no estaban ni diseñadas:** abrir fecha, cancelar fecha, reportes y equipo. Las cuatro tenían ruta y ninguna tenía pantalla.

---

## 1 · Las siete pestañas, y qué ruta cubre cada una

| Pestaña | Ruta |
|---|---|
| Reparto | `repartir` · `propuesta` · `publicar` · `despublicar` |
| Verificaciones | `verificaciones` · `miembro` |
| Pagos | `pagos` |
| Reportes | `incidencias` |
| Fechas | `fechas` · `cancelar-fecha` |
| Locales | `locales` |
| Equipo | `equipo` |

Las doce están cubiertas. **Antes solo lo estaban cinco.**

---

## 2 · Reparto: rehecho contra el modelo real

**Ya no hay una fecha escrita a mano.** Filtro por familia arriba, fechas de ese tipo en riel, y dentro la jerarquía **fecha → zona → mesas**. Una lista vertical de fechas no escala.

**Las siete reglas duras**, evaluadas de verdad, no «tres señales»: balance de género, horquilla de edad, empresa repetida, ya cenaron juntos, tramos de gasto, idioma común y **zona común**.

La séptima tuvo un fallo que merece la pena contar: intersectaba las zonas de los seis entre sí pero **nunca las comparaba con la zona donde la mesa está puesta**, así que seis personas de El Rosal sentadas en Los Palos Grandes salían en verde. Ahora dice «Todos aceptan Los Palos Grandes» o rompe.

**Octava comprobación, que no estaba en tu lista:** una mesa con cinco o con siete tampoco publica. Aparece sola en cuanto se puede mover gente.

### Mover gente

Se arrastra a alguien —de una mesa, de otra zona o **de la espera**— y se recalculan **todas las mesas abiertas**, no solo las dos tocadas, con estado `CALCULANDO`. Las publicadas no sueltan ni reciben.

El arrastre **nunca prohíbe cruzar de zona**: puede haber razones que el algoritmo no sabe. Lo que hace es decir la consecuencia y parar la publicación.

### Publicar

Por mesa, con deshacer. Si rompe una regla, **modal de confirmación** con qué se rompe y las tres salidas: publicar igualmente, volver a repartir, cancelar. Queda escrito quién lo aceptó y cuándo.

Y **barra fija abajo** con el contador de espera, su consecuencia —«publicar deja fuera a esas 2»— y el publicar en tanda, que solo alcanza a las que no rompen nada. La barra es también destino de arrastre.

---

## 3 · Fechas: abrir y cancelar

**Se elige solo el día.** La pantalla muestra las tres fechas derivadas para que quien abre vea qué promete.

**Y aquí hay una decisión nueva que toca tu código:** «todo se abre a las 12:00» se diseñó para cenas, pero **siete de los once formatos empiezan por la mañana** y a mediodía ya habrían pasado.

```
cenas y drinks       → 12:00 del mismo día
mañana (7 formatos)  → 12:00 del día ANTERIOR
```

**El correo 03 y Mi mesa cuelgan de esa hora** y asumen mediodía del propio día.

**Cupo y precio son del evento**, para todos los formatos: cupo abierto o limitado, y precio con 8 USD como arranque, no como constante. El tope manda sobre el reparto.

**La actividad, obligatoria en movimiento.** Es el hueco de modelo que faltaba: el punto de encuentro es un lugar con dirección —`event_venues.restaurant_id`—, y la actividad es qué se hace: ruta, kilómetros, minutos, nivel. Para una cena coinciden; para un hiking no.

**Cancelar son dos vías con consecuencias distintas**, no un motivo libre:

| Vía | Devuelve |
|---|---|
| No se llenó | **1 crédito** |
| La cancelamos nosotros | **2 créditos** |

Cada una con su botón nombrado, los pagos que hay que devolver **a mano** en bolívares, y el motivo que va al correo 12.

---

## 4 · Reportes y Equipo

**Reportes** lee `incident_reports` con su severidad. Tres acciones: sacar del club, avisar y anotar, cerrar sin acción. Muestra reincidencia cuando la hay, y quién reporta va como «protegida».

**Equipo** era la única ruta sin pantalla, y la que peor consecuencia tenía: dar acceso pasaba por pedirle a un compañero que se registrara como miembro y editarle la fila a mano. Ahora se da acceso con nombre, correo y rol; solo admin puede; quitar el acceso **baja a miembro**, no borra, para que la auditoría conserve al actor. Y el último admin no se puede retirar.

**Una nota para que no lo leas como contradicción:** la fila retirada se queda visible con su chip en «Miembro», mientras tu `GET` filtra `.in('role',['ops','admin'])` y no la devolvería. Es deliberado —ver el resultado de tu propia acción sin recargar—, pero al montarlo con datos reales esa fila desaparece en el siguiente refresco, y eso está bien. El contador de la pestaña sí cuenta solo a quien tiene acceso hoy.

---

## 5 · Locales: la pantalla existía y no se llegaba a ella

`Aro Club - Locales.dc.html` tiene lista, ficha y alta. El botón de Operación iba a la lista, no al alta: ahora `#alta` y `#ficha`.

Y el alta pedía seis campos de los que el esquema define. Añadí tres:

- **Metro y minutos andando.** Tu propio comentario lo justifica: en Caracas decide si alguien acepta una zona.
- **Forma de mesa** como enum de tres. Lo puse primero como casilla y estaba mal: `redonda | larga | ambas`, y con un booleano no se distingue `larga` de `ambas`.
- **Días de apertura.** Faltaba, y es el que impide que un sitio cerrado el jueves reciba la cena del jueves. **El selector de sitio de Fechas ahora filtra por días además de por familia.**

---

## 6 · El vocabulario: grupo, no mesa

Una tabla derivada de la familia del formato, en un solo sitio, **con género** —«una mesa» / «un grupo»—: mesa/grupo, restaurante/punto de encuentro, sentados/repartidos.

Con la caminata del domingo el panel dice grupos y punto de encuentro. **Y la pestaña dejó de llamarse «Mesas»: es «Reparto»**, porque desde ahí se reparte también una caminata.

**Falta llevarlo al miembro:** la pantalla se llama «Mi mesa» y el correo 03 dice «TU MESA · 04». Para un hiking eso no tiene sentido.

---

## 7 · Cada persona lleva a su perfil

Desde la cola de verificaciones, desde cada integrante de una mesa y desde la espera. `Aro Club - Perfil miembro.dc.html` existía sin que nada lo enlazara — el mismo error que Cancelar.

---

## 8 · Archivos

```
Aro Club - Operacion.dc.html     ← siete pestañas
Aro Club - Locales.dc.html       ← alta con metro, forma y días
Aro Club - Perfil miembro.dc.html
Aro Club - Sistema v3.dc.html    ← regla de sobre verde
Aro Club - Correos.html + correos/  ← trece
support.js
```

---

## 9 · Lo que sigue abierto por mi lado

**El vocabulario en el miembro**: Mi mesa, Mi cuenta y el correo 03.

**La foto** de «estás unos días y no quieres pasarlos en casa» sigue viniendo de Wikimedia.

**Y una advertencia honesta sobre esta entrega:** el panel se rompió tres veces mientras lo construía, y las tres por lo mismo —usar algo antes de declararlo o borrar por región helpers compartidos—. `new Function` solo valida sintaxis, así que compilaba «OK» y la pantalla salía en blanco. Ahora instancio la clase y llamo `renderVals()` antes de entregar. Si algo así llega hasta ti, el fallo es de mi cierre, no de tu montaje.
