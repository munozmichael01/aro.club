# Aro Club

Seis desconocidos verificados, una cena curada por semana en Caracas, 7 USD
pagados en bolívares. Next.js 15 App Router · TypeScript strict · Supabase ·
Vercel Pro.

Las pantallas son ficheros estáticos `.dc.html` en `public/`, servidos por
rutas limpias en `next.config.ts`, con el runtime DCLogic de `public/support.js`
(`<x-dc>`, `<sc-for>`, `<sc-if>`). Design entrega pantallas en
`docs/entrega/entrega N/`.

## Hay una app, y comparte fichero con la web

`app-mobile/` (Expo, React Native), con su propio `CLAUDE.md`. **Nunca `App/`**:
en el Mac colisiona con `app/` y Next la toma por su carpeta de rutas.

Lo que comparten vive en **`public/reglas.js`**, y lo cargan los tres: el
navegador con un `<script>`, el servidor vía `src/lib/reglas.ts`, y la app
leyéndolo con Metro sin copiarlo. Dentro:

```js
AroReglas.PUERTA / ORDEN_PUERTA   // las 4 preguntas de antes de tener cuenta,
                                  // cada opción como par [texto, código]
AroReglas.partesDe(iso, zona)     // día, número, mes y hora de una fecha
AroReglas.ZONA · vozDe · COCINAS · valido · filtrar · PRECIO_USD
```

Si un texto o una lista tiene que estar en los dos sitios, va ahí. Una copia
en la app es la misma forma de fallo que este repo ya ha pagado tres veces con
la web, con un sitio más donde diverger.

Cuando algo lo pide la app, el cambio del servidor es **aditivo**: un campo
nuevo en una respuesta, nunca uno que cambie de forma.

---

## Antes de cada push

```bash
npx tsc --noEmit && node scripts/comprobar-cuestionario.mjs
```

El primero porque el CI lo exige y el dev server no caza errores de tipos. El
segundo porque compara las opciones del cuestionario con el catálogo de la
base, y ese descuadre no falla nada visible: la respuesta se pierde al guardar
y la persona sigue adelante creyendo que quedó.

**No** correr `npm run build` con el dev server vivo: corrompe `.next` y
produce un 500 fantasma.

### Nunca un bucle esperando a un comando que puede pedir login

Prohibido `until … npx vercel …; do sleep …; done` y cualquier variante. Ha
pasado **dos veces**, desde dos sesiones distintas: la sesión del CLI caduca,
`vercel ls` deja de listar y pide autorización de dispositivo, y el bucle la
vuelve a pedir cada diez segundos. La primera vez fueron cuarenta y cinco
horas y unas dieciséis mil peticiones; la segunda, veinte pestañas abiertas en
el navegador de Michael.

Un `until` sin tope convierte un fallo de sesión en una inundación. Si hace
falta esperar a un despliegue: una comprobación, y si no está lista, decirlo y
seguir. Nunca un bucle sin número máximo de vueltas.

Y **nunca `vercel login`**. Es lo que borra `auth.json` cuando el flujo no se
completa, y a partir de ahí todo vuelve a pedir autorización. El token vive en
`VERCEL_TOKEN` en el `~/.zshrc` de Michael y el CLI lo lee solo. Si un comando
falla por sesión: se dice y se para.

---

## Antes de tocar un enum, una constante o un esquema

Esto no es higiene, es la causa del último fallo grave. Se añadió `extranjero`
al enum `rootedness_t` porque la pantalla lo mandaba y la columna lo rechazaba
— cuando la entrega 7 lo había **retirado a propósito**, dejando escrito el
motivo en su propia migración. La pantalla era lo que estaba viejo.

```bash
git log -S'<el valor>' -- supabase/migrations/   # ¿quién lo puso y por qué?
```

1. **Leer la migración que creó lo que vas a cambiar.** El porqué está escrito
   ahí. Un valor retirado a propósito parece un valor que falta.
2. **Añadir un valor a un enum no es aditivo si alguien lo quitó antes.** Es
   deshacer una decisión.
