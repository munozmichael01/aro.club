# El mismo texto en tres sitios: web, correos y app

Respuesta al §6 bis del pedido, antes de la primera pantalla. Todo lo que
sigue está medido en el código el 27-09, no recordado.

---

## 1 · Lo que hay hoy

**34 frases** aparecen en dos o más superficies (pantallas del recorrido,
plantillas de correo y respuestas de API; fuera el panel de operación). Se
reparten en cuatro familias, y cada una pide un tratamiento distinto:

| Familia | Ejemplos reales | Cuántas |
|---|---|---|
| **Fechas y horas** | «todo se abre a las 12:00», «tú llegas a las siete», «el sábado a las doce del mediodía se abre todo» | 4, en 7 correos y 2 landings |
| **Reglas con número dentro** | «tu puesto sigue apartado veinticuatro horas», «vale una vez y caduca en quince minutos» | 2 |
| **Mensajes de error de la API** | «Ese correo no se ve completo», «No pudimos registrar tu pago», «Ese correo y esa contraseña no coinciden» | 11 |
| **Frases de producto y de marca** | «nadie se queda mirando la puerta», «todos con identidad verificada», «el sitio, la dirección, tu número de mesa y quiénes son los otros cinco» | 17 |

### Y lo que ya se ha separado, con fallos visibles

1. **Tres relojes distintos, no dos.** Los correos formatean en hora de
   Caracas cableada (`correos-datos.ts`, `- 4 * 3600_000`); las pantallas, en
   la zona del dispositivo de quien mira; y `src/lib/fechas.ts`, en la del
   servidor, que en Vercel es **UTC** (nadie fija `TZ`). Comprobado ejecutando
   `fechas.ts` con la cena abierta hoy (`2026-10-04T00:00Z`, sábado 3 a las
   20:00 en Caracas):
   - con `TZ=UTC` → **«Domingo 4 de octubre»**;
   - con `TZ=America/Caracas` → «Sábado 3 de octubre».

   Afecta hoy a la ficha de miembro del panel (`operacion/miembro/route.ts:322`)
   y a «revisada el» y «se borra el» de `/api/verificacion`, que ve la persona,
   a partir de las 20:00 de Caracas.
2. **`DIAS` está escrito cinco veces** (Mi cuenta dos veces, Mi mesa, Pago,
   Cancelar y `correos-datos.ts`), más otra en `operacion/miembro`. Y `MESES`,
   cuatro.
3. **El correo `abrimos_zona` lleva datos de maqueta**: «Sábado 21» y «18
   personas apuntadas · faltan pocas plazas», escritos en la plantilla
   (`11-abrimos-zona.html:54`). El servidor le prepara `cuandoFrase` con la
   fecha real, y la plantilla no la usa. «Faltan pocas plazas» contradice
   además que no se limitan las reservas.
4. **El pie de marca está copiado en 7 plantillas** con la hora cableada:
   «todo se abre a las 12:00 · Tú llegas a las siete». Con la fecha abierta
   hoy, que empieza a las 20:00, `07-pago-confirmado` diría en el mismo correo
   «Cena …, 8:00 p.m.» y «Tú llegas a las siete».
5. **`03-mesa-asignada` se titula «Tu mesa del sábado»**, y el asunto sale del
   `<title>`. Lo mismo `05-cancelacion`: «no contamos contigo el sábado».

Los puntos 1, 3, 4 y 5 son del backend y de los correos; no los toco. Los
pongo aquí porque son la misma enfermedad que la app no puede heredar.

---

## 2 · Qué viene de dónde

La regla que propongo tiene tres casillas, y cada frase cae en una:

### A · Del servidor, en tiempo real: lo que depende de un dato o de una regla que cambia

Una app instalada no se actualiza cuando cambia el precio o el plazo, y el
precio ya cambió una vez (de 8 a 7 USD). Así que todo lo que lleve un dato o
una regla viaja en la respuesta:

- **Los mensajes de error, tal cual.** Las rutas ya devuelven `{error: '…'}`
  escrito para la persona. **La app los enseña sin reescribirlos**, y la web
  tiene 11 copias de esos mensajes como texto de respaldo. Esto no pide nada
  nuevo al backend: pide que el cliente no invente.
- **El estado del embudo**, que ya viene como código (`estado`, `paso`,
  `verif`). La app decide la pantalla por el código, nunca deduciéndolo.
- **Importes, plazos y fechas de la persona**: el importe en bolívares
  (`/pago`), el motivo de rechazo (`/verificacion`), los avisos con su título
  (`/mis-avisos`, que ya lo hace así).
- **Pieza aditiva a pedir**: que las reglas con número que salen en el copy
  (las 24 horas de apartado, los 15 minutos del enlace, los 90 días de
  borrado, los 3 meses de veto, el precio) viajen en una respuesta, por
  ejemplo `GET /api/reglas`. Hasta que exista, la app las lee de `reglas.js`
  (casilla B), que es donde tendrían que vivir de todas formas.

