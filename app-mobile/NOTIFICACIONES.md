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

## Estado al 02-10-2026: el lado de la app, hecho

En `src/avisos/` (commit «Push: el lado de la app»):

- **Permiso:** se pide al **reservar**, al **reportar un pago** y al usar un
  **código**. Nunca al abrir la app. Si ya dijo que no, no se insiste: iOS no
  deja volver a preguntar.
- **Token:** se registra con `POST /api/push/token`. Se vuelve a mandar al
  arrancar si cambió o si pasó una semana. Al cerrar sesión se manda
  `DELETE /api/push/token`, antes del `signOut`.
- **Tocar una push abre su pantalla**, con la app viva o cerrada.
  `destinoDe` lo decide con una lista cerrada de rutas: primero
  `data.ruta`, si no `data.tipo`, y `data.eventoId` para Pago. Si no
  reconoce la push, no navega.
- **Android:** canal `aro`, icono blanco `assets/notificacion.png` (el aro)
  y color `#14342A`.
- **Expo Go y web:** no hacen nada.

### Contrato que se le pide al agente de la web

```
POST   /api/push/token  { token, plataforma: 'ios'|'android', version }  sesión de cuenta → 200
DELETE /api/push/token  { token }                                         sesión de cuenta → 200
```

- Una tabla `push_tokens` con `profile_id`, `token` único, `plataforma`,
  `version`, `creado_en`, `visto_en` y `baja_en`. Un mismo teléfono que
  cambia de cuenta mueve el token a la nueva.
- **Enviar en el mismo sitio donde se encola el correo**, con la misma
  `send_at`. Va por la API de Expo (`https://exp.host/--/api/v2/push/send`),
  en lotes de hasta 100. `data` lleva `{ tipo, ruta?, eventoId? }`, con el
  mismo `tipo` que el correo.
- Se respetan las preferencias de Perfil («Cómo te escribimos»). Los
  imprescindibles no se pueden apagar.
- Leer los *receipts*: con `DeviceNotRegistered`, el token pasa a `baja_en`.
- Probar con `?seco=1` y con tokens del banco de pruebas. **Una push encolada
  SE MANDA**, igual que un correo.

### Copy propuesto (neutro, corto; el servidor lo arma con `partesDe`)

| tipo | título | cuerpo |
|---|---|---|
| `mesa_asignada` | Ya sabes con quién cenas | Tu mesa está abierta: el sitio, la hora y los otros cinco. |
| `recordatorio` | Es hoy | Abre tu mesa para ver dónde es y cómo llegar. |
| `verificacion` | Tu identidad está verificada | Ya puedes apartar puesto en cualquier fecha abierta. |
| `verificacion_rechazada` | Hay que repetir una foto | Te contamos qué pasó y cuál repetir. |
| `abrimos_zona` | Nueva fecha en {zona} | {Día} a las {hora}. Se cierra {N} horas antes. |
| `pago_confirmado` | Pago confirmado | Tu puesto está apartado. Te avisamos cuando se abra tu mesa. |
| `llego_tarde` | Alguien de tu mesa llega tarde | {Nombre} llega unos {n} minutos tarde. |

### Lo que hace falta fuera del código (Michael)

1. **iOS, la llave de APNs:** `npx eas-cli@latest credentials -p ios` →
   production → *Push Notifications* → generar una llave nueva, entrando con
   Apple.
2. **Android, Firebase:**
   - Crear un proyecto en console.firebase.google.com sobre el MISMO
     proyecto de Google Cloud («My First Project»), sin Analytics.
   - Añadir una app Android `club.aro.app`, descargar `google-services.json`
     y dejarlo en `app-mobile/` **sin commitear**: el repo es público. Va a
     EAS como variable de tipo fichero, y para eso hay que pasar `app.json`
     a `app.config.js` (`googleServicesFile`).
   - *Service accounts* → *Generate new private key*. **Es un secreto: no se
     pega en el chat.** Subirlo con `npx eas-cli@latest credentials -p
     android` → *Google Service Account* → *FCM V1* y borrar el JSON después.
3. Hecho eso, una build de cada plataforma y la prueba de §9.2: la
   revelación llega a su hora, con la app cerrada, y abre Mi mesa.
