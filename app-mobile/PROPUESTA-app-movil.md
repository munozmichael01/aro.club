# Propuesta · App de Aro Club, día 0

Respuesta a `PEDIDO-app-movil.md`. Los cuatro entregables previos (a–d), más
cómo se versiona para que un despliegue del backend no rompa una app en
tienda. Todo lo que aquí se afirma sobre el backend está comprobado contra el
código y, donde decía algo que decide la arquitectura, **contra la API en
producción con una cuenta desechable**, ya borrada.

---

## 0 · Lo primero: lo que ya se probó, y tres cosas que no son de la app

### La prueba que decide la arquitectura: la sesión

Las rutas de usuario leen la sesión **solo de la cookie** de `@supabase/ssr`
(`sb-qdydmklrbsdemzvjsldo-auth-token`). No aceptan `Authorization: Bearer`.
Si eso obligara a cambiar el backend, la app nacería con una dependencia.

No obliga. Resultado contra `https://aro.club/api` el 26-09:

| Caso | Respuesta |
|---|---|
| Sin cookie | 401 |
| Cookie con la sesión del SDK entera | 200 |
| **Cookie con solo el access token (refresh vacío)** | **200, sin `Set-Cookie`** |
| Access token alterado | 401 |
| Access caducado, refresh vacío | 401 limpio |
| `/mi-mesa` y `/mis-avisos`, solo access | 200 |
| El refresh token del SDK, después de todo | sigue vivo |

La consecuencia es la pieza central del diseño: **el SDK de Supabase en el
celular es el dueño de la sesión** (la guarda, la refresca, sobrevive a
reinicios) y, en cada llamada, la app arma esa cookie **solo con el access
token**. El servidor nunca recibe el refresh token, así que nunca lo rota a
espaldas de la app. Si responde 401, la app refresca una vez y reintenta.
Funciona **hoy, sin tocar una línea del backend**.

### Hallazgos fuera del encargo (ya cerrados)

- Un fallo de exposición de datos en el alta de leads, arreglado en
  producción el 26-09. **Consecuencia para la app:** `POST /lead` con un
  correo ya registrado responde `repetido` **sin token**, y la app lo trata
  como «revisa tu correo» o «entra».
- El título «Tu mesa del jueves» en `/mis-avisos`, la numeración del pedido y
  la exclusión de la app en `tsconfig.json`: arreglados.

---

## a · Arquitectura: React Native con Expo (dev builds, no Expo Go)

**Recomendación: multiplataforma, con React Native + Expo en modo
*prebuild*.** Las razones son las de este caso, no generales:

1. **La lógica ya está en el servidor, y lo que queda en el cliente ya es
   JavaScript.** `public/reglas.js` —validación de teléfono, fechas, precio,
   lo que se puede teclear— lo cargan hoy el navegador y el servidor desde
   **un solo fichero**. La app lo carga igual y sería el tercer consumidor, no
   una tercera copia. Nativo puro (Swift + Kotlin) obliga a reescribir esas
   reglas **dos veces más**, y el propio `reglas.js` cuenta lo que pasó cuando
   la misma regla vivía en dos sitios: un botón que no se activaba jamás.
   Flutter tiene el mismo problema: Dart no puede consumirlo.
2. **Equipo pequeño.** Un código, un lenguaje y los mismos tipos que el
   backend (`database.types.ts` se puede importar para los contratos).
3. **Los dos puntos de dolor no son donde RN duele:**
   - **Cámara guiada.** `react-native-vision-camera` es una cámara nativa:
     enfoque, control de formato y *frame processors* si algún día se quiere
     detectar el borde de la cédula. Lo que pide el pedido —guía de encuadre,
     vista previa, «usar esta / repetir»— es una capa de interfaz sobre la
     cámara, no procesamiento. Y la revisión es humana, así que no hay
     algoritmo en el celular.
   - **Push fino.** `expo-notifications` da notificaciones locales
     programadas a una hora exacta, remotas por APNs/FCM y
     `interruptionLevel: timeSensitive` en iOS, que es lo que hace que la
     revelación suene aunque el teléfono esté en Concentración. Si algo se
     queda corto, prebuild permite escribir el módulo nativo exacto sin salir
     del proyecto. Esa es la válvula de escape, y existe.
