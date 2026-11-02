# Brief para Design · Qué estás reservando

**De:** Michael, con el agente de la app
**Para:** Design
**Fecha:** 01-11-2026
**Va junto a:** `BRIEF-como-funciona.md` (29-10, las tres tarjetas Antes,
Durante, Después), que aún no está entregado. Pedimos que salgan como UNA
sola propuesta: las dos responden a lo mismo, «qué me estoy apuntando».

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

Hoy cada marca es solo una cápsula junto al día. Nadie explica qué
significa. Michael teme que la gente reserve sin tener claro qué está
reservando.

Timeleft enseña una descripción del plan antes de pasar a reservar
(capturas en `Product features & Content Ideas/TIMELEFT APP/Reserva Dinner
Timeleft | Antes - Durante - Después/`).

## Dónde se ve hoy

- **App, hoja de reservar** (se abre al tocar una fecha de la agenda en
  Inicio), de arriba abajo:
  1. ELIGE LA HORA;
  2. «Te apuntas a una fecha, no a una mesa…»;
  3. tu puesto y el precio;
  4. la nota de qué cubre;
  5. si toca, las zonas nuevas, el aviso de grabación o el bloque del +1.

  No hay nada sobre el formato ni sobre las marcas. Se ve en
  `/catalogo-cuenta?estado=reservar`.
- **Web, Mi cuenta:** la misma hoja.
- **Web, `/agenda` pública:** la lista de fechas, sin ningún contexto.

## Lo que pedimos

1. **Dónde va.** Hay dos caminos y Michael quiere ver su propuesta:
   - **A.** Un bloque «Qué incluye» dentro de la hoja de reservar que ya
     existe, arriba del precio.
   - **B.** Una pantalla propia del plan antes de reservar, como Timeleft,
     con el botón de reservar al final.

   Si ven otro camino, también.
2. **Cómo se cuenta una fecha con varias marcas.** Por ejemplo, una «Cena
   +45 · Segundo acto» o una «+1 acompañante en inglés». Que se lea como un
   plan y no como una lista de condiciones.
3. **Una propuesta de texto** por formato y por marca, corta. **Los aprueba
   Michael** antes de construir nada. Viven en `reglas.js` para que la app y
   la web digan lo mismo.
4. **Cómo encaja con las tres tarjetas** de `BRIEF-como-funciona.md`. ¿Son
   la misma pieza, o una va dentro de la otra?
5. **La versión web**, también en `/agenda` pública: quien llega de una
   historia de Instagram tiene que entender qué es cada fecha antes de
   crearse una cuenta.

## Lo que ya existe y no se pierde

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
