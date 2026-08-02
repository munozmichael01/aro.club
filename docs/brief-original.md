# Brief de arranque para Claude Code

Producto de social dining en Caracas. Codename: **MESA**.
Objetivo de este documento: que Claude Code tenga todo el contexto para construir el MVP en dos semanas sin preguntar cada cinco minutos.

Uso sugerido: guardar este archivo como `CLAUDE.md` en la raíz del repositorio. Claude Code lo lee automáticamente en cada sesión.

---

## 1. Qué estamos construyendo

Una PWA que junta a 6 desconocidos verificados en una cena curada, una vez por semana, en el este de Caracas. El usuario se registra, responde un cuestionario de 14 preguntas, verifica su identidad, reserva una plaza, paga por un riel local, y el día del evento recibe el restaurante y su número de mesa.

El público objetivo son personas de 28 a 45 años cuyo círculo social se erosionó por la diáspora venezolana. El posicionamiento no es "conoce desconocidos" sino "reconstruye tu círculo".

**No es una app de citas.** No hay fotos de perfil, no hay swipe, no hay perfiles públicos. Esa ausencia es una decisión de producto, no una funcionalidad pendiente.

---

## 2. Decisiones ya tomadas (no reabrir)

| Decisión | Valor |
|---|---|
| Plataforma | PWA instalable. Nada de app nativa en esta fase |
| Stack | Next.js 15 (App Router) + TypeScript + Supabase + Vercel |
| UI | Tailwind + shadcn/ui |
| Auth | Supabase Auth con magic link por correo. Sin contraseñas |
| Idioma | Español de Venezuela. Todo el copy visible en español |
| Pagos | Conciliación manual asistida. Sin pasarela en el MVP |
| Notificaciones | WhatsApp como canal principal. Push web como refuerzo |
| Matching | Endpoint aparte que lee de Supabase y escribe mesas |
| Modelo de cobro | **Sin decidir.** El esquema soporta evento suelto, packs y suscripción simultáneamente |

Sobre la última fila: no optimizar el checkout para un solo modelo de cobro. La tabla `products` es un catálogo. Todo cobro pasa por `payments`. Los créditos viven en un ledger. La membresía es otra fila. Esa decisión se toma con datos del piloto.

---

## 3. Por qué no hay pasarela de pago

Contexto que hay que entender antes de escribir el checkout:

- Stripe no opera para negocios venezolanos.
- Las tarjetas emitidas en Venezuela suelen estar bloqueadas para compras internacionales.
- Pago Móvil no permite débito recurrente automático: cada cobro exige un token dinámico por SMS que genera el cliente.
- Poolear fondos de usuarios en una cuenta de empresa tiene precedente regulatorio adverso en Venezuela.

**Flujo de pago del MVP:**
1. El usuario elige producto y ve las instrucciones de pago (Pago Móvil en bolívares a la tasa del día, o USDT a una wallet).
2. Declara la referencia de la transacción y sube el comprobante.
3. Se crea un registro en `payments` con status `awaiting_proof`.
4. La reserva queda en `pending_payment` con un `held_until` de 24 horas.
5. Operaciones concilia desde el panel: aprueba o rechaza.
6. Al aprobar, la reserva pasa a `confirmed` y, si el producto era un pack, se acredita el ledger.

Esto es trabajo manual a propósito. A 40 pagos por semana es perfectamente sostenible y evita construir integraciones antes de saber si el producto retiene.

---

## 4. Reglas de negocio que el código debe respetar

**Matching. Restricciones duras, nunca se rompen:**
- Spread de edad máximo de 10 años dentro de una mesa.
- Balance de género 3/3, tolerancia 4/2. Nunca 5/1.
- Dos personas no coinciden dos veces en 6 meses (consultar `pair_encounters`).
- Nunca juntar pares presentes en `exclusions`.
- Nunca juntar dos personas con el mismo `employer`.

**Matching. Función de score sobre mesas completas, no sobre pares:**

