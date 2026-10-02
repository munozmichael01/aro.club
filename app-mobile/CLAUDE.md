@AGENTS.md

# La app de Aro Club

Expo SDK 57 · React Native 0.86 · Expo Router (rutas en `src/app/`). El
encargo está en `PEDIDO-app-movil.md`, las decisiones de arranque en
`PROPUESTA-app-movil.md` y el reparto del texto en `TEXTO-tres-superficies.md`.
Las reglas de producto son las del `CLAUDE.md` de la raíz: valen aquí igual.

**La condición que manda: la app no puede tener dependencias para salir.**
Lo que necesite del backend se pide como cambio aditivo al agente de la web.
La única dependencia aceptada es `POST /api/auth/nativo` (ver abajo).

---

## Dónde lo dejamos (02-10-2026) — empezar por aquí

**En las tiendas:**
- **iOS:** en TestFlight, con testers externos ya aceptados. La build 4
  (`d33b2a5e…`) se está compilando y se sube sola con `--auto-submit`. Trae
  las polaroids nuevas de la Bienvenida y las fotos de Inicio arregladas.
  Apple y Google funcionan: los probaron Michael y un tester.
- **Android:** la cuenta de Play está verificada, la app creada y la AAB
  (versionCode 4) en *Internal testing*. Los dos clientes Android de Google
  están creados. Falta que Michael confirme que «Continuar con Google»
  funciona en Android. Las AAB se suben A MANO: EAS todavía no tiene cuenta
  de servicio de Play.

**Pendiente de Michael:**
- Ver la build 4: cerrar sesión → borrar la app → instalar desde TestFlight.
  El llavero de iOS guarda la sesión aunque se borre la app, y con sesión no
  se ve la Bienvenida.
- Probar Google en Android.
- Revisar la ficha de App Store (`tienda/app-store.md`) y ver si el
  cuestionario pregunta algo que Apple considera «sensible».
- *Closed testing* de Android: 12 testers × 14 días antes de producción.
- Textos de permiso de cámara y fotos (`app.json`).

**Pendiente mío (app):**
- Capturas de 1320 × 2868 para la App Store. Chrome sin ventana recorta la
  maqueta, porque su ancho mínimo no es el del teléfono. Probar con el
  iPhone de Michael o con otra herramienta.
- «Cerrada · 0 apuntados»: propuse decir solo «Cerrada» por debajo de 3
  apuntados, en la app y en la web. **Michael no lo ha confirmado.**
- Cuando el agente mande `motivo: 'ya_tiene_cuenta'` en el 409 de
  `/api/cuenta`, dejar de comparar el texto.
- Opcional: `eas submit` para Android (con cuenta de servicio de Play) y EAS
  Update para mandar arreglos de JS sin hacer build.
- **Push (02-10): todo montado, falta la prueba de punta a punta.**
  - **App:** `src/avisos/` (69663e1).
  - **Servidor:** el agente. Salen desde `despacharPendientes` con la fila
    del correo; el resultado queda en `scheduled_emails.push_at` /
    `push_motivo`; solo 7 tipos; quien se dio de baja de los correos
    tampoco recibe push.
  - **iOS:** llave de APNs en EAS y capacidad Push activada; build 5 con push
    en TestFlight.
  - **Android:** proyecto de Firebase `aro-club`, con `google-services.json`
    como variable de fichero de EAS `GOOGLE_SERVICES_JSON` (vía
    `app.config.js`, nunca en el repo) y la clave FCM V1 subida a EAS por
    Michael. La build con push (`bf0c5ed0…`) hay que subirla a mano a
    *Internal testing*.

  **Prueba:** una cuenta del banco en el teléfono reserva (ahí pide el
  permiso), el agente encola uno de los 7 tipos para ella, y hay que ver que
  llega y que al tocarla abre su pantalla. `/api/cron/correos?seco=1`
  devuelve `pushes` sin llamar a Expo.

**La cena del 03-10 (influencers):** no se hace, y se deja pasar SIN
TOCARLA. Mientras siga en `open` y sin mesas no sale ningún correo: ni
revelación, ni recordatorio, ni encuesta, ni cancelación. El agente lo
comprobó en `scheduled_emails`. Cancelarla desde Operación SÍ mandaría el
correo.

---

## Estado: qué está hecho y qué es andamio

Hecho y probado contra producción, y en el iPhone de Michael (Expo Go):

