# Entrega 9 · Pago con métodos manuales y estados de reserva

> **Esto no reemplaza la entrega 8.** La 8 es la pantalla de Locales, y sigue vigente tal cual. Esta es la siguiente.

Sustituye el diseño de pago que había en la entrega 4. Toca `Pago` y `Mi cuenta`, y añade dos correos.

**La app no va en esta entrega.** Los cinco métodos también están montados ahí, pero su navegación sigue abierta y la entrego cuando esté cerrada.

**Ojo:** el contrato de datos cambia. La reserva ya no nace confirmada.

---

## 1 · El cambio de fondo

El pago venía diseñado como cobro instantáneo: pulsar «Pagar», esperar dos segundos, puesto confirmado. **Eso no es lo que pasa en Venezuela.** Pago Móvil, Zelle y Bizum son transferencias: la persona sale al banco, paga, vuelve y reporta. Alguien tiene que cuadrar ese reporte con el movimiento real.

Consecuencia: **una reserva pagada no está confirmada.** Está *pendiente de confirmar*, y la confirma una persona.

Tres decisiones que se derivan de eso:

1. **El puesto se aparta al reportar, no al confirmar.** Si esperáramos a la conciliación, alguien podría pagar y quedarse sin sitio. El apartado es lo primero que dice la pantalla y el correo.
2. **La tasa se congela al reportar.** Entre reportar y confirmar pueden pasar horas, y la tasa se mueve. El monto que reportó es el que vale.
3. **La conciliación es un estado, no un detalle.** Aparece en Mi cuenta, en Mis planes, en la app, en un correo propio y en el panel de operación.

---

## 2 · Los cinco métodos

| id | Nombre | Moneda | Manual | Activo hoy |
|---|---|---|---|---|
| `pm` | Pago Móvil | Bs | sí | **sí** |
| `zelle` | Zelle | USD | sí | **sí** |
| `bizum` | Bizum | EUR | sí | **sí** |
| `debito` | Débito inmediato | Bs | no | no |
| `tarjeta` | Tarjeta | Bs | no | no |

`manual: true` significa que lo concilia una persona. `activo` lo enciende operación.

**Interruptor por método, como pediste.** Un método apagado se muestra atenuado, con etiqueta «Pronto», y no se puede seleccionar. Hace falta una tabla `payment_methods` con `id`, `activo`, `orden` y los datos de nuestra cuenta, editable desde operación. No lo dejes en una constante del código: el objetivo es encenderlos sin desplegar.

**Débito inmediato está diseñado entero** aunque esté apagado. Es el único método venezolano sin conciliación manual —lo confirma el banco— y el único con devolución automática. Cuando integres la pasarela, encenderlo no requiere diseño nuevo. Su flujo: los mismos datos del pago móvil más el código que el banco manda por SMS; no muestra datos que copiar, no pide captura, y la pantalla se llama «Confirma el cobro», no «Reporta tu pago».

---

## 3 · Qué pide cada método

Cada uno pide **lo que de verdad genera**, no un formulario común.

**Pago Móvil** — teléfono emisor (+58), cédula del titular (V/E), banco emisor, referencia (6 dígitos), fecha.

**Zelle** — nombre del titular que envió, correo o teléfono desde el que envió, **código de confirmación** (alfanumérico, hasta 14) y fecha. Ese código es el equivalente a la referencia: Zelle lo entrega al terminar el envío.

**Bizum** — nombre del titular, teléfono (+34) y fecha. **Bizum no entrega referencia en el momento**; el número de operación solo aparece después en el extracto. Por eso aquí **la captura es obligatoria** y es el único método donde el botón no se activa sin ella.

**Débito inmediato** — teléfono, cédula, banco y el código OTP del banco.

**Captura de pantalla** en los tres manuales: opcional donde hay referencia, obligatoria en Bizum. Guárdala junto al reporte; operación la necesita.

---

## 4 · Contrato de datos

### 4.1 Reporte de pago

