# Ficha de App Store — borrador

Borrador del 01-10-2026, para que Michael lo revise antes de pegarlo en App
Store Connect (Aro Club → Distribución → versión 1.0). Los límites de
caracteres son los de Apple. **No nombra el día de la semana**: todavía no
está decidido.

## Textos (español)

**Nombre** (30): `Aro Club`

**Subtítulo** (30): `Cena con cinco desconocidos` (27)

**Texto promocional** (170, se cambia sin nueva versión):
> Te sentamos con cinco personas afines y verificadas en Caracas. Tú solo apareces.

**Descripción** (4000):
> Ya sabemos con quién cenas esta semana. Tú no. Todavía.
>
> Aro Club te sienta en una mesa de seis con cinco personas que no conoces, elegidas para que la conversación funcione. Respondes unas preguntas sobre cómo eres en la mesa, de qué te gusta hablar y qué días puedes; nosotros armamos el grupo.
>
> CÓMO FUNCIONA
> • Te apuntas a una fecha, no a una mesa. Los apuntados se reparten en mesas de seis por toda la zona.
> • El mismo día sabes dónde y con quién: el restaurante, la hora y el nombre y el sector de los otros cinco. Nada más.
> • Al terminar, cuentas qué tal. Puedes pedir no volver a coincidir con alguien, y nadie se entera.
>
> TODOS VERIFICADOS
> Cada persona sube su cédula y una selfie, y las revisa alguien del equipo, no un programa. Nadie más las ve, y se borran a los 90 días de aprobarse.
>
> CENA, CAFÉ O EN MOVIMIENTO
> Elige el plan que te pide el cuerpo esa semana.
>
> SIN SORPRESAS
> Tu puesto cuesta 7 USD, en bolívares. Cubre el emparejamiento, la verificación del grupo y la mesa reservada a tu nombre; lo que consumes lo pagas en el sitio. Si cancelas con más de 24 horas, recuperas el crédito.
>
> Solo para mayores de 18. Hoy en Caracas.

**Palabras clave** (100, separadas por coma, sin espacios; no repetir el nombre ni el subtítulo):
`cenar,amigos,gente nueva,caracas,planes,conocer gente,grupo,restaurante,social,venezuela,café` (95)

**Categoría:** principal *Estilo de vida*; secundaria *Redes sociales*.
(*Redes sociales* como principal invita a más revisión de contenido de usuarios.)

## URLs

- Política de privacidad: `https://aro.club/privacidad` (existe).
- Soporte: **falta** una página. `/ayuda` da 404. Apple exige que la URL de
  soporte lleve a una forma de contacto. Pedir al agente de la web una
  `/ayuda` sencilla (preguntas frecuentes + `hola@aro.club`). Mientras
  tanto vale `https://aro.club/legal`, que trae el correo.
- Marketing (opcional): `https://aro.club`.

## Clasificación por edad

Contestar «No» o «Ninguno» a todo lo de contenido (violencia, sexo, drogas,
apuestas…). No hay navegador web abierto ni chat dentro de la app. Al final,
marcar que la app **restringe a mayores de 18** (la puerta de edad del alta),
para que salga **18+**.

## Privacidad de la app («etiquetas»)

Seguimiento (*tracking*): **No**. No hay anuncios, analítica de terceros ni
SDK de seguimiento.

Todo lo de abajo va **vinculado a la identidad** y con el fin
**Funcionalidad de la app**. Donde se indica, también *Personalización*.

| Tipo de dato de Apple | Qué es en Aro |
|---|---|
| Contacto → Nombre | Nombre y cómo quieres que te llamen |
| Contacto → Correo | El de la cuenta y el de contacto |
| Contacto → Teléfono | Para la mesa y el pago móvil |
| Fotos o vídeos | Cédula y selfie de la verificación |
| Información financiera → Info. de pago | El reporte del pago móvil: banco, referencia, documento del que paga |
| Contenido del usuario → Otro | Respuestas del cuestionario (también *Personalización*: arman la mesa), valoraciones y reportes |
| Identificadores → ID de usuario | El de la cuenta |
| Otros tipos de datos | Fecha de nacimiento y género |

Si el cuestionario pregunta algo que Apple llama sensible (orientación
sexual, religión, salud, etnia…), hay que añadir **Información sensible**.
Revisarlo contra el catálogo antes de enviar.

No se recoge: ubicación (las zonas se eligen a mano), contactos, historial,
diagnósticos ni datos de uso.

## Notas para la revisión de Apple

Cuenta de demostración **ya verificada**, con una fecha abierta y, a ser
posible, una mesa revelada. Si el revisor choca con la verificación (la
revisa una persona), rechaza la app. Texto propuesto:

> Aro Club organiza cenas de seis personas en Caracas, Venezuela. Para entrar
> hay que verificarse con documento y selfie, que revisa una persona. La
> cuenta de demostración ya está verificada y tiene una reserva. El pago es de
> un servicio presencial (la cena) y se hace fuera de la app por pago móvil,
> como prevé la norma 3.1.3(e). La cuenta se borra desde Perfil → Darse de baja.

## Capturas

Tamaño de 6,9": 1320 × 2868, de 3 a 10. Propuesta, en este orden:

1. Bienvenida (las polaroids y el titular).
2. Una pregunta del cuestionario.
3. Inicio con la agenda y fechas abiertas.
4. Mi mesa abierta (restaurante y los otros cinco).
5. La verificación («nadie más las ve»).
6. Pago con el pago móvil.

Pendiente: sacarlas a ese tamaño desde el catálogo (Chrome sin ventana
recorta la maqueta) o desde el iPhone con TestFlight y ajustarlas.