| Ruta | Qué es | Maqueta |
|---|---|---|
| `/` | Bienvenida: polaroids, titular, «Encuentra tu mesa», «Ya tengo cuenta · Entrar». Solo la primera vez; después, sin sesión, abre en Entrar | `Design/Bienvenida app.dc.html` (1b) |
| `/empezar` | La puerta: correo + cuatro preguntas | Landing / entrada |
| `/datos` | Datos personales | Datos base |
| `/cuestionario` | El cuestionario, del catálogo | Cuestionario |
| `/verificacion` | Cédula + selfie (sin la fase QR, que es del ordenador) | Verificación |
| `/entrar` | Entrar, sobre verde, con pie | Entrar |
| `/cuenta` | Inicio: estado, agenda, lo próximo, atajos | Mi cuenta |
| `/mesa` | Mi mesa: vacía (3 casos), cerrada, abierta, lo de después | Mi mesa |
| `/perfil` | Perfil: datos y respuestas editables, exclusiones, cenas, avisos, baja | Mi perfil |
| `/pago?evento=` | Pago: método, datos para pagar, reporte, cupón, pendiente/confirmado/no cuadra | Pago |
| `/cancelar` | Cancelar: con margen o sin él, el porqué, y los créditos de verdad | Cancelar |

La cuenta (`src/app/(cuenta)/`) lleva **pestañas abajo: Inicio, Mi mesa y
Perfil, SIEMPRE las tres** (decidido 28-09: una barra que cambia de forma
entre visitas desorienta). «Mi mesa» se llama «Mi grupo» si lo reservado es
de movimiento (`reglas.vozDe`, vía `src/cuenta/voz.ts`). La cabecera
(`src/cuenta/Cabecera.tsx`) y cerrar sesión (`src/cuenta/salir.ts`) son las
mismas en las tres. Cada pestaña se relee al volver a ella (`useFocusEffect`):
se quedan montadas, y lo hecho en una cambia lo que dicen las otras.

**Ya no queda ninguna pantalla de andamio.** `src/Pendiente.tsx` se queda
por si hace falta otra.

Pago y Cancelar van FUERA de las pestañas (`src/app/pago.tsx`,
`cancelar.tsx`): son flujos con principio y final, y una barra invita a irse
a mitad. Llevan su propia vuelta atrás.

**Google y Apple, del lado de la app, hechos** (`src/sesion/proveedores.ts`,
`nativo.ts`): SDK nativo → `signInWithIdToken` → `POST /api/auth/nativo`, con
la marca «entrada pendiente» (AsyncStorage) que `src/app/index.tsx` usa para
repetir la llamada si la app murió a mitad, y el aterrizaje por `paso`
(`destinoDePaso`, lo decide `embudo.ts`). Entrar tiene las fases «correo
distinto» y relay de Apple, que guardan el `contacto` por `/api/mi-perfil`.
En Expo Go los dos botones dicen que aún no funcionan (los tokens saldrían a
nombre de Expo Go). **Para que funcionen de verdad falta, fuera del código:**
- ~~Apple~~ (hecho el 01-10):
  - cuenta de Apple Developer: equipo 696DAG5UG5, individual,
    `somos.aroclub@gmail.com`;
  - capacidad *Sign in with Apple* en `club.aro.app`;
  - proveedor Apple de Supabase con `club.aro.app` en *Client IDs*, sin
    *Secret Key* (solo la necesita la web).

  El panel de Supabase es de **munozmichael01@hotmail.com**;
- ~~Google en iOS~~ (hecho el 01-10, ad5a862): proyecto de Google Cloud
  «My First Project» (el del login web), cliente web `…ce8up` y cliente iOS
  `…gl33e` en `app.json` → `extra.google`, plugin con `iosUrlScheme`, y los
  dos en *Client IDs* del proveedor Google de Supabase con «Skip nonce
  checks». Pantalla de consentimiento: en producción, externa.
- **Google en Android** (02-10): dos clientes Android (`club.aro.app`) en
  el mismo proyecto de Google Cloud, con los SHA-1 de Play Console → App
  signing: clave de firma de Play `D4:88:0E:…:BC:30` (lo que se instala
  desde Play) y clave de subida de EAS `99:01:C4:…:86:87`. No van a
  Supabase ni a `app.json`: en Android el SDK pide el token con el
  `webClientId`, y los clientes Android solo prueban que la app es nuestra.
  Sin ellos, `DEVELOPER_ERROR`.

