# Ficha de Google Play: borrador

Borrador del 05-10-2026. Los textos salen de la ficha de App Store
(`app-store.md`), con los límites de Play. Sin guiones largos (regla de
marca) y sin nombrar un día escrito a mano.

## Ficha principal (Crece → Presencia en la tienda → Ficha principal)

**Nombre de la app** (30): `Aro Club`

**Descripción breve** (80):
> Cena con cinco personas afines y verificadas en Caracas. Tú solo apareces.

(74 caracteres)

**Descripción completa** (4000):
> Ya sabemos con quién cenas esta semana. Tú no. Todavía.
>
> Aro Club te sienta en una mesa de seis con cinco personas que no conoces, elegidas para que la conversación funcione. Respondes unas preguntas sobre cómo eres en la mesa, de qué te gusta hablar y qué días puedes; nosotros armamos el grupo.
>
> CÓMO FUNCIONA
> • Te apuntas a una fecha, no a una mesa. Los apuntados se reparten en mesas de seis por toda la zona.
> • El día de la cena sabes dónde y con quién: el restaurante, la hora y el nombre y el sector de los otros cinco. Nada más.
> • Al terminar, cuentas qué tal. Puedes pedir no volver a coincidir con alguien, y nadie se entera.
>
> TODOS VERIFICADOS
> Cada persona sube su cédula y una selfie, y las revisa alguien del equipo, no un programa. Nadie más las ve, y se borran a los 90 días de aprobarse.
>
> SIN SORPRESAS
> Tu puesto cuesta 7 USD, en bolívares. Cubre el emparejamiento, la verificación del grupo y la mesa reservada a tu nombre; lo que consumes lo pagas en el sitio. Si cancelas con más de 24 horas, recuperas el crédito.
>
> Solo para mayores de 18. Hoy en Caracas.

**Gráficos:**
- Icono de 512 × 512: `Design/icono/play-store-512.png`.
- Gráfico destacado de 1024 × 500: `tienda/capturas/android/grafico-destacado.png`.
- Capturas de teléfono: las cinco de `tienda/capturas/android/` (1320 × 2640, en orden).

**Categoría:** Estilo de vida. **Etiquetas:** Social, Comida.
**Contacto:** correo `hola@aro.club`; sitio web `https://aro.club`.

## Contenido de la app (Política → Contenido de la app)

- **Política de privacidad:** `https://aro.club/privacidad`.
- **Anuncios:** No contiene anuncios.
- **Acceso a la app:** «Todas o algunas funciones están restringidas». Hay
  que añadir instrucciones con la cuenta del revisor (la de
  `scripts/cuenta-revision.mjs`). El usuario y la contraseña los pone Michael
  en el formulario, **nunca en este fichero**, porque el repo es público.
  Texto: «Para entrar hace falta verificarse con documento y selfie, que
  revisa una persona. Esta cuenta ya está verificada y tiene una reserva».
- **Clasificación de contenido** (cuestionario IARC):
  - Categoría: «Redes sociales, comunicación…» si la ofrece; si no, «Todas las demás».
  - Violencia, sexo, lenguaje, drogas y apuestas: **No**.
  - ¿Los usuarios pueden interactuar o intercambiar contenido? **Sí**. Se
    conocen en persona y ven el nombre y el sector de los otros cinco. No
    hay chat en la app.
  - ¿Comparte la ubicación del usuario con otros? **No**.
  - ¿Permite compras digitales? **No**. El pago es de un servicio presencial
    y va fuera de la app.
- **Público objetivo:** 18 años o más, sin franjas de menores.
- **App de noticias:** No. **App gubernamental:** No. **Funciones
  financieras:** Ninguna (no hay préstamos ni banca).
- **Salud:** No.

## Seguridad de los datos (Política → Contenido de la app → Seguridad de los datos)

- **¿Recopila o comparte datos?** Sí recopila. **No los comparte:** Supabase,
  Resend y Expo son proveedores que tratan los datos por encargo nuestro, y
  Play no los cuenta como «compartir».
- **¿Cifrado en tránsito?** Sí.
- **¿Se puede pedir que se borren?** Sí, desde Perfil → Darse de baja, o
  escribiendo a `hola@aro.club`. **URL para borrar la cuenta:** Play la pide
  aparte; usar `https://aro.club/ayuda` si explica cómo pedir el borrado sin
  la app (confirmarlo con el agente de la web).

| Tipo de dato en Play | Qué es en Aro | ¿Obligatorio? | Para qué |
|---|---|---|---|
| Información personal → Nombre | Nombre y cómo te llaman en la mesa | Sí | Funcionalidad de la app |
| Información personal → Correo | El de la cuenta | Sí | Funcionalidad, comunicaciones |
| Información personal → ID de usuario | El de la cuenta | Sí | Funcionalidad |
| Información personal → Teléfono | Para la mesa y el pago móvil | Sí | Funcionalidad |
| Información personal → Otra | Fecha de nacimiento, género, situación, sector, empleador | Sí | Funcionalidad, personalización |
| Información financiera → Otra | El reporte del pago móvil: banco, referencia, documento | Sí, para reservar | Funcionalidad |
| Fotos y videos → Fotos | Cédula y selfie de la verificación, y la captura del pago | Sí | Funcionalidad, prevención de fraude |
| Actividad en la app → Otro contenido generado por el usuario | Respuestas del cuestionario, valoraciones y reportes | Sí | Funcionalidad, personalización |

No se recopila: ubicación (las zonas se eligen a mano), contactos, mensajes,
historial de navegación, audio, archivos, calendario ni datos de salud.
Tampoco analítica ni diagnósticos: no hay SDK de medición.