4. **Actualizaciones sin pasar por tienda (EAS Update).** Arreglos de
   JavaScript llegan a las apps instaladas en minutos. Es la mitad de la
   respuesta a «el backend se despliega varias veces al día» (ver §e).

**Descartado:** envolver la web (Capacitor/WebView). Las pantallas `.dc.html`
existen y tienta, pero Apple rechaza por la 4.2 (funcionalidad mínima) las
apps que son una web con marco. Además, la sesión web va por cookie de
navegador, y la cámara y el push serían justo las dos piezas mal resueltas.

**Dónde vive el código:** en `app-mobile/` dentro de este repositorio, para que
cargue `public/reglas.js` sin copias y para que el comprobador de contrato
(§e) corra en el mismo CI. El `tsconfig.json` de la raíz ya la excluye, y
la app tiene el suyo.

---

## b · Notificaciones: qué hace la v1 sin push, y la pieza mínima para encenderlo

### La v1 sale sin push remoto, y la revelación llega igual

La revelación y el recordatorio **no dependen de un evento del servidor, sino
de una hora que la app ya conoce**. `/api/mi-cuenta` devuelve
`proximaFecha.revelaEn` (sale de `reveal_at`: hoy `2026-10-03T16:00Z`, las
12:00 en Caracas) y `/api/mi-mesa` confirma si hay reserva. Con eso:

| Aviso | v1, sin backend nuevo | Con la pieza aditiva |
|---|---|---|
| **La revelación** | **Notificación local** programada en `reveal_at`, time-sensitive en iOS. Suena con la app cerrada y abre `/mesa`. | Push remoto desde la cola, que se suma a la local (sin duplicar, ver abajo) |
| **Recordatorio del día** | Local, programada desde la fecha del evento | Remoto |
| Verificación aprobada/rechazada | Al abrir la app, `/mi-cuenta` ya lo dice. Queda el correo. | Remoto |
| Pago confirmado | Igual: estado al abrir + correo | Remoto |
| Abrimos mesa en tu zona | Correo | Remoto |

**Cómo se mantiene honesta la local:** se reprograma cada vez que la app pasa
a primer plano y en cada tarea de fondo, siempre desde `/mi-cuenta`, nunca
desde una regla propia. Si la reserva se cancela, se borra. Si cambia
`reveal_at`, se mueve.

**Lo que la local no puede, dicho claro:**

- Si la fecha se cancela y la persona no abre la app, la local sonaría igual.
  Mitigación: el texto dice «Tu mesa ya está abierta» y la pantalla muestra el
  estado real. El correo `fecha_cancelada` llega de todas formas. Es poco
  probable, y el push remoto lo cierra.
- **Android y la hora exacta.** Desde Android 12, «en punto» exige el permiso
  de alarma exacta (`SCHEDULE_EXACT_ALARM`), que la persona concede. Sin él,
  el sistema puede retrasarla unos minutos en reposo. Se pide en el momento de
  reservar, con su porqué. **Esto se comprueba en un teléfono de verdad en la
  primera semana**; no lo doy por hecho.

Con eso, los criterios 9.2 (revelación a la hora, app cerrada, abre la mesa) se
cumplen en la v1 sin esperar a nadie.

### La pieza mínima aditiva para el push remoto

Pensada para colgar de `scheduled_emails` y no inventar un segundo calendario:

1. **Tabla `device_tokens`**: `profile_id`, `token`, `platform`,
   `app_version`, `created_at`, `last_seen_at`. Con RLS cerrada, como todo.
2. **`POST /api/dispositivos`** (registrar o renovar el token) y **`DELETE`**
   (al salir o al darse de baja). **Una ruta nueva; no toca ninguna existente.**
3. **En `despacharPendientes`** (`src/lib/correos.ts`), el mismo despachador
   que ya usan el cron y `encolar()`: al mandar una fila de un tipo que tiene
   aviso, se manda también el push a los tokens de ese perfil, respetando
   `/mis-avisos`. Misma `send_at`, mismo `sent_at`, cero calendario nuevo. Si
   el push falla, el correo sale igual.
4. **`/api/baja`** borra también los tokens (es una línea).

