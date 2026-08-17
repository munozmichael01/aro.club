# Entrega 15 · Gente, y las dos pantallas sin sesión

Tres cosas: la octava pestaña del panel, la baja de correos y la revisión de `/clave`.

---

## 1 · Gente · octava pestaña de Operación

Responde las cuatro preguntas en el orden de tu documento.

**Dónde hay gente suficiente** manda arriba: las ocho zonas con su número de verificados, cruzadas por un filtro de formato. Cada tarjeta dice **SALE**, **FALTA 1** o **VACÍA**, y a cuántas mesas de seis da. Es lo que decide abrir una fecha, así que va primero y en cifras grandes.

**Buscar por nombre**, con los tres atajos semanales al lado y su cuenta.

**El número es la respuesta.** Filtros acumulativos por estado, edad, género, arraigo y formato. **Cada opción dice cuánta gente deja dentro calculado sobre lo ya filtrado**, no en total. Cero no se esconde: la opción se atenúa pero se puede pulsar, y el vacío lo explica —«esa fecha no se puede abrir con la gente que hay hoy»—. La leyenda se compone sola.

**El embudo**, siete escalones, pinchable: filtra la lista al escalón elegido y la leyenda lo nombra.

### 1.1 · Dos campos que el esquema necesita

**`profiles.waitlisted_count`** — cuántas veces se apuntó sin llegar a sentarse. Está en tu lista de «Del histórico» y no existe en la base. Sin él, «se apunta y no entra» devuelve exactamente la misma gente que «tiene créditos y no ha reservado», y son dos preguntas distintas: la segunda es una señal mala **nuestra**.

**Los leads son filas, no una cifra.** `GET /api/operacion/gente` devuelve perfiles y leads en la misma lista, con `estado: 'lead'` para quien solo dejó el correo. Si el primer escalón dice 47, tiene que poder enseñar a esos 47.

### 1.2 · La regla que no se puede romper

**Las mesas se cuentan sobre verificados, nunca sobre el total filtrado.** Quien no está verificada no entra al reparto, así que no puede contar para prometer mesas. Cuando total y verificados difieren, **se dice**: «10 personas, 9 están verificadas y dan para 1 mesa de seis». Sin esto, la misma pantalla da dos respuestas a la misma pregunta —el mapa decía 9 y el titular 10.

### 1.3 · Privacidad

El listado enseña nombre, edad, industria, zonas y recorrido. **Del lead solo el correo enmascarado** (`an•••@gmail.com`); el completo se abre en la ficha, de una en una.

No enseña documento, selfie, teléfono, correo completo, dealbreakers ni apertura romántica. La cédula sigue solo en la cola de verificaciones con enlace firmado.

**Sin exportar y sin envíos**, y lo dice la propia pantalla. Los filtros se aplican en tu ruta, no en el navegador.

---

## 2 · Baja de correos sin sesión

`Aro Club - Sin sesion.dc.html`, estado `BAJA`.

Corta, como pediste: una frase, un botón y la vuelta atrás. **Con deshacer**, y con **enlace caducado** como tercer estado — un enlace de baja que falla en silencio es el problema legal, no el feo.

Una línea que hay que mantener: si algún día se apunta a una mesa, sí le escribiremos ese día, porque ese correo **es** cómo sabe dónde es. Eso no se puede apagar sin apagar la reserva.

**El pie de los correos necesita dos destinos:** con cuenta, a sus ajustes dentro de Mi cuenta; sin cuenta, a esta pantalla con enlace firmado. Hoy los trece correos apuntan a `/cuenta`, que exige sesión — y quien recibe la bienvenida no tiene.

---

## 3 · `/clave` revisada

Estados `CLAVE`, `CLAVE HECHA` y `CLAVE CADUCADA`. Lo tuyo estaba bien; le faltaban tres cosas, y las tres son de contenido:

**De qué cuenta se trata.** Sin el correo en pantalla no se sabe si el enlace es tuyo.

**Qué se conserva** — verificación, créditos e historial. Es el miedo real de quien perdió el acceso, y decirlo cuesta una línea.

**Que se cierra la sesión en los otros dispositivos.** Es lo que hay que decir si alguien pidió el cambio porque le entraron.

Añadí medidor de fuerza **como orientación, no como regla**: ocho caracteres siguen siendo el único mínimo. Bloquear por «fuerza» deja gente fuera de su propia cuenta, que es justo el agujero que cerraste.

Y mantengo el «Ver» aquí aunque en Entrar no esté: escribir a ciegas una contraseña que no se confirma es la vía rápida a quedarse fuera otra vez.

---

## 4 · Archivos

```
Aro Club - Operacion.dc.html      ← octava pestaña
Aro Club - Sin sesion.dc.html     ← nuevo, seis estados
Aro Club - Perfil miembro.dc.html ← destino de la lista, sin cambios
support.js
```

Las once reglas del sistema siguen vigentes.
