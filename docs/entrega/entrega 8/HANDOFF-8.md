# Entrega 8 — Locales

Una pantalla. Es el requerimiento de `PARA-DESIGN-journey-y-locales.md` §2.

Lee antes `entrega/entrega 7/HANDOFF-7.md`: sigue vigente entero. Esto solo añade.

| Archivo | Qué es |
|---|---|
| `Aro Club - Locales.dc.html` | Lista, ficha y alta de locales. Tres vistas en un archivo. |
| `support.js` | Idéntico al que ya tienes. |

---

## 1 · De dónde se llega y a dónde va

**Entrada:** desde el panel de operación. Es una **cuarta pestaña**, junto a Mesas, Verificaciones y Pagos. La flecha de vuelta lleva a `Aro Club - Operacion.dc.html`.

**Tres vistas, un archivo.** `#` lista · `#ficha` · `#alta`. Los hashes son de revisión: en producción son rutas.

| Vista | Se llega desde | Sale hacia |
|---|---|---|
| Lista | Pestaña Locales | Ficha (fila) · Alta (botón cabecera) |
| Ficha | Fila de la lista | Lista |
| Alta | Botón «Añadir local» | Lista, con el local ya creado |

---

## 2 · El modelo

Un local tiene:

```
nombre          texto
ciudad          código de ciudad          ← campo, no constante
zona            código de zona
direccion       texto
formatos        lista: cenas | drinks | movimiento | coffee
aforo           entero: mesas de 6 simultáneas
ruido           0 | 1 | 2                  ← se muestra como etiqueta, nunca como número
menu            USD por persona, o null si no tiene menú cerrado
gastoMedio      USD por persona, real, calculado de las mesas que ya cenaron
comision        porcentaje
contacto        nombre + teléfono
foto            la ENTRADA del local
activo          booleano
```

### 2.1 · Un local no se borra nunca

Solo se desactiva. El botón dice **«Dejar de ofrecerlo»**, no «Eliminar». Deja de salir para fechas nuevas; las mesas que ya cenaron ahí y su histórico se quedan intactos.

Borrar un local rompe el histórico de las mesas que pasaron por él, y ese histórico es lo que decide si se renueva.

### 2.2 · El ruido es una etiqueta, no una escala

Se guarda 0-2, se muestra siempre con su texto:

| Valor | Etiqueta | Qué significa |
|---|---|---|
| 0 | Se puede conversar | Una mesa de seis se oye entera sin levantar la voz |
| 1 | Suena | Se conversa, pero hay que acercarse al de enfrente |
| 2 | Suena alto | No sirve para cenas. Solo drinks |

Quien elige sitio para una mesa que viene a conversar no debería traducir una escala.

### 2.3 · El aforo es un tope real

Si un local aguanta dos mesas simultáneas y ya hay dos asignadas esa fecha, la tercera va a otro sitio. El reparto tiene que respetarlo.

### 2.4 · Alta incompleta entra sin activar

El alta pide cinco cosas: nombre, zona, formatos, aforo y ruido. Precios, contacto y foto se rellenan luego desde la ficha. **Hasta que esté completo no se ofrece para ninguna fecha.** Un sitio a medias en un selector es una mesa mal sentada.

---

## 3 · Todo lo derivado, derivado

Ningún número de esta pantalla está escrito a mano, y no puede estarlo:

| Dato | De dónde sale |
|---|---|
| Zonas cubiertas | Zonas distintas entre los locales activos |
| Zonas con un solo sitio | Zonas donde `count(activos) === 1` |
| Aviso de zonas sin cenas | Complemento de las zonas con local activo de cenas. **Nombrar y contar salen del mismo conjunto** |
| Valoración media | Media de los locales con nota, no un literal |
| Encima / en / debajo de la media | Comparado **a la misma precisión que se imprime** |
| Gasto medio por local | De las mesas que ya cenaron ahí |

Las dos últimas tienen historia: la media estaba escrita a mano en tres sitios y ya se había desviado del dato real, y comparar 4,35 contra un 4,4 impreso hacía que un local dijera estar «por encima de la media de 4,4» mostrando 4,4. En la pantalla donde se decide renovar a un proveedor, un número que se contradice deja de servir.

**El empate tiene su propio texto:** «En la media de 4,4. Renovaríamos.» No fuerces a un local a estar arriba o abajo cuando está justo en la media.

---

## 4 · Lo que conecta con el reparto

Esta pantalla no es un CRUD suelto. Alimenta el paso 08:

1. **Sin local activo en una zona, esa zona no puede tener mesa**, aunque haya doce apuntados. El aviso de la lista existe por eso.
2. **El formato filtra:** un local de solo drinks no puede recibir una cena.
3. **El ruido filtra:** ruido 2 no sirve para cenas.
4. **El aforo topa** cuántas mesas simultáneas caben.
5. **El gasto medio cruza con el tramo declarado** por cada persona de la mesa. Recuerda la regla: se elige con **el número más bajo de la mesa**, no con la media.

El punto 5 es el que convierte esta pantalla en producto y no en administración.

---

## 5 · Qué se guarda y cuándo

| Momento | Qué se guarda |
|---|---|
| Al guardar el alta | El local completo, con `activo: false` |
| Al editar un campo de la ficha | Ese campo, al salir del campo |
| Al activar o desactivar | Solo `activo`, con quién y cuándo |
| Tras cada mesa | `gastoMedio` y valoración se recalculan, no se escriben a mano |

Activar y desactivar necesita registro nominal: quién dejó de ofrecer un local y cuándo es una decisión de dinero.

---

## 6 · Reglas nuevas

12. **Un local se desactiva, no se borra.** Su histórico sobrevive siempre.
13. **El ruido se muestra con su etiqueta.** Nunca 1, 2 o 3 en pantalla.
14. **Una cifra y su comparación se calculan a la misma precisión.** Si se imprime con un decimal, se compara con un decimal.
15. **Nombrar y contar un conjunto salen del mismo conjunto.** Nunca se nombra uno y se cuenta otro.

---

## 7 · Lo que falta y depende de ti

- **Foto de la entrada:** hoy es un marcador. Necesita subida real. Va al correo del jueves y a Mi mesa, así que su ausencia se ve.
- **Ciudad:** la pantalla ya la trata como campo. Los datos de ejemplo son de Caracas.
- **Histórico real:** hoy son datos de ejemplo. Sale de las mesas que pasaron por el local.
- **El botón DEMO no existe aquí**, porque los tres estados son vistas y no estados simulados.