Mapeo inicial de tipos: la mesa publicada → revelación; `pago_confirmado`,
`pago_no_cuadra`, `verificacion_rechazada` (y **falta un tipo de
verificación aprobada**: hoy solo hay correo de rechazo), `abrimos_zona`,
`fecha_cancelada`, `mesa_cambiada`.

**Dos cosas a acordar contigo:**

- **La precisión de la revelación en remoto.** El cron de correos corre
  `*/15`. Hoy `reveal_at` cae en :00 y sale en punto, pero si una fecha se
  revela a las 12:05, el remoto llegaría a las 12:15. Por eso la **local se
  queda siempre** para la revelación, y el remoto la confirma (misma
  identificación de notificación, así el sistema no la duplica).
- **Proveedor.** Propongo Expo Push al principio (una llamada HTTP, sin
  certificados en el servidor), migrable a APNs/FCM directo sin tocar la app.

Mientras esto no exista, la app no pide el token al servidor. El día que
exista, lo registra en la siguiente apertura. **No hace falta publicar otra
versión en la tienda** si el registro ya viene preparado para tolerar el 404.

---

## c · Recorrido de pantallas, una a una contra la web

Leyenda: **igual** = mismos pasos, estados y copy que el `.dc.html`;
**se aparta** = y por qué.

| # | Web | App | API | Diferencia |
|---|---|---|---|---|
| 1 | `/` entrada + 4 preguntas | Entrada | `POST /lead` | **Igual.** El token de lead se guarda en el almacén seguro del celular. Tolera `repetido` sin token (ver §0.1). |
| 2 | `/datos` (4 pasos) | Datos | `GET/POST /datos-base` | **Igual.** Validación con `reglas.js`, el mismo fichero. |
| 2b | Crear cuenta | Crear cuenta | `POST /cuenta`; Google y Apple por `POST /auth/nativo` (§g) | **Igual**, con contraseña, Google o Apple. Con contraseña, la app entra después con el SDK con las mismas credenciales. |
| 3 | `/cuestionario` (17 en 5) | Cuestionario **nativo** | `GET /questions` (v3), `GET/POST /cuestionario` | **Igual en pasos y copy, construido desde el catálogo.** `/questions` trae clave, tipo, `valor` por opción, `pantalla` y `exclusiva`, así que la app guarda **por código por construcción** y la trampa de `OPC`/`COD` no puede darse. Si llega un `tipo` que la app no conoce, esa pantalla abre la web (§e). |
| 4 | `/verificacion` | Verificación con cámara | `GET/POST /verificacion` (multipart `tipo` + `archivo`, ≤ 4 MB, jpeg/png/webp/heic) | **Se aparta a propósito, que es lo pedido:** guía de encuadre (rectángulo de cédula; óvalo para la selfie), vista previa y **«Usar esta» / «Repetir»** en las dos. La app comprime por debajo de 4 MB antes de subir. |
| 5 | `/cuenta` inicio | Inicio | `GET /mi-cuenta` | **Igual.** Estado, único paso siguiente y agenda. Si `esOps`, un enlace «El panel está en la web». |
| 6 | Reservar | Reservar | `POST /reservar` | **Igual.** Sin verificar, el botón no existe: se ve el paso de verificación (el candado se refleja **antes**). |
| 7 | `/pago` | Pago | `GET/POST /pago`, `POST /cupon` | **Igual** + botones «Copiar» en los datos de Pago Móvil y el importe. |
| 8 | `/mesa` espera | Mesa (espera) | `GET /mi-mesa` | **Igual.** Cuenta atrás hacia `revelaEn`, nunca hacia una hora escrita. |
| 9 | `/mesa` revelada | Mesa (revelada) | `GET /mi-mesa` | **Igual** + **disponible sin datos**: la última respuesta revelada se guarda cifrada en el celular y se muestra con «Actualizado a las hh:mm». La dirección abre la app de mapas. Se borra al día siguiente de la cena, porque lleva los nombres de otros cinco. |
| 10 | `/despues` | Después | `GET/POST /despues` | **Igual.** |
| — | Mi perfil | Perfil | `GET/POST /mi-perfil` | Igual |
| — | Mis avisos | Avisos | `GET/POST /mis-avisos` | **Igual**, las dos fijas sin interruptor. En la app se suma el estado del permiso del sistema («Tienes los avisos apagados en el celular → Activar»). |
| — | Exclusiones | Exclusiones | `GET/POST /mis-exclusiones` | Igual |
| — | Cancelar | Cancelar | `POST /cancelar` | Igual |
| — | Baja | **Borrar mi cuenta**, desde Perfil, sin escribir a nadie | `POST /baja` | Igual. Obligatoria para Apple. |
| — | Entrar | Entrar | SDK `signInWithPassword`, o Google/Apple + `POST /auth/nativo` | Se aparta por dentro, no a la vista: entra con el SDK, no con `/entrar`, porque la sesión la guarda el SDK. |
| — | `/entrar?fase=otroCorreo` y `fase=relay` | Las mismas dos fases | `POST /mi-perfil {clave:'contacto'}` | **Igual.** Las decide la respuesta de `/auth/nativo` en vez de una redirección. |
| — | Recuperar clave | Recuperar | `POST /entrar {accion:'recuperar'}` | **Igual y por la API, no por el SDK:** el de Supabase mandaría su propio correo y se saltaría el tope de 3 por hora. El enlace del correo abre `/clave` **en la web** en la v1. |
| — | Términos y privacidad | Navegador del sistema dentro de la app | — | **Única pantalla «embebida», y a propósito:** es texto legal. Tiene que ser la misma versión que se acepta (`VERSION_LEGAL`), y así lo es por construcción. |

