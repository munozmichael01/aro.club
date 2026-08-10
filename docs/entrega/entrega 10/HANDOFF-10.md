# Entrega 10 · App del miembro, tasa derivada y conciliación

Incluye la app completa —que no iba en la 9— más las correcciones que señalaste y el cierre del pago en operación.

**Tres cosas tuyas están arregladas:** la tasa, el QR y la regla de congelado del panel. Las tres eran errores míos.

---

## 1 · La tasa: era el mismo fallo que yo te señalé

`62,40` estaba escrita a mano en **cinco archivos** —pago web, app, panel y dos correos—, exactamente el defecto que yo marqué en tu panel. Ahora todo sale de una sola fuente.

```
tasa   756,71 Bs / USD
puesto 8,00 USD
total  6.053,68 Bs
```

Ninguna cifra de esas se vuelve a escribir a mano. **La tasa se congela al reportar, no al confirmar** —entre una cosa y otra pasan horas y se mueve—, y el panel ya no dice lo contrario.

## 2 · QR de 33 módulos

Tenías razón: 21 no aloja una URL con token. Corregido en `Aro Club - Verificacion.dc.html`, con los tres patrones de esquina en su sitio.

Y sobre el selector de hora: hiciste bien en quitarlo. Diseñé dos horas por formato cuando **un evento tiene una** — mezclé el catálogo con la instancia.

---

## 3 · La app del miembro

`Aro Club - App miembro.dc.html`. Recorrido entero: arranque, cuestionario, datos base, crear cuenta, verificación, inicio, planes, pago, mi mesa, después de la cena, cancelar y perfil.

### Navegación

**Tres pestañas: Inicio, Planes, Perfil.** Aparecen solo con sesión y desaparecen en flujos modales (alta, pago, cancelar). Sin barra durante el alta, que era tu recomendación y sigue siendo correcta ahí.

- **Inicio**: el siguiente paso, créditos, estado del perfil y tus reservas.
- **Planes**: filtro por categoría, agenda de fechas y tus reservas.
- **Perfil**: siete filas, todas navegables.

**La flecha atrás recuerda el origen.** El cuestionario y los datos base son a la vez alta y edición: abiertos desde el perfil, vuelven al perfil. En pago retrocede por subfases.

### Pantallas propias de la app

Exclusiones, Avisos, un lector para Reglas y Preguntas, y **Darse de baja**.

---

## 4 · Contrato: tres cosas nuevas

### 4.1 El documento tiene tipo

```json
"datos": { "doc_tipo": "V", "doc": "18442019" }
```

`V` o `E`, elegido por el usuario. El esquema de la 9 asumía V, y hay extranjeros residentes pagando con cédula E: sin ese campo, operación no puede cuadrar su pago móvil.

### 4.2 Notificaciones: cinco claves, dos no desactivables

```json
"notificaciones": {
  "mesa_jueves":  true,   // fijo
  "dia_cena":     true,   // fijo
  "pago_ok":      true,
  "apertura_zona":true,
  "whatsapp":     false
}
```

Los cuatro primeros llegan **encendidos**: es lo que se acepta al crear la cuenta, y ya está escrito en el legal. Los dos fijos no se pueden apagar porque sin ellos el usuario no sabe dónde es.

**WhatsApp va apagado y es un permiso, no una preferencia.** Guárdalo con fecha de activación: es el único dato con implicación legal de este bloque.

### 4.3 Baja de cuenta ≠ cerrar sesión

Borra respuestas, datos y documentos. Devuelve créditos sin usar en siete días. Conserva facturación diez años. No se puede deshacer.

---

## 5 · Validación de formularios

Antes solo se medía la longitud, así que `01012020` y un banco llamado `1` pasaban por buenos. Ahora cada campo tiene su comprobación, en **web y app**:

| Campo | Regla |
|---|---|
| Teléfono | 10 dígitos con +58, 9 con +34 — deriva del prefijo |
| Cédula | 6–9 dígitos, con tipo V/E |
| Banco | mínimo 3 caracteres |
| Referencia | mínimo 4 dígitos |
| Fecha | `DD/MM/AA`, día y mes que existan |
| OTP | 6 dígitos |

El error sale bajo el campo con borde terracota, y **el botón nombra el que falta** en vez de decir «completa los datos». Las barras de la fecha se escriben solas.

Valida en servidor con las mismas reglas: esto es ayuda al usuario, no seguridad.

---

## 6 · La conciliación, en el panel

Pestaña **Pagos**, bloque «Por conciliar» antes del histórico. Cada reporte muestra **lo que dijo el usuario y lo que dice el banco, lado a lado**, con el desajuste en terracota.

Tres casos reales de ejemplo: uno que cuadra, uno con 0,50 USD de diferencia por comisión, y un Bizum sin movimiento —donde la captura es lo único que hay, porque Bizum no da referencia al momento.

Dos acciones: **Confirmar pago** y **No cuadra**. El contador de la pestaña cuenta pendientes, no total.

`no_cuadra` **no libera el puesto**: lo mantiene 24 h para que corrija.

---

## 7 · Correos: ya son ocho

```
01 bienvenida            05 puesto cancelado
02 verificación          06 pago en revisión
03 tu mesa               07 pago confirmado
04 es hoy                08 el pago no cuadra   ← nuevo
```

El 08 no dice «error»: dice que no se cobró nada, que el puesto sigue apartado 24 h y da tres salidas.

Todos con la tasa nueva. **Móntalos ya**, los ocho.

---

## 8 · Archivos

```
Aro Club - App miembro.dc.html   ← nuevo en entrega
Aro Club - Pago.dc.html          ← validación, V/E, tasa
Aro Club - Mi perfil.dc.html     ← darse de baja
Aro Club - Verificacion.dc.html  ← QR de 33
Aro Club - Operacion.dc.html     ← conciliación, tasa
Aro Club - Legal.dc.html         ← avisos, WhatsApp, baja
Aro Club - Correos.html + correos/  ← ocho
```

Las once reglas del sistema siguen vigentes. El botón `DEMO` sigue fuera antes de producción, y en la app hay uno equivalente.

**Una lección de lo de Cancelar:** una pantalla que nadie enlaza es una pantalla que nadie prueba. Las doce de web y las quince de app son alcanzables desde otra.

---

## 9 · Correcciones posteriores al primer corte

Cinco cosas que se arreglaron después de armar la carpeta. Todas van incluidas.

**Teléfono por país.** El validador exigía diez dígitos y el campo de Bizum cortaba a nueve, así que **Bizum era imposible de enviar**. Ahora la regla deriva del prefijo: diez con +58, nueve con +34. Idéntica en web y app — antes divergían.

**El perfil se lee, no se rellena.** «Mis respuestas» y «Mis datos» reabrían el cuestionario o el formulario de alta: para ver una respuesta había que rellenarlo entero. Ahora son listas de pregunta, valor y editar en línea, mismo patrón en las dos versiones.

**Verificación completa en ambas.** Cada versión tenía media: a la app le faltaba el rechazo, a la web el estado «ya verificada» con documento y fecha de borrado. Ahora las dos tienen las cinco fases.

**El perfil completo cuenta los datos base.** En la app el porcentaje contaba solo las catorce preguntas —podía decir 100% y «faltan tus datos base» a la vez—; en la web el sello «Perfil completo» estaba escrito a mano en `true`. Ahora un solo total de diecinueve, derivado, igual en las dos.

**Prefijo duplicado** en el teléfono del perfil web: se normaliza al guardar y al mostrar.

**Para el reparto, lo que importa:** el perfil no está completo sin los cinco datos base, y la fecha de nacimiento se puede corregir desde la app. Sin ellos no hay regla de ±10 años ni balance de género.


---

## 10 · Reparto de Mi cuenta y el perfil