**Builds y tiendas:**
- Para lanzar: `npx eas-cli@latest build -p ios --profile production
  --non-interactive --auto-submit --no-wait`. Se sube sola a TestFlight: EAS
  guarda la API key de App Store Connect y `eas.json` el `ascAppId`. Para
  Android es `… -p android …`, y la AAB se sube a mano a Play Console.
- Los certificados de iOS están en EAS hasta oct-2027. Con `appVersionSource:
  remote` y `autoIncrement`, el número de build lo lleva EAS.
- App Store Connect: app 6818022672, grupo interno «Team (Expo)». Play:
  `club.aro.app`, cuenta `somos.aroclub` (personal, nombre público «Aro Club»).
- La ficha de App Store está en `tienda/app-store.md`, con soporte en
  `https://aro.club/ayuda`. La cuenta del revisor la monta
  `node scripts/cuenta-revision.mjs` (desde `aro-club/`). Su mesa caduca a
  las ~30 h: correr `--refrescar` el día que se envía.

**El alta nueva está en `/puerta`** (`src/puerta/`) y es la que abre la
Bienvenida («Encuentra tu mesa») y el «Empezar» de Entrar. `/empezar` (el
alta vieja, con lead) sigue existiendo pero ya no se enlaza. Probada entera
contra producción con `npm run prueba:alta-app` (cuenta sin lead →
respuestas → embudo; sin lead fabricado; `profiles.source = 'app'`).
Quien entra con Google y le faltan las cuatro (`paso: preguntas`) va a
`/puerta`, que con sesión se salta la cuenta.

El alta nueva de la app (acordada con el agente de la web el 29-09): las
cuatro de la puerta y el nacimiento en local (borrador guardado; la puerta de
los 18 antes de crear nada), después «crea tu cuenta» (Apple, Google, o
correo y contraseña por `/api/cuenta` sin lead, que abre él), y con la
sesión las cinco respuestas por `POST /api/cuestionario {clave, valor}`,
una por llamada. Luego manda `embudo.ts`. `/api/datos-base` NO acepta
guardados parciales, a propósito. La web conserva su orden (correo primero).

La push de «Voy tarde» y de la revelación necesita build nativa (Expo Go ya
no recibe push remotas) y trabajo del backend (guardar tokens y mandar).

---

## Decisiones tomadas (no se reabren)

- **Sin las preguntas obligatorias (y los datos) no se reserva** (Michael,
  01-10-2026). Qué falta lo dice el servidor (`embudo.ts`, vía `estado` y
  `respuestas.faltan` de `/api/mi-cuenta`); ninguna pantalla lo decide por
  su cuenta. El botón Reservar manda a completar, no a verificarse, y «en
  revisión» solo dice «perfil completo» si `faltan === 0`. El candado del
  servidor (`/api/reservar`) lo pone el agente de la web.
- **Las fechas cierran `AroReglas.HORAS_DE_CIERRE` horas antes** (24 desde
  el 01-10). El copy lee la constante, nunca el número a pelo.
  - Una fecha cerrada no enseña los datos para pagar: fase `cerrada` de
    Pago, y el 409 `motivo: 'fecha-cerrada'` lleva ahí.
  - En la agenda se ve cerrada también si pasó su `cierraEn`, aunque el
    estado siga `open`.
- **«Te faltan N preguntas» solo con N ≤ 3** (Michael, 01-10). Si son más:
  «UN PASO MÁS», «Termina tu perfil para reservar», «Termina tu perfil».
- **Arraigo `interior` = «Soy nueva o nuevo en la ciudad».** El copy es
  neutro siempre: nada de masculino genérico. La etiqueta vive en `reglas.js`.
- **Las fechas de prueba no le salen a nadie:** `events.es_prueba`, que
  `/api/mi-cuenta` y `/api/proxima` filtran. Si la app lista fechas desde
  otra consulta, que filtre por esa columna.
- **Todo ajuste se hace en la app Y en la web.** Lo de la web y el servidor
  va en un mensaje al agente (ficheros y líneas); lo compartido, primero al
  servidor.

- **Un color de cuerpo: `#33513F`** (AAA). La web tiene dos y es deriva. Si
  una maqueta trae otro tono para el mismo papel, se usa el token y se anota.
  La tabla de contrastes de la hoja está inflada ~7 %: medir con WCAG.