**Embebida en la v1: ninguna pantalla del recorrido.** Pesaba embeber el
cuestionario, pero `/questions` lo hace innecesario y, además, más seguro que
la web. Embeber un `.dc.html` exigiría un «modo app» en la web para quitarle
su cabecera, y eso sería una dependencia.

**Google y Apple** entran en la v1 por la ruta nueva del §g.

### Qué hace la web cuando exista la app

**Sigue siendo el recorrido completo, y la app es opcional.** Nadie necesita
instalar nada para llegar desde un DM, dejar el correo, contestar, verificarse,
pagar y cenar. La cuenta es la misma y el estado vive en el servidor, así que
se puede empezar en una y seguir en la otra.

La web cambia en tres cosas, todas aditivas y ninguna bloquea la app:

1. **`/.well-known/apple-app-site-association` y `assetlinks.json`** (hoy no
   existen). Sin ellos, los enlaces de los correos abren el navegador, que es
   lo que pasa hoy: se degrada a lo que ya funciona. Con ellos, abren la app
   si está instalada. **La app sale igual sin ellos.**
2. **Invitar a instalar en el momento que lo justifica, no antes:** al
   confirmarse la reserva, «Para enterarte de tu mesa en cuanto se abra, ten
   la app». Nunca un muro, nunca en la entrada. El banner de Safari
   (`apple-itunes-app`) va al `<head>` de las diecinueve o al comprobador,
   **preferiblemente las dos**.
3. Nada más. La web no pierde ninguna función.

---

## d · Estimación, con las tiendas dentro

Un desarrollador RN con experiencia, dedicado. Semanas de calendario.

| Semana | Trabajo |
|---|---|
| **0 (días 1–3)** | Proyecto Expo con dev builds; tokens del sistema de diseño, Young Serif e Inter Tight empaquetadas, el aro de carga; cliente de API con la sesión del §0; esquemas de contrato. **Abrir cuentas de desarrollador el día 1** (ver abajo). |
| 1–2 | Entrada, datos, crear cuenta, entrar, recuperar; **Google y Apple nativos contra `/auth/nativo`** (§g); cuestionario desde el catálogo |
| 3 | Verificación con cámara (las dos, con repetir) y su estado. **Arranca la prueba cerrada de Google Play.** |
| 4 | Inicio, agenda, reservar, pago (Pago Móvil + reporte), cupón, cancelar |
| 5 | Mesa: espera, revelación, sin conexión; notificaciones locales; después; perfil, avisos, exclusiones, baja |
| 6 | Los criterios del §9 uno a uno en teléfono real (el más pequeño, letra al máximo, fecha movida a martes, sesión a una semana); fichas de tienda; TestFlight |
| 7 | Envío a revisión; margen para un rechazo |

