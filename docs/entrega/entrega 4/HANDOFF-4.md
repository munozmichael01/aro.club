# Aro Club — Entrega 4

**La transacción y la operación.** Tres pantallas: cobrar, cancelar y el panel con el que se opera cada fecha.

Lee antes `entrega/HANDOFF.md` (contrato de datos de captación) y `entrega/entrega 2/HANDOFF-2.md` (área de miembro). Siguen vigentes.

| Archivo | Qué es |
|---|---|
| `Aro Club - Pago.dc.html` | Cobro en bolívares. Cuatro estados: elegir, pagando, comprobante, rechazado. |
| `Aro Club - Cancelar.dc.html` | Cancelación con la regla de las 24 h. |
| `Aro Club - Operacion.dc.html` | Panel interno. Tablero de mesas, cola de verificaciones y pagos del día. |

**No incluidos en esta entrega:** los cinco correos transaccionales. Están diseñados y en revisión; llegan aparte.

---

## 1 · Aclaración sobre la entrega 3

Dije que `Mi mesa` se había corregido después de armar la entrega 3. **Era falso.** Los dos archivos son idénticos (29.560 bytes) y la copia que ya tienes contiene la cuenta atrás al jueves y el «sobre quién» del reporte. No rehagas nada.

---

## 2 · Pago — lo que no puede hacerse de otra forma

### 2.1 La tasa se congela al confirmar, no al reservar

El precio se muestra en dólares como referencia y **se cobra en bolívares a la tasa BCV del día**. La pantalla muestra las tres cifras: 8,00 USD, la tasa, y el total real en bolívares.

Guarda con cada pago: `monto_usd`, `tasa_aplicada`, `monto_bs`, `momento_tasa`. Sin la tasa aplicada no se puede conciliar ni devolver bien.

El total visible tiene que recalcularse si la tasa cambia entre que abre la pantalla y confirma. Nunca cobres un número distinto del que vio.

### 2.2 El orden de los métodos no es estético

Pago móvil primero, transferencia después, tarjeta al final. Es el orden por tasa de éxito real en Venezuela, no alfabético ni por preferencia nuestra.

La transferencia **no confirma al instante**: entra como pendiente y se concilia. La pantalla lo dice antes de elegirla, no después.

### 2.3 El rechazo no es un error genérico

Cuando el banco rechaza: no se cobró nada, **el puesto sigue apartado quince minutos**, y se ofrecen tres salidas concretas (otro método, límite diario, escribirnos). Esa retención de quince minutos hay que implementarla de verdad — si no, la pantalla miente.

### 2.4 El comprobante

Referencia, fecha, zona, método, tasa aplicada y monto en las dos monedas. Se manda también por correo. Es lo que el usuario necesita si su banco no cuadra.

---

## 3 · Cancelar — la regla de las 24 h

Con **más de 24 horas** antes del encuentro: el crédito vuelve entero.
Con **menos**: se pierde, porque la mesa ya está armada y el puesto ya no se puede rellenar.

Dos cosas:

- El estado de la pantalla **se deriva del tiempo real que falta**, no de un parámetro. Muestra cuánto margen queda y qué implica antes de que la persona confirme.
- Cancelar libera el puesto y **rehace el reparto de esa fecha** si aún no se ha publicado. Si ya se publicó, la mesa se queda en cinco: no metas a nadie de la lista de espera a última hora.

Quien no aparece sin avisar dos veces queda fuera de reservas un mes (regla 3 del legal). Ese contador es distinto de las cancelaciones y hay que llevarlo aparte.

---

## 4 · Operación — el panel

Tres vistas en una sola pantalla, con contadores en las pestañas.

### 4.1 Mesas — todo se deriva del pool

Ni una cifra de esta vista está escrita a mano. Del pool de apuntados salen las mesas, las señales y las métricas. Replícalo así: **si una cifra se puede calcular, se calcula.**

