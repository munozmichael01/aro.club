# Ficha de App Store · borrador

Borrador del 01-10-2026, para que Michael lo revise antes de pegarlo en App
Store Connect (Aro Club → Distribución → versión 1.0). Los límites de
caracteres son los de Apple. **No nombra el día de la semana** ni la hora:
salen de cada fecha.

## Textos (español)

**Nombre** (30): `Aro Club`

**Subtítulo** (30): `Conoce gente nueva en persona` (29)

**Texto promocional** (170, se cambia sin nueva versión):
> Te juntamos con cinco personas afines y verificadas. Nosotros elegimos el sitio y armamos el grupo; tú solo llegas.

**Descripción** (4000). General (Michael, 06-10-2026): todos los formatos y no solo Caracas. Lo que aún no existe se dice como «muy pronto», nunca como si ya estuviera: Apple rechaza fichas que prometen funciones que la app no tiene (norma 2.3.1). Cuando la app deje anotarse desde otra ciudad, la sección DÓNDE puede decir «Si estás en otra ciudad, anótate y te avisamos cuando abramos allí».
> Un club para conocer gente nueva en tu ciudad. Te juntamos con cinco personas afines y verificadas: nosotros elegimos el sitio, armamos el grupo y reservamos a tu nombre. Tú solo llegas.
>
> CÓMO FUNCIONA
> • Respondes unas preguntas sobre cómo eres, de qué te gusta hablar y qué días puedes.
> • Te apuntas a una fecha, no a un grupo. Con todos los apuntados armamos grupos de seis por afinidad.
> • El mismo día sabes dónde y con quién: el sitio, la hora y el nombre y el sector de los otros cinco. Nada más.
> • Para romper el hielo, el juego de la mesa: preguntas en tres rondas, de menos a más.
> • Al terminar, cuentas qué tal. Puedes pedir no volver a coincidir con alguien, y nadie se entera.
>
> HOY CENAS, MUY PRONTO MÁS PLANES
> Empezamos con cenas. Muy pronto, café, drinks y planes en movimiento.
>
> TODOS VERIFICADOS
> Cada persona sube su cédula y una selfie, y las revisa alguien del equipo, no un programa. Nadie más las ve, y se borran a los 90 días de aprobarse.
>
> SIN SORPRESAS
> Tu puesto cuesta 7 USD, en bolívares. Cubre el emparejamiento, la verificación del grupo y la reserva a tu nombre; lo que consumes lo pagas en el sitio. Si cancelas con más de 24 horas, recuperas el crédito.
>
> DÓNDE
> Empezamos en Caracas, y pronto abrimos en más ciudades.
>
> Solo para mayores de 18.

**Palabras clave** (100, separadas por coma, sin espacios; no repetir lo del nombre ni del subtítulo, que Apple ya cuenta):
`cenar,amigos,caracas,planes,grupo,restaurante,social,venezuela,cena,salir,café,drinks,desconocidos` (98)

**Categoría:** principal *Estilo de vida*; secundaria *Redes sociales*.
(*Redes sociales* como principal invita a más revisión de contenido de usuarios.)

## URLs

- Política de privacidad: `https://aro.club/privacidad` (existe).
- Soporte: `https://aro.club/ayuda` (existe desde el 01-10: correo arriba,
  las preguntas frecuentes de `AroReglas.FRECUENTES` y cómo borrar la cuenta).
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
| Otros tipos de datos | Fecha de nacimiento, género, situación (pareja, hijos), sector y empleador, idiomas |

Revisado el 05-10-2026 contra el catálogo de `/api/questions`. **Sin
información sensible:** la dieta tenía «Kosher» y «Halal», que dicen la
religión, y Michael decidió quitarlas (el agente las sacó del catálogo, sin
ninguna respuesta guardada con esos códigos). Lo demás no está en la lista de
Apple: situación de pareja e hijos, «abierto a que surja algo», los temas que
se prefieren evitar y el género. La selfie no es biométrica: la compara una
persona, no un algoritmo.

No se recoge: ubicación (las zonas se eligen a mano), contactos, historial,
diagnósticos ni datos de uso.

## Notas para la revisión de Apple

Cuenta de demostración: la monta `node scripts/cuenta-revision.mjs` (desde
la raíz de `aro-club/`). Usuario y contraseña los tiene Michael: **nunca en
este fichero**, el repositorio es público. Van en el formulario de App Store
Connect.

- Está verificada, con créditos y una mesa **revelada** (restaurante, mesa y
  los otros cinco, que son cuentas `@prueba.aro.club` a las que el remitente
  no escribe nunca). Su fecha nace `locked`, así que no sale en la portada.
- **Caduca:** la cena es a las ~30 h de montarla. El día que se envía a
  revisión, y otra vez si Apple la devuelve, correr `--refrescar`. Si el
  revisor ve Mi mesa vacía, es esto y no un fallo.
- `--borrar` quita lo que creó y nada más.

Texto propuesto:

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