**Salida estimada: 7 a 8 semanas, con una de margen para un rechazo.** Google
y Apple en la v1 suman de tres a cuatro días entre app y ruta. El push remoto
entra como actualización cuando llegue su pieza, sin retrasar nada.

### Dependencias de tienda: lo que no se puede comprimir

- **Apple Developer Program**: 99 USD al año. Es la dependencia real de iOS:
  sin ella no hay TestFlight ni publicación. **Como organización** (el
  vendedor sale como «Aro Club», que es la señal de algo real del §2.3) exige
  entidad legal y número D-U-N-S, **de una a dos semanas**. Como persona sale
  tu nombre. **Hay que confirmar** qué entidad existe y que la inscripción y
  el cobro funcionan desde Venezuela. Si no, la cuenta la abre la entidad del
  país que la tenga.
- **Google Play**: 25 USD una vez. **Las cuentas personales nuevas tienen que
  pasar 14 días seguidos de prueba cerrada con al menos 12 personas** antes de
  poder publicar. Las de organización están exentas, pero piden D-U-N-S. Por
  eso la prueba cerrada arranca en la semana 3 y no en la 6.
- **Sign in with Apple**: va en la v1, porque la app ofrece Google (guía
  4.8). Está incluido en la membresía y no cuesta nada aparte. Pide tres
  cosas de configuración, **todas tuyas porque viven en consolas**:
  - la capacidad «Sign in with Apple» en el App ID;
  - **encender el proveedor Apple en Supabase** con el *bundle ID* como
    Client ID;
  - en el proveedor Google de Supabase, **añadir los Client ID de iOS y
    Android** a los autorizados (sin eso, `signInWithIdToken` rechaza el
    token del celular).
- **Borrar la cuenta de quien entró con Apple** tiene una exigencia más:
  Apple pide **revocar su token** con su API al darse de baja. Supabase no lo
  hace solo. Es una pieza de backend en `/baja` (§g.5) y la revisión la mira.
- **La cuenta del revisor**: Apple entra con una cuenta y tiene que ver el
  producto, no una pantalla de «en revisión». Hace falta una cuenta
  **verificada, con reserva y con mesa revelada** en producción. El banco de
  pruebas ya crea estados; se le añade uno para el revisor. Es trabajo
  interno, no del backend público.

### Si rechazan: los motivos probables y la respuesta preparada

| Motivo | Respuesta, escrita antes de enviar |
|---|---|
| **3.1.1 · pagos fuera de la compra in-app** | Guía 3.1.3(e): bienes y servicios que se consumen fuera de la app. Es un puesto en una cena física en un restaurante, se paga por Pago Móvil y no hay contenido digital desbloqueado. Va en las notas de revisión desde el primer envío. |
| 5.1.1(v) · borrar la cuenta | Perfil → Borrar mi cuenta → `POST /baja`. Se explica en las notas qué se conserva (la facturación, 10 años por ley) y por qué. |
| 2.1 · no pudimos probarla | La cuenta del revisor, con mesa revelada. |
| 4.8 · login con Apple | Sign in with Apple ofrecido junto a Google, con el mismo peso visual. |
| 4.2 · funcionalidad mínima | Pantallas nativas, cámara, notificaciones. |
| Privacidad · documentos de identidad | Declarado en la ficha: fotos de documento y selfie, fin (verificación humana), bucket privado, borrado a los 90 días de aprobar. |

Apple suele contestar en 1–3 días. Un rechazo corriente se resuelve en el
Resolution Center en uno o dos ciclos: **una semana de margen está en la
estimación**. Google: la ficha de *Data safety* (documento, fotos, teléfono,
nacimiento), clasificación +18 y el nivel de API que exija Play en ese
momento.

---

## e · Versionado: cómo no se rompe una app en tienda

Cinco capas, de la que no depende de nadie a la que pide algo:

1. **La app tolera, no exige.** Cada respuesta se valida con un esquema que
   **ignora campos nuevos**. Un valor desconocido en un enum (un `estado`
   nuevo en `/mi-cuenta`, un `tipo` nuevo en `/questions`) no rompe nada:
   lleva a una pantalla «Esto lo ves mejor en la web» que abre `aro.club` en
   el punto equivalente. Una app vieja degrada a la web, nunca a un error.