3. Cuando la pantalla y la base no concuerdan, **la vieja suele ser la
   pantalla**, no el esquema.

---

## El cuestionario guarda por posición

En `public/Aro Club - Cuestionario.dc.html`, `OPC` tiene las opciones como
pares `[texto, código]` en **una sola lista**, y `COD` se deriva. Antes eran
dos listas emparejadas solo por el índice, y reordenar una guardaba la
respuesta equivocada —«Depende del momento» archivado como «lleva la
conversación»— sin error, sin validación fallida y sin verse en ninguna
pantalla.

**Nunca separarlas otra vez.** Un código `null` es una opción que a propósito
no es respuesta (hoy solo «Cualquier zona de la ciudad», que marca las demás).
El catálogo autoritativo está en la tabla `questions`; el comprobador vigila
que no se separen.

---

## Las pantallas son ficheros sueltos, y eso tiene un precio

Los `.dc.html` de `public/` se sirven **tal cual**, por reescrituras de
`next.config.ts`. Next no los renderiza: son ficheros estáticos con una ruta
limpia delante. Se compró a propósito —lo que entrega Design es exactamente lo
que se sirve, sin traducción de por medio— y se paga con esto:

**No hay un `<head>` compartido.** Nada de lo que declara Next les llega: ni
`metadata.icons`, ni fuentes, ni etiquetas de SEO. Lo común vive en diecinueve
sitios. El favicon de Vercel estuvo tres semanas en todas menos la landing por
esto, y el SEO tuvo que escribirse a mano por lo mismo.

Lo que no se puede unificar, **se vigila**: `comprobar-cuestionario.mjs` ya
comprueba seis listas duplicadas, el favicon entre ellas. Antes de meter algo
nuevo al `<head>`, o va en las diecinueve o va al comprobador. Preferiblemente
las dos.

**Y no lanzan excepción cuando se rompen.** Un `</div>` fuera de su `<sc-if>`
hace que el navegador reanide en silencio: el pie del cuestionario —Atrás y
Continuar— estuvo semanas sin pintarse y el capturador de errores no tenía nada
que avisar, con razón. Al tocar markup anidado, mirar el resultado en el
navegador, no solo el diff.

## El día de una cena no lo decide ningún reloj local

Ni el del servidor ni el del navegador. `getDay()`, `getDate()`, `getMonth()`
y `getHours()` son la hora de la máquina que ejecuta, y una cena del **sábado
3 a las ocho de la noche de Caracas es medianoche del domingo 4 en Madrid**.

Ha mordido dos veces, en los dos lados:

- **En el servidor**, donde Vercel corre en UTC: el panel y las fechas de
  «se borra el» decían un día de más. Se arregló con `src/lib/fechas.ts`.
- **En el navegador**: Mi cuenta pintaba diez fechas con el reloj de quien
  mirara. A quien estuviera fuera de Venezuela le decía otro día. Lo encontró
  el agente de la app comparando su pantalla con la web desde Madrid.

```js
AroReglas.partesDe(iso, zona)   // día, número, mes, hora — en la zona de la ciudad
AroReglas.diaDe(iso, zona)      // solo el día
AroReglas.horaDe(iso, zona)     // solo la hora
```

`zona` es `zonaHoraria`, que viaja **junto a cada fecha** en `/api/proxima`,
`/api/mi-mesa` y `/api/mi-cuenta` desde que existe `cities.timezone`. Nunca en
la raíz de la respuesta: una persona puede tener una cena en Caracas y otra en
otra ciudad.

`comprobar-cuestionario.mjs` lleva la cuenta de las apariciones que quedan,
pantalla por pantalla, y falla si alguna sube. Quedan **cuatro por migrar**
—Operación, Pago, Mi mesa, Cancelar—; las demás miran fechas de **nacimiento**,
que no llevan hora ni zona, y ahí el `Date` vale.

Cuidado al clasificar una como «es un nacimiento»: Mi perfil estaba en esa
lista y su `getDate()` era el HISTORIAL DE CENAS. Quien cenó el 29 leía «30 de
agosto» en su propio historial.

---

