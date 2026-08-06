# Aro Club — Entrega de diseño, fase 1

Cinco pantallas navegables entre sí. Abre cualquier `.dc.html` en el navegador; no necesitan build.

| Archivo | Qué es |
|---|---|
| `Aro Club - Sistema v3.dc.html` | Sistema de diseño. Tokens, tipografía, tratamiento fotográfico, botones y el kit de pregunta, todo interactivo. **Fuente de verdad.** |
| `Aro Club - Landing v3.dc.html` | F1. Captación: hero, reconocimientos, cómo funciona, planes, cuidado, zonas, precio, FAQ y registro. |
| `Aro Club - Agradecimiento.dc.html` | Confirmación con la pregunta opcional de arraigo. Destino del enlace por correo. |
| `Aro Club - Cuestionario.dc.html` | F4. Diecisiete preguntas en cinco pantallas, con guardado incremental. |
| `Aro Club - Legal.dc.html` | Reglas de la mesa, términos y privacidad. **Borrador: tiene que revisarlo un abogado.** |
| `fotos/` | Siete imágenes ya servidas en local. |
| `support.js` | Runtime de las pantallas. No editar. |

---

## 1 · Lo que cambió respecto al brief

**§F1 ya no es solo el correo.** El registro es correo y, de inmediato, cuatro preguntas: arraigo, zonas, días y temas. Son el mínimo para un emparejamiento posible: sin zona y sin día no hay mesa.

El correo se guarda **antes** de la primera pregunta. Quien abandona en la pregunta 2 sigue capturado.

**El agradecimiento ya no es donde se pregunta el arraigo** si vino de la landing. Es confirmación más traspaso al cuestionario.

**El cuestionario oculta lo ya respondido.** Si las cuatro de la landing están, se saltan y se avisa en pantalla.

---

## 2 · Datos: leer esto antes de tocar nada

### 2.1 Las opciones se guardan por código, nunca por posición ni por texto

Reordenar opciones o reescribir una etiqueta **no puede** cambiar la respuesta de nadie. Cada opción lleva su código estable.

```
arraigo   volvio · se-quedo · interior · extranjero · visita

zonas     mercedes · palos-grandes · altamira · chacao · rosal · castellana ·
          sebucan · chuao · bello-monte · cafetal · naranjos · trinidad · hatillo

dias      mar · mie · jue · vie · sab · sab-md · dom-md

temas     cocina · viajes · cine · musica · libros · deporte · negocios ·
          tecnologia · arte · arquitectura · ciencia · historia · psicologia ·
          politica · economia · crianza · salud · humor

ciudades  caracas · valencia · maracaibo · margarita · barquisimeto ·
          merida · puerto-la-cruz · otra
```

La landing muestra 10 zonas y el cuestionario 13; la landing muestra 10 temas y el cuestionario 18. **Las listas no comparten orden.** Por eso el código es obligatorio.

Al montar `GET /api/questions`, cada opción devuelve su `value` explícito. Nunca su índice.

### 2.2 Payload de la landing

En el prototipo vive en `localStorage` bajo `aro-landing`. Sustitúyelo por tu endpoint:

```json
{
  "v": 2,
  "correo": "persona@correo.com",
  "ciudad": "caracas",
  "arraigo": "volvio",
  "zonas": ["mercedes", "altamira"],
  "dias": ["jue", "vie"],
  "temas": ["cocina", "viajes"]
}
```

Se escribe **dos veces**: al validar el correo (solo `correo` y `ciudad`) y al terminar las cuatro preguntas (todo). El primer guardado es el que salva al lead que abandona.

### 2.3 Ciudades fuera de Caracas — esto es nuevo, léelo

Al final de la sección de zonas hay un bloque aparte, «¿No vives en Caracas?», con siete ciudades. **Hay que guardar ese dato**: es la única fuente de demanda por ciudad que vamos a tener, y decide dónde se abre la siguiente.

Reglas:

- El bloque de ciudades y el de zonas son **independientes**. Marcar una ciudad no toca la selección de zonas ni al revés. Cada uno tiene su propio botón.
- Si hay ciudad marcada y **cero zonas de Caracas**, ese lead es «de fuera»: tras el correo **no pasa por el cuestionario**. Va directo a un cierre propio.
- Motivo: la pregunta de zonas son las diez de Caracas. Obligar a alguien de Maracaibo a marcar una zona de Caracas contamina la densidad por zona, que es justo el número que decide dónde abrir.
- Quien no marca ninguna ciudad se guarda como `caracas`.
- El cierre para gente de fuera no ofrece completar perfil ni verificar identidad. No hay nada que completar hasta que exista ciudad.
- **No prometas fecha en ningún copy.** La frase acordada es: abrimos donde se junta suficiente gente.

Para el panel de operación hace falta un contador de leads por ciudad, igual que el de densidad por zona.

### 2.4 Guardado incremental del cuestionario

Vive en `localStorage` bajo `aro-cuestionario` con `{pantalla, r, empleador, fin}`. Al volver, retoma la pantalla y muestra el aviso. Al pasarlo a servidor, guarda por pregunta y no por pantalla.

Hay una migración escrita en `componentDidMount` que normaliza payloads viejos (por índice o por etiqueta) a códigos. Cuando todo esté en la API, se puede borrar.

---

## 3 · Reglas que no se pueden romper

1. **Un solo indicador de selección** en todo el producto: aro de 20px que se rellena de terracota `#A0511F` con ✓. Única, múltiple y ficha, iguales. La ficha no cambia de ancho al marcarla.
2. **Ningún control por debajo de 44px** de alto. Cuando el diseño pide algo visualmente más pequeño, se usa margen negativo.
3. **Young Serif no tiene itálica.** `em { font-style: normal }` está en el reset de las cuatro pantallas. El énfasis es color o peso.
4. **Terracota clara `#C0662F` nunca lleva texto pequeño.** Para texto pequeño va `#8F4515`. Sobre verde oscuro, el secundario es `#9CBBA6`, no `#566A5D`.
5. **Nunca fotos de perfil.** No existe avatar con foto real en ninguna pantalla.
6. **La respuesta sobre citas no se muestra jamás**, en ningún estado del producto.
7. **Un solo tratamiento fotográfico:** `grayscale(.24) contrast(1.16) saturate(.74) brightness(.9)` más velo verde, siempre en marco polaroid.
8. **Nada dice «algo salió mal».** Correo ya registrado no es un error.

---

## 4 · Lo que falta y hay que resolver

**Bloqueante para producción**

- Términos y privacidad son un borrador. Necesitan abogado antes de publicar.
- Dos fotos siguen cargando en remoto desde Wikimedia (las de Caracas en «conoces la ciudad» y «vienes de visita»). Wikimedia desaconseja el enlace directo. Sustituir por foto propia.
- `POST` real de correo y respuestas. Hoy es `localStorage`.

**Diseño pendiente, fase 2**

- Verificación de identidad en web. En móvil, cámara. En escritorio, **traspaso por QR**: el escritorio muestra el código, la foto se hace con el teléfono y el escritorio avanza solo. Sin app.
- Área de miembro en web: home con el siguiente paso, próxima cena, reserva, perfil y mis respuestas.
- Primitivos que aún no existen y el sistema ya lista: área de texto, subida de archivo, cámara, pestañas, modal, confirmación destructiva, tarjeta de evento, tablero de mesas.

**Decidido**

- La categoría deportiva se llama **Movimiento** e incluye hiking, running, pilates y ciclismo.
- Sin app por ahora. Web para captar y web para el área de miembro. La app se replantea cuando la revelación de las 12:00 y los avisos del día de la cena pesen más que el coste de instalación.
