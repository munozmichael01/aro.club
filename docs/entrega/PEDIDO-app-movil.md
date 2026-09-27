# Pedido · La app de Aro Club para Android y iOS

Para un agente especialista en desarrollo de aplicaciones móviles. Este
documento es el encargo completo: qué es el producto, qué existe ya, qué tiene
que hacer la app, qué no puede hacer, y cómo se da por terminada.

Lo escribe quien mantiene el backend y la web. Todo lo que aquí se afirma sobre
el sistema está comprobado contra el código, no recordado.

---

## 1 · Qué es Aro Club

Seis desconocidos verificados, una mesa, una vez por semana, en Caracas. La
persona no elige con quién se sienta ni dónde: **nosotros armamos la mesa y
reservamos el sitio, y ella aparece**. El puesto cuesta 7 USD, que se pagan en
bolívares a la tasa oficial del día. Lo que consuma en la cena va aparte y lo
paga en el restaurante.

El producto tiene un momento central y todo gira en torno a él: **la
revelación**. A mediodía del día de la cena se abre de golpe el sitio, la
dirección, el número de mesa y quiénes son los otros cinco. Ni un minuto antes.
Antes de esa hora la persona sabe la fecha y la zona, y nada más.

Que no haya nada que elegir **no es una carencia, es el producto**. No hay
perfiles que mirar, no hay fotos de nadie, no hay chat previo, no hay a quién
elegir. La primera conversación es en la mesa. Cualquier propuesta que añada
«ver quién viene», «elegir mesa» o «chatear antes» está proponiendo otro
producto.

---

## 2 · Por qué una app, y qué NO tiene que hacer

La web ya funciona y cubre el recorrido entero. La app se hace por tres razones
concretas, y conviene tenerlas presentes porque son las que deciden qué es
importante:

1. **La notificación de la revelación.** Es el único momento del producto que
   exige llegar a la persona en un instante concreto. Hoy se resuelve por
   correo, y un correo a mediodía de un sábado compite con todo lo demás. Una
   notificación push es la razón de más peso para que esto sea una app y no una
   web guardada en la pantalla de inicio — sobre todo en iOS, donde la web
   tiene el push muy limitado.
2. **La cámara para verificar.** Cédula y selfie. En la web funciona, pero en
   móvil nativo se puede guiar mucho mejor —encuadre, enfoque, reintento— y esa
   pantalla es hoy uno de los puntos donde se cae gente.
3. **Existir en las tiendas.** Para un producto que le pide a alguien cenar con
   cinco desconocidos, estar en la App Store y en Google Play es una señal de
   que detrás hay algo real.

**Lo que la app NO tiene que hacer:** no es un rediseño. No se reordena el
recorrido, no se renombran los pasos, no se «mejora» el copy. Si algo parece
mal, se dice y se decide; no se cambia por cuenta propia.

---

## 3 · Lo que ya existe, y hay que reutilizar

**No se construye un backend nuevo.** El que hay está en producción, con datos
reales, y es la fuente de verdad. La app es otro cliente del mismo sistema.

- **Backend**: Next.js 15 (App Router) desplegado en Vercel.
- **Base de datos y auth**: Supabase (Postgres + Auth + Storage). Hay **un solo
  proyecto de Supabase y es producción**; no existe staging.
- **Correo**: Resend, desde `hola@aro.club`.
- **Web**: `https://aro.club`.

### Autenticación

Supabase Auth, con dos caminos vivos:

- **Correo y contraseña.**
- **Google** (OAuth). La ruta del servidor es `/api/auth/google`.
- **Apple está construido pero apagado** a propósito: exige cuenta de
  desarrollador de pago. **Ojo, esto es un requisito de tienda, no una
  preferencia**: si la app iOS ofrece entrar con Google, Apple **exige** ofrecer
  también «Sign in with Apple». Hay que contarlo con eso desde el principio.

En la app conviene usar el SDK de Supabase para la plataforma en vez de
reimplementar el flujo de sesión. La sesión del móvil no tiene por qué ser la
cookie que usa la web.

### Las APIs que ya existen

Todas bajo `https://aro.club/api/`. Las que necesita la app, por orden de uso:

| Ruta | Qué hace |
|---|---|
| `POST /lead` | Guarda el correo y las cuatro preguntas de entrada |
| `GET/POST /cuestionario` | Las diecisiete preguntas del perfil, por código |
| `GET /questions` | El catálogo de preguntas y sus opciones |
| `GET/POST /datos-base` | Nombre, cómo te llaman, nacimiento, género, teléfono |
| `POST /entrar`, `POST /clave`, `POST /salir` | Sesión |
| `GET/POST /verificacion` | Subida de cédula y selfie, y su estado |
| `GET /mi-cuenta` | El estado completo de la persona: en qué punto está, créditos, próxima fecha, agenda |
| `GET /proxima` | La próxima fecha abierta, sin sesión |
| `GET /zonas` | Las zonas activas |
| `POST /reservar` | Reserva con crédito |
| `GET/POST /pago` | Datos para pagar y reporte del pago |
| `POST /cupon` | Canjea un código y confirma el puesto sin cobrar |
| `GET /mi-mesa` | Antes de la revelación: hora y zona. Después: sitio, dirección, mesa y comensales |
| `GET/POST /mi-perfil` | Ver y editar las respuestas |
| `POST /cancelar` | Soltar el puesto |
| `GET/POST /despues` | La encuesta del día después |
| `GET/POST /mis-avisos` | Qué notificaciones quiere recibir |

**Si la app necesita algo que no está, se pide y se añade al backend.** No se
hacen consultas directas a Postgres desde el móvil saltándose estas rutas: las
reglas de negocio viven en ellas.

### Storage

Los documentos de verificación van a un bucket **privado** de Supabase
(`verificaciones`). No son públicos ni lo pueden ser. Se borran a los 90 días de
aprobarse.

---

## 4 · El recorrido completo

Es el mismo de la web y hay que respetarlo paso a paso. Entre paréntesis, la
ruta web equivalente, que sirve como referencia visual.

1. **Entrada** (`/`). Deja su correo. Después, cuatro preguntas rápidas:
   arraigo, zonas, días y temas de conversación.
2. **Datos personales** (`/datos`), en cuatro pasos: nombre y cómo quiere que le
   llamen en la mesa; fecha de nacimiento; género; teléfono. Al terminar, crea
   la cuenta con contraseña o con Google.
3. **El cuestionario** (`/cuestionario`), diecisiete preguntas en cinco
   pantallas: contexto, cómo es en la mesa, de qué habla, qué busca y cuánto
   gasta, y logística. **Guarda por respuesta, no al final**: quien lo deja a
   medias vuelve donde estaba.
4. **Verificación** (`/verificacion`). Cédula y selfie. Lo revisa una persona
   del equipo, no un algoritmo. Queda en revisión hasta que alguien lo aprueba
   desde el panel interno.
5. **Inicio** (`/cuenta`). El estado en el que está y el único paso siguiente,
   más la agenda de fechas abiertas.
6. **Reservar**. Si tiene crédito, se confirma en el acto. Si no, va a pagar.
7. **Pagar** (`/pago`). Pago Móvil en bolívares: la app enseña los datos de la
   cuenta y el importe exacto, y la persona **transfiere desde su banco** y
   vuelve a reportar la referencia. También puede aplicar un **código de
   invitación**, que confirma el puesto sin cobrar nada.
8. **Esperar** (`/mesa`). Cuenta atrás a la revelación. Solo se sabe la hora y
   la zona.
9. **La revelación**, a mediodía del día de la cena. Se abre todo.
10. **Después** (`/despues`). Encuesta breve del día siguiente.

---

## 5 · Reglas del producto que no se negocian

Están así por decisiones tomadas, y varias costaron un fallo antes de quedar
escritas.

- **Sin verificar no hay puesto.** El candado está en el servidor (`/reservar`,
  `/pago` y `/cupon`) y la app tiene que reflejarlo **antes**, no después de que
  alguien haya transferido dinero.
- **No se limitan las reservas.** Se apunta quien quiera; el reparto sienta por
  afinidad y quien no entra pasa a lista de espera. Nunca se rechaza a alguien
  por aforo.