## Una sola verdad sobre qué le falta a alguien

`src/lib/embudo.ts`: `correo → preguntas → contacto → cuenta → verificación`.
Lo consumen **seis** sitios —`/api/mi-cuenta`, `/api/cuenta`,
`/api/cuestionario`, `/api/datos-base`, `/api/mi-perfil` y `/auth/callback`— y
antes vivía escondido dentro de uno. Ninguna pantalla lleva su propia lista de
lo que falta; preguntan aquí.

De ahí sale la regla que más se ha pagado: **el nacimiento va primero de todo,
porque es la puerta de los 18 y no se rechaza a nadie después de diecisiete
preguntas.** Generalizada: no dejes que alguien invierta esfuerzo antes de la
puerta que puede rechazarlo.

### Y una sola sobre qué pasa al entrar

`src/lib/trasEntrar()` cruza el lead por correo, crea el perfil y detecta el
«entré con otro correo». La llaman las **tres** puertas:

| | |
|---|---|
| `/auth/callback` | Google en el navegador. Responde con redirecciones. |
| `/api/auth/nativo` | Apple y Google en la app. Responde JSON con el `paso`. |
| `/api/cuenta` | Correo y contraseña, con lead (web) o sin él (app). |

Lo que NO está ahí, a propósito: canjear el código y comprobar que el correo
viene **verificado por el proveedor** —cada puerta lo hace a su manera y es la
condición que impide que quien controle una dirección se quede con la cuenta
de quien la usó— y a dónde se va después, que la web resuelve con una URL y la
app con una pantalla.

`/api/auth/nativo` **no recibe tokens de Google ni de Apple**: la sesión viaja
en la misma cookie que el resto y quién es lo dice Supabase. Y es idempotente,
porque la app la reintenta al arrancar si murió entre el login y la llamada.

**Lo que decide el camino en `/api/cuenta` es quién llama, no si hay lead.**
Escribirlo al revés hizo que quien dejó su correo en la web y luego se daba de
alta en la app recibiera «te faltan 17 preguntas», que ahí no significa nada.

**La atribución vive en dos sitios y hay que llevarla.** `waitlist.source`
para quien aún no tiene cuenta y `profiles.source` para quien ya la tiene.
Durante meses la segunda no existía: todo el que entraba directo con Google no
tenía atribución ninguna.

---

## Correos: los que anuncian y los que acusan

`scheduled_emails` tiene un índice único `(profile_id, kind, event_id)` y
**solo cubre los que ANUNCIAN algo una vez**: `abrimos_zona`, `recordatorio`,
`fecha_cancelada`. Lo que no esté en esa lista se puede repetir, y tiene que
poder.

Cubría todo, y por eso Michael canceló, volvió a reservar y canceló otra vez
sin recibir el segundo correo: `encolar` devolvió «repetido» y nadie se
enteró. Meter `booking_id` en el índice no lo arregla —una reserva se
REACTIVA, así que la misma fila sirve para las dos cancelaciones—. Un choque
en un correo **imprescindible** ahora grita en los registros.

**`sent_at` no significa entregado**, significa que Resend lo aceptó. Lo que
pasó después se consulta con `provider_id`, que es el id que devuelve Resend
y que durante meses se tiraba: cuando alguien decía «no me llegó» no había con
qué preguntar.

**Todo lo que no es imprescindible sale con `List-Unsubscribe`** y su
`List-Unsubscribe-Post` de un clic, que apunta a `/api/baja-correos/un-clic`.
Sin esa cabecera Gmail empuja a Promociones. El enlace lleva SIEMPRE el token
firmado, también para quien tiene cuenta: lo pulsa el cliente de correo, sin
sesión. Los imprescindibles no la llevan a propósito — se mandan aunque la
persona esté de baja, así que ofrecer apagarlos sería ofrecer algo que no
ocurre.

**Probar un cron que encola es MANDAR correos.** No hay staging, esta base es
la de producción y `/api/cron/correos` la recorre cada quince minutos. La llave
de Resend del `.env.local` es inválida, lo que engaña: en local no sale nada
porque lo manda producción. `/api/cron/cierra` y `/api/cron/encuesta` aceptan
`?seco=1`, que calcula sin escribir. Cualquier cron nuevo que encole nace con
su pasada en seco.

