# Aro Club — Entrega 3

Lo nuevo y lo modificado **después de la entrega 2**. Lee antes `HANDOFF.md` y `entrega 2/HANDOFF-2.md`: siguen vigentes salvo lo que aquí se corrige.

| Archivo | Estado |
|---|---|
| `Aro Club - Datos base.dc.html` | **NUEVO** · F3. Nombre, trato, nacimiento, género y teléfono. |
| `Aro Club - Mi mesa.dc.html` | **NUEVO** · F10 la revelación + F11 valorar, bloquear y reportar. |
| `Aro Club - Cuestionario.dc.html` | **MODIFICADO** · tres preguntas cambian de pantalla. |
| `Aro Club - Mi perfil.dc.html` | **MODIFICADO** · seis secciones, datos base editables. |
| `Aro Club - Entrar.dc.html` | **REHECHO** · contraseña + Apple + Google. Seis estados. |

---

## 1 · F3 · Datos base — bloqueante para el reparto

**Sin esta pantalla el reparto no puede aplicar dos de sus restricciones.** No había ninguna que pidiera fecha de nacimiento ni género, así que el spread de edad de 10 años y el balance de género no tenían de dónde salir.

Cuatro pasos: nombre + trato, nacimiento, género, teléfono.

**Va entre el cuestionario y la verificación de identidad.**

Reglas:

- **Nada de `input type="date"`.** Trae el calendario del sistema, en inglés y en formato mm/dd. La fecha son tres campos propios, en orden **día → mes → año**, con los meses como rejilla de pastillas abreviadas (ene, feb, mar…). Con nombres completos no cabe en una pantalla de móvil.
- **Menores de 18 se bloquean** con el aviso de que puede ser un error de tecleo.
- **Prefijos de móvil venezolano válidos: `412`, `414`, `416`, `422`, `424`, `426`** más siete cifras. El `+58` es fijo, no se escribe.
- El resumen final dice **quién ve cada dato**. Solo el trato es visible para la mesa.

Campos a persistir:

```json
{
  "nombre": "Daniela Pérez",
  "trato": "Daniela",
  "nacimiento": "1992-03-14",
  "genero": "mujer",
  "telefono": "4241234567"
}
```

Códigos de género: `mujer · hombre · no-binario · sin-decir`. Por código estable, como todo lo demás.

## 2 · F10 · Mi mesa — la revelación

La pantalla del jueves a las 12:00. **Es la única del producto que se usa de pie en la calle**, así que va en **AAA (7:1)**, no en el AA del resto. Tiene tokens de texto propios (`#33513F` secundario, `#2C4A38` cuerpo, `#C5D8CA` sobre verde, `#6E340F` en el sello) precisamente por eso: los del sistema son AA y aquí no bastan.

Tres estados, hoy por hash (`#cerrada`, `#abierta`, `#pasada`) y por el botón DEMO:

- **Cerrada** — cuenta atrás al jueves 12:00. Nada más.
- **Abierta** — número de mesa a 150px, sitio, dirección, cómo llegar, «voy tarde», los cinco nombres.
- **Pasada** — F11: valorar, bloquear, reportar.

**Lee la asignación ya persistida.** No la calcula al abrirse.

### F11 · Después de la cena

Dos caminos **independientes**, y esto no es cosmético:

- **Bloquear** es silencioso y personal. No se notifica nunca. Puede ser por pura química.
- **Reportar** acusa de romper una regla y lo lee una persona. Pide **sobre quién** y **qué pasó**; sin las dos no se envía.

Reglas que hay que respetar:

1. **Enviar la valoración no puede cerrar el acceso a reportar.** Son hermanos, no anidados.
2. **Reportar a alguien lo bloquea automáticamente**, y se avisa **antes** de enviar: «Al enviarlo, Gabriela deja de coincidir contigo para siempre. No se le avisa de que fuiste tú.»
3. **Ese bloqueo queda fijado.** La fila no vuelve a ser alternable: pasa a «Bloqueada por tu reporte». No se puede deshacer con un toque lo que se prometió «para siempre».
4. Los cinco motivos salen de las reglas de la mesa del legal.

## 3 · Cuestionario — tres preguntas cambian de pantalla

