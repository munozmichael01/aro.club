# Solicitar reembolso · copy y contrato

**Todo cerrado el 21-10 de noche. Listo para construir.**

Lo que cambió respecto a la primera propuesta:

- Las 24 horas pasan a ser **«un día hábil»**.
- La tasa y el monto en Bs se **fijan al solicitar**, no al pagar, y se le
  enseñan antes de enviar. Eso cierra el hueco (c).
- El botón es **«Pedir el reembolso»**.
- El apunte negativo del crédito **no puede llevar `reason: 'refund'`**.

---

## 1 · Los huecos del encargo, todos cerrados

### a) CERRADO · no hay «devolver el crédito», se paga

Yo proponía un botón para devolverle el crédito cuando el pago no se
hiciera. Michael lo descartó, y tiene razón:

> «la misma persona que le daría a ese botón de devolver el crédito es la
> que devolvería el pago, así que no, se hace el pago».

El botón resolvía un problema que no existe: quien está mirando la
solicitud en el panel es quien tiene el teléfono para pagar. Darle una
salida fácil es invitar a no pagar.

**Lo que sí cambia:** «Marcar reembolsado» deja de ser un botón y pasa a ser
**un formulario igual al que rellena quien paga**, con los mismos campos y
**adjuntando el soporte del pago**. El comprobante queda guardado en la
solicitud, igual que la captura de un pago.

Así que no hay estado `devuelta` y el contrato pierde ese valor: los
estados son `pendiente` y `reembolsado`.

### b) CERRADO · «un día hábil»

Michael: «1 día hábil». En el acuse, el correo 1 y la push 1.

### c) CERRADO · la tasa se fija al solicitar

Michael: «la tasa es del día que recibimos la solicitud y debe marcarse al
momento de solicitarlo, así sabe cuánto va a recibir».

Cambia el acuerdo anterior: **la tasa y el monto en Bs se guardan en la
solicitud**, el formulario los enseña antes de enviar, y «Marcar
reembolsado» ya no calcula nada, paga lo guardado.

Si al pedirlo no hay tasa del día se usa la misma regla que al reportar un
pago: el navegador manda la tasa que vio (`tasaVista`), el servidor la
acepta solo si es una de las **tres últimas publicadas**, y si no lo es
responde 409 con la tasa buena para que la pantalla enseñe el monto nuevo.
Si no hay ninguna tasa, el botón de solicitar dice que lo intente más tarde.

### d) El apunte del crédito NO puede ser `reason: 'refund'`

Lo cazó el agente de la app y es correcto, con una consecuencia peor de la
que él mismo describe.

`reason: 'refund'` ya lo usa el abono de quedarse sin mesa, y
`/api/mi-mesa` pregunta así si ese crédito volvió:

```ts
.eq('booking_id', reserva.id).eq('reason', 'refund').maybeSingle()
```

Con dos filas, `maybeSingle` no devuelve la primera: **falla**, `data` queda
en null y `creditoDevuelto` se vuelve **false**. La pantalla «Esta vez no
entraste» le diría «tu crédito no volvió» justo a la persona a la que le
estamos devolviendo el dinero.

Hay tres sitios más que filtran por ese mismo motivo, en `creditos.ts` y en
el panel de pagos.

**Solución:** motivo nuevo `reembolso_pedido`, con su migración sobre
`credit_reason_t`, **y sin `booking_id`**. El enlace con el crédito original
lo guarda la solicitud, que es donde tiene que estar.

---

## 2 · Copy propuesto

### Botón, en Mi mesa y en Mi cuenta

> **Pedir el reembolso**

Debajo, en pequeño:
> Tienes hasta el {día} para pedirlo. Después, el crédito sigue siendo tuyo
> para la próxima.

### Formulario

**Título:** Te devolvemos tu plaza en bolívares

**Bajada:**
> Te devolvemos los {precio} ref de tu plaza por Pago Móvil.

**Antes del botón, el monto ya fijado:**
> Vas a recibir **{monto} Bs** ({precio} ref a la tasa de hoy, {tasa}).

**Campos:** Teléfono · Cédula · Banco (los mismos de pagar)

**Antes del botón, en terracota:**
> Al enviarlo, el crédito sale de tu cuenta. No vas a poder usarlo para
> reservar. Si después quieres volver a una mesa, se paga de nuevo.

**Botón:** Pedir el reembolso

### Acuse en pantalla

**Título:** Listo, vamos a ello
> Te mandamos {monto} Bs a {teléfono} en un día hábil. Te avisamos en
> cuanto salga.

### Correo 1 · «Recibimos tu solicitud»

**Asunto:** Recibimos tu solicitud de reembolso
**Vista previa:** Te mandamos {monto} Bs por Pago Móvil en un día hábil.

