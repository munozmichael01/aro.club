# Brief para Design · Mi mesa: Próxima y Pasadas

**Para:** Design. **De:** Michael, con el agente de la app. **Fecha:** 31-10-2026.

## Por qué

La entrega «seguir-en-contacto» pone la tarjeta en «la Mi mesa de esa cena».
Pero Mi mesa deja de enseñar una cena pasada en cuanto se responde la
encuesta, y para coincidir con alguien hay que haberla respondido. La tarjeta
no se vería casi nunca. Y lo que se comparten dos personas tiene que poder
encontrarse siempre, no solo durante 7 días.

A la vez, hoy la encuesta pendiente tapa la mesa nueva hasta que se responde.
Con una cena hoy y otra mañana, eso deja a alguien sin ver su mesa. Michael
decidió el 31-10 que la mesa activa manda siempre.

## Lo que hay que diseñar

### 1. Dos pestañas arriba en Mi mesa: «Próxima» y «Pasadas»

En movimiento la pantalla se llama «Mi grupo», como hoy. Las pestañas
dicen lo mismo.

### 2. Próxima: qué se ve, por orden

1. **Hay una reserva activa:** manda esa, siempre. Lo que ya existe (cerrada,
   abierta, sin mesa), sin cambios.
   - Si queda algo pendiente de una cena pasada, **una línea arriba** que no tapa
     nada y lleva a esa cena en Pasadas:
     - encuesta: «Te falta contar cómo estuvo el jueves»;
     - contacto: «Andrea también quiere seguir en contacto · quedan 6 días»
       (con varias, «Andrea y Luis…»);
     - si hay las dos, manda la de contacto, porque caduca.
2. **No hay reserva activa, pero sí pendientes:** Próxima enseña esa cena pasada
   con lo que falta (la encuesta, la tarjeta de contacto), como hoy.
3. **Ni reserva ni pendientes:** el «sin reserva» de siempre.

### 3. Pasadas: la lista

Las cenas de la persona, de la más reciente a la más vieja. Cada fila lleva la
fecha, el plan, el sitio y, si hay algo, una marca:
- **Pendiente:** encuesta sin responder, o contacto por confirmar.
- **Punto de «hay algo nuevo»:** ver el punto 5.

Vacía (nunca ha cenado): un estado vacío que invite a la agenda.

### 4. La vista de una cena pasada

Se abre desde una fila de Pasadas, desde la línea de Próxima o desde Mis cenas
de Perfil. Lleva:
- la cabecera de la cena (día, plan, sitio);
- con quién cenaste (como la Mi mesa pasada de hoy);
- la encuesta si falta, o tu valoración si ya la diste;
- «Seguir en contacto» **en el estado que tenga, para siempre**. Es el panel de
  la entrega, dentro de la cena: A, B, C, D y E, y la versión de varias
  personas. Quien confirmó y no hubo cruce sigue viendo «Esta vez no se cruzaron
  los datos». Si no hubo coincidencia, no sale nada de contacto.

### 5. El punto de «hay algo nuevo»

Sale en tres sitios a la vez: la pestaña Pasadas, la fila de esa cena y el
icono de Mi mesa de la barra de abajo. Se quita al abrir esa cena. Lo encienden:
- una coincidencia nueva;
- «Andrea te dejó su número» (la otra persona confirmó);
- «Esta vez no se cruzaron los datos», solo para quien había confirmado.

### 6. Mis cenas en Perfil

Se queda, pero pasa a ser un acceso directo a Mi mesa → Pasadas. Diseñar solo
cómo se ve el acceso.

## Cambios a la entrega «seguir-en-contacto» (Michael, 31-10)

- **«Las dos» pasa a «las dos personas»** en todo el copy: «Las dos personas
  confirmaron», «no se comparte nada de ninguna de las dos personas». La otra
  persona puede ser un hombre.
- **La frase del plazo sale igual en app, web y correos:** «Andrea tiene hasta
  el viernes 7 de noviembre. Si no confirma, no se comparte nada de ninguna de
  las dos personas.»
- **«Te avisamos por correo en cualquier caso» se queda**, porque ahora es
  verdad: quien confirmó y no hubo cruce recibe un correo al cerrarse el plazo.
  Hay que diseñarlo (ver abajo).
- **La push «Andrea te dejó su número» sale siempre**, ya no es opcional.
- **La tarjeta de Mi mesa (M1 a M4)** ya no va «en la Mi mesa de esa cena»: es
  la línea de Próxima del punto 2 y el panel dentro de la cena del punto 4.

## Un correo nuevo: «No se cruzaron»

Solo a quien confirmó, cuando se cierra el plazo sin cruce. Corto y sin culpa:
«Se cerró el plazo para compartir. No se compartió nada de ninguna de las dos
personas.» Nunca dice si la otra persona no confirmó o eligió no compartir.
Lleva a esa cena en Pasadas y, como el estado D, invita a la agenda.

## Voz y forma

Copy de Aro: sin guiones largos, sin masculino genérico, en venezolano. Iconos
SVG del sistema, sin emojis. App (390 px) y web (escritorio y por debajo de
720 px).

## Qué entregar

1. Mi mesa con las dos pestañas, y Próxima con la línea de pendientes.
2. Pasadas: la lista, con las marcas y el estado vacío.
3. La vista de una cena pasada, con «Seguir en contacto» dentro.
4. El punto, en sus tres sitios.
5. El acceso desde Mis cenas de Perfil.
6. El correo «No se cruzaron».