Este bloque nace del diagnóstico de Code sobre «Mis planes», y es correcto: **una lista sin techo en la portada**. Una entrada por cena, para siempre, hundiendo un poco más cada semana lo que hay debajo. Y lo delataba que la fila pasada no hacía nada: lo único que importa de una cena pasada —valorarla— no estaba ahí.

### El criterio

**Lo que tengo que hacer** frente a **quién soy**. Su línea, con un matiz: el historial no es ninguna de las dos, es identidad acumulada, así que va en perfil.

**Inicio / Mi cuenta — altura fija para siempre.** Siguiente paso, valorar si toca, lo próximo y créditos. Nada que crezca.

**Planes — la agenda.** Categorías, fechas y a qué estás apuntado.

**Perfil — todo lo que te describe.** Datos, respuestas, verificación, exclusiones **y tus cenas**.

Los **créditos se quedan en cuenta**: son dinero pendiente de usar, no una descripción tuya.

### Qué cambia en pantalla

**«Mis planes» pasa a «Lo próximo»** y solo lleva lo que tiene fecha por delante. Acotado por diseño: no puedes estar apuntado a más de dos o tres fechas.

**«Pendiente de valorar» es una tarjeta de acción**, no una fila de historial. Vive 48 horas y desaparece sola. Antes valorar solo se alcanzaba escribiendo la URL a mano.

**«Mis cenas» es una tarjeta más** que lleva al perfil, donde vive la lista completa.

### Lo de Code, aceptado

Su arreglo de Mi mesa —que durante 48 h mande la cena pasada y después la próxima— es correcto y era pérdida de datos: quien se apuntaba a la siguiente antes de valorar la anterior perdía la anterior para siempre.

---

## 11 · Reglas de entrada, en una sola tabla

Este mismo fallo apareció cinco veces —la tasa, el total de preguntas, la validación de teléfono, los campos del alta y el teléfono de Datos base—: **dos implementaciones del mismo dato divergiendo**. Estas son las reglas, y son las mismas en web y app.

| Campo | Filtro al teclear | Válido cuando |
|---|---|---|
| Teléfono del perfil | dígitos y un `+` inicial, máx. 16 | 8–15 dígitos, con prefijo del país |
| Teléfono del pago móvil | solo dígitos, máx. 10 | 10 dígitos (es un dato bancario venezolano) |
| Teléfono de Bizum | solo dígitos, máx. 9 | 9 dígitos |
| Cédula | solo dígitos, máx. 9, con tipo `V`/`E` aparte | 6–9 dígitos |
| Día | solo dígitos, máx. 2 | 1–31 |
| Mes | solo dígitos, máx. 2 | 1–12 |
| Año | solo dígitos, máx. 4 | edad ≥ 18 |
| Fecha de pago | dígitos, barras automáticas | `DD/MM/AA` con día y mes reales |
| Referencia | solo dígitos, máx. 6 | ≥ 4 dígitos |
| OTP | solo dígitos, máx. 6 | 6 dígitos |
| Banco | texto libre | ≥ 3 caracteres |
| Código Zelle | mayúsculas, máx. 14 | ≥ 3 caracteres |
| Correo | texto libre | tiene arroba y punto |
| Contraseña | texto libre | ≥ 8 caracteres |

**Dos cosas importan aquí:**

El **filtro al teclear** evita el estado imposible —un año de ocho dígitos, un teléfono con letras— y el **validador** decide si se puede enviar. No son lo mismo y hacen falta los dos.

**El teléfono del perfil admite cualquier prefijo internacional** — hay miembros escribiendo desde fuera, y forzar `+58` los dejaba fuera. En el pago móvil sí es venezolano, porque ahí el teléfono es un dato del banco, no de contacto.

**El prefijo de un dato bancario nunca viaja dentro del valor.** En pago, `V`/`E` se guarda aparte; si el usuario los teclea, se descartan. Así se evitó el `+58 +58 4241234501` que apareció en el perfil.

Valida igual en servidor: lo del cliente es ayuda, no seguridad.
