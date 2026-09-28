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

## Estado: qué está hecho y qué es andamio

Hecho y probado contra producción, y en el iPhone de Michael (Expo Go):

| Ruta | Qué es | Maqueta |
|---|---|---|
| `/` | Bienvenida (foto, Empezar, Entrar) | Landing, modo Meetup |
| `/empezar` | La puerta: correo + cuatro preguntas | Landing / entrada |
| `/datos` | Datos personales | Datos base |
| `/cuestionario` | El cuestionario, del catálogo | Cuestionario |
| `/verificacion` | Cédula + selfie (sin la fase QR, que es del ordenador) | Verificación |
| `/entrar` | Entrar, sobre verde, con pie | Entrar |
| `/cuenta` | Inicio: estado, agenda, lo próximo, atajos | Mi cuenta |
| `/mesa` | Mi mesa: vacía (3 casos), cerrada, abierta, lo de después | Mi mesa |
| `/perfil` | Perfil: datos y respuestas editables, exclusiones, cenas, avisos, baja | Mi perfil |

La cuenta (`src/app/(cuenta)/`) lleva **pestañas abajo: Inicio, Mi mesa y
Perfil, SIEMPRE las tres** (decidido 28-09: una barra que cambia de forma
entre visitas desorienta). «Mi mesa» se llama «Mi grupo» si lo reservado es
de movimiento (`reglas.vozDe`, vía `src/cuenta/voz.ts`). La cabecera
(`src/cuenta/Cabecera.tsx`) y cerrar sesión (`src/cuenta/salir.ts`) son las
mismas en las tres. Cada pestaña se relee al volver a ella (`useFocusEffect`):
se quedan montadas, y lo hecho en una cambia lo que dicen las otras.

**Andamio** (`src/Pendiente.tsx`, «Esta pantalla todavía no está hecha»):
`/pago` y `/cancelar`. Ninguna sale a tienda así.

Por hacer, en este orden salvo que Michael diga otra cosa: pago (con cupón),
cancelar, y la notificación push de «Voy tarde» (necesita una build nativa:
Expo Go ya no recibe push remotas). Y Google + Apple cuando exista
`/api/auth/nativo`: hoy los botones de Entrar enseñan un aviso provisional.

---

## Decisiones tomadas (no se reabren)

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

## Trampas que ya mordieron

- **Subir un fichero:** el fetch de Expo 57 NO acepta `{ uri, name, type }`
  en `FormData` («Unsupported FormDataPart implementation»). Se adjunta
  `new File(uri)` de `expo-file-system`. Y «Usar esta» espera a la foto ya
  encogida (1600 px, JPEG 0,82): sin eso subía la de 4 MB.
- **El servidor de Expo Go lo apaga la app de escritorio** tras ~30 min sin
  actividad. Antes de que Michael pruebe: `preview_start` con `app-telefono`
  (el launch.json está en `Documents/Dev/.claude/`). Dirección
  `exp://192.168.68.54:8081`, misma wifi. Cuenta de Expo `somos.aroclub`,
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
- **`App/` en macOS es `app/`** y Next la toma por su carpeta de rutas (todo
  404 en la web local). Por eso la app vive en `app-mobile/`.
- **La base es producción y no hay staging.** Nunca insertar filas a mano ni
  usar las herramientas MCP de Supabase (apuntan a otro proyecto). Probar solo
  con el banco de pruebas, y borrarlo.

## Qué esperar del agente de la web

Él mantiene `aro.club/api`, `public/reglas.js` y `scripts/banco-pruebas.mjs`.
Se le pide lo que falta como cambio aditivo, con el hallazgo concreto (qué
pantalla, qué dato, qué se ve mal) y sin el paso a paso de un fallo de
seguridad en el repo. Pendiente de su lado: `/api/auth/nativo`. Pendiente de
Michael: revisar los textos de permiso de cámara y fotos (`app.json`).

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

La sesión, si tocaste `src/sesion/`:

```bash
node ../scripts/banco-pruebas.mjs && npm run prueba:api; node ../scripts/banco-pruebas.mjs borrar
```

Cada pantalla se ve en el navegador (config `app-catalogo`, puerto 8090) con
servidor simulado: `/catalogo`, `/catalogo-entrada`, `/catalogo-datos`,
`/catalogo-cuestionario`, `/catalogo-verificacion?estado=…`,
`/catalogo-cuenta?estado=reservar|reservada|abierta|…`,
`/catalogo-mesa?estado=revision|sin-reserva|sin-mesa|cerrada|abierta|movimiento|pasada|valorada`,
`/catalogo-perfil`.

Instalar siempre con `npx expo install`. Las pruebas usan los tipos de Node y
la app no: por eso tienen su propio `tsconfig`. Un `Buffer` en `src/` compila
en las pruebas y revienta en Hermes.