2. **Solo cambios aditivos en las rutas que usa la app.** Quitar o renombrar
   un campo pasa a ser una ruta nueva, no un cambio. Y, como todo aquí, **se
   vigila en vez de confiar**: `scripts/comprobar-contrato-app.mjs` valida
   las respuestas reales contra los esquemas de `app-mobile/contrato/` y corre antes
   de cada push, junto a `comprobar-cuestionario.mjs`. Quien rompa el contrato
   se entera en su terminal, no por una reseña de una estrella.
3. **La app se identifica**: cabecera `X-Aro-App: ios/1.0.0 (12)`. El
   servidor la ignora hoy; mañana permite saber qué versiones siguen vivas
   antes de retirar algo.
4. **EAS Update**: los arreglos de JavaScript llegan a las apps instaladas
   sin revisión de tienda, atados a la versión nativa compatible.
5. **Versión mínima**: un JSON estático (`/app/estado.json`:
   `{minima, recomendada, mensaje}`). Si no existe, la app entiende «todo
   bien». Es un fichero, no una ruta, y la app no lo necesita para salir.

---

## f · Lo que se pide al backend

Todo aditivo. **Una pieza bloquea la salida**, y es consecuencia directa de
sacar la v1 con Google: `/auth/nativo`. Lo demás no bloquea nada.

| Pieza | Para qué | Sin ella, la app… |
|---|---|---|
| **`POST /auth/nativo`** (§g) | Google y Apple en la app | **…no sale.** Es la única dependencia de la v1, así que va la primera. Mientras llega, se desarrolla y se prueba todo con contraseña. |
| **Revocar el token de Apple en `/baja`** (§g.5) | Guía 5.1.1(v) con Sign in with Apple | …la revisión puede rechazarla |
| `device_tokens` + `POST/DELETE /dispositivos` + push en `despacharPendientes` | Push remoto | …avisa por locales (revelación y día) y por correo |
| Tipo de aviso «verificación aprobada» | Que sepa cuándo cambia | …lo muestra al abrir |
| `/.well-known/…` (AASA + assetlinks) | Que los correos abran la app | …los correos abren la web, como hoy |
| `/app/estado.json` | Forzar actualización | …no fuerza nada |

---

## g · La ruta nueva: `POST /api/auth/nativo`

### El problema

En la web, Google vuelve por `/auth/callback`, que después de canjear el
código aplica cuatro reglas en orden:

1. sin correo verificado por el proveedor, no se entra;
2. si no hay perfil, se cruza el lead por correo y se llama a
   `convertir_lead`, o se crea el perfil con lo que da el proveedor;
3. si el correo de entrada no es el del lead, pantalla de «correo distinto»;
4. el destino lo decide `situacionDePerfil`.

En el celular, el login es nativo: el SDK de Google o el de Apple dan un
*ID token*, y `supabase.auth.signInWithIdToken` abre la sesión **sin pasar
por `/auth/callback`**. Sin una ruta que aplique esas cuatro reglas, quien
entra con Google desde la app se queda sin perfil, o con uno vacío y las
respuestas del lead huérfanas. Es justo lo que la regla 2 existe para impedir.

### La propuesta

**La sesión la abre el SDK en el celular, y la ruta solo aplica las reglas.**
La ruta no recibe ni canjea tokens de Google o Apple: la sesión ya existe y le
llega por la misma cookie que el resto de rutas (§0). Así la ruta no manipula
credenciales de proveedores, y el SDK sigue siendo el único dueño de la
sesión.

```
POST /api/auth/nativo
Cookie: sb-…-auth-token   (la sesión recién abierta con signInWithIdToken)

{
  "lead":   { "correo": "…", "token": "…" },   // opcional: el token de lead, si la app lo tiene
  "nombre": "María Pérez"                      // opcional: solo Apple, que da el nombre
}                                              //   en la credencial y solo la primera vez
```

Respuestas:

| Caso | Respuesta |
|---|---|
| Sin sesión | `401 {error:'sin-sesion'}` |
| Correo sin verificar | `403 {error:'correo-sin-verificar'}`, y se cierra la sesión en el servidor, como hace `/auth/callback` |
| Fallo al convertir o crear | `500 {error:'no-se-pudo'}` |
| Dentro | `200 {estado:'dentro', paso, otroCorreo?: {registro, entrada}, relay?: true}` |