### B · Un fichero compartido: lo que no cambia con los datos

`public/reglas.js` ya lo cargan el navegador, el servidor y la app. Es el
vehículo que ya existe. Propongo que lo acompañe **`public/textos.js`**, con
el mismo patrón (UMD, sin build), y que contenga:

- **Las funciones de fecha, una vez**: `nombreDia(iso)`, `diaYMes(iso)`,
  `hora(iso)`, `horaEnLetra(iso)`, `cuentaAtras(revelaEn, ahora)`. Todas
  reciben la zona horaria explícita, con `Intl.DateTimeFormat`, que funciona
  en Node y en los navegadores. En Hermes está **por comprobar** en la primera
  build nativa; si fallara, Venezuela no tiene horario de verano y la
  conversión se hace con el desfase de la ciudad, sin `Intl`. **Sustituyen a las seis
  `DIAS` y a los tres relojes.**
- **Las frases de marca y de producto** que hoy se repiten (las 17 de la
  tabla), como plantillas con huecos donde haga falta:
  `pie: ({ revelaA, llegasA }) => …`. El pie de los correos deja de tener la
  hora cableada.

La app lo importa como un módulo más. Los correos, desde el servidor, igual
que ya importan `reglas.js`.

**Esto es trabajo de backend y web**, y no bloquea a la app: la app arranca
con su `src/texto/` escrito ya con la forma de `textos.js` (mismas funciones,
mismos nombres) y, cuando `textos.js` exista, lo sustituye por la importación
y se borra.

### C · Propio de la app: lo que solo existe en el celular

Los permisos de cámara y avisos, «Usar esta» / «Repetir», «Tienes los avisos
apagados en el celular». Van en un solo fichero, `src/texto/app.ts`, y nunca
sueltos en las pantallas.

---

## 3 · La decisión que es tuya: en qué hora habla el producto

Hoy la web habla en la hora del dispositivo y los correos en la de Caracas.
Quien «se fue del país y volvió», con el celular aún en hora de Madrid, lee
en la web una hora y en el correo otra, para la misma cena.

**Propongo: siempre en la hora de la ciudad de la cena.** La cena es en
Caracas a las 20:00, esté donde esté el celular de quien la lee. Para no
cablear «Caracas», la zona sale de la ciudad del evento. Hoy no hay columna
de zona horaria en `cities`: es **un campo aditivo** (`cities.timezone`), y
mientras no exista, la zona vive **en un solo sitio** (`textos.js`), no en
cada función.

---

## 4 · Lo que se vigila

Lo que no se puede unificar se vigila. Un comprobador nuevo,
`scripts/comprobar-textos.mjs`, que corre antes de cada push junto a
`comprobar-cuestionario.mjs`:

1. **Ningún día ni hora escritos a mano en el copy** de la app, de las
   plantillas ni de las pantallas: `lunes…domingo`, «a las siete»,
   «mediodía» y `\d{1,2}:\d{2}` fuera de `textos.js`. En la app entra desde
   el primer día y en verde. En la web y los correos arranca como **aviso**,
   con los casos de hoy listados, y pasa a **fallo** cuando se hayan
   limpiado. Si no, el primer push lo tumba todo.
2. **Los números de las reglas coinciden con `reglas.js`**: si un texto dice
   «veinticuatro horas» o «7 USD», el comprobador verifica que la constante
   diga lo mismo. Es lo que hubiera cazado el 8 USD del `CLAUDE.md`.
3. **Ningún dato de maqueta en las plantillas de correo**: un día con número
   («Sábado 21») o una cifra de gente («18 personas») escritos en una
   plantilla, sin `{{ }}`, fallan.
4. **Las variables que prepara el servidor se usan**: si `correos-datos.ts`
   prepara `cuandoFrase` para una plantilla y la plantilla no la cita, es
   casi seguro que alguien la tapó con un literal (es el caso 3 de arriba).
5. **Los mensajes de error no se duplican en el cliente**: la app no puede
   tener un literal igual a un `error:` de una ruta.

---

## 5 · Qué hago en la app mientras tanto

Nada de lo anterior bloquea las pantallas:

- `src/texto/fechas.ts` con la forma de `textos.js`, una función por cálculo
  (incluida la cuenta atrás, que es una y la usan Inicio y Mesa), con pruebas.
- La regla 1 del comprobador (ningún día ni hora escritos a mano) corriendo
  sobre `app-mobile/src` desde la primera pantalla.
- Los errores de la API, enseñados tal cual.
- Los esqueletos, vacíos: ningún dato de ejemplo en el camino de pintado.

**Lo que necesito de ti para empezar**: la decisión del §3 (hora de la
ciudad o del dispositivo). Lo demás puede ir en paralelo.
