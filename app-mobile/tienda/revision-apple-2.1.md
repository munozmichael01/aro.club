# Respuesta a Apple · Guideline 2.1 (08-10-2026)

Apple no rechazó la app: pide información porque la cuenta de desarrollador es
nueva. Hay que hacer tres cosas:

1. Grabar el video (parte A).
2. Pegar el texto en inglés (parte B) **en dos sitios**: como respuesta en
   «Revisión de apps» y en *App Review Information → Notes*.
3. Adjuntar el video a la respuesta.

---

## A · El video (lo grabas tú en tu iPhone)

Apple pide que empiece **abriendo la app** y que se vean:

- el registro, la entrada y el borrado de la cuenta;
- el contenido de otras personas, con cómo se reporta y se bloquea;
- cómo se llega a lo que se paga.

Graba con *Centro de control → Grabación de pantalla*. Mejor en dos tomas;
luego las juntas en Fotos o las subes como dos videos.

**Antes de grabar:** avísame y dejo la cena del revisor en el pasado
(`node scripts/cuenta-revision.mjs --refrescar --horas=-6`). Así Mi mesa
enseña valorar, bloquear y reportar. Al terminar la vuelvo a poner a 6 días.

### Toma 1 · Cuenta nueva: registro y borrado (unos 2 min)

1. Cierra sesión en la app y ciérrala del todo. Empieza en la pantalla de
   inicio del iPhone y **toca el icono de Aro**.
2. Bienvenida → **Encuentra tu mesa** → responde las cuatro preguntas.
3. Crea la cuenta con **correo y contraseña**, con una dirección nueva (por
   ejemplo `munozmichael01+apple@gmail.com`).
4. Sigue el alta hasta llegar al **Inicio**. Si el cuestionario es largo,
   puedes ir rápido, pero que se vea.
5. Abre **Verificación** y enseña la pantalla (cédula y selfie). **No subas
   nada**: basta con que se vea que existe.
6. **Perfil → Darse de baja** → escribe BAJA → **Darme de baja**. Que se vea
   que la app vuelve al principio.

### Toma 2 · La cuenta del revisor: lo de dentro (unos 2 min)

1. **Entrar** con la cuenta del revisor (`revision.appstore@aro.club` y la
   contraseña que tienes guardada). La contraseña no debe verse: tápala o
   corta ese momento.
2. **Inicio:** la agenda, el filtro de formatos y una fecha. Si hay una
   fecha abierta, toca **Reservar** hasta ver la pantalla de **Pago** (los
   datos del Pago Móvil). **No envíes el reporte de pago.** Vuelve atrás.
3. **Mi mesa:** la cena pasada, con el sitio y los otros cinco.
4. **Valora** la cena y marca a alguien en «¿Alguien con quien preferirías no
   volver a coincidir?». Eso es el **bloqueo**.
5. **¿Pasó algo grave? Reportarlo** → elige persona y motivo → **Enviar el
   reporte**. Es una cuenta de prueba: el reporte nos llega a nosotros.
6. **Perfil → Exclusiones:** que se vea la persona bloqueada.
7. **Cerrar sesión.**

---

## B · El texto para Apple (pegar tal cual)

> Hello, and thank you for reviewing Aro Club. Below is the information you requested. A screen recording on a physical iPhone is attached.
>
> **1. Screen recording**
> The attached recording starts from the Home Screen and shows: (a) account registration with email and password, the in-app identity verification screen, and account deletion (Profile → "Darse de baja" → type BAJA → confirm); (b) signing in with the demo account; (c) the dinner calendar and the payment instructions screen; (d) after a dinner: rating it, blocking a member ("no volver a coincidir") and reporting a member ("Reportarlo"), and the list of blocked members under Profile → "Exclusiones".
>
> **2. Purpose and audience**
> Aro Club helps adults (18+) in Caracas, Venezuela, meet new people in person. Members answer a short questionnaire, sign up for a dinner date, and we match them into groups of six by affinity, choose the restaurant and book the table. On the day, the app reveals the place, the time and the first name and professional sector of the other five. The problem it solves is loneliness and how hard it is to meet new people as an adult, especially for people who are new to the city. Every member's identity is checked by a person on our team (ID document and selfie) before they can book, so everyone at the table is verified.
>
> **3. How to access the main features**
> Sign in from the welcome screen with "Ya tengo cuenta · Entrar", using the demo account provided in App Review Information (email and password). This account is already verified and has a confirmed dinner, so you can see the whole experience without waiting for our team:
> - **Inicio (Home):** upcoming dates, filter by format, and the status of the booking.
> - **Mi mesa (My table):** the restaurant, time, directions and the other five members. The icebreaker game ("El juego de la mesa") unlocks at the dinner's start time.
> - **Perfil (Profile):** editable answers, blocked members ("Exclusiones"), notification settings, sign out and account deletion ("Darse de baja").
> To create a new account: welcome screen → "Encuentra tu mesa". Sign in with Apple, Sign in with Google and email/password are supported. Identity verification is reviewed manually by our team, which is why we provide a pre-verified demo account.
>
> **4. External services**
> - Supabase: authentication, database and private file storage (ID verification photos, deleted 90 days after approval).
> - Sign in with Apple and Google Sign-In: optional sign-in methods.
> - Apple Push Notification service, through Expo's push service: notifications (table revealed, dinner reminder, verification result).
> - Resend: transactional email.
> - Vercel: hosts our API at aro.club.
> - DolarAPI (ve.dolarapi.com): the official USD to bolívar exchange rate, used to show the price in bolívares.
> We do not use any AI services, advertising or analytics SDKs in the app.
>
> **Payments:** a seat at a dinner costs USD 7, paid in bolívares. It pays for an in-person service (matching, member verification and the restaurant booking); food and drinks are paid at the restaurant. Payment is made outside the app by bank transfer ("Pago Móvil") from the member's own banking app; the member then reports the transfer reference in our app and our team confirms it manually. There is no digital content or feature unlocked by payment, so In-App Purchase does not apply (Guideline 3.1.3(e), goods and services consumed outside the app).
>
> **5. Regional differences**
> The app works the same way in every region and is in Spanish. Dinners currently take place only in Caracas, Venezuela. People in other cities can create an account and choose their city to be notified when we open there; they cannot book a dinner until their city opens.
>
> **6. Regulated industry / third-party material**
> Aro Club does not operate in a regulated industry and does not include protected third-party content. Identity verification is done by our own team only to keep members safe; documents are stored privately, are never shown to other members, and are deleted 90 days after approval.
>
> Thank you. We are happy to answer anything else.

---

## Notas para Michael

- **La contraseña del revisor no va en este texto.** Ya está en *App Review
  Information → Sign-In Information*. Comprueba que sigue ahí.
- La cena del revisor está programada para el 14-10. Si la revisión se
  alarga, se refresca con `--horas=144`.
- Un posible tropiezo que Apple no ha mencionado: cuando alguien entró con
  Apple y borra su cuenta, Apple pide revocar su acceso con la API de Apple.
  Hoy no lo hacemos. Si lo reclaman, es un cambio del servidor.
