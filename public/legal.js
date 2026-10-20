;(function (raiz) {
  /**
   * EL TEXTO LEGAL, UNA SOLA VEZ.
   *
   * Michael, 18-10: los Términos y la Privacidad tienen que poder leerse
   * DENTRO de la app, sin mandar a nadie al navegador, y sin que eso cree
   * una segunda copia del texto legal. «Hazlo: un /api/legal que lean las
   * dos».
   *
   * Vivía dentro de `Aro Club - Legal.dc.html`, que es la pantalla que lo
   * pinta. Mientras la web era el único sitio donde se leía, eso estaba
   * bien. Con la app leyéndolo también, dejarlo ahí obligaba a copiarlo, y
   * dos copias de un texto legal son dos textos legales: cambias una coma en
   * una y la otra sigue diciendo lo de antes, con la gente habiendo aceptado
   * cualquiera de las dos.
   *
   * Así que vive aquí, como `reglas.js`: el MISMO fichero que carga el
   * navegador con un <script>, que lee el servidor para servirlo por
   * `/api/legal`, y que no necesita compilarse para ninguno de los dos.
   *
   * Fichero aparte y no dentro de `reglas.js` a propósito: son quince mil
   * caracteres de legal que no hacen falta en la portada ni en Mi mesa.
   * `reglas.js` lo carga todo el mundo; esto, solo quien va a leerlo.
   *
   * LA VERSIÓN es la que se guarda en `profiles.terms_version` al aceptar.
   * Subirla aquí es lo que hace que «aceptó los términos» siga queriendo
   * decir algo cuando el texto cambie: quien tenga la anterior queda
   * identificable sin tocarle la fecha a nadie.
   */
  var R = raiz.AroReglas
    // Este fichero lo carga el navegador con un `<script>` Y el servidor con
    // `import`, asi que el `require` es el unico puente cuando no hay window.
    // Es la misma excepcion que `support.js`, escrita aqui porque la regla
    // lleva desde el 18-10 dejando el CI en rojo en cada push.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    || (typeof require !== 'undefined' ? require('./reglas.js') : null)
  var diasFotos = (R && R.DIAS_GUARDA_FOTOS) || 120

  var reglas = [
      ['Vas tú, y vas solo', 'La plaza es personal e intransferible. No puedes llevar acompañante ni cederla: todo el grupo tiene que ser desconocido entre sí, porque una pareja que ya se conoce convierte al resto en público.'],
      ['Eres quien dices ser', 'La verificación no es un trámite. Suplantar a otra persona, usar documentos ajenos o dar datos falsos es salida inmediata y definitiva.'],
      // La causa ajena —lluvia, apagón, una vía cerrada— NO devuelve el
      // crédito, y eso tenía que decirse en los dos sitios o se contradicen:
      // esta regla corta y el término largo de más abajo.
      ['Avisas si no vas', 'Cancelar con más de 24 horas devuelve tu crédito. Con menos, se pierde, también cuando la causa es ajena a ti o a nosotros. No aparecer sin avisar dos veces te deja fuera de las reservas durante un mes: en una mesa de seis, un puesto vacío se nota.'],
      ['Nadie vende nada en la mesa', 'Puedes hablar de tu trabajo. No puedes usar la cena para vender, reclutar, levantar capital ni repartir tarjetas. Si eso es lo que buscas, este no es el sitio.'],
      ['Lo que se dice en la mesa se queda en la mesa', 'No publiques nombres, capturas ni datos de las otras personas. Fotos del grupo solo si todos dicen que sí, en el momento y en voz alta.'],
      ['Respeto, y el «no» se acepta a la primera', 'Cero acoso, cero comentarios sobre el cuerpo, cero insistencia después de un no. Si alguien no quiere dar su contacto al final de la noche, ahí se acabó la conversación.']
    ]

  var terminos = [
      ['Qué es Aro Club', 'Un servicio que arma grupos de seis personas verificadas y reserva una mesa en un restaurante de Caracas. No somos el restaurante, no cocinamos y no servimos: intermediamos el encuentro.'],
      ['Quién puede usarlo', 'Mayores de 18 años con documento de identidad venezolano o pasaporte vigente. Una cuenta por persona. Nos reservamos el derecho de no admitir a alguien sin dar explicaciones, y de devolverle lo que haya pagado sin usar.'],
      ['Qué incluye lo que pagas', 'Armar tu mesa, la verificación de identidad del grupo, la reserva a tu nombre y el acompañamiento de operación esa noche. No incluye tu consumo: la comida y la bebida las pagas en el sitio, como en cualquier salida.'],
      ['Precios y pagos', 'Los precios se muestran en ref como referencia y se cobran en bolívares a la tasa oficial del EURO que publica el Banco Central de Venezuela el día del pago. Un crédito es un puesto en una cena, no una cantidad de dinero guardada: si la tasa cambia, tu crédito sigue valiendo una cena entera y no tienes que poner la diferencia. No caduca. No hay cobros automáticos ni suscripción: pagas cuando reservas.'],
      ['Cancelaciones y devoluciones', 'Cancelas con más de 24 horas y recuperas el crédito íntegro. No aparecer, o cancelar con menos de 24 horas, hace perder el crédito, también cuando la causa es ajena a ti o a nosotros (lluvia, apagones, cierres de vías u otras situaciones de fuerza mayor): la mesa ya está reservada y el grupo ya está armado. Si somos nosotros quienes cancelamos una fecha por una de esas causas, te devolvemos el crédito, sin el de cortesía. Si cancelamos nosotros por una causa nuestra, te devolvemos el crédito y te damos otro de cortesía.'],
      // El aviso NO puede prometer más antelación que el cierre: hasta que la
      // fecha no cierra no se sabe si hay gente para armar la mesa. Decía 48
      // horas cuando el cierre era 48; con el cierre en 24, prometerlas era
      // prometer saber algo antes de poder saberlo.
      ['Si la mesa no se llena', 'A veces no hay suficiente gente compatible una semana concreta. Te avisamos en cuanto lo sabemos, que es al cerrarse la fecha, cuando ya están las cuentas, y tu crédito vuelve intacto. Preferimos moverte de semana a sentarte en un grupo que no funciona.'],
      ['Lo que no controlamos', 'No respondemos por la calidad de la comida, el servicio del restaurante ni por lo que otra persona haga o diga en la mesa. Verificamos identidades y moderamos reportes; eso reduce el riesgo, no lo elimina. Vas bajo tu propia responsabilidad, igual que a cualquier sitio.'],
      ['Tu contenido', 'Las respuestas del cuestionario y los reportes que escribas son tuyos. Nos das permiso para usarlos con un único fin: armar mesas y moderar el club. No los vendemos, no los cedemos y no entrenamos nada con ellos.'],
      ['Cómo te escribimos', 'Al crear la cuenta aceptas los avisos del servicio: la mesa del sábado a mediodía, el recordatorio del día de la cena, la confirmación de tu pago y las aperturas en tus zonas. Los dos primeros no se pueden desactivar, porque sin ellos no sabrías dónde es. WhatsApp es aparte y va apagado: solo lo activas tú, solo se usa el día de la cena y solo si algo cambia. No mandamos promociones ni novedades por ninguna vía.'],
      ['Darte de baja', 'Borrar la cuenta elimina tus respuestas, tus datos y tus documentos, y no se puede deshacer. Los créditos que no hayas usado se pierden: si te vas teniendo alguno, úsalo antes. Los registros de facturación se conservan diez años porque la ley lo exige.'],
      ['Cierre de cuenta', 'Puedes irte cuando quieras desde tu perfil. Podemos cerrarte la cuenta si rompes las reglas de la mesa, si hay fraude en el pago o si suplantas a alguien. En ese caso te devolvemos los créditos sin usar, salvo que el motivo sea un daño a otra persona.']
    ]

  var nunca = ['Tu apellido', 'Tu cédula', 'Tu selfie', 'Tu teléfono', 'Tu correo', 'Tu edad exacta', 'Dónde trabajas', 'Tus respuestas del cuestionario']

  var datos = [
      ['Correo', 'Avisarte cuando abra mesa en tu zona, escribirte lo de tus cenas y, si olvidas la contraseña, mandarte el enlace para poner una nueva.', 'Mientras tengas cuenta'],
      ['Nombre y fecha de nacimiento', 'Confirmar que eres mayor de edad y saber cómo llamarte.', 'Mientras tengas cuenta'],
      ['Teléfono', 'Escribirte por WhatsApp el día de la cena, y solo ese día.', 'Mientras tengas cuenta'],
      ['Cédula y selfie', 'Verificar que eres quien dices. Lo revisa una persona de nuestro equipo.', '' + diasFotos + ' días tras verificar'],
      ['Respuestas del cuestionario', 'Armar tu mesa y moderar el club. No hay un tercer uso.', 'Mientras tengas cuenta'],
      ['Dónde trabajas', 'Intentar no sentarte con alguien de tu propia empresa.', 'Mientras tengas cuenta'],
      ['Pagos', 'Facturación y obligaciones fiscales.', '10 años, por ley']
    ]

  var privacidad = [
      ['La cédula y la selfie se borran a los ' + diasFotos + ' días', 'Una vez verificada tu identidad, el documento y la foto dejan de hacer falta. Se borran a los ' + diasFotos + ' días y solo queda una marca de que la verificación ocurrió y quién la aprobó. No se guardan en el teléfono de nadie ni en ninguna carpeta compartida.'],
      ['Quién los ve dentro de Aro', 'Solo el equipo de operación que hace la verificación, con acceso registrado y nominal. Nadie más de la empresa, y ningún otro miembro, en ningún caso.'],
      ['Con quién los compartimos fuera', 'Con el proveedor de pagos, lo mínimo para cobrar. Con el restaurante, solo el nombre de la reserva y el número de personas. Con nadie más. No vendemos datos ni los cedemos a anunciantes.'],
      ['No hay perfiles públicos ni fotos de perfil', 'La base de miembros no se puede navegar. No existe una pantalla donde alguien vea quién está en el club. Y no hay foto de perfil en ninguna parte del producto: es una decisión de diseño, no una función pendiente.'],
      ['Tus datos viven fuera de Venezuela', 'Los servidores están en Estados Unidos, con nuestro proveedor de infraestructura. Al registrarte aceptas esa transferencia internacional. Todo viaja cifrado y los documentos de identidad se guardan cifrados en reposo.'],
      ['Cómo medimos el uso', 'Usamos dos herramientas, y ninguna sirve para publicidad. Google Analytics cuenta visitas y recorridos: cuánta gente llega, por dónde entra y en qué pantalla se queda. Microsoft Clarity graba cómo se usa la página, de forma anónima: dónde se toca, dónde se duda, qué se queda sin rellenar. En esas grabaciones lo que escribes sale enmascarado, así que no se lee tu nombre, tu correo ni ningún dato que teclees, y Clarity está apagado del todo en las pantallas donde entregas algo: verificación, pago y las de operación. El proveedor de la primera es Google y el de la segunda Microsoft.'],
      ['Cookies', 'Las necesarias para mantener tu sesión abierta y recordar dónde te quedaste en el cuestionario, y las que ponen las dos herramientas de medición de arriba para no contarte dos veces. No hay cookies de publicidad, no vendemos lo que miden y nadie las usa para seguirte por otras páginas.'],
      ['Menores de edad', 'El servicio es solo para mayores de 18. Si detectamos una cuenta de un menor, la cerramos y borramos todo lo asociado.']
    ]

  /**
   * Y LO QUE NO ES UNA LISTA: titulos, entradillas y los dos bloques
   * sueltos.
   *
   * Estaba escrito dentro de la pantalla, y es texto legal igual que lo
   * demas: la frase de tolerancia cero, como se ejercen los derechos, bajo
   * que legislacion y con cuanta antelacion avisamos de un cambio. Lo vio el
   * agente de la app antes de copiarlo: «si copio eso en la app volvemos a
   * tener dos textos legales, justo lo que querias evitar».
   */
  var cabecera = {
    titulo: 'Las reglas, los términos y qué hacemos con tus datos.',
    bajada: 'Escrito para que se entienda. Si algo aquí no te cuadra, escríbenos y lo hablamos.',
    actualizado: 'Última actualización: 5 de agosto de 2026 · Caracas, Venezuela',
  }

  var secciones = {
    reglas: {
      cinta: '01 · REGLAS DE LA MESA',
      titulo: 'Lo que aceptas al sentarte.',
      intro: 'Estas seis reglas son la razón por la que alguien se atreve a cenar con cinco desconocidos. Romperlas es motivo de salida del club, sin devolución de créditos usados.',
    },
    terminos: {
      cinta: '02 · TÉRMINOS DE SERVICIO',
      titulo: 'Qué te damos y qué no.',
      intro: '',
    },
    privacidad: {
      cinta: '03 · PRIVACIDAD',
      titulo: 'Qué guardamos, quién lo ve, cuánto dura.',
      intro: 'Te pedimos cédula y una selfie. Es lo más delicado que vas a darnos, así que esta sección es la más concreta de las tres.',
    },
  }

  var mesa = {
    titulo: 'Si algo pasa en una mesa',
    // La primera frase va en negrita en la pantalla. Se guarda aparte para
    // que la app pueda hacer lo mismo sin partir el texto por su cuenta.
    fuerte: 'Tolerancia cero: no se permite contenido ofensivo, acoso ni abuso de ningún tipo, ni en la mesa ni en la app. Quien lo haga sale del club.',
    cuerpo: 'Lo reportas desde tu mesa y lo lee una persona el mismo día. Puedes bloquear a alguien para que nunca vuelva a coincidir contigo, y no se le avisa. Quien acumula reportes sale del club. Si hay un delito de por medio, colaboramos con las autoridades y te acompañamos en la denuncia; no hacemos de juez ni de policía.',
  }

  var nuncaTitulo = 'LO QUE NUNCA VE OTRO MIEMBRO'
  var nuncaNota = 'De ti, los otros cinco solo ven el nombre con el que quieres que te llamen y tu sector. Nada más, en ninguna pantalla, en ningún estado del producto.'

  var derechos = {
    titulo: 'Cómo ejercer tus derechos',
    cuerpo: 'Escribe desde el correo con el que te registraste y pide lo que quieras: ver tus datos, corregirlos, llevártelos o borrarlos. Respondemos en menos de quince días hábiles. Borrar la cuenta borra tus respuestas y tus documentos; lo que no se borra son los registros de facturación, que la ley obliga a conservar.',
    correo: 'hola@aro.club',
  }

  var pie = 'Aro Club opera en Caracas, Venezuela. Estos términos se rigen por la legislación venezolana y cualquier disputa se resuelve en los tribunales de la ciudad de Caracas. Si cambiamos algo importante, te lo escribimos por correo con treinta días de antelación.'

  var api = {
    version: '2026-08',
    cabecera: cabecera,
    secciones: secciones,
    mesa: mesa,
    nuncaTitulo: nuncaTitulo,
    nuncaNota: nuncaNota,
    derechos: derechos,
    pie: pie,
    // Las seis reglas de la mesa. No son las normas de seguridad que se
    // aceptan al entrar —esas están en `AroReglas.NORMAS`—: estas son cómo
    // se comporta uno en una cena.
    reglas: reglas,
    terminos: terminos,
    // Lo que los otros cinco NO ven de ti.
    nunca: nunca,
    // Qué dato, para qué, y cuánto se guarda.
    datos: datos,
    privacidad: privacidad,
  }

  raiz.AroLegal = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