La aritmética que tiene que cuadrar siempre:

```
apuntados − sin_verificar = elegibles
elegibles ÷ 6            = mesas (truncado)
elegibles − mesas × 6    = en espera
```

Los sin verificar **no entran al reparto**. Es la razón por la que verificar bloquea reservar.

**Las tres señales por mesa** salen de las restricciones del brief y se calculan del grupo:

| Señal | Regla | Marca en terracota si |
|---|---|---|
| Balance de género | 3/3, tolerancia 4/2 | diferencia > 2 |
| Rango de edad | spread máximo 10 años | max − min > 10 |
| Empresa | nadie de la misma | hay repetida |

Una mesa con cualquiera de las tres en rojo se marca `REVISAR`. Las demás, `CUADRA`. Trabajar por cuenta propia (`Estudio propio`, `Freelance`, `Oficina propia`) no cuenta como empresa repetida.

### 4.2 Nada se publica solo

El reparto **propone**. Una persona confirma. Y al confirmar, los correos **no salen**: quedan programados para el jueves a las 12:00 en punto. La revelación es el producto; adelantarla lo rompe.

«Volver a repartir» tiene que reordenar de verdad, respetando exclusiones y las tres restricciones.

### 4.3 Lista de espera

Los que sobran del reparto no van a una mesa incompleta. Se les avisa el mismo día y **su crédito no se toca**. La pantalla dice cuántos faltan para llenar la siguiente mesa, que es el dato que decide si conviene empujar esa fecha.

### 4.4 Verificaciones

Documento y selfie lado a lado, los datos extraídos, y los avisos donde algo no encaja. Aprobar o rechazar en un toque.

- Cada decisión queda **con el nombre de quien la tomó**. Acceso nominal y registrado.
- Documento y selfie **se borran a los 90 días** de aprobar. Después solo queda la marca de que ocurrió y quién la aprobó.
- Un rechazo tiene que poder explicarse. Hoy la pantalla no pide motivo: **añádelo** cuando lo montes, porque la persona necesita saber qué repetir.

### 4.5 Pagos

Tasa BCV del día visible en cabecera. Confirmados, pendientes de conciliar y devueltos. Las transferencias pendientes son trabajo manual real: dale a operación una forma de marcarlas conciliadas.

---

## 5 · Reglas que siguen en pie

Las ocho del `HANDOFF.md` y las tres del `HANDOFF-2.md`. Tres que esta entrega toca de cerca:

1. **Terracota clara `#C0662F` nunca lleva texto pequeño.** Para texto pequeño, `#8F4515`; sobre fondo terracota, `#6E340F`.
2. **Ningún control por debajo de 44px.**
3. **Nada dice «algo salió mal».** Un pago rechazado dice qué pasó y qué hacer.

Y una nueva:

4. **Ninguna cifra derivable se escribe a mano.** Ni en la interfaz ni en el copy. «Cinco mesas» y «faltan cuatro» salen del cálculo, no de un literal — es como se desincronizan los paneles.

---

## 6 · Quitar antes de producción

`Pago` y `Operación` no llevan botón DEMO, pero **`Pago` avanza sola a comprobante tras 1,3 s** y `Operación` tiene el pool de 32 personas incrustado. Los dos se sustituyen por datos reales.

Sigue en pie lo del `HANDOFF-3.md` §5.1: quitar los botones `DEMO ·` de `Mi cuenta`, `Mi perfil`, `Mi mesa` y `Entrar`.

---

## 7 · Lo que sigue abierto

- **Términos y privacidad siguen siendo el borrador.** Necesitan abogado y ya se capturan correos reales.
- **Dos fotos de la landing** siguen cargando de Wikimedia: «conoces la ciudad» y «vienes de visita». Pendiente de foto propia.
- **Los cinco correos** llegan en la siguiente entrega.
- **Motivo de rechazo** en la cola de verificaciones: falta diseñarlo.