- **Nada de elegir.** Ni mesa, ni compañía, ni restaurante.
- **El día de la semana NO se escribe en el código.** Hoy las cenas son en
  sábado; hasta hace dos días eran en jueves, y cambiarlo costó setenta y una
  sustituciones repartidas por toda la web. **Todo lo que hable de un día tiene
  que derivarse de la fecha del evento**, nunca de una constante.
- **La hora de la revelación sale del evento** (`reveal_at`), no de una regla
  escrita en la pantalla. Dos relojes calculándola por su cuenta ya
  discreparon a la vista del usuario.
- **Las escalas se guardan «más = mejor»**, siempre, y la conversión desde el
  índice de la pantalla vive en una sola función del servidor.
- **El cuestionario guarda por código, no por posición.** Reordenar una lista de
  opciones sin tocar sus códigos corrompe respuestas en silencio.
- **Se escribe en venezolano**: celular y no móvil, computadora y no ordenador,
  estacionamiento y no aparcamiento.
- **Nunca se quita funcionalidad.** Si la web hace algo, la app lo hace también.

---

## 6 · El sistema de diseño

Hay que respetarlo. No es un punto de partida a interpretar.

**Colores** (los que sostienen todo, por frecuencia de uso real):

| Uso | Valor |
|---|---|
| Tinta principal, verde muy oscuro | `#14342A` |
| Fondo crema | `#FAF3E4` |
| Verde de marca (acciones, enlaces) | `#1B5138` |
| Terracota (acentos, el punto que destaca) | `#8F4515` |
| Verde medio, texto secundario | `#33513F` |
| Gris verdoso, texto terciario | `#566A5D` |
| Crema de tarjeta, sobre el fondo | `#FFFBF0` |
| Verde claro sobre fondo oscuro | `#9CBBA6` |

**Tipografías**: `Young Serif` para titulares y `Inter Tight` (400/500/600/700)
para todo lo demás. Las dos están en Google Fonts; en la app hay que
empaquetarlas, no cargarlas de la red.

**La marca** es un aro con seis puntos alrededor: cinco del color de la tinta y
**uno en terracota**, que es la persona. Ese sexto punto es el elemento de
identidad y se usa como indicador de carga (el aro gira).

**Nada de emojis genéricos en la interfaz.** Iconos SVG propios del sistema.

**Formas**: esquinas muy redondeadas (22–30 px en tarjetas, botones en cápsula
`999px`), áreas de toque de 44 px como mínimo, y bastante aire.

---

## 7 · Lo específico del móvil

Esto es lo que hay que diseñar de cero, porque en la web no existe o existe a
medias.

### Notificaciones

Son la razón principal de la app. Las que importan:

- **La revelación**, a mediodía del día de la cena. Es LA notificación. Tiene
  que llegar en punto y abrir directamente la pantalla de la mesa.
- **El recordatorio** el mismo día de la cena.
- **La verificación aprobada o rechazada.** Hoy la persona se queda mirando una
  pantalla que dice «en revisión» sin saber cuándo cambia.
- **Abrimos mesa en tu zona.**
- **Tu pago fue confirmado.**

El backend ya tiene una cola de correos con tipos (`scheduled_emails`), y lo
razonable es que las notificaciones cuelguen del mismo sitio en vez de inventar
un segundo calendario que se desincronice. **Esto hay que diseñarlo con quien
mantiene el backend**, no resolverlo por dentro de la app.

Hay una pantalla de preferencias de avisos (`/mis-avisos`) y **dos de ellos no
se pueden apagar** porque sin ellos la persona no sabría dónde presentarse.

### Cámara

Cédula y selfie. Lo que hoy falla en la web y la app debería resolver: la selfie
se envía sin vista previa, así que quien saca una foto mala no puede corregirla.
En la app: guía de encuadre, previsualización, y **«usar esta» o «repetir»** en
las dos.

### Enlaces profundos

Los correos llevan a `/cuenta`, `/mesa`, `/pago`, `/verificacion`. Con la app
instalada tienen que abrir la pantalla equivalente, no el navegador. Universal
Links y App Links sobre `aro.club`.

### Las tiendas