- **Suelo de interlineado medido en los TTF** (`hhea`): Young Serif 1,42,
  Inter Tight 1,21 (`SUELO_INTERLINEADO` en `tokens.ts`). En RN el
  `lineHeight` RECORTA la caja: por debajo se comen tildes y ascendentes.
  El aire se saca del tamaño (portada 34, titularGrande 30), nunca bajando el
  suelo. `pruebas/tipografia.test.ts` lee los TTF y falla si alguien lo baja.
- **`reglas.js` se carga, no se reescribe.** Metro lo trae de `../public`
  (`watchFolders`). Es el tercer consumidor, con la web y el servidor.
- **La puerta sale de `AroReglas.PUERTA` / `ORDEN_PUERTA`**, las zonas de
  `/api/zonas` (tope de 5 en la puerta). Todo se guarda por CÓDIGO, nunca por
  posición.
- **Día y hora: SIEMPRE de `reglas.partesDe` / `diaDe` / `horaDe` con la
  `zonaHoraria` de ESA fecha**, que viaja junto a cada fecha en `/api/proxima`,
  `/api/mi-mesa` y `/api/mi-cuenta` (agenda, `proximaFecha`, `reserva`, cada
  plan). Nunca `getDay()`/`getHours()`: eso es el reloj del celular. Solo
  `src/texto/fechas.ts` puede escribir días; `sin-dias-a-mano.test.ts` lo
  vigila. Sin fecha, la frase va sin día («cuando se abra la mesa»).
- **`origen: 'app'`** en `/api/lead`. Las respuestas del lead exigen su token,
  y el token solo llega con `estado: 'nuevo'`.
- **Nada de cache-buster en `/api/questions`**: se cachea 5 min a propósito.
- **Fotos con el filtro cocido** en el fichero (`scripts/cocer-foto.py`, con
  las matrices de CSS). Se regeneran desde `public/fotos/`, no se editan.
