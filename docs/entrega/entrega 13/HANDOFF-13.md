# Entrega 13 · Respuesta al feedback: estado deshabilitado, correos y números

Cierra los cinco puntos que levantaste. Tres están resueltos en archivo; dos son respuestas y una es una limitación que no puedo arreglar desde aquí.

---

## 1 · El botón deshabilitado: `#456352`

**Tu valor, y elegiste bien.** Está en el DS con su ratio medido: 4,88 sobre el relleno al 13%.

Y encontré la mitad que faltaba: **sobre verde oscuro el token es `#C5D8CA`**, porque ahí `#7E9A8B` daba 3,1. Lo tenía mal en tres pantallas.

```
Deshabilitado sobre crema  → texto #456352 · fondo rgba(27,81,56,.13)
Deshabilitado sobre verde  → texto #C5D8CA · fondo rgba(250,243,228,.16)
```

Corregidos los once sitios con un tercer valor, en ocho archivos. Ya no hay tres.

**La regla que faltaba escribir:** un botón apagado sigue siendo texto que alguien necesita leer, porque dice qué falta para poder pulsarlo. Lo que baja es el fondo, no la tinta. Está en §04 del DS.

### Sobre si hay más divergencias

Las busco yo. No es tu trabajo distinguir descuido de intención, y este caso demuestra que a veces yo mismo no sé cuál de los dos es. Cuando encuentre algo, va en su entrega.

---

## 2 · Los correos

### 2a · Las dos plantillas ya existen

```
09-restablecer-clave.html      ← el enlace que hoy se genera y se tira
11-abrimos-zona.html           ← el aviso del interruptor del perfil
```

Y otras dos que también faltaban:

```
10-verificacion-rechazada.html ← la foto no sirve, repite solo esa
12-fecha-cancelada.html        ← la cancelamos nosotros, no el miembro
```

**Son doce**, no ocho. Y todos con la tipografía real: Young Serif se carga y cae a Georgia **negrita** donde el cliente no la soporta, que es lo más parecido a sus astas gruesas.

### 2b · Variante, no plantilla aparte

El correo dice «esto es lo que falta». Que un paso esté tachado es un **estado** de ese mensaje, no otro mensaje.

Y tu cambio de disparo —seis horas después, solo si se paró— es mejor que lo que yo había diseñado. Mandarlo en el momento de dejar el correo era escribirle a alguien que está en la pantalla siguiente haciendo justo eso.

### 2c · El paso 1, reescrito

Tenías razón en las dos cosas: el número era falso y el tono era todo coste.

> **Termina tu perfil**
> Diez preguntas más: de qué hablas, qué comes, qué prefieres esquivar. Es lo que hace que tu mesa no sea al azar.

Y aproveché el paso 2, que tenía el mismo defecto:

> **Verifica tu identidad**
> Cédula y una selfie. Es la razón por la que los otros cinco se atreven a sentarse contigo.

Antes decía «sin esto no se puede reservar» — una condición nuestra donde cabía un beneficio suyo.

### 2d · Sí hace falta, y no es una bienvenida

Es un **recibo**. En un producto donde todo pasa por correo, no tener dónde buscar es perder la cuenta: si olvida con qué dirección se registró, la recuperación va a un sitio que no recuerda haber usado.

Una línea, sin pasos ni botón grande: «tu cuenta está lista, entras por aquí», con el correo visible. Lo diseño en la próxima tanda.

---

## 3 · El runtime: no puedo arreglarlo, y tu diagnóstico es correcto

`support.js` **no es un archivo que yo escriba**, y no existe una versión sin el compilador dentro. No puedo servir las pantallas precompiladas desde aquí.

Tu lectura del problema es exacta: Babel compilando en un teléfono con conexión irregular en Caracas es inaceptable para gente real.

**La salida es tuya:** compila en el build y sirve el resultado. Mis `.dc.html` son la **fuente de diseño**, no el artefacto de producción — trátalos como un Figma que se lee, no como el archivo que se despliega.

Si te sirve que los entregue de otra forma —el marcado y los tokens por separado, o los estilos extraídos—, dime cuál y cambio el formato de entrega.

---

## 4 · Los datos inventados eran marcadores, los tres

Ninguno intencionado. Y el de Cancelar era el peor de los tres: **la fecha de otra persona en la pantalla donde alguien renuncia a su puesto.**

### Convención desde ahora

Todo dato de ejemplo va en **un solo bloque al principio de la lógica**, con este comentario:

```js
// ─── DATOS DE EJEMPLO · no son copy, se sustituyen por datos reales ───
const EJEMPLO = { … };
```

**Si está fuera de ese bloque, es copy definitivo.** Con eso no tienes que adivinar, y yo tengo un sitio único que revisar antes de entregar.

---

## 5 · Los números canónicos

Hoy el catálogo tiene **17 preguntas · 14 obligatorias · 4 de ellas en la portada · más 5 datos personales**.

| Dónde | Qué lee la gente | Se deriva de |
|---|---|---|
| Landing | «cuatro preguntas, dos minutos» | las 4 de portada |
| Cuestionario | «1 de 10» | obligatorias que quedan |
| Mi cuenta y perfil | «14 preguntas» | obligatorias totales |
| Perfil completo | 19 | 14 + 5 datos base |
| Correo 01 | «diez preguntas más» | obligatorias que quedan |

**Las opcionales nunca se cuentan.** Contarlas hace que quien las salta se quede en 82% para siempre, y la etiqueta «Opcional» invita justo a eso.

Deriva los cinco del catálogo. El día que cambie, cambian solos.

---

## 6 · Archivos

```
Aro Club - Sistema v3.dc.html      ← token deshabilitado, regla escrita, escala de la v4
Aro Club - Pago.dc.html            ← deshabilitado
Aro Club - Operacion.dc.html       ← deshabilitado
Aro Club - App miembro.dc.html     ← deshabilitado, sobre verde
Aro Club - Mi cuenta.dc.html       ← deshabilitado
Aro Club - Datos base.dc.html      ← deshabilitado
Aro Club - Cuestionario.dc.html    ← deshabilitado
Aro Club - Entrar.dc.html          ← deshabilitado, sobre verde
Aro Club - Verificacion.dc.html    ← deshabilitado
Aro Club - Mi perfil.dc.html       ← deshabilitado
Aro Club - Landing v4.dc.html      ← deshabilitado, sobre verde
Aro Club - Correos.html + correos/ ← los doce
```

**Ojo:** la landing v4 lleva solo el cambio de color del deshabilitado. Si ya la tienes cableada, aplica los dos valores a mano en vez de reemplazar el archivo.

Y el DS documenta ahora la escala de la v4: **Display XL y Cifra display existen solo en captación**, no dentro del producto.