### Las push viajan en la misma fila

No hay cola de push. Se mandan desde `despacharPendientes`, con los MISMOS
datos que acaba de usar el correo y el mismo `send_at`, y el resultado se
escribe en `scheduled_emails.push_at` / `push_motivo`. Una segunda cola serían
dos ideas de cuándo se avisa a alguien.

De ahí hereda lo que costó construir: el índice de «uno por persona y fecha»,
las preferencias ya miradas al encolar, y los imprescindibles. Quien se dio de
baja de los correos tampoco recibe push: pidió que dejáramos de escribirle.

Solo **siete tipos** tienen copy (`copyDe` en `src/lib/push.ts`); el resto no
vibra ningún teléfono, a propósito — una push que no aporta es la que hace que
se apaguen todas.

**Una fila se marca enviada solo si llegó a algún teléfono vivo.** Con el
único token muerto queda `push_motivo = 'token_muerto'`, no «enviada».

Y como en el correo, `push_at` no significa entregado: significa que Expo la
aceptó. `push_ticket` guarda `[{t: ticket, k: id del token}]` —atado a SU
token, porque alguien puede tener dos teléfonos y dar de baja el equivocado no
es algo que se deba adivinar— y `push_recibo` lo que dijo Expo después.

**El recibo se lee en una pasada POSTERIOR**, no al mandar: Expo tarda
minutos en tenerlo, y pedirlo en el mismo segundo devuelve un hueco. Lo hace
`leerRecibos()` dentro del mismo cron de correos, que ya pasa cada cuarto de
hora. Ahí es donde aparece el `DeviceNotRegistered` de quien desinstaló la
app, y ahí se da de baja su token.

---

## Base de datos

- **El proyecto es `qdydmklrbsdemzvjsldo`.** Las herramientas MCP de Supabase
  apuntan a otro proyecto (`nrcqljqsbagdvjtbwysa`) y **no se usan nunca**.
  Todo va por la CLI (`npx supabase db push`) o REST con la llave de servicio.
- **No hay staging.** Ese Supabase es producción y `push` a `main` despliega a
  Vercel. La contraseña de la base no se pega en el chat.
- RLS por defecto deniega. `SUPABASE_SERVICE_ROLE_KEY` nunca llega al
  navegador. La única puerta pública es la vista `v_fechas_publicas`.
- Recon antes de escribir: `grep` en `scripts/`, `supabase/migrations/`,
  `docs/handoff/`. Nunca inventar datos de referencia ni esquemas paralelos, y
  preservar los IDs canónicos.

---

## Cómo se verifica

**En el navegador, con una cuenta desechable, no leyendo el código.** Los
fallos que han importado —el borrado en Storage, los crons parados, los correos
con el logo roto, la aprobación que no aprobaba— eran invisibles en el código y
evidentes al usarlo.

- **El repositorio es público.** Ninguna contraseña en un fichero. Aquí había
  una —la de la cuenta demo— a la vista de cualquiera.
- Panel de operación: se entra con una cuenta de rol `admin`. Michael tiene
  dos; la demo que vivía aquí se borró. `node scripts/cuenta-demo.mjs` la
  repone si hace falta, y `borrar` la quita: eso último estuvo roto mucho
  tiempo porque **diez columnas apuntan a `profiles(id)` sin `on delete`** y
  una cuenta de operación las llena todas. Se suelta la FIRMA y no se borra la
  fila: que la cuenta que aprobó una cédula fuera de prueba no significa que
  esa persona no esté verificada.
- `scripts/banco-pruebas.mjs <modos>` crea una cuenta con el estado que se le
  pida: `lista`, `verificada`, `mesa`, `revelada`, `cenas`, `purgada`,
  `borrar`. Un modo que no exista **falla diciendo cuáles hay**: se tragaba el
  primer argumento en silencio y anunciaba «lista» sobre una cuenta desnuda,
  lo que costó una tarde de pruebas.