- **Splash** (1a de Bienvenida app): `assets/splash.png`, generado por `scripts/splash.py` desde la geometría del SVG de Design, sobre `#14342A` en la config de `expo-splash-screen`. Se oculta al cargar las fuentes. Expo Go no lo enseña: solo una build.
- **Iconos en SVG** (`src/diseno/Iconos.tsx`), nunca glifos (◗ ✓ → ×) ni emojis.
- **Componentes del sistema antes que estilos sueltos**: `Opcion` (con `pie`
  y `fija` para las personas de Mi mesa), `Ficha` (las escalas), `Interruptor`
  (propio: el `Switch` del sistema pinta otro color en cada plataforma),
  `Boton tipo="grave"` (enviar un reporte, darse de baja: la terracota #6E340F).
- **Cómo llegar** abre Apple Maps en iOS y el enlace de Google en Android
  (`mesa/maquina.mapa`): aquí se sabe el teléfono, la web lo adivina.
- **Las fechas de nacimiento no pasan por `Date`** (`fechaDeNacimiento`):
  medianoche UTC es el día anterior en Caracas.
- **Fuentes embebidas** (plugin `expo-font`) y además `useFonts` para web y
  Expo Go. Cada fichero se llama con su nombre PostScript.
- **El texto** vive en `src/texto/*.ts` (casilla B: calcado de la maqueta;
  casilla C: solo del celular, marcado). `public/textos.js` aún no existe:
  avisar a Michael ANTES de crearlo o tocarlo.
- La verificación la decide **una persona**, no «el servidor»: el copy nunca
  dice lo contrario.

## La sesión

- **El SDK de Supabase es su único dueño.** Llavero (`src/sesion/almacen.ts`,
  en trozos, `AFTER_FIRST_UNLOCK`); en web, AsyncStorage.
- **Toda llamada a `aro.club/api` pasa por `api` de `src/sesion`.** Nada de
  `fetch` suelto: arma la cookie, refresca con 5 min de margen y reintenta
  una vez con 401.
- **El refresh token no sale nunca del celular.** La cookie lo lleva vacío a
  propósito (`cookie.ts`). Quitarlo hace que el servidor lo rote a escondidas.
- **`/api/auth/nativo`** lo escribe el agente de la web. La sesión llegará en
  la misma cookie que el resto; la app no recibe tokens de Google ni Apple.
  Al integrarlo: probar la idempotencia matando la app entre el login y la
  llamada, y quitar el aviso provisional de Entrar.

## Lo que es solo para desarrollo no se publica

Decisión de Michael (29-09): **ningún atajo de desarrollo llega a la app
publicada.** Todo va detrás de `__DEV__` (en una build de producción es
`false` y el código ni se conecta), y `pruebas/solo-desarrollo.test.ts`
falla si sale de esa condición. Hoy hay uno: mantener pulsado el logo de
Entrar olvida que ya se vio la bienvenida, para volver a probarla. Si se añade
otro, va a esa prueba.

## Trampas que ya mordieron

- **Subir un fichero:** el fetch de Expo 57 NO acepta `{ uri, name, type }`
  en `FormData` («Unsupported FormDataPart implementation»). Se adjunta
  `new File(uri)` de `expo-file-system`. Y «Usar esta» espera a la foto ya
  encogida (1600 px, JPEG 0,82): sin eso subía la de 4 MB.
- **El servidor de Expo Go lo apaga la app de escritorio** tras ~30 min sin
  actividad. Antes de que Michael pruebe: `preview_start` con `app-telefono`
  (el launch.json está en `Documents/Dev/.claude/`). Dirección
  `exp://<IP del Mac>:8081`, misma wifi. La IP CAMBIA (fue .54, luego .58):
  mirarla con `ipconfig getifaddr en0` antes de dársela a Michael. Cuenta de Expo `somos.aroclub`,
  proyecto `@somos.aroclub/aro-club` (el `projectId` de `app.json` hace falta:
  sin él el manifiesto sale como `@anonymous`).
- **Esta Mac no tiene Xcode**: no hay simulador de iOS. Se prueba en el
  iPhone de Michael o en el catálogo web.
- **Carrera de estado** con dos toques seguidos: guardar el estado vivo en un
  ref (`actual`), como el cuestionario y el Inicio.
- **Callbacks de props fuera de las dependencias de la carga** (`useUltimo`):
  la ruta los escribe en línea y cambian cada vez que ella se pinta.
- **En el navegador no se puede probar contra la API**: el navegador no deja
  poner la cabecera `Cookie` y aro.club no da CORS a localhost. El navegador
  es para los catálogos; la API se prueba con `npm run prueba:*`.
- **La caché de npm del sistema está corrupta**: si `npx` falla, correrlo con
  `npm_config_cache=<carpeta temporal>`.
- **El `overrides` de `react-native-worklets` en `package.json` no se quita.**
  `expo-modules-core` lo pide como peer opcional `^0.10` y Reanimated exige
  0.13. El npm 11 de esta Mac lo tolera, pero el npm de EAS no: `npm ci`
  falla con «Missing: react-native-worklets@0.10.4 from lock file». Antes de
  lanzar una build: `npx npm@10 ci --dry-run` en una copia. El log de una
  build fallida viene en brotli: se lee con `zlib.brotliDecompressSync` de Node.
- **`App/` en macOS es `app/`** y Next la toma por su carpeta de rutas (todo
  404 en la web local). Por eso la app vive en `app-mobile/`.
- **La base es producción y no hay staging.** Nunca insertar filas a mano ni
  usar las herramientas MCP de Supabase (apuntan a otro proyecto). Probar solo
  con el banco de pruebas, y borrarlo.

## Qué esperar del agente de la web

Él mantiene `aro.club/api`, `public/reglas.js` y `scripts/banco-pruebas.mjs`.
Se le pide lo que falta como cambio aditivo, con el hallazgo concreto (qué
pantalla, qué dato, qué se ve mal) y sin el paso a paso de un fallo de
seguridad en el repo. Lo que es de la web va en UN mensaje con ficheros y
líneas, que Michael reenvía. Ya hecho de su lado:
- `/api/auth/nativo` y `/api/cuenta` sin lead;
- `paso`, `donde` y `puedeReservar` en `/api/mi-cuenta`, y `faltan` en
  `GET /api/verificacion`;
- los 409 `perfil-incompleto` de `/api/reservar` y `fecha-cerrada`;
- `HORAS_DE_CIERRE` y `es_prueba`;
- `/ayuda`, con `AroReglas.FRECUENTES`;
- el cuerpo de los correos que entran a `hola@aro.club`: el webhook de
  Resend no lo trae.

La cuenta de prueba de Michael `munozmichael01+app@gmail.com` se mantiene
hasta que él termine de probar; después se borra con sus ficheros de
`verificaciones/<id>/`. Nadie aprueba su verificación en el panel.

---

## Antes de cada push

```bash
npm run tipos && npm test
```

`npm test` corre dos veces, con el reloj de Madrid y con el de UTC: las
fechas se dicen en la zona de la ciudad, esté donde esté el celular.

Contra la API real (escriben una fila de `waitlist` con un correo desechable
y la borran):

```bash
npm run prueba:entrada
npm run prueba:datos
npm run prueba:alta      # el alta entera: correo → preguntas → datos → cuenta → entrar
```

El embudo, con la cuenta del banco: una cuenta nueva con solo la puerta.
Comprueba `paso` y `donde`, el botón de Reservar, el `faltan` de la
verificación y el 409 `perfil-incompleto`:

```bash
node ../scripts/banco-pruebas.mjs borrar && npm run prueba:embudo; node ../scripts/banco-pruebas.mjs borrar
```

La verificación, con la cuenta del banco y una imagen GENERADA (nunca un
documento de verdad); borra filas y ficheros:

```bash
node ../scripts/banco-pruebas.mjs && IMAGEN=<jpg generado> npm run prueba:verificacion; node ../scripts/banco-pruebas.mjs borrar
```

El Inicio, en el estado que monte el banco (`lista` → reservar, `lista mesa`
→ reservada, `lista revelada` → abierta, sin nada → datos). No reserva nada:
solo prueba el «no» del servidor:

```bash
node ../scripts/banco-pruebas.mjs lista revelada && ESPERA=abierta npm run prueba:cuenta; node ../scripts/banco-pruebas.mjs borrar
```

Mi mesa, solo leyendo (de «Voy tarde» solo se prueba el «no» de antes de
abrirse: el «sí» manda un correo a los otros cinco). `ESPERA` = vacia,
cerrada (`lista mesa`), abierta (`lista revelada`) o pasada (`lista cenas`):

```bash
node ../scripts/banco-pruebas.mjs lista mesa && ESPERA=cerrada npm run prueba:mesa; node ../scripts/banco-pruebas.mjs borrar
```

Perfil: edita y lee de vuelta, alterna un aviso y, con `BAJA=1`, da de baja
la cuenta del banco (solo esa: la prueba se niega con otra). Con
`GUARDAR=pruebas/datos/mi-perfil.json` refresca la respuesta real que usan
el catálogo y `pruebas/perfil.test.ts`:

```bash
node ../scripts/banco-pruebas.mjs lista && BAJA=1 npm run prueba:perfil; node ../scripts/banco-pruebas.mjs borrar
```

Pago: GET, un código que no existe y, con `REPORTAR=1`, un Pago Móvil
inventado (aparta un puesto de verdad; el banco lo borra). La captura no se
sube: dejaría un fichero que el banco no limpia. Y Cancelar, que cancela la
reserva de pruebas y comprueba que el crédito vuelve:

```bash
node ../scripts/banco-pruebas.mjs lista && REPORTAR=1 npm run prueba:pago; node ../scripts/banco-pruebas.mjs borrar
node ../scripts/banco-pruebas.mjs lista mesa && npm run prueba:cancelar; node ../scripts/banco-pruebas.mjs borrar
```

`pruebas/datos/pago.json` es la respuesta real de `GET /api/pago` con los
datos de la cuenta que recibe CAMBIADOS por inventados: nunca subir al repo
los de verdad (banco, cédula, teléfono).

La sesión, si tocaste `src/sesion/`:

```bash
node ../scripts/banco-pruebas.mjs && npm run prueba:api; node ../scripts/banco-pruebas.mjs borrar
```

Cada pantalla se ve en el navegador (config `app-catalogo`, puerto 8090) con
servidor simulado: `/catalogo`, `/catalogo-entrada`, `/catalogo-datos`,
`/catalogo-cuestionario`, `/catalogo-verificacion?estado=…` (`revision-faltan` incluido),
`/catalogo-cuenta?estado=reservar|reservada|abierta|…`,
`/catalogo-mesa?estado=revision|sin-reserva|sin-mesa|cerrada|abierta|movimiento|pasada|valorada`,
`/catalogo-perfil`, `/catalogo-pago?estado=elegir|sin-verificar|pendiente|listo|fallo|prueba`
(el código «REGALO» sale bien), `/catalogo-cancelar?estado=margen|tarde|revelada|fallo`,
`/catalogo-bienvenida`, `/catalogo-puerta[?sesion=1]`.

Instalar siempre con `npx expo install`. Las pruebas usan los tipos de Node y
la app no: por eso tienen su propio `tsconfig`. Un `Buffer` en `src/` compila
en las pruebas y revienta en Hermes.