```json
{
  "reserva_id": "…",
  "metodo": "pm",
  "moneda": "VES",
  "monto_local": 499.20,
  "monto_usd": 8.00,
  "fx_rate": 62.40,
  "fx_congelado_en": "2026-08-09T15:12:04Z",
  "reportado_en": "2026-08-09T15:12:04Z",
  "datos": {
    "tel": "4141234567",
    "doc": "V12345678",
    "banco": "Banesco",
    "ref": "004471",
    "fecha": "09/08/26"
  },
  "captura_url": "…",
  "estado": "pendiente"
}
```

`datos` es un objeto libre porque cambia por método. Valida contra el esquema del método, no contra una lista fija de columnas.

### 4.2 Estados

**Pago:** `pendiente` → `confirmado` | `no_cuadra`

**Reserva:** `pendiente` → `confirmada` → `cancelada`

La reserva aparta el puesto en `pendiente`. Solo `cancelada` lo libera.

### 4.3 Reglas

- Un método `activo: false` no acepta reportes ni por API.
- `no_cuadra` **no libera el puesto**: lo mantiene 24 h más para que corrija. Es un error nuestro tanto como suyo.
- El paso a `confirmado` dispara **correo 07 y notificación push**, ambos con el mismo disparador.
- El débito inmediato salta `pendiente`: lo confirma el banco.

---

## 5 · Pantallas

### Pago

Siete fases: `ELEGIR` → `DATOS` → `REPORTAR` → `ENVIANDO` → `PENDIENTE` | `CONFIRMADO` | `NO CUADRA`.

El formulario va a dos columnas y los campos largos ocupan la fila entera. En la app, cuando se entregue, va a una columna.

`DATOS` muestra nuestra cuenta con botón de copiar por campo. Cambia por método: banco y J- para Pago Móvil, correo Zelle, teléfono español y concepto para Bizum, nada para débito.

`PENDIENTE` es una pantalla completa, no un mensaje: sello terracota, tres pasos de qué pasa ahora, y el resumen de lo reportado. Lo primero que dice es que el puesto está apartado.

`NO CUADRA` dice «no encontramos tu pago», no «error». Ofrece corregir el reporte, y avisa de que el puesto sigue apartado 24 h.

### Mi cuenta

Estado nuevo, `porconfirmar`, entre `reservar` y `reservada`. Séptimo de la lista.

En **Mis planes** la fila tiene tres estados vivos: **Por confirmar** (terracota), **Confirmada** (verde), **Hoy** (verde). La agenda no vuelve a ofrecer una fecha en la que ya estás, aunque el pago siga en revisión.

### Correos

`correos/06-pago-en-revision.html` y `correos/07-pago-confirmado.html`, con los otros cinco en `Aro Club - Correos.html`.

El 06 dice *tu puesto ya está apartado* en la primera línea; sin eso la espera se lee como riesgo. El 07 nombra el cambio de estado —«pasa de pendiente a confirmada»— y lleva el comprobante completo.

**Falta un tercero, y lo necesitas tú:** el de pago que no cuadra. No lo diseñé porque quiero cerrar antes el texto de los cinco primeros. Dímelo si lo bloquea.

---

## 6 · Lo que hace falta en operación

La pestaña **Pagos** del panel ya lista confirmados, pendientes y devueltos, pero le falta lo de esta entrega:

- **Cola de conciliación**: reportes pendientes con sus datos, la captura, y el movimiento del banco al lado.
- **Aprobar / no cuadra** por reporte, con el motivo cuando no cuadra.
- **Interruptor por método**, con los datos de nuestra cuenta editables.
- **Contador de pendientes** en la pestaña, como el de verificaciones.

No lo he diseñado todavía. Va después de cerrar la navegación de la app.

---

## 7 · Archivos

```
Aro Club - Pago.dc.html          ← reescrito
Aro Club - Mi cuenta.dc.html     ← estado porconfirmar + estados de fila
correos/06-pago-en-revision.html ← nuevo
correos/07-pago-confirmado.html  ← nuevo
Aro Club - Correos.html          ← índice actualizado
```

No incluye la app.

Las once reglas del sistema siguen vigentes. El botón `DEMO` sigue fuera antes de producción (HANDOFF-2 §5.1).