- **Probar como el desconocido**, no con una cuenta que arrastra estado. Una
  cuenta de pruebas con lead previo escondió un 403 en todos los guardados del
  cuestionario, y detrás había tres fallos más. La campaña entra por ahí.
- Nunca dar algo por cerrado sin haberlo ejecutado. Si algo no se pudo probar,
  decirlo.

---

## Producto: lo que no se negocia

- **No se limitan las reservas.** Se apunta quien quiera; el reparto sienta por
  afinidad y quien no entra va a la lista de espera. El cupo del local no
  restringe la distribución: el local es una elección estratégica y se cambia.
- **Sin verificar no hay puesto.** El candado va en `/api/reservar` **y** en
  `/api/pago`: reportar el pago es lo que aparta el puesto. Es la regla que
  sostiene que cinco desconocidos se sienten con alguien.
- **Las mesas se cuentan sobre verificados**, nunca sobre el total filtrado. Y
  cuando total y verificados difieren, se dice.
- La validación de la IA se le pide al dueño del dato, no a operación.
- **Quién vino lo marca operación, no el usuario.** Pedirle a quien acaba de
  cenar que diga quién faltó es cobrarle un trabajo nuestro. Por lo mismo, la
  encuesta de después no clasifica persona por persona: no volvemos a juntar a
  la misma gente —el veto es de tres meses— así que un «sí repetiría con X» no
  se puede usar. El único dato aplicable es el negativo, y va como salida
  opcional, no como tarea.
- Las escalas se guardan **más = mejor**, siempre, y la conversión desde el
  índice de la pantalla vive en **una sola función del servidor**. En la
  pantalla «Excelente» es el índice 0: guardar el índice tal cual deja la mejor
  mesa como la peor sin fallar nada.
- El cuestionario acepta **dos sesiones**: la de cuenta primero —quien entra con
  Google ya está identificado y no se le pregunta nada— y el token de lead como
  respaldo. Nunca fabricar un lead para quien ya tiene cuenta.
- **Escribimos en venezolano:** celular y no móvil, computadora y no ordenador,
  estacionamiento y no aparcamiento.
- Nunca quitar funcionalidad, ni del diseño ni del código: el resultado es un
  superset. Componentizar en vez de duplicar markup.
- Implementar los `.dc.html` de Design **fielmente** —pasos, estados, copy—, y
  contrastar cada pantalla con su maqueta antes de darla por hecha. Sin emojis
  genéricos: iconos SVG del sistema.

---

## Correo

Resend (región EU) desde `hola@aro.club`, plantillas en
`src/lib/correos-plantillas/`. El asunto sale del `<title>`. La envoltura del
correo va del **mismo color** que la tarjeta: dos cremas distintos se ven como
un marco blanco.

`encolar()` manda al momento además de dejarlo en la cola; el cron recoge lo
programado y lo que falle. Un acuse que contesta a algo que la persona acaba de
hacer no puede tardar un cuarto de hora — no se lee como una cola, se lee como
que no funcionó.

---

## Al trabajar

- Responder y alinear **antes** de implementar. No editar un entregable en
  medio de un intercambio, solo al cerrar todos los puntos.
- Verificar los criterios de aceptación **paso a paso**, nunca de corrido.
- Desplegar lo cerrado y verificado sin volver a pedir permiso.
- Commit y push juntos.
- No ser complaciente: vigilar el secuenciado, no solo la solución.
- Correo, cuentas, Google y Apple van al **final**.
- **Probar contra producción con una cuenta desechable, y borrarla.** No hay
  staging: eso no es excusa para no probar, es el motivo de limpiar después.
- **Decir lo que no se pudo probar.** El ida y vuelta de Google no se puede
  comprobar sin una cuenta de Google: se deja verificado el resto, se dice, y
  lo confirma Michael con un clic.
- Cuando un hallazgo venga de fuera —del agente de la app, de un revisor—,
  **verificarlo en el código antes de arreglarlo**. Varias veces era cierto y
  más grande de lo que decía; alguna, la causa estaba en otro sitio.
