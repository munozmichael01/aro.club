# Brief para Design · Qué estás reservando

**De:** Michael, con el agente de la app
**Para:** Design
**Fecha:** 01-11-2026
**Parte de:** «Cómo funciona», las tres tarjetas Antes, Durante, Después
(entrega del 29-10). Ya está en producción: en la app sale en la hoja de
reservar y en Mi mesa, y en la web en la página de la fecha. El texto vive en
`AroReglas.COMO_FUNCIONA`.

**El fallo:** solo tiene tres versiones, cena, brunch y grupo (movimiento).
**Drinks y coffee caen en la de cena**, que les dice «Pidan, preséntense…» y
«Una vuelta rápida de nombres y a comer». Y no dice nada de las marcas de la
fecha.

## El problema

Ya no hay un solo plan. En la misma agenda conviven:

- **Formatos distintos:** cenas, drinks, coffee, brunch y movimiento.
- **Marcas de la fecha**, que cambian lo que es esa noche:
  - **+45** (o la edad que toque): solo gente desde esa edad.
  - **+1 acompañante**: toda la mesa viene de dos en dos, y reservas dos
    puestos.
  - **Idioma** («En inglés»): la mesa habla ese idioma.
  - **Segundo acto** (nuevo, 01-11): después de la cena, todas las mesas de
    la fecha se juntan en un mismo bar. El bar no se dice hasta ese día.
    **No lo llevan todas las cenas**, solo las fechas que lo tengan (hoy, la
    +45 del sábado 7). Una cena sin segundo acto sigue con su «Después» de
    siempre, y nada de lo que se diseñe puede dar a entender que toda cena
    termina en un bar.

Ninguna marca es de todas las fechas: cada una la lleva solo la fecha que la
tiene, y una misma semana puede tener dos cenas que se cuentan distinto.

Hoy cada marca es solo una cápsula junto al día, y «Cómo funciona» cuenta
la misma noche para todas. Nadie explica qué significa cada una. Michael teme que la gente reserve
sin tener claro qué está reservando.

Timeleft enseña una descripción del plan antes de pasar a reservar
(capturas en `Product features & Content Ideas/TIMELEFT APP/Reserva Dinner
Timeleft | Antes - Durante - Después/`).

## Dónde se ve hoy

- **App, hoja de reservar** (al tocar una fecha de la agenda en Inicio):
  - la hora;
  - «Te apuntas a una fecha, no a una mesa…»;
  - la fila «¿Cómo funciona?», que abre las tres tarjetas;
  - el precio y lo que cubre;
  - si toca, las zonas nuevas, la grabación o el bloque del +1.

  Se ve en `/catalogo-cuenta?estado=reservar`. «Cómo funciona» sale también
  en Mi mesa y la primera vez que alguien tiene puesto.
- **Web:** la página de la fecha, con las mismas tarjetas.
- **Web, `/agenda` pública:** la lista de fechas, sin ningún contexto.

## Lo que pedimos

1. **Las tres tarjetas de drinks y de coffee**, que hoy no existen. ¿Qué
   pasa antes, durante y después en un drinks? ¿Y en un coffee?
2. **Las marcas dentro de «Cómo funciona».** ¿Cómo cuentan las tarjetas una
   +45, una +1 acompañante, una en inglés o una con segundo acto? El
   segundo acto, por ejemplo, cambia el «Después» de ESA fecha: ya no es
   «te sugerimos sitios cerca» sino «todas las mesas se juntan en un bar».
   En las cenas sin segundo acto, el «Después» no cambia.
3. **Cómo se lee una fecha con varias marcas.** Por ejemplo, una «Cena +45
   · Segundo acto» o una «+1 acompañante en inglés». Que se lea como un plan
   y no como una lista de condiciones.
4. **Si hace falta algo más visible antes de reservar.** Hoy «Cómo funciona»
   es una fila que hay que tocar dentro de la hoja. Timeleft enseña el plan
   sin que lo pidas. Ustedes dicen si basta con la fila o si las marcas
   necesitan una línea a la vista en la hoja.
5. **Una propuesta de texto** para cada versión y cada marca. **Los aprueba
   Michael** antes de construir nada. Van a `AroReglas.COMO_FUNCIONA`, que es
   de donde ya leen la app y la web.
6. **La `/agenda` pública de la web**, que hoy no explica nada: quien llega
   de una historia de Instagram tiene que entender qué es cada fecha antes
   de crearse una cuenta.

## Lo que ya existe y no se pierde

- Las tres versiones de «Cómo funciona» que ya están: cena, brunch y grupo.
  Se amplían, no se rehacen.
- La hoja de reservar con todo lo que lleva hoy: precio, nota, zonas
  nuevas, grabación, el bloque del +1 y el aviso con casilla. Lo nuevo se
  suma, no reemplaza.
- Las cápsulas de la agenda:
  - +1 ACOMPAÑANTE, de contorno;
  - idioma, maciza verde;
  - SEGUNDO ACTO, maciza verde oscuro `#14342A`.

## Reglas que no cambian

- No prometer el número de personas: la mesa se arma con quien haya.
- Del segundo acto no se dice el bar: se revela ese día.
- Sin emojis: iconos del sistema.
- Copy en venezolano y en neutro, sin guiones largos.