Siguen siendo **17 en cinco pantallas**, con los mismos grupos. Solo se movieron tres:

| Pregunta | Antes | Ahora | Motivo |
|---|---|---|---|
| `momento` | 1 · Tu contexto | 2 · Cómo eres en la mesa | Es la más íntima y llegaba antes de que el usuario diera nada. Va junto a `romance`, que es su pareja natural. |
| `actividades` | 2 · Cómo eres en la mesa | 3 · De qué hablas | No describe cómo eres en una mesa: describe qué haces. |
| `dieta` | 4 · Qué buscas y cuánto | 5 · Logística | Es operativa pura: condiciona el restaurante, no lo que buscas. |

Reparto de peso: **4 / 4 / 3 / 3 / 3** en vez de 4 / 4 / 2 / 4 / 3.

**La cifra del cierre se deriva del array `pantallas`**, no está escrita a mano. Si se añade o quita una pregunta, el texto se actualiza solo. No vuelvas a poner un número fijo ahí.

## 4 · Mi perfil — seis secciones

Ahora es espejo exacto del cuestionario, más los datos base arriba:

```
0 · Datos base           trato, nombre, nacimiento, género, teléfono
1 · Tu contexto          arraigo, sector, empleador
2 · Cómo eres en la mesa momento, rol, motivo, romance
3 · De qué hablas        temas, evitar, actividades
4 · Qué buscas y cuánto  planes, peso, gasto
5 · Logística            zonas, días, dieta, idiomas
```

Antes faltaban `empleador`, `actividades` y `planes`: se respondían y no había dónde verlos.

**Todo es editable, incluidos los datos base.** El nombre y la fecha de nacimiento cambian lo que se compara contra la cédula, así que en producción editarlos debería exigir reverificación — decide si lo bloqueas tras verificar y dilo en la fila.

El titular sale de `trato`, no es una cadena fija.

## 5 · Acceso — las tres vías

**El enlace mágico se cae como forma de entrar.** Con contraseña, Apple y Google la cuarta vía es superficie extra, y la recuperación de contraseña ya es un enlace mágico con otro nombre: existe igual, en un solo sitio.

### Jerarquía

Apple y Google arriba como iguales, contraseña debajo. **Tres accesos, un solo nivel de énfasis** — la regla 10 prohíbe tres primarios.

### La cuenta se crea al cerrar el cuestionario

El acceso se elige al terminar las 17 preguntas, no antes: es cuando ya hay algo que guardar. Contraseña mínima de ocho caracteres.

### Estados de `Entrar`

`inicio` · `correo` · `recuperar` · `otroCorreo` · `relay` · `entrando`

**`recuperar` exige correo válido antes de confirmar el envío.** No se puede afirmar «te mandamos un enlace» sin dirección: es la ruta donde el usuario ya está bloqueado. Sigue vigente §1 de la entrega 2 — no mandes correo antes de comprobar que la cuenta existe.

### `otroCorreo` — Google devuelve otra dirección

Registro con `daniela@trabajo.com`, Google devuelve `daniela@gmail.com`. **No es un error.** Se ata la cuenta a la sesión, no al correo, así que no se pierde nada. La pantalla lo dice y deja elegir a cuál escribir, con el motivo explícito: ahí llega el correo del jueves con la mesa. Cambiable después desde el perfil.

### `relay` — Apple con «Ocultar mi correo»

Apple devuelve `k2m9x@privaterelay.appleid.com`. **Hay que pedir correo de contacto en el momento**, no después: si el usuario desvincula Aro desde los ajustes de su iPhone, el reenvío muere y se pierde el canal — en un producto donde el correo del jueves *es* el producto. La pantalla lo explica sin culpar a nadie y deja claro que su correo real sigue oculto para nosotros.

Guardar entonces dos campos: el `sub` de Apple como identidad y el correo de contacto como canal. Nunca uno solo.

## 6 · Recordatorio de la entrega 2

Sigue vigente §5.1: **elimina los botones `DEMO ·` de Mi cuenta, Mi perfil, Mi mesa y Datos base** al conectar datos. Búscalos por `etiquetaDemo` y `ciclar`.

Y las dos fotos de Wikimedia y el legal siguen abiertos.
