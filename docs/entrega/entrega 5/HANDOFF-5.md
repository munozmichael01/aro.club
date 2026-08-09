# Aro Club — Entrega 5

**El perfil que ve operación**, más el sistema al día y dos ajustes de coherencia.

Lee antes `HANDOFF.md`, `HANDOFF-2.md`, `HANDOFF-3.md` y `HANDOFF-4.md`. Todos siguen vigentes.

| Archivo | Estado |
|---|---|
| `Aro Club - Perfil miembro.dc.html` | **Nuevo.** El perfil de un miembro visto desde operación. |
| `Aro Club - Sistema v3.dc.html` | **Muy cambiado.** 30 KB → 46 KB. Ahora incluye los primitivos que antes listaba como pendientes. |
| `Aro Club - Mi cuenta.dc.html` | Ajuste de jerarquía. |
| `Aro Club - Verificacion.dc.html` | Un carácter. |

Todo lo demás está igual que en tu copia. No vuelvas a bajarlo.

---

## 1 · Perfil miembro — nueva pantalla

Es la ficha que abre operación desde la cola de verificaciones y desde el tablero de mesas. Tres estados por hash: `#gabriela` (verificada), `#ricardo` (en revisión), `#renata` (sin verificar).

### 1.1 La vuelta depende del origen

Se llega desde dos sitios y el botón de volver lo dice: «Volver a la cola» o «Volver al reparto». No pongas un genérico.

### 1.2 Lo que operación ve y lo que no

Tres campos llevan chip **`USO INTERNO`**: cédula, correo y teléfono. Se ven aquí y **nunca** en producto de miembro.

Un campo lleva chip **`NO SE LE ENSEÑA`** y no muestra su valor: `romance`. El cuestionario promete que esa respuesta no se enseña jamás, y eso incluye a operación. Sale la pregunta, no la respuesta.

`empleador` lleva la misma marca por la misma razón: el cuestionario promete que no se muestra a nadie. Se usa para no sentar a dos de la misma empresa, no para enseñarlo.

### 1.3 Las respuestas salen de la lista real

Las diecisiete preguntas se muestran con **su texto literal** y **las opciones exactas** del cuestionario. Nunca escritas a mano ni parafraseadas: `'20 a 35 USD'`, no `'Presupuesto medio'`.

Y esta distinción importa porque el dato llega al anfitrión de la mesa:

| Valor guardado | Se muestra |
|---|---|
| `[]` en pregunta opcional | **Sin responder** |
| `['Ninguno, hablo de todo']` | Ninguno, hablo de todo |

No responder y responder que nada le molesta son dos hechos distintos. Que se leyeran igual hacía que alguien diera por buena información que nadie dio.

---

## 2 · Sistema v3 — al día

Cuando lo entregué, listaba ocho primitivos como «lo que falta». **Ya existen todos** en las pantallas posteriores, así que la fuente de verdad mentía. Ahora están documentados con sus estados: pestañas, modal, confirmación destructiva, tarjeta de evento, tablero de mesas, subida de archivo, área de texto y traspaso por QR.

También entraron las inconsistencias que fuimos corrigiendo a mano y que no estaban escritas en ningún sitio:

- **Los dos terracotas.** `#C0662F` para trazos, anillos y titulares grandes. `#8F4515` para texto pequeño sobre crema. `#6E340F` para texto pequeño sobre fondo terracota.
- **El aro de selección** es el mismo en única, múltiple y ficha: 20px, relleno `#A0511F` con ✓. La ficha no cambia de ancho al marcarla.
- **Los recuadros de foto** usan `#456352`, un solo token.

Si algo del sistema y una pantalla no coinciden, gana el sistema.

---

## 3 · Mi cuenta y Verificación

**Mi cuenta**: el grid de atajos colgaba visualmente de «Mis planes». Ahora va separado y con título propio, **«Tu cuenta»**.

**Verificación**: un carácter, sin efecto funcional.

---

## 4 · Dos reglas nuevas

Van a la lista de las once anteriores:

12. **Las opciones que se muestran salen siempre de la lista real de la pregunta.** Nunca literales escritos a mano. Es como se desincronizan producto y datos.
13. **Un solo paso siguiente por pantalla.** El bloque de estado vive en el inicio y no se repite en el perfil: dos primarios compitiendo no son dos oportunidades, son una decisión rota.

---

## 5 · Lo que sigue abierto

- **Términos y privacidad siguen siendo el borrador.** Necesitan abogado.
- **Dos fotos de la landing** cargan de Wikimedia: «conoces la ciudad» y «vienes de visita».
- **Los cinco correos** siguen en revisión. No los montes.