> Hola, {trato}:
>
> Recibimos tu solicitud. Te mandamos **{monto} Bs** por Pago Móvil en un
> día hábil, que son los {precio} ref de tu plaza a la tasa de hoy.
>
> Te lo mandamos a:
> {teléfono} · {banco} · {cédula}
>
> Si alguno de esos datos no es el correcto, contesta a este correo y lo
> arreglamos antes de mandarlo.
>
> El crédito ya salió de tu cuenta, así que no aparece al reservar. Cuando
> quieras volver a una mesa, se paga como la primera vez.

### Correo 2 · «Te devolvimos el dinero»

**Asunto:** Te devolvimos el dinero
**Vista previa:** {monto} Bs por Pago Móvil. Referencia {referencia}.

> Hola, {trato}:
>
> Ya está. Te mandamos **{monto} Bs** por Pago Móvil a {teléfono}, los
> mismos que te dijimos al pedirlo.
>
> Referencia: **{referencia}**
>
> Si en un par de horas no lo ves en tu banco, contesta a este correo con
> esa referencia y lo revisamos.
>
> Nos vemos en otra mesa cuando te provoque.

### Push

| | título | cuerpo |
|---|---|---|
| Solicitud | Recibimos tu solicitud | Te mandamos {monto} Bs por Pago Móvil en un día hábil. |
| Pagado | Te devolvimos el dinero | {monto} Bs a {teléfono}. Referencia {referencia}. |

### El formulario del panel, al marcar reembolsado

Los mismos campos que rellena quien paga, más el soporte:

- Referencia del Pago Móvil
- Monto en Bs, ya calculado y guardado desde la solicitud, sin poder
  tocarlo
- **Adjuntar el comprobante**, como la captura de un pago

Sin comprobante no se marca: la referencia sola es lo que se escribe mal y
luego nadie puede rastrear.

---

## 3 · Contrato para la app

En **`/api/mi-mesa`** (fase `sin-mesa`) y en **`/api/mi-cuenta`**:

```jsonc
"reembolso": {
  "puede": true,              // hay un crédito de espera reembolsable y queda plazo
  "hasta": "2026-10-25T04:00:00Z",  // fin del plazo, 3 días desde el crédito
  "monto": "10 ref",          // lo que se devuelve, en ref
  "montoBs": null,            // los Bs ya fijados, solo si hay solicitud
  "tasa": null,               // la tasa con la que se fijó
  "estado": null,             // null | "pendiente" | "reembolsado"
  "solicitadoEn": null,
  "reembolsadoEn": null,
  "referencia": null          // solo cuando está reembolsado
}
```

`puede` es false en cuanto hay una solicitud, se pasa el plazo, o el crédito
se usó. `estado` manda sobre `puede` en la pantalla: con `pendiente` se
enseña el acuse, no el botón.

### El endpoint

**POST `/api/reembolso`**

```jsonc
{ "telefono": "04141234567", "cedula": "V12345678", "banco": "0102" }
```

Respuestas:

| | |
|---|---|
| `200 {estado:"pendiente", hasta, monto}` | hecho |
| `400 {error}` | un campo no válido, con cuál |
| `404 {error:"No tienes ningún crédito que devolver."}` | no hay crédito reembolsable |
| `409 {error:"Ya pediste este reembolso.", motivo:"ya-pedido"}` | hay una solicitud viva |
| `409 {error:"El plazo para pedirlo se pasó el {día}.", motivo:"fuera-de-plazo"}` | |
| `409 {error:"Ese crédito ya lo usaste en una reserva.", motivo:"ya-usado"}` | |

Los campos se validan con `campoDe` y `BANCOS` de `reglas.js`, que es lo
mismo que usa pagar: dos validaciones del mismo teléfono acaban aceptando
cosas distintas.

---

## 4 · Lo que haría falta por dentro

- Tabla `refund_requests`: persona, el `credit_ledger.id` concreto que se
  reembolsa, teléfono, cédula, banco, `solicitado_at`, `estado`,
  `reembolsado_at`, `referencia`, `monto_ves`, `tasa`. El monto y la tasa se
  escriben AL SOLICITAR y no se vuelven a tocar.
- Al solicitar, un apunte negativo en `credit_ledger` con un motivo NUEVO,
  `reembolso_pedido`, y **sin `booking_id`**. Ver el punto (d): con
  `reason: 'refund'` se rompe «Esta vez no entraste».
- Dos tipos nuevos en `email_kind_t`, que es un enum de Postgres y pide
  migración.
- Y el alcance: solo créditos cuyo apunte original sea por quedarse sin
  mesa. Ni cancelación, ni cortesía, ni cupón.
