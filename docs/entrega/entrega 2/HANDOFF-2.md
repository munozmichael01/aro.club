# Aro Club — Entrega 2: área de miembro

Amplía la entrega 1. Lee **`HANDOFF.md`** primero: el contrato de datos de captación sigue vigente y no se repite aquí.

| Archivo | Qué es |
|---|---|
| `Aro Club - Entrar.dc.html` | F2. Acceso por enlace mágico. Cuatro estados. |
| `Aro Club - Verificacion.dc.html` | F5. Cédula y selfie, con traspaso por QR en escritorio. |
| `Aro Club - Mi cuenta.dc.html` | F6. Inicio: siguiente paso, agenda, reservar, mis planes. Seis estados. |
| `Aro Club - Mi perfil.dc.html` | F13. Datos, respuestas, créditos, exclusiones. |

---

## 1 · Acceso (F2)

Enlace mágico, sin contraseña. Un solo uso, caduca a los 15 minutos.

- **No mandes correo antes de comprobar que existe la cuenta.** Un correo desconocido ve la misma pantalla de «mira tu correo» —no filtramos quién está registrado— pero no se envía nada. Si no, se paga por cada intento de sondeo.
- Limita a 3 envíos por correo y hora.
- Reenviar invalida el enlace anterior.
- Cuando exista app, este mismo enlace abre la app si está instalada. La contraseña se replantea entonces, no ahora.

## 2 · Verificación (F5)

Dos tomas: cédula y selfie. En móvil, cámara directa. En escritorio, **QR**: el escritorio muestra el código, la captura ocurre en el teléfono y **el escritorio avanza solo** al terminar. Sin app.

- El QR caduca a los 10 minutos y es de un solo uso.
- El escritorio necesita canal en vivo para avanzar sin recargar.
- Cédula y selfie se borran a los 90 días de aprobar. Queda solo la marca de que ocurrió y quién la aprobó.
- Estados a soportar: sin verificar, en revisión, aprobada, rechazada con motivo.

## 3 · Reserva — leer con atención

**El usuario se apunta a una FECHA, no a una mesa.** Las mesas no existen al reservar.

1. Se apunta a, por ejemplo, «Cenas · jueves 14 · Las Mercedes», eligiendo hora.
2. La fecha se cierra 48 h antes.
3. **Al cerrar, repartes a todos los apuntados en mesas de seis.** Ese es el paso que hoy no existe y hay que construir.
4. El jueves a las 12:00 en punto, el usuario ve en qué mesa quedó.

Consecuencias:

- El contador de una fecha es **gente apuntada**, no puestos de una mesa. Se muestra «34 apuntados · 6 mesas».
- Por debajo de 6 apuntados la fecha no sale: «4 apuntados · faltan 2 para la primera mesa».
- **La asignación se cierra y se persiste al cerrar la fecha**, no se calcula al abrir la pantalla del jueves. Es prerequisito de F10.
- Cancelar con más de 24 h devuelve el crédito. Con menos, se pierde.

## 4 · Estados de Mi cuenta

Seis, y el orden importa: cada uno tiene un solo paso siguiente.

| Estado | Siguiente paso |
|---|---|
| Perfil incompleto | Terminar las 13 preguntas |
| Perfil completo, sin verificar | Verificar identidad |
| En revisión | Nada. Esperar, sin urgencia |
| Verificada, sin reserva | Reservar puesto |
| Con reserva | Esperar al jueves 12:00 |
| Abierta | Ver la mesa (F10) |

Los atajos del pie reflejan el estado real: «Mi perfil» dice sin verificar, en revisión o verificada; «Mis respuestas» dice cuántas faltan; los créditos descuentan lo reservado.

## 5 · Reglas nuevas de esta entrega

Además de las ocho del `HANDOFF.md`:

9. **Las polaroids de categoría son navegación, no adorno.** Filtran la agenda. Tocar la activa quita el filtro. Las no seleccionadas se desaturan, no se opacan.
10. **Nunca dos primarios en una vista.** En la cabecera, «Entrar» va en texto y «Empezar» en verde.
11. **El copy de reserva dice «puesto», no «apuntarse».** El usuario reserva un puesto; el reparto en mesas es asunto nuestro.

## 6 · Lo que falta y va después

- **F10 · La revelación**, jueves 12:00. En diseño ahora. Depende del reparto en mesas del §3.
- **F11 · Después de la cena**: valorar, bloquear, reportar.
- **F12 · Cancelar reserva.**
- **Pago en bolívares** y su comprobante. Hoy Mi cuenta confirma sin cobrar.
- **Panel de operación** completo.
- **Correos**: bienvenida, enlace mágico, verificación, mesa asignada, recordatorio.
