# Solicitar reembolso · propuesta de copy y contrato

Para que Michael lo apruebe antes de construirlo. Nada de esto está hecho.

---

## 1 · Tres huecos del encargo que hay que cerrar antes

### a) Si operación no paga, el crédito no vuelve

El flujo dice: al solicitar, **el crédito sale del saldo en ese mismo
momento**, y **la persona no puede cancelar**. Si por lo que sea el pago no
se hace —datos malos, la persona cambia de opinión, se nos pasa— esa
persona se queda **sin crédito y sin dinero**, y sin ninguna puerta.

Propongo añadir en el panel, junto a «Marcar reembolsado», un **«Devolver el
crédito»**: cierra la solicitud como `devuelta`, el crédito vuelve al saldo
y le llega un correo diciéndolo. No es poder cancelar del usuario, es que
nosotros podamos deshacerlo.

### b) Las 24 horas son una promesa a gente real

El correo promete el pago en 24 horas. Hoy los pagos los revisa una persona.
Si entra un reembolso un viernes por la noche, ¿se paga el sábado? Si la
respuesta es «en días de semana», el copy tiene que decir eso y no «24
horas».

### c) La tasa del día puede no existir

El monto sale de la tasa BCV del día del reembolso, de `fx_rates`. Esa tabla
la llena un cron. Si ese día falta la fila, el panel no puede calcular el
monto. Propongo: **el botón de marcar reembolsado se desactiva y dice por
qué**, en vez de usar una tasa vieja en silencio.

---

## 2 · Copy propuesto

### Botón, en Mi mesa y en Mi cuenta

> **Pedir que me devuelvan el dinero**

Debajo, en pequeño:
> Tienes hasta el {día} para pedirlo. Después, el crédito sigue siendo tuyo
> para la próxima.

### Formulario

**Título:** Te devolvemos tu plaza en bolívares

**Bajada:**
> Te devolvemos los {precio} ref de tu plaza, a la tasa del día en que
> hagamos el pago. Te lo mandamos por Pago Móvil.

**Campos:** Teléfono · Cédula · Banco (los mismos de pagar)

**Antes del botón, en terracota:**
> Al enviarlo, el crédito sale de tu cuenta. No vas a poder usarlo para
> reservar. Si después quieres volver a una mesa, se paga de nuevo.

**Botón:** Pedir el reembolso

### Acuse en pantalla

**Título:** Listo, vamos a ello
> Te lo mandamos a {teléfono} en las próximas 24 horas. Te avisamos en
> cuanto salga.

### Correo 1 · «Recibimos tu solicitud»

**Asunto:** Recibimos tu solicitud de reembolso
**Vista previa:** Te lo mandamos por Pago Móvil en las próximas 24 horas.

> Hola, {trato}:
>
> Recibimos tu solicitud. Te devolvemos {precio} ref por Pago Móvil, a la
> tasa del día del pago, en las próximas 24 horas.
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
> Ya está. Te mandamos **{monto} Bs** por Pago Móvil a {teléfono}, que son
> los {precio} ref de tu plaza a la tasa de hoy.
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
| Solicitud | Recibimos tu solicitud | Te mandamos el dinero por Pago Móvil en las próximas 24 horas. |
| Pagado | Te devolvimos el dinero | {monto} Bs a {teléfono}. Referencia {referencia}. |

### Si se devuelve el crédito (el hueco (a))

**Asunto:** Tu crédito está de vuelta
> No pudimos hacerte el pago, así que te devolvimos el crédito a tu cuenta:
> ya puedes usarlo para reservar. Si quieres el dinero en vez del crédito,
> vuelve a pedirlo desde tu cuenta.

---

## 3 · Contrato para la app

En **`/api/mi-mesa`** (fase `sin-mesa`) y en **`/api/mi-cuenta`**:

```jsonc
"reembolso": {
  "puede": true,              // hay un crédito de espera reembolsable y queda plazo
  "hasta": "2026-10-25T04:00:00Z",  // fin del plazo, 3 días desde el crédito
  "monto": "10 ref",          // lo que se devuelve, en ref
  "estado": null,             // null | "pendiente" | "reembolsado" | "devuelta"
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
  `reembolsado_at`, `referencia`, `monto_ves`, `tasa`.
- Al solicitar, un apunte negativo en `credit_ledger` con `reason: 'refund'`,
  que es el valor que ya existe en el enum. El saldo sale de esa tabla, así
  que el crédito desaparece sin tocar nada más.
- Dos tipos nuevos en `email_kind_t`, que es un enum de Postgres y pide
  migración.
- Y el alcance: solo créditos cuyo apunte original sea por quedarse sin
  mesa. Ni cancelación, ni cortesía, ni cupón.