| Componente | Peso | Qué mide |
|---|---|---|
| Cohesión | 0.30 | Al menos 2 intereses compartidos por 4 de los 6 |
| Diversidad de industria | 0.25 | Máximo 2 personas del mismo sector |
| Mezcla de arraigo | 0.20 | Al menos 1 `returnee` y al menos 2 `stayed` |
| Balance de energía | 0.15 | 2 o 3 `driver`. Nunca 6 `listener` ni 6 `driver` |
| Novedad de red | 0.10 | Penaliza mesas donde varios ya se conocen |

Los pesos van en la tabla `matching_runs.weights`, no hardcodeados. Cada corrida se audita.

**Ciclo semanal:**
- Inscripción abierta toda la semana.
- Cutoff 48 horas antes del evento (`booking_closes_at`).
- Matching el lunes, ejecutado por operaciones desde el panel.
- Revelación de restaurante y mesa el día del evento a las 12:00 (`reveal_at`).
- Evento a las 19:00. El horario temprano es una decisión de seguridad.
- Feedback se abre a las 23:00 del mismo día.

**Cancelación de evento:** si al cierre hay menos de `min_tables` mesas viables, el evento se cancela y se devuelven créditos o se reembolsa.

**No-show:** primero sin aviso genera advertencia. Segundo, baneo. Se registra en `bookings.status = 'no_show'`.

**Confianza:** un perfil solo puede reservar si tiene `id_document` y `selfie` aprobados en `verifications`. Sin excepciones, ni siquiera para invitados por referencia.

**Privacidad del feedback:** `peer_feedback` nunca es legible por la persona valorada. Esto está en RLS, pero también verificarlo en cada endpoint.

---

## 5. Scope de las dos semanas

### Semana 1

**Bloque A. Fundaciones (día 1)**
- Repositorio Next.js con TypeScript, Tailwind, shadcn/ui.
- Proyecto de Supabase, aplicar `schema.sql`.
- Tipos generados de Supabase con `supabase gen types typescript`.
- Variables de entorno y despliegue en Vercel funcionando desde el día uno.

**Bloque B. Auth y onboarding (días 2 y 3)**
- Magic link por correo.
- Captura de teléfono en formato E.164 con validación venezolana.
- Creación de fila en `profiles` con status `lead`.
- Landing pública con lista de espera que escribe en `waitlist`.

**Bloque C. Cuestionario (días 3 y 4)**
- Render dinámico desde `questions` de la versión activa. Nada hardcodeado.
- Guardado incremental en `answers` (el usuario puede abandonar y volver).
- Al completar, computar `profile_traits` en una función de servidor.
- Barra de progreso. 14 preguntas en 4 pantallas.

**Bloque D. Verificación (día 5)**
- Subida de cédula y selfie a un bucket **privado** de Supabase Storage.
- Escritura en `verifications` con status `pending`.
- Estado visible para el usuario: pendiente, aprobado, rechazado con motivo.

**Bloque E. Panel de operación (días 5, 6 y 7). Prioridad alta.**
- Cola de verificaciones con vista de documento y acciones aprobar/rechazar.
- CRUD de restaurantes con términos comerciales.
- CRUD de eventos.
- Cola de conciliación de pagos.
- Todo protegido por rol. Toda acción escribe en `ops_audit_log`.

Este bloque es el que se subestima siempre. Vas a pasar más horas aquí que en cualquier pantalla de usuario. Trátalo como producto de primera clase.

### Semana 2

**Bloque F. Reserva (días 8 y 9)**
- Listado de eventos abiertos con plazas restantes.
- Reserva provisional con `held_until`.
- Job que expira reservas provisionales vencidas.
- Lista de espera cuando el evento está lleno.
- Cancelación por parte del usuario con política de plazos.

**Bloque G. Pago (días 9 y 10)**
- Selección de producto desde `products`.
- Pantalla de instrucciones por método (Pago Móvil, USDT).
- Tasa del día editable desde el panel, guardada en `payments.fx_rate`.
- Declaración de referencia y subida de comprobante.
- Aplicación de créditos y membresía activa como método alternativo.

**Bloque H. Matching (días 11 y 12)**
- Endpoint `POST /api/matching/run` que recibe `event_id` y pesos.
- Lee de `v_matching_pool`, aplica restricciones duras, optimiza score.
- Escribe `matching_runs` y mesas propuestas sin publicar.
- Vista de previsualización en el panel con score por mesa y desglose.
- Botón de publicar que crea `dinner_tables` y `table_members`.
- Permitir ajuste manual de mesas antes de publicar. Operaciones siempre puede sobrescribir el algoritmo.