- `paso` es el `Paso` de `situacionDePerfil`, sin traducir. La app elige la
  pantalla con el mismo criterio que la web: `preguntas` o `contacto` →
  cuestionario; si no, inicio.
- `otroCorreo` sale en el mismo caso en que la web redirige a
  `/entrar?fase=otroCorreo`. La app enseña esa fase y guarda la elección con
  `POST /mi-perfil {clave:'contacto'}`, **igual que la web hoy**.
- `relay` sale cuando Apple entrega un correo `@privaterelay.appleid.com`.
  La app enseña la fase `relay` que ya está diseñada en `Entrar.dc.html`
  (hoy la dispara el botón de Apple apagado). El correo de contacto se guarda
  por la misma vía.

### Aditiva de verdad: se extrae, no se copia

Duplicar las cuatro reglas en otra ruta es la receta de dos copias que
divergen, que es de lo que este repo más ha sufrido. Así que:

1. **Se extrae** el cuerpo de `/auth/callback`, desde que hay usuario, a
   `src/lib/tras-entrar.ts`:
   `trasEntrar(usuario, leadFirmado?, nombre?) → {tipo:'dentro', paso, otroCorreo?, relay?} | {tipo:'fallo', motivo}`.
   Devuelve **qué pasó**, no a dónde ir.
2. `/auth/callback` llama a esa función y traduce el resultado a **las mismas
   redirecciones que hoy**, con la misma cookie borrada. Sus respuestas no
   cambian.
3. `/api/auth/nativo` llama a la misma función y traduce a JSON.

Dos cambios dentro de la función, los dos sin efecto en lo que hoy responde
la web:

- **La regla 1 acepta `google` y `apple`**, no solo `google`. En la web Apple
  está apagado, así que hoy no cambia nada.
- **El lead llega firmado**, igual que en la web: allí viaja en la cookie
  `aro-oauth` firmada; aquí, como `{correo, token}` verificado con
  `verificar()`. Un lead sin firma válida se ignora, como en `/api/auth/google`.
  Nunca se acepta un correo de lead a secas: es la puerta por la que se toma
  una cuenta ajena.

**Cómo se comprueba que la web no cambió** (en el navegador, no leyendo el
diff): el recorrido de Google de la web con una cuenta desechable, en los
tres casos: sin lead, con lead del mismo correo y con lead de otro correo.
Mismas pantallas y mismas filas en `profiles` y `waitlist` que antes.

### Idempotente, porque el celular se cuelga

Entre `signInWithIdToken` y la llamada a la ruta, la app puede morir (sin
señal, la cierran). La web tiene la misma ventana entre el canje y el alta del
perfil. Por eso:

- la ruta es **idempotente**: con perfil ya creado, salta a la regla 4 y
  responde `dentro`, que ya es lo que hace hoy `/auth/callback`;
- la app guarda «falta el tras-entrar» junto a la sesión y **lo reintenta al
  abrir** antes de enseñar nada.

### g.5 · Borrar la cuenta de quien entró con Apple

Apple exige que, al borrar una cuenta creada con Sign in with Apple, la app
**revoque el token** con `POST https://appleid.apple.com/auth/revoke`. Para
eso:

- la app manda el `authorizationCode` de Apple en el primer login;
- `/auth/nativo` lo canjea por el *refresh token* de Apple y lo guarda aparte
  (tabla con RLS cerrada, solo servicio);
- `/baja` lo revoca antes de borrar, y si Apple falla, lo registra y sigue:
  la baja no puede quedarse a medias por un tercero.

Hace falta la clave privada de Sign in with Apple (`.p8`) como secreto en
Vercel. **La saca quien abra la cuenta de Apple.**

---

## Siguiente paso

En marcha: el proyecto Expo en `app-mobile/`, con la sesión como primer módulo. La
ruta `/auth/nativo` es la primera pieza de backend y la única que bloquea la
salida. **Si el diseño del §g te vale, la escribo yo o la escribe quien
mantiene el backend**, como prefieras.
