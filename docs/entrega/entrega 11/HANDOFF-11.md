# Entrega 11 · Landing v4

Una segunda landing, **no un reemplazo**. Se monta junto a la v3, en su propia ruta, y queda lista para un A/B que **todavía no hay que montar**.

La v4 nace de una prueba con una usuaria real. Su queja literal: «demasiado que leer», «no sé si son cuatro pasos o cinco», «me repites otra vez las cuatro foticos», «lo de los planes no me quedó claro».

---

## 1 · Qué cambia, y por qué importa para el test

**El defecto que la disparó:** las cuatro categorías salían **dos veces** en la v3 —hero y sección de planes, mismos archivos y mismas etiquetas—. No se parecían: eran idénticas.

**Cinco cambios estructurales:**

1. **Hero sin polaroids.** Foto a sangre y, en la primera pantalla, qué es, para quién y cuánto cuesta: «8 USD la plaza · dos minutos · sin tarjeta».
2. **Los cuatro pasos suben al segundo lugar** y son el **único bloque numerado** de la página. Antes competían con siete listas de igual peso visual.
3. **Reconocimiento sin párrafos:** seis fotos y seis titulares. Unas 600 palabras fuera.
4. **Las categorías, una sola vez.**
5. **Precio rehecho:** un 8 grande, qué cubre dentro, el pack como línea secundaria, y el consumo como aviso — ya no como tercera tarjeta con forma de plan.

Y la cuenta atrás apunta **al cierre del martes**, no a una mesa: es verdad aunque la fecha no llene.

---

## 2 · El contrato de datos NO cambia

Esto es lo que hace el test barato: **ambas landings escriben exactamente el mismo payload.**

```json
{ "v": 2, "correo": "…", "ciudad": "caracas",
  "arraigo": "volvio", "zonas": ["mercedes"],
  "dias": ["jue"], "temas": ["cocina","viajes"] }
```

Mismos códigos estables, mismo quiz de cuatro preguntas, mismas reglas de §11 del HANDOFF-10, mismo desvío de leads de fuera de la ciudad. **No dupliques el endpoint ni el esquema.**

Lo único que hay que añadir es **de qué variante vino el lead**.

---

## 3 · Lo único que hay que añadir: el campo de variante

```
lead.variante   "v3" | "v4"
```

Se escribe **con el correo, en el primer guardado**, no al final del quiz: quien abandona en la pregunta 2 también tiene que quedar atribuido.

Por ahora **la v4 lo escribe siempre como `"v4"`, y la v3 como `"v3"`**. No hace falta ninguna lógica de reparto: cada página sabe cuál es.

Con eso el experimento se puede encender más adelante sin tocar el esquema ni volver a desplegar las landings.

**Nada más de A/B en esta entrega.** No montes asignación de tráfico, ni cookie de variante, ni panel de métricas: lo definimos cuando decidamos arrancar el test.

## 3.1 · Dónde vive mientras tanto

En una ruta propia —`/v4` o similar— accesible pero no enlazada desde ningún sitio. La v3 sigue siendo la landing pública y no se toca.

## 4 · Riesgos concretos

**Las dos fotos de Wikimedia** siguen cargando en remoto, en las dos versiones. Wikimedia desaconseja el enlace directo: si lo cortan, se caen en las dos a la vez. Sustituir por foto propia antes de que la v4 vea tráfico real.

**El parallax del hero** usa `requestAnimationFrame` con listener pasivo y se desactiva con `prefers-reduced-motion`. Si lo tocas, mantén las dos cosas.

**Las once reglas del sistema siguen vigentes**, y la de los 44px la comprobé en esta página.

---

## 5 · Archivos

```
Aro Club - Landing v4.dc.html
support.js
fotos/   (ocho, las mismas de la v3)
```

La v3 no se toca.