**Bloque I. Evento y feedback (días 13 y 14)**
- Pantalla de revelación que respeta `reveal_at`.
- Vista de compañeros de mesa: solo nombre de pila, industria y un dato de conversación. Sin apellidos ni contacto.
- Formulario de feedback: NPS, valoración de restaurante, conexiones hechas, señal por persona.
- Marcado de asistencia desde el panel.

---

## 6. Fuera de scope (no construir)

Chat dentro de la app, feed social, perfiles públicos, badges o gamificación, matching en tiempo real, app nativa, integración con pasarela de pago, multi-ciudad, internacionalización, modo oscuro.

Si alguna de estas aparece como "sería rápido añadirlo", la respuesta es no. Cada una añade superficie de mantenimiento sobre un producto que todavía no sabemos si retiene.

---

## 7. Convenciones

- Server Components por defecto. Client Components solo cuando haya interactividad real.
- Toda mutación en Server Actions o Route Handlers. Nunca escribir a Supabase desde el cliente con la anon key para operaciones sensibles.
- La `service_role` key jamás llega al navegador.
- Validación de entrada con Zod en cada endpoint.
- Nombres de tablas y columnas en inglés (ya está en el esquema). Copy visible en español.
- Sin `any` en TypeScript.
- Errores de usuario en español y accionables. Nada de "Something went wrong".
- Commits pequeños y descriptivos.

---

## 8. Métricas a instrumentar desde el día uno

| Métrica | Fuente |
|---|---|
| Conversión de waitlist a cuestionario completo | `waitlist` a `profile_traits` |
| Conversión de cuestionario a verificación aprobada | `verifications` |
| Fill rate por evento | `bookings` sobre `max_seats` |
| No-show rate | `bookings.status` |
| NPS por mesa | `table_feedback` |
| **Varianza de NPS entre mesas del mismo evento** | `v_matching_signal` |
| **Segunda asistencia a 60 días** | `v_second_attendance` |

Las dos últimas son las que deciden si el producto sigue. La varianza entre mesas revela si el matching aporta valor: mismo restaurante, misma noche, distinta mesa, toda la diferencia viene del algoritmo. La segunda asistencia dice si el producto retiene.

---

## 9. Orden de construcción recomendado

1. Esquema aplicado y desplegado.
2. Landing con waitlist en producción. **La captación empieza el día uno, no cuando el producto esté listo.**
3. Panel de operación, aunque no haya usuarios. Te obliga a definir el flujo real de la semana.
4. Auth y cuestionario.
5. Verificación.
6. Reserva y pago.
7. Matching.
8. Feedback.

---

## 10. Prompt de arranque

Para pegar en la primera sesión de Claude Code, con `schema.sql` y este archivo ya en el repositorio:

> Lee `CLAUDE.md` y `schema.sql` completos antes de escribir código.
>
> Vamos a construir el MVP descrito ahí. Empieza por el Bloque A: inicializa el proyecto Next.js 15 con App Router, TypeScript estricto, Tailwind y shadcn/ui. Configura el cliente de Supabase con separación clara entre cliente de navegador y cliente de servidor. Genera los tipos desde el esquema. Deja listo el despliegue en Vercel.
>
> Cuando termines el Bloque A, para y muéstrame la estructura de carpetas antes de seguir con el Bloque B.
>
> Reglas para toda la sesión: no inventes funcionalidad que no esté en el brief, no uses `any`, todo el copy visible va en español de Venezuela, y si una decisión de producto no está en el brief, pregúntame en vez de asumir.

---

## 11. Umbrales de decisión

Definidos ahora, antes de tener datos que los sesguen.

| Al mes 3 | Acción |
|---|---|
| 10+ mesas por semana y segunda asistencia sobre 30% | Escalar. Evaluar app nativa y segundo formato |
| Segunda asistencia entre 20% y 30% | Iterar matching y curaduría. No escalar todavía |
| Segunda asistencia bajo 20% | El problema es producto o densidad, no marketing. Reducir alcance y densificar el nicho |
