# Notificaciones: la base

Punto de partida para las push de la app. Inventario del agente de la web
(29-09-2026), contado del código: **19 tipos de correo, 18 con plantilla, y
cero notificaciones push.** Los tipos viven en `src/lib/correos.ts` y las
plantillas en `src/lib/correos-plantillas/` (repo de la web).

## Lo que sale hoy (correo)

| Momento | Correo |
|---|---|
| Dejas tu correo | `bienvenida` |
| Te paraste a mitad | `empujon` (cron) |
| Creas la cuenta | `cuenta_lista` |
| Te aprueban la identidad | `verificacion` |
| Te la rechazan | `verificacion_rechazada` |
| Abrimos fecha en tu zona | `abrimos_zona` |
| Reportas el pago | `pago_en_revision` |
| Lo confirmamos / no cuadra | `pago_confirmado` · `pago_no_cuadra` |
| Usas un código | `puesto_con_cupon` |
| **Se abre tu mesa** | **`mesa_asignada`** ← la importante |
| Tu mesa cambia | `mesa_cambiada` |
| Pagaste y no entraste | `sin_mesa` |
| El día de la cena | `recordatorio` (cron) |
| Alguien de tu mesa llega tarde | `llego_tarde` |
| Cancelas tú | `cancelacion` |
| Cancelamos la fecha | `fecha_cancelada` |
| Olvidaste la contraseña | `restablecer_clave` |

## Lo que falta, por orden de lo que cuesta

1. **La encuesta de después no se manda.** La plantilla existe
   (`16-encuesta-despues.html`), el tipo existe, los datos existen, y ningún
   sitio la encola. Es el único momento del recorrido con pieza escrita y sin
   remitente. Sin ella no hay bucle: nadie valora el local ni la mesa, y de
   ahí salen la nota del sitio y el veto de tres meses.
2. **Nadie persigue una reserva sin pagar.** Quien reserva y no reporta el
   pago no recibe nada nunca: ningún cron mira `pending_payment`. Es el
   agujero que más dinero cuesta.
3. **Nadie avisa de que la fecha se va a cerrar.** Verificado, con fecha
   abierta en su zona y sin reservar: no se le dice nada antes del cierre.
4. **Las cinco push del pedido de la app, ninguna existe:** la revelación,
   el recordatorio, verificación aprobada o rechazada, «abrimos mesa en tu
   zona» y pago confirmado. Necesitan build nativa (Expo Go ya no recibe push
   remotas): van cuando haya build.

**Orden recomendado por el agente de la web: la 2 antes que la 1.** Un
puesto reservado y sin pagar es dinero que no entra y una mesa que se arma
con un hueco; la encuesta mejora el producto pero no lo sostiene.

## Qué supone esto para la app (cuando haya build)

- Las push **cuelgan de los mismos momentos** que los correos (PEDIDO §7):
  cada push es un correo que ya existe, con su tipo. No se inventa una
  segunda lista de momentos.
- Del lado de la app: pedir el permiso **al reservar**, no al abrir (nota de
  Design en la Bienvenida); registrar el token del teléfono; y que tocar la
  notificación abra la pantalla del momento (`mesa_asignada` → `/mesa`,
  `pago_confirmado` → `/mesa`, `verificacion*` → `/verificacion`,
  `abrimos_zona` → `/cuenta`, `llego_tarde` → `/mesa`).
- Del lado del backend: guardar los tokens por persona y mandar la push en
  el mismo sitio donde se encola el correo.
- Los avisos que la persona apaga en Perfil («Cómo te escribimos») valen
  igual para la push, y los imprescindibles siguen sin poder apagarse.
- Criterio del pedido (§9.2): la de la revelación llega a la hora, en iOS y
  Android, con la app cerrada, y abre la pantalla correcta.