- **El pago NO es un bien digital.** Son 7 USD por un puesto en una cena real,
  en un restaurante real. Eso queda fuera de la obligación de usar compras
  in-app, tanto en Apple como en Google. **Conviene tenerlo argumentado por
  escrito antes de la primera revisión**, porque es el motivo de rechazo más
  probable y el más caro si sale mal.
- **Sign in with Apple** es obligatorio en iOS si se ofrece Google.
- La app pide **cámara** (verificación) y **notificaciones**. Las dos necesitan
  su texto de permiso explicando para qué, en venezolano y sin jerga.
- Hay que declarar el manejo de **documentos de identidad** en las fichas de
  privacidad de las dos tiendas. Es información sensible y las dos preguntan.
- Contenido **+18**: el servicio es solo para mayores de edad.

---

## 8 · Decisiones, tomadas y abiertas

**Ya está decidido:**

- La app es cliente del backend que existe. No se duplica lógica de negocio.
- El diseño es el que hay. No se rediseña.
- Español de Venezuela. Una sola lengua en la v1.
- Solo Caracas en la v1, pero la base ya tiene ciudades: no cablear «Caracas».

**Abierto, y hay que proponerlo con argumentos:**

1. **Nativo o multiplataforma.** Se quiere una recomendación razonada, no una
   preferencia. Pesa a favor de compartir código: el equipo es pequeño y la
   lógica ya vive en el servidor. Pesa en contra: la cámara guiada y el push
   fino son donde más duele una capa de por medio.
2. **Cuánto se reutiliza de la web.** Hay pantallas muy pesadas —el cuestionario
   son diecisiete preguntas con reglas— y quizá alguna se sirva embebida en la
   v1. Si se propone, hay que decir cuál y por qué, y que no se note.
3. **Qué pasa sin conexión.** Mínimo: que la pantalla de la mesa ya revelada
   —dirección incluida— se pueda ver sin datos, porque se consulta llegando al
   restaurante.
4. **Versionado y despliegue.** Cada cambio de las tiendas tarda; el backend se
   despliega varias veces al día. Hay que decir cómo se evita que una app vieja
   se rompa contra una API nueva.

---

## 9 · Cómo se da por terminado

No vale «compila» ni «se ve bien». Los criterios:

1. **El recorrido completo, de principio a fin, con una cuenta nueva y en un
   teléfono de verdad**: correo → cuatro preguntas → datos → cuestionario →
   cuenta creada → verificación → aprobación → reservar → pagar o canjear código
   → esperar → revelación → encuesta. Grabado.
2. **La notificación de la revelación llega a la hora**, en los dos sistemas,
   con la app cerrada, y abre la pantalla correcta.
3. **La cámara**: las dos fotos se pueden repetir antes de enviarlas.
4. **La sesión sobrevive** a cerrar la app, reiniciar el teléfono y estar una
   semana sin abrirla.
5. **Nada cablea el día de la semana.** Se comprueba moviendo la fecha de
   prueba de sábado a martes y viendo que todo lo dice bien sin tocar código.
6. **Se ve bien en el teléfono más pequeño que se soporte** y con el tamaño de
   letra del sistema al máximo.
7. **Las dos fichas de tienda**, con sus textos de privacidad y permisos,
   revisadas antes de subir nada.

---

## 10 · Lo que NO entra en la v1

Para que no se cuele: chat entre comensales, perfiles públicos, ver quién viene
antes de la revelación, valoraciones persona a persona, pago con tarjeta dentro
de la app, invitar amigos a tu mesa, y cualquier forma de elegir con quién te
sientas. Varias de esas cosas no son «para después»: son lo contrario del
producto.

---

## 11 · Lo primero que hay que pedir

Antes de escribir código, se espera:

- La recomendación de arquitectura con sus razones (punto 8.1).
- El plan de notificaciones acordado con el backend (punto 7).
- Un recorrido de pantallas en papel, comparado una a una con la web, señalando
  dónde se aparta y por qué.
- Una estimación con las dependencias de tienda dentro: cuentas de
  desarrollador, revisión y qué pasa si rechazan.

Y una pregunta que hay que contestar antes de empezar: **qué hace la web
cuando exista la app**. Sigue viva, y el recorrido tiene que funcionar entero en
las dos, porque la gente llega por un enlace en un DM y no va a instalar nada
para leerlo.
