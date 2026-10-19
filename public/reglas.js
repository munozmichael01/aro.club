/**
 * Las reglas de entrada. §11 del HANDOFF-10.
 *
 * UN SOLO FICHERO, y lo cargan los dos lados: el navegador con un <script>
 * al lado de support.js, y el servidor importándolo. No hay copia que
 * mantener ni build que generar.
 *
 * Nace de que el mismo dato se validaba distinto en cada pantalla, cinco
 * veces. El caso que lo enseña entero: el validador de teléfono exigía diez
 * dígitos (venezolano) y el campo de Bizum cortaba a nueve (español), así
 * que el campo NUNCA podía satisfacer al validador y el botón no se
 * activaba jamás. Un método de pago inservible sin un solo error de lógica:
 * solo dos copias de la misma regla que divergieron.
 *
 * Cada campo tiene dos cosas, y no son la misma:
 *
 *   filtrar(v)  lo que se puede teclear. Evita el estado imposible —un año
 *               de ocho cifras, un teléfono con letras— mientras escribe.
 *   valido(v)   si se puede enviar. Es la condición de verdad.
 *
 * Lo del navegador es ayuda; lo que manda es el servidor. Por eso importa
 * que sean el mismo código: si el filtro impide teclear lo que el validador
 * exige, el formulario se cierra solo.
 */
(function (raiz) {
  'use strict'

  var soloDigitos = function (max) {
    return function (v) {
      return String(v == null ? '' : v).replace(/\D/g, '').slice(0, max)
    }
  }

  /**
   * El teléfono del perfil admite cualquier prefijo internacional: hay
   * miembros escribiendo desde fuera y forzar +58 los dejaba fuera. El del
   * pago móvil sí es venezolano, porque ahí el teléfono es un dato del
   * banco y no de contacto. NO son el mismo campo.
   */
  var telefonoPerfil = function (v) {
    var s = String(v == null ? '' : v)
    var mas = s.trim().charAt(0) === '+'
    return (mas ? '+' : '') + s.replace(/\D/g, '').slice(0, 15)
  }

  /** Cuántos dígitos exige un país. Deriva del prefijo, no de una constante. */
  var LARGO_POR_PREFIJO = { '58': 10, '34': 9 }

  var REGLAS = {
    telefonoPerfil: {
      etiqueta: 'Teléfono',
      filtrar: telefonoPerfil,
      valido: function (v) {
        var d = String(v || '').replace(/\D/g, '')
        // El rango de E.164, que es el suelo para un pais que no conocemos.
        if (d.length < 8 || d.length > 15) return false
        // Y encima, el largo del pais cuando lo sabemos.
        //
        // `LARGO_POR_PREFIJO` llevaba aqui desde el principio y no lo miraba
        // NADIE: se exportaba y ya. Con solo el rango generico, '+58123456'
        // —seis cifras— pasaba por bueno, y '+58412123456' tambien, que es un
        // numero venezolano al que le falta una. No falla nada al guardar: la
        // fila entra, y el dia de la cena el WhatsApp no llega a ningun sitio.
        for (var pre in LARGO_POR_PREFIJO) {
          if (d.indexOf(pre) !== 0) continue
          // El cero nacional se descuenta antes de medir, igual que en
          // `aE164`: quien teclea 0412-1234567 escribe once cifras y son diez.
          var resto = d.slice(pre.length).replace(/^0(?!0)/, '')
          return resto.length === LARGO_POR_PREFIJO[pre]
        }
        return true
      },
      ayuda: 'Con el prefijo de tu país. Da igual si escribes el 0 de delante: en Venezuela son diez cifras sin él.',
    },

    telefonoPagoMovil: {
      etiqueta: 'Teléfono',
      // El cero de delante se quita ANTES de cortar a diez.
      //
      // Con `soloDigitos(10)` a secas, quien teclea 0412-1234567 —que es como
      // esta el numero en su agenda— acaba con '0412123456': se pierde la
      // ultima cifra, el validador lo da por bueno porque son diez digitos, y
      // lo que viaja al banco es un telefono que no existe. No falla nada; el
      // pago no cuadra y lo descubre quien concilia, dias despues.
      filtrar: function (v) {
        var d = String(v == null ? '' : v).replace(/\D/g, '')
        // Solo si al quitarlo queda un movil de diez: asi un numero que
        // empiece por cero por otra razon no se toca.
        if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1)
        return d.slice(0, 10)
      },
      valido: function (v) {
        return /^\d{10}$/.test(String(v || ''))
      },
      ayuda: 'Sin el +58. Da igual si escribes el 0 de delante.',
    },

    telefonoBizum: {
      etiqueta: 'Teléfono',
      filtrar: soloDigitos(9),
      valido: function (v) {
        return /^\d{9}$/.test(String(v || ''))
      },
      ayuda: 'Nueve dígitos, sin el +34.',
    },

    // La letra va aparte del número: si se teclea, se descarta. Es lo que
    // evitó el «+58 +58 4241234501» que apareció en el perfil.
    cedula: {
      etiqueta: 'Cédula',
      filtrar: soloDigitos(9),
      valido: function (v) {
        var d = String(v || '').replace(/\D/g, '')
        return d.length >= 6 && d.length <= 9
      },
      ayuda: 'Solo el número. La V o la E se eligen aparte.',
    },

    dia: {
      etiqueta: 'Día',
      filtrar: soloDigitos(2),
      valido: function (v) {
        var n = parseInt(v, 10)
        return n >= 1 && n <= 31
      },
    },
    mes: {
      etiqueta: 'Mes',
      filtrar: soloDigitos(2),
      valido: function (v) {
        var n = parseInt(v, 10)
        return n >= 1 && n <= 12
      },
    },
    anio: {
      etiqueta: 'Año',
      filtrar: soloDigitos(4),
      // No es «un año plausible»: es que sea mayor de edad. Aro es +18 y
      // eso se comprueba contra el documento, así que el formulario no
      // puede admitir lo que la verificación va a rechazar.
      valido: function (v) {
        var n = parseInt(v, 10)
        if (!(n >= 1900)) return false
        return new Date().getFullYear() - n >= 18
      },
      ayuda: 'Tienes que ser mayor de edad.',
    },

    fechaPago: {
      etiqueta: 'Fecha del pago',
      // El año, entero. Con dos cifras «16/08/26» se lee distinto segun quien
      // mire —y quien lo cuadra contra el movimiento del banco lee fechas
      // todo el dia—, asi que la ambiguedad la paga el que concilia.
      filtrar: function (v) {
        var bruto = String(v == null ? '' : v)
        // Una barra TECLEADA cierra el grupo: quien escribe «7/» ya dijo que
        // el dia es el 7, y ahi el cero delante se agradece. Rellenar uno que
        // aun se esta escribiendo es el fallo CONTRARIO —te pone el cero
        // delante del 7 y el 15 ya no se puede teclear—, y es el que la app
        // tuvo que quitar de su pantalla de pago. De ahi que se rellene solo
        // lo que la persona dio por terminado.
        //
        // Sin barras no se adivina nada: el teclado numerico del telefono no
        // tiene «/», asi que ahi se teclean las ocho cifras y la pista del
        // campo —DD/MM/AAAA— es la que lo dice.
        var grupos = bruto.split(/\D+/)
        var acabaEnBarra = /\D$/.test(bruto)
        var d = ''
        for (var i = 0; i < grupos.length; i++) {
          var g = grupos[i]
          if (!g) continue
          var cerrado = i < grupos.length - 1 || acabaEnBarra
          // El limite de cuatro deja fuera el anio: ahi una cifra sola es el
          // principio de 2026, no un 2 al que le falte el cero.
          if (cerrado && g.length === 1 && d.length < 4) g = '0' + g
          d += g
        }
        d = d.slice(0, 8)
        if (d.length <= 2) return d
        if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2)
        return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
      },
      valido: function (v) {
        var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || ''))
        if (!m) return false
        var dia = parseInt(m[1], 10)
        var mes = parseInt(m[2], 10)
        var anio = parseInt(m[3], 10)
        if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return false
        // Un pago no se reporta antes de existir ni en el siglo que viene.
        return anio >= 2025 && anio <= 2099
      },
      ayuda: 'DD/MM/AAAA',
    },

    referencia: {
      etiqueta: 'Referencia',
      filtrar: soloDigitos(6),
      valido: function (v) {
        return String(v || '').replace(/\D/g, '').length >= 4
      },
      ayuda: 'Los últimos dígitos que te dio el banco.',
    },

    otp: {
      etiqueta: 'Código',
      filtrar: soloDigitos(6),
      valido: function (v) {
        return /^\d{6}$/.test(String(v || ''))
      },
    },

    banco: {
      etiqueta: 'Banco',
      filtrar: function (v) {
        return String(v == null ? '' : v).slice(0, 60)
      },
      // De la lista, y no lo que sea. Escrito a mano llegaban «Banesco»,
      // «banesco», «BANESCO C.A.» y «0134» como cuatro bancos distintos, y
      // quien concilia tiene que adivinar cual es cual contra el movimiento.
      // Se acepta el codigo o el nombre exacto: el desplegable manda el
      // codigo, y asi lo ya guardado a mano no se vuelve invalido de golpe.
      valido: function (v) {
        var s = String(v || '').trim()
        if (!s) return false
        for (var i = 0; i < api.BANCOS.length; i++) {
          if (api.BANCOS[i].codigo === s || api.BANCOS[i].nombre === s) return true
        }
        return false
      },
    },

    codigoZelle: {
      etiqueta: 'Código',
      filtrar: function (v) {
        return String(v == null ? '' : v).toUpperCase().slice(0, 14)
      },
      valido: function (v) {
        return String(v || '').trim().length >= 3
      },
    },

    correo: {
      etiqueta: 'Correo',
      filtrar: function (v) {
        return String(v == null ? '' : v).trim().slice(0, 254)
      },
      valido: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
      },
    },

    clave: {
      etiqueta: 'Contraseña',
      filtrar: function (v) {
        return String(v == null ? '' : v)
      },
      valido: function (v) {
        return String(v || '').length >= 8
      },
      ayuda: 'Al menos ocho caracteres.',
    },
  }

  var api = {
    REGLAS: REGLAS,
    LARGO_POR_PREFIJO: LARGO_POR_PREFIJO,

    /** Lo que se puede teclear en ese campo. */
    filtrar: function (campo, valor) {
      var r = REGLAS[campo]
      return r ? r.filtrar(valor) : String(valor == null ? '' : valor)
    },

    /** Si ese valor se puede enviar. */
    valido: function (campo, valor) {
      var r = REGLAS[campo]
      return r ? !!r.valido(valor) : true
    },

    /**
     * Los prefijos que ofrecemos, con el pais delante.
     *
     * Venezuela primero porque es la unica ciudad abierta; despues, donde
     * de verdad hay gente de Caracas. No es una lista mundial a proposito:
     * un desplegable de doscientos paises para elegir uno es peor que
     * escribirlo, y quien no este aqui puede teclear su prefijo a mano.
     */
    // Los bancos del sistema venezolano, con su codigo de cuatro cifras.
    //
    // El codigo es lo que manda: es lo que aparece en el movimiento del
    // banco y lo que se teclea al hacer un pago movil, asi que es por donde
    // se cuadra. El nombre esta para que la persona reconozca el suyo.
    //
    // Ordenados por codigo, que es el orden en que los lista el propio
    // sistema bancario. Si alguno falta o cambia de nombre, se toca aqui y
    // vale para la pantalla y para el servidor a la vez.
    BANCOS: [
      { codigo: '0102', nombre: 'Banco de Venezuela' },
      { codigo: '0104', nombre: 'Venezolano de Crédito' },
      { codigo: '0105', nombre: 'Mercantil' },
      { codigo: '0108', nombre: 'Provincial' },
      { codigo: '0114', nombre: 'Bancaribe' },
      { codigo: '0115', nombre: 'Exterior' },
      { codigo: '0128', nombre: 'Banco Caroní' },
      { codigo: '0134', nombre: 'Banesco' },
      { codigo: '0137', nombre: 'Sofitasa' },
      { codigo: '0138', nombre: 'Banco Plaza' },
      { codigo: '0146', nombre: 'Bangente' },
      { codigo: '0151', nombre: 'BFC Banco Fondo Común' },
      { codigo: '0156', nombre: '100% Banco' },
      { codigo: '0157', nombre: 'DelSur' },
      { codigo: '0163', nombre: 'Banco del Tesoro' },
      { codigo: '0166', nombre: 'Banco Agrícola de Venezuela' },
      { codigo: '0168', nombre: 'Bancrecer' },
      { codigo: '0169', nombre: 'Mi Banco' },
      { codigo: '0171', nombre: 'Banco Activo' },
      { codigo: '0172', nombre: 'Bancamiga' },
      { codigo: '0174', nombre: 'Banplus' },
      { codigo: '0175', nombre: 'Banco Bicentenario' },
      { codigo: '0177', nombre: 'Banfanb' },
      { codigo: '0191', nombre: 'BNC Banco Nacional de Crédito' },
    ],

    PREFIJOS: [
      { codigo: '+58', pais: 'Venezuela' },
      { codigo: '+34', pais: 'España' },
      { codigo: '+1', pais: 'EE. UU.' },
      { codigo: '+57', pais: 'Colombia' },
      { codigo: '+51', pais: 'Perú' },
      { codigo: '+56', pais: 'Chile' },
      { codigo: '+52', pais: 'México' },
      { codigo: '+54', pais: 'Argentina' },
      { codigo: '+55', pais: 'Brasil' },
      { codigo: '+507', pais: 'Panamá' },
      { codigo: '+39', pais: 'Italia' },
      { codigo: '+351', pais: 'Portugal' },
      { codigo: '+33', pais: 'Francia' },
      { codigo: '+44', pais: 'R. Unido' },
      { codigo: '+49', pais: 'Alemania' },
    ],

    /**
     * Partir un E.164 en prefijo y resto, para poder pintarlos por separado.
     * El prefijo mas largo gana: +1 no puede comerse a +507.
     */
    partirTelefono: function (valor) {
      var v = String(valor == null ? '' : valor).trim()
      if (v.charAt(0) !== '+') return { prefijo: '+58', resto: v.replace(/\D/g, '') }
      var lista = api.PREFIJOS.map(function (p) { return p.codigo })
        .sort(function (a, b) { return b.length - a.length })
      for (var i = 0; i < lista.length; i++) {
        if (v.indexOf(lista[i]) === 0) {
          return { prefijo: lista[i], resto: v.slice(lista[i].length).replace(/\D/g, '') }
        }
      }
      // Un prefijo que no ofrecemos. No se adivina donde corta —+971 se
      // partiria como +9715— asi que se devuelve entero y la pantalla lo
      // enseña en el campo, con el selector en "Otro". Inventar el corte
      // seria romperle el numero a quien escribe desde fuera de la lista.
      return { prefijo: '', resto: v }
    },

    /**
     * El teléfono de contacto, en E.164, desde lo que sea que haya tecleado.
     *
     * Estaba resuelto en tres sitios y de tres maneras: Datos base pegaba
     * '+58' a ciegas —y encima solo aceptaba móviles venezolanos, que deja
     * fuera a quien escribe desde España—, Mi perfil hacía su propio apaño
     * contra el '+58 +58' que ya apareció una vez, y cada servidor validaba
     * distinto. Es el mismo dato: se normaliza una vez y aquí.
     *
     * Quien escribe su prefijo manda. Quien no lo escribe es de Caracas,
     * que es la única ciudad abierta, y se le pone el +58; en cuanto haya
     * otra ciudad esta suposición hay que revisarla.
     */
    /**
     * La fecha del pago tiene DOS formatos y no son negociables ninguno de los
     * dos. Se guarda y se concilia como DD/MM/AAAA —es lo que lee quien cuadra
     * contra el movimiento del banco— y el selector nativo del telefono habla
     * AAAA-MM-DD, que es lo que exige `<input type="date">`. La traduccion vive
     * aqui, en un sitio, y no repartida entre la pantalla y el servidor.
     */
    fechaAISO: function (v) {
      var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || ''))
      return m ? m[3] + '-' + m[2] + '-' + m[1] : ''
    },
    fechaDesdeISO: function (v) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''))
      return m ? m[3] + '/' + m[2] + '/' + m[1] : ''
    },

    /**
     * EL PRECIO DE UN PUESTO, en un solo sitio.
     *
     * Estaba escrito a mano en siete: cuatro veces en la landing, dos en Mi
     * cuenta, una en el correo de «abrimos tu zona» y dos como respaldo en la
     * ruta del pago. Bajarlo de 8 a 7 obligaba a acertar en los siete y
     * cualquiera que se escape deja la pantalla diciendo un precio y el cobro
     * haciendo otro — que es la peor forma de equivocarse que tiene esto.
     *
     * La verdad operativa sigue siendo `events.price_usd`: cada fecha puede
     * tener el suyo y es lo que se cobra. Esto es lo que se ENSEÑA cuando se
     * habla del precio en general, sin una fecha delante.
     */
    /**
     * Las cocinas. UN catalogo, no dos.
     *
     * Lo usan la pregunta «elige tus 3 comidas favoritas» del cuestionario y
     * la ficha del local, y cruzar las dos es lo que dice que restaurante pide
     * la bolsa de una fecha. Con dos listas paralelas —una en la pantalla del
     * alta y otra en la del cuestionario— se desincronizan a su ritmo y el
     * cruce empieza a fallar sin que nada avise, que es exactamente lo que ya
     * paso aqui con las zonas.
     */
    COCINAS: [
      ['Venezolana', 'venezolana'],
      ['Parrilla y carnes', 'parrilla'],
      ['Italiana', 'italiana'],
      ['Pizza', 'pizza'],
      ['Japonesa', 'japonesa'],
      ['Asiática', 'asiatica'],
      ['Peruana', 'peruana'],
      ['Mexicana', 'mexicana'],
      ['Española', 'espanola'],
      ['Mediterránea', 'mediterranea'],
      ['Árabe', 'arabe'],
      ['Pescados y mariscos', 'mariscos'],
      ['De autor y fusión', 'autor'],
      ['De mercado y vegetariana', 'mercado'],
      ['Hamburguesas', 'hamburguesas'],
    ],

    /**
     * Lo que cuesta la plaza. DIEZ desde el 13-10, antes siete.
     *
     * Y esto es SOLO el valor por defecto de una fecha nueva. Lo que se
     * cobra de verdad sale de `events.price_usd`, que se congela al abrir
     * la fecha: las tres abiertas con siete siguen cobrando siete, y la
     * gente que ya pagó no se entera de nada.
     *
     * Esa separación es la que hay que respetar al escribir el precio en
     * cualquier sitio. Si el texto cuelga de UNA fecha concreta, el número
     * tiene que salir de esa fecha; si habla del club en general —la
     * portada, las preguntas frecuentes— sale de aquí. Mezclarlo ya costó
     * caro una vez: dos fechas se abrieron prometiendo siete y cobrando
     * ocho, y eso no falla en ningún sitio hasta que alguien paga.
     */
    PRECIO_USD: 10,
    /**
     * Cómo se dice el precio. En REF, no en USD, desde el 13-10.
     *
     * En Venezuela el precio se dice en «ref» —referencia— y cada
     * establecimiento decide con qué tasa del BCV cobra. Aro cobra a tasa
     * EURO. Decir «10 USD» y cobrar al cambio del euro sería decir una cosa
     * y hacer otra: la gente que lee «USD» hace la cuenta con el dólar y le
     * sale otro número del que va a pagar.
     *
     * La constante sigue llamándose `PRECIO_USD` por dentro, y ahí sí hay
     * una deuda: el nombre dice dólares y el número ya no es de dólares.
     * Cambiarlo toca `price_usd` y `amount_usd` en la base, que es otra
     * tarde. Lo que NO podía quedarse así es lo que lee la gente.
     */
    precioTexto: function () {
      return this.PRECIO_USD + ' ref'
    },

    aE164: function (valor) {
      var v = String(valor == null ? '' : valor).trim()
      var digitos = v.replace(/\D/g, '')
      if (!digitos) return ''

      // El '+58 +58' que ya aparecio una vez en un perfil. Un numero
      // venezolano es 58 y diez cifras que empiezan por 4, asi que un
      // '5858' al principio solo puede ser el prefijo puesto dos veces:
      // ni el filtro ni el validador lo cazaban y se guardaba tal cual.
      while (digitos.indexOf('5858') === 0) digitos = digitos.slice(2)

      // EL CERO DE DELANTE. En Venezuela el numero se escribe y se dicta
      // como 0412-1234567: el cero es el prefijo nacional de llamada y NO
      // forma parte del numero internacional. Quien lo teclea —que es como lo
      // teclea casi todo el mundo, porque es como esta en su agenda— mandaba
      // '+5804121234567', y la restriccion de la base exige
      // '^\+58(412|414|416|422|424|426)[0-9]{7}$'. La fila no entraba, la ruta
      // devolvia un 500 y la pantalla decia «No pudimos guardar tus datos»
      // sin decir cual.
      //
      // Se quita aqui y no en la pantalla porque esta funcion la usan el
      // navegador y el servidor: arreglado en un solo sitio, no en dos que se
      // desincronizan. Y se quita UNO solo, detras del pais: un numero que
      // empiece por doble cero es otra cosa y no se toca.
      var sinCeroNacional = function (pais, resto) {
        return pais + resto.replace(/^0(?!0)/, '')
      }

      // Con prefijo escrito, manda quien escribe.
      if (v.charAt(0) === '+') {
        var m = digitos.match(/^(58|34)(.*)$/)
        return m ? '+' + sinCeroNacional(m[1], m[2]) : '+' + digitos
      }
      // Sin prefijo: venezolano, que es la unica ciudad abierta.
      return '+' + sinCeroNacional('58', digitos.replace(/^58/, ''))
    },

    /**
     * El teléfono de un método de pago, según su país. Un solo sitio donde
     * decidirlo: la divergencia entre el filtro y el validador es lo que
     * dejó Bizum imposible de enviar.
     */
    campoTelefonoDe: function (prefijo) {
      var p = String(prefijo || '').replace(/\D/g, '')
      if (p === '34') return 'telefonoBizum'
      return 'telefonoPagoMovil'
    },

    /**
     * Qué regla aplica a un campo de un método de pago. Los métodos
     * describen sus campos con `tipo` y, en los teléfonos, `prefijo`; aquí
     * se traduce a la regla, en un solo sitio.
     *
     * Sin esto, la pantalla decidía por su cuenta cuántos dígitos caben y
     * el servidor por la suya: el desacuerdo dejó Bizum imposible de
     * enviar.
     */
    campoDe: function (definicion) {
      var d = definicion || {}
      if (d.tipo === 'tel') return api.campoTelefonoDe(d.prefijo)
      if (d.tipo === 'documento') return 'cedula'
      if (d.tipo === 'banco') return 'banco'
      if (d.tipo === 'fecha') return 'fechaPago'
      if (d.tipo === 'numero') return d.largo === 6 ? 'referencia' : 'otp'
      // `texto` y los que no declaran tipo —el titular de Zelle, su código—
      // no tienen forma fija: se exige que no vengan vacíos y ya.
      return null
    },

    /**
     * La zona en la que habla el producto.
     *
     * Escrita una vez porque el dia de una cena depende de ella: la del
     * sabado 3 a las ocho de la noche de Caracas es medianoche del 4 en UTC,
     * asi que `getDay()` a secas la cuenta como domingo. Ya paso en el
     * servidor —el panel y las fechas de borrado decian un dia de mas— y en
     * el navegador pasa igual con quien viaje.
     *
     * Es lo que hay que cambiar el dia que `cities` tenga su columna de zona
     * horaria: entonces cada cena hablara en la hora de SU ciudad.
     */
    ZONA: 'America/Caracas',

    /**
     * Los meses, en minuscula y escritos aqui.
     *
     * No salen del motor: en Hermes el nombre del mes no llega, y en
     * cualquier motor depende de que el locale este instalado. Doce palabras
     * que no cambian nunca pesan menos que una dependencia que falla en un
     * telefono y no en el portatil de quien lo programa.
     */
    MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
            'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],

    /**
     * El dia de la semana de una fecha, en la zona del producto.
     *
     * Existe porque el dia estaba ESCRITO: «vuelves a entrar el sábado»,
     * «el sábado a mediodía». Era verdad mientras todas las cenas cayeran en
     * sábado, y dejo de serlo el jueves que hubo que barrer la web entera,
     * el panel y los correos para cambiar una palabra.
     *
     * Sin fecha abierta devuelve null, y la frase se dice sin dia. Es mejor
     * que inventarse uno.
     */
    /**
     * Las etiquetas de campana que trae la URL, para que no se pierdan.
     *
     * Quien pulsa el boton de un correo sin sesion aterriza en una pantalla
     * privada, que lo manda a /entrar con la direccion original metida
     * dentro de `volver`. Ahi dentro, Analytics no las ve: la visita entra
     * como trafico directo y el correo que la trajo es invisible.
     *
     * Se probo el 19-10 con el resumen de los lunes: /cuenta?utm_... acaba
     * en /entrar?volver=%2Fcuenta%3Futm_source%3D... y la unica baliza que
     * sale no lleva campana ninguna.
     *
     * Asi que al mandar a entrar se copian tambien sueltas. `volver` sigue
     * llevandolas para cuando la persona entre y vuelva.
     */
    campanaDe: function (busqueda) {
      var fuera = []
      try {
        new URLSearchParams(busqueda || '').forEach(function (v, k) {
          if (k.slice(0, 4) === 'utm_') fuera.push([k, v])
        })
      } catch (e) { /* sin URLSearchParams no hay campana que copiar */ }
      return fuera
    },

    diaDe: function (iso, zona) {
      if (!iso) return null
      var d = new Date(iso)
      if (isNaN(d.getTime())) return null
      try {
        return new Intl.DateTimeFormat('es-VE', { timeZone: zona || api.ZONA, weekday: 'long' }).format(d)
      } catch (e) {
        return null
      }
    },

    /**
     * Los dias de la semana en que caen unas fechas, sin repetir.
     *
     * «Sabado». «Viernes y sabado». Es lo que va debajo del nombre de cada
     * formato en el filtro de la agenda, y se DERIVA de las fechas que hay
     * abiertas: un mapa escrito a mano —«Cenas: jueves y viernes»— miente el
     * dia que se abre una cena en sabado, y miente en silencio.
     *
     * Vivia en la app (`texto/fechas.ts`), que lo estreno. Sube aqui porque
     * la web lo necesita igual y porque la web tenia su propia version: un
     * objeto fijo con «Sabado y viernes» para Cenas, en ese orden, que no
     * miraba ninguna fecha.
     *
     * Ordena por fecha antes de listar: «Viernes y sabado» y no «Sabado y
     * viernes» no es cosmetica, es el orden en que van a ocurrir.
     */
    diasDe: function (fechas) {
      var vistos = []
      var lista = (fechas || []).slice().sort(function (a, b) {
        return new Date(a.iso).getTime() - new Date(b.iso).getTime()
      })
      for (var i = 0; i < lista.length; i++) {
        var d = api.diaDe(lista[i].iso, lista[i].zona)
        if (d && vistos.indexOf(d) < 0) vistos.push(d)
      }
      if (!vistos.length) return ''
      var texto = vistos.length === 1
        ? vistos[0]
        : vistos.slice(0, -1).join(', ') + ' y ' + vistos[vistos.length - 1]
      return texto.charAt(0).toUpperCase() + texto.slice(1)
    },

    /**
     * Las piezas de una fecha, en la zona que toque.
     *
     * Existe porque las pantallas las sacaban con `getDay()`, `getDate()`,
     * `getMonth()` y `getHours()`, que son la hora LOCAL DEL NAVEGADOR. La
     * cena del sábado a las ocho de la noche de Caracas es medianoche del
     * domingo en Madrid, así que a quien esté fuera de Venezuela —o a
     * cualquiera que viaje— la pantalla le dice el día equivocado.
     *
     * Es el mismo fallo que ya se arregló en el servidor, donde Vercel corre
     * en UTC y el panel decía un día de más. Aquí estaba vivo en cuarenta y
     * seis sitios.
     *
     * `zona` es la de la ciudad de esa fecha, que viaja en las respuestas
     * como `zonaHoraria`. Sin ella, la del producto.
     */
    partesDe: function (iso, zona) {
      if (!iso) return null
      var d = new Date(iso)
      if (isNaN(d.getTime())) return null
      var z = zona || api.ZONA
      try {
        // SIN `formatToParts`. En Hermes —el motor de la app en el iPhone—
        // devuelve mal `month` y `year`, y de ahi salia el «8 de NaN» del
        // historial de cenas: `day` y `weekday` si llegaban, asi que el fallo
        // parecia de la pantalla y no de aqui.
        //
        // `format()` si funciona, y `mesNumero` ya lo usaba por su cuenta.
        // Ahora TODO lo numerico sale de dos cadenas con formato fijo, que es
        // lo mismo que hacia falta y ademas una llamada menos.
        //
        // `en-CA` con año, mes y dia da «2026-10-09» en cualquier motor: es
        // el unico locale que la especificacion fija en ese orden.
        var ymd = new Intl.DateTimeFormat('en-CA', {
          timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d)
        var hm = new Intl.DateTimeFormat('en-GB', {
          timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(d)

        var ano = parseInt(ymd.slice(0, 4), 10)
        var mesNumero = parseInt(ymd.slice(5, 7), 10) - 1
        var numero = parseInt(ymd.slice(8, 10), 10)
        // Medianoche sale como «24:00» en algunos motores.
        var horas = parseInt(hm.slice(0, 2), 10) % 24
        var minutos = parseInt(hm.slice(3, 5), 10)

        // Si algo no se pudo leer se devuelve null y no un objeto con NaN
        // dentro. Un NaN no falla: viaja hasta la pantalla y se imprime.
        if (isNaN(ano) || isNaN(mesNumero) || isNaN(numero) || isNaN(horas) || isNaN(minutos)) {
          return null
        }

        // El dia de la semana como numero, que es lo que usan las tablas de
        // la pantalla. `en-US` para que el nombre sea estable y no dependa de
        // acentos ni de mayusculas.
        var ingles = new Intl.DateTimeFormat('en-US', { timeZone: z, weekday: 'short' }).format(d)
        var DIAS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        return {
          dia: new Intl.DateTimeFormat('es-VE', { timeZone: z, weekday: 'long' }).format(d),
          diaNumero: DIAS.indexOf(ingles.slice(0, 3)),
          numero: numero,
          // Del numero de mes y no de una cadena del motor: es lo mismo en
          // todas partes y no depende de que el locale este instalado.
          mes: api.MESES[mesNumero] || '',
          mesNumero: mesNumero,
          ano: ano,
          horas: horas,
          minutos: minutos,
          hora: api.horaDe(iso, z),
        }
      } catch (e) {
        return null
      }
    },

    /**
     * LAS NORMAS QUE SE ACEPTAN UNA VEZ.
     *
     * Vive aqui porque la pintan dos sitios —la pantalla de la web y la de
     * la app— y es un texto legal: dos copias de un texto legal son dos
     * textos legales, y el dia que cambie uno nadie se acuerda del otro.
     *
     * Viene del rechazo de Apple por la norma 1.2: hay que aceptar antes de
     * ver contenido de otra gente. Michael eligio el copy el 18-10: la cinta
     * de «NORMAS ACTUALIZADAS» como titulo y la linea de contexto debajo,
     * «B como titulo + A como contexto».
     *
     * La linea de `actualizacion` no es relleno: esta pantalla le sale de
     * golpe a gente que lleva semanas en el club, y sin ella se lee como un
     * error o como una trampa. Michael: «hay que dejar claro que es una
     * actualizacion porque el que no vio esto antes se confunde al ver esta
     * pantalla y nada mas».
     */
    NORMAS: {
      cinta: 'NORMAS ACTUALIZADAS',
      titulo: 'Seguridad y normas',
      bajada: 'Aro Club funciona porque cada mesa es un sitio seguro.',
      actualizacion: 'Las pusimos por escrito y te las enseñamos una vez. Si las aceptas, esta pantalla no vuelve a salir.',
      puntos: [
        ['Tolerancia cero', 'Con el acoso, los insultos, el contenido ofensivo y cualquier abuso, en la mesa y en la app. Quien lo haga sale del club.'],
        ['Puedes reportar', 'A cualquier persona de tu mesa, desde Mi mesa. Lo lee una persona el mismo día.'],
        ['Puedes bloquear', 'A quien quieras: no vuelve a coincidir contigo y no se le avisa.'],
      ],
      pie: 'Al usar Aro Club aceptas estas normas, los Términos y la Privacidad.',
      casilla: 'Acepto las normas de seguridad y los Términos, con tolerancia cero a cualquier abuso.',
      botonListo: 'Continuar',
      botonFalta: 'Acepta las normas para continuar',
    },

    /**
     * EN QUE SEMANA CAE UNA FECHA. 0 esta, 1 la que viene, 2 mas adelante.
     *
     * Michael, 18-10, viendo la app: «estoy viendo todas las cenas en ESTA
     * SEMANA y brunch en LA SEMANA QUE VIENE. Ambas son esta semana. Nuestra
     * semana va de lunes a viernes».
     *
     * Tenia razon y el fallo era de bulto: no se agrupaba por semanas, se
     * agrupaba por DIAS QUE FALTAN —menos de siete, esta semana; menos de
     * catorce, la que viene—. Un domingo por la tarde, la cena del jueves
     * caia a cuatro dias y el brunch del domingo siguiente a siete, asi que
     * la misma semana salia partida en dos titulos.
     *
     * Ahora son semanas de calendario y empiezan en LUNES, que es como se
     * cuentan aqui. Y en la zona de la fecha, no en la del telefono: un
     * domingo a las nueve de la noche en Caracas ya es lunes en Madrid, y la
     * semana de la cena es la de Caracas.
     */
    semanaDe: function (iso, zona, ahora) {
      var p = api.partesDe(iso, zona)
      // `ahora` opcional: sin el, el reloj de verdad. Con el, se puede
      // probar una semana concreta sin esperar al domingo que viene. Lo
      // pidio el agente de la app, que tuvo que copiar esta funcion para
      // poder escribir pruebas que pasen siempre.
      var hoy = api.partesDe(ahora || new Date().toISOString(), zona)
      if (!p || !hoy) return 2
      // Dia absoluto, para restar sin que el horario de verano estorbe.
      var dia = function (q) { return Math.floor(Date.UTC(q.ano, q.mesNumero, q.numero) / 86400000) }
      // Y el lunes de SU semana: domingo es 0, asi que va seis dias atras.
      var lunes = function (q) { return dia(q) - ((q.diaNumero + 6) % 7) }
      /**
       * EL DOMINGO YA CUENTA COMO LA SEMANA QUE EMPIEZA.
       *
       * Solo para HOY, no para las fechas. Es como se habla: un domingo por
       * la tarde, «esta semana» es la que empieza mañana, no la que se está
       * acabando. Michael lo dijo asi mismo mirando la agenda un domingo
       * —«todas son esta semana»— con la cena del jueves dentro.
       *
       * Sin esto, un domingo la agenda entera dice «La semana que viene»,
       * que es verdad de calendario y mentira de como se lee.
       */
      var lunesHoy = lunes(hoy) + (hoy.diaNumero === 0 ? 7 : 0)
      var semanas = (lunes(p) - lunesHoy) / 7
      if (semanas <= 0) return 0
      return semanas === 1 ? 1 : 2
    },

    /**
     * La hora de una fecha, en la zona del producto y como se dice.
     *
     * «12:00 p.m.» la calculaban por su cuenta la app, los correos y las
     * pantallas, cada uno con su formato. Y la hora no es una regla: sale de
     * `reveal_at` y de `starts_at`, que operacion pone al crear el evento,
     * porque no todas las cenas son a la misma hora y ademas vienen brunch,
     * cafes y formatos de movimiento.
     */
    horaDe: function (iso, zona) {
      if (!iso) return null
      var d = new Date(iso)
      if (isNaN(d.getTime())) return null
      try {
        return new Intl.DateTimeFormat('es-VE', {
          timeZone: zona || api.ZONA, hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(d).replace(/\s*a\.?\s*m\.?/i, ' a.m.').replace(/\s*p\.?\s*m\.?/i, ' p.m.')
      } catch (e) {
        return null
      }
    },

    /** Las doce horas en letra, para `horaEnLetra`. */
    HORAS_EN_LETRA: ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'],

    /**
     * «siete y media de la noche». La hora como se dice, no como se escribe.
     *
     * LOS MINUTOS NO SE PUEDEN TIRAR. Esto existía en tres sitios —la app,
     * los correos y Mi cuenta— y dos de ellos solo miraban la hora: la cena
     * del sábado es a las 7:30 y salía «Sábado 10, siete de la noche», en la
     * portada de la cuenta y en el recordatorio de la mañana. Media hora de
     * diferencia en el único dato por el que alguien sale de su casa.
     *
     * En punto, y cuarto, y media y menos cuarto se dicen en letra, que es
     * como se dice una hora en voz alta. CUALQUIER OTRO MINUTO vuelve a las
     * cifras —«7:20 p.m.»— en vez de inventar «siete y veinte»: una hora
     * rara escrita en letra se lee dos veces, y la que importa es la de
     * llegar a tiempo.
     *
     * Las siete son de la NOCHE y no de la tarde: es como se dice en Caracas
     * y como lo dice el copy de Design.
     */
    horaEnLetra: function (horas, minutos) {
      var h = (((horas | 0) % 24) + 24) % 24
      var m = minutos | 0
      var resto = ''
      if (m === 30) resto = ' y media'
      else if (m === 15) resto = ' y cuarto'
      else if (m === 45) { resto = ' menos cuarto'; h = (h + 1) % 24 }
      else if (m !== 0) {
        var h12 = h % 12 === 0 ? 12 : h % 12
        return h12 + ':' + (m < 10 ? '0' + m : '' + m) + ' ' + (h < 12 ? 'a.m.' : 'p.m.')
      }
      var franja = h >= 19 || h < 6 ? 'de la noche' : h >= 12 ? 'de la tarde' : 'de la mañana'
      return api.HORAS_EN_LETRA[h % 12] + resto + ' ' + franja
    },

    /**
     * La misma, desde una fecha y la zona de SU ciudad.
     *
     * Es la que usan el servidor y las pantallas, que tienen un ISO y no
     * horas sueltas. La app llama a la de arriba, porque ya tiene las partes.
     */
    horaEnLetraDe: function (iso, zona) {
      var p = api.partesDe(iso, zona)
      return p ? api.horaEnLetra(p.horas, p.minutos) : ''
    },

    /**
     * Las preguntas de la puerta: la ciudad y las cuatro de siempre.
     *
     * Son las que se hacen antes de tener cuenta —en la portada y en la
     * entrada de la app— y viven aquí por la misma razón que el resto de
     * este fichero: eran dos sitios escribiendo la misma lista a mano, y
     * con la app iban a ser tres.
     *
     * Cada opción es un par `[texto, código]` en UNA sola lista. Antes eran
     * dos listas —los textos arriba y `COD` doscientas líneas más abajo—
     * unidas solo por el índice. Es exactamente lo que rompió el
     * cuestionario en agosto: se reordenó una y la respuesta se archivó como
     * otra, sin error, sin validación fallida y sin verse en ninguna
     * pantalla. Aquí no se puede: el código viaja pegado a su texto.
     *
     * `zonas` y `ciudad` van sin opciones a propósito. Las zonas se abren y
     * se cierran desde el panel, así que las trae `/api/zonas` en caliente;
     * escritas a mano se quedaron en diez cuando la base tenía trece, y
     * quien vivía en las otras tres no podía decirlo. Las ciudades son la
     * tabla `cities`, y las sirve `/api/ciudades`.
     *
     * Los códigos son los del catálogo (`questions`), que es lo que manda al
     * guardar. `comprobar-cuestionario.mjs` lo verifica contra la base: un
     * código que no exista ahí no llega a producción.
     */
    PUERTA: {
      /**
       * La ciudad, y va PRIMERO.
       *
       * No estaba. La portada preguntaba las zonas de Caracas a todo el
       * mundo y ofrecía la ciudad DEBAJO, como salida —«¿No vives en
       * Caracas?»—, así que quien entra por el registro no la veía nunca.
       * El 15-10 escribieron dos miembros: uno desde Maracaibo y otro desde
       * Valencia, los dos con zonas de Caracas marcadas, porque era lo
       * único que se les preguntó. Sus mesas se decidían con un dato que no
       * es el suyo.
       *
       * Primero porque es la puerta que puede cerrar: con la ciudad cerrada
       * no hay zonas que ofrecer —las zonas son de una ciudad— ni mesa que
       * armar, y preguntar cuatro cosas más es cobrarle trabajo a quien no
       * podemos sentar todavía. Es la misma regla del nacimiento y los 18:
       * nada de esfuerzo antes de la puerta que puede rechazarlo.
       *
       * Sin opciones, igual que las zonas: el catálogo es la tabla `cities`
       * —con su orden y su `is_open`— y lo sirve `/api/ciudades`. Escrita a
       * mano aquí serían dos listas, y la lista de ciudades ya tuvo esa
       * forma de fallo en la portada: slugs en una constante y nombres en
       * otra, emparejados solo por el índice.
       */
      ciudad: {
        clave: 'ciudad', etiqueta: 'CIUDAD', tipo: 'unica',
        pregunta: '¿En qué ciudad estás?',
        ayuda: 'Abrimos ciudad cuando hay suficiente gente que pueda llegar a la misma mesa el mismo día.',
        opciones: [],
      },
      arraigo: {
        clave: 'arraigo', etiqueta: 'ARRAIGO', tipo: 'unica',
        pregunta: '¿Cuál de estas eres tú?',
        ayuda: 'Una sola. Nos dice quién está llegando a Aro, y por dónde abrir.',
        // La MISMA redacción que el cuestionario y que el catálogo. Habia
        // tres, y dos de ellas no querian decir lo mismo: «Llegué y no
        // conozco a nadie» aqui, «Me mudé a Caracas desde el interior» en el
        // cuestionario y «Llegué de otra ciudad y no conozco a nadie» en la
        // base. Quien acaba de mudarse desde fuera del pais encontraba su
        // casilla o no segun por donde entrara, y con esto se decide su mesa.
        //
        // `interior` no dice de donde se llega A PROPOSITO. La entrega 7
        // retiro `extranjero` y lo fusiono aqui —esta escrito en su
        // migracion— asi que este cajon es «acabo de llegar y no conozco a
        // nadie», se venga de Valencia o de Madrid. Tampoco nombra la ciudad:
        // sigue valiendo el dia que se abra otra.
        opciones: [
          ['Me fui del país y volví', 'volvio'],
          ['Nunca me fui, pero casi todos sí', 'se-quedo'],
          // «Soy nueva o nuevo en la ciudad» y no «Llegué hace poco y no conozco
          // a nadie»: quien volvió de fuera leía las dos y no sabía cuál era
          // la suya —«me fui del país y volví» también llegó hace poco y
          // tampoco conoce a nadie—. El código NO cambia: las respuestas ya
          // guardadas siguen valiendo, y el catálogo se mueve con su migración
          // para que la pantalla y la base no digan cosas distintas.
          ['Soy nueva o nuevo en la ciudad', 'interior'],
          ['Estoy de paso', 'visita'],
          ['Sigo con la gente de siempre', 'mismos'],
          ['Trabajo remoto y casi no veo gente', 'remoto'],
        ],
      },
      zonas: {
        clave: 'zonas', etiqueta: 'ZONAS', tipo: 'multi', max: 5,
        pregunta: '¿Dónde te queda cómodo salir?',
        // Neutra: este texto lo comparten la portada y la app, y en la app
        // no hay nada «arriba» —la pregunta llega sola, sin el selector de
        // zonas de la portada delante—. Decía «son las mismas que puedes
        // marcar arriba» y ahí no señalaba a nada.
        ayuda: 'Hasta cinco. Marca todas a las que puedas llegar sin pensarlo.',
        opciones: [],
      },
      dias: {
        clave: 'dias', etiqueta: 'DÍAS', tipo: 'multi',
        pregunta: '¿Qué días te sirven mejor?',
        ayuda: 'Marca todos los que puedas. Sin esto no podemos sentarte en ninguna mesa.',
        opciones: [
          ['Jueves noche', 'jue'],
          ['Viernes noche', 'vie'],
          ['Sábado mañana', 'sab-am'],
          ['Sábado noche', 'sab'],
          ['Domingo mañana', 'dom-am'],
        ],
      },
      temas: {
        clave: 'temas', etiqueta: 'CONVERSACIÓN', tipo: 'multi', min: 2, max: 4,
        pregunta: '¿De qué podrías hablar dos horas seguidas?',
        ayuda: 'Entre dos y cuatro. Es con lo que armamos tu mesa.',
        // Diez de las dieciocho del catálogo, a propósito: en la puerta
        // dieciocho fichas son demasiadas para el primer minuto. El
        // cuestionario sí las ofrece todas.
        //
        // Las diez van con la redacción EXACTA del catálogo. Decían «Cocina»
        // y «Negocios» y el cuestionario los llama «Cocina y restaurantes» y
        // «Negocios y emprender»: quien marcaba uno en la puerta lo veía con
        // otro nombre en su perfil y no sabía si era lo mismo.
        opciones: [
          ['Cocina y restaurantes', 'cocina'],
          ['Viajes', 'viajes'],
          ['Cine y series', 'cine'],
          ['Música', 'musica'],
          ['Libros', 'libros'],
          ['Deporte', 'deporte'],
          ['Negocios y emprender', 'negocios'],
          ['Arte y diseño', 'arte'],
          ['Tecnología', 'tecnologia'],
          ['Crianza', 'crianza'],
        ],
      },
    },

    /**
     * Las cuatro de después de la ciudad, en su orden.
     *
     * Se queda con las cuatro —y no con las cinco— porque es lo que leen
     * hoy la portada y la entrada de la app para pintar «PREGUNTA n DE 4»,
     * y porque la app descarta la puerta entera si una pregunta llega sin
     * opciones (`preguntasDeEntrada`, §e.1): meter aquí la ciudad, que las
     * trae de `/api/ciudades`, dejaría la app sin alta hasta que la pidiera.
     * La puerta completa es `pasosDePuerta()`.
     */
    ORDEN_PUERTA: ['arraigo', 'zonas', 'dias', 'temas'],

    /**
     * La puerta entera: la ciudad y, si está abierta, las cuatro.
     *
     * Una sola función para las dos superficies, porque lo que se decide
     * aquí es de producto y no de pantalla: en una ciudad cerrada la puerta
     * TERMINA en la propia pregunta. No se piden zonas —son de una ciudad
     * que no es la suya—, ni días, ni temas: no hay mesa que armar con eso
     * todavía, y lo que se le promete es que le escribimos.
     *
     * `abierta` indefinido es «todavía no lo ha dicho»: la puerta se enseña
     * entera, que es lo que vale mientras no haya respuesta.
     */
    pasosDePuerta: function (abierta) {
      return abierta === false ? ['ciudad'] : ['ciudad'].concat(api.ORDEN_PUERTA)
    },

    /**
     * Lo que se le dice a quien vive donde todavía no abrimos.
     *
     * Dos frases de Michael (15-10), y van aquí para que la portada, la app
     * y Mi perfil digan las tres lo mismo. Sin fecha a propósito: una
     * ciudad abre cuando hay gente suficiente, no en una semana concreta, y
     * prometer un plazo que no controlamos es peor que no prometer ninguno.
     */
    CIUDAD_CERRADA: function (nombre, slug) {
      // «Otra ciudad todavía no» no se puede leer: no es el nombre de
      // ningún sitio. Quien marca esa casilla no nos ha dicho dónde está,
      // así que la frase no puede nombrarlo.
      return {
        titulo: slug === 'otra'
          ? 'Todavía no estamos ahí.'
          : (nombre || 'Tu ciudad') + ' todavía no.',
        bajada: 'Te escribimos el día que abramos.',
      }
    },

    /**
     * Cómo se llama esto según el formato: mesa o grupo.
     *
     * Once formatos y un solo vocabulario: la pantalla se llamaba «Mi mesa»
     * y el correo decía «TU MESA · 04» también para una caminata del
     * domingo, donde no hay mesa ni restaurante — hay un grupo y un punto de
     * encuentro. Y hay que llevar el género, porque «una grupo» es
     * castellano roto.
     *
     * Vive aquí y no en cada pantalla porque lo usan las cuatro del miembro,
     * el panel y los correos. Con una copia por sitio, cambiar una palabra
     * es cambiarla en seis y acordarse de los seis.
     */
    VOZ_MESA: {
      unidad: 'mesa', unidades: 'mesas', Unidad: 'Mesa', Unidades: 'Mesas',
      art: 'una', Art: 'Una', esta: 'esta', tu: 'tu', La: 'La', el: 'la',
      sitio: 'restaurante', Sitio: 'Restaurante', sitioCorto: 'el sitio',
      sentados: 'sentados', juntarse: 'sentarse', mia: 'Mi mesa', TU: 'TU MESA',
      conQuien: 'CON QUIÉN VAS', estuviste: 'Estuviste en',
      vasCon: 'Vas con cinco personas.',
    },

    VOZ_GRUPO: {
      unidad: 'grupo', unidades: 'grupos', Unidad: 'Grupo', Unidades: 'Grupos',
      art: 'un', Art: 'Un', esta: 'este', tu: 'tu', La: 'El', el: 'el',
      sitio: 'punto de encuentro', Sitio: 'Punto de encuentro', sitioCorto: 'el punto',
      sentados: 'repartidos', juntarse: 'juntarse', mia: 'Mi grupo', TU: 'TU GRUPO',
      conQuien: 'CON QUIÉN VAS', estuviste: 'Estuviste en',
      vasCon: 'Vas con cinco personas.',
    },

    /**
     * Cuántas horas antes de la cena se cierra el apuntarse.
     *
     * Estaba escrita en `/api/operacion/fechas` y repetida en texto en la
     * portada, en Legal y en el correo de fecha cancelada. Vive aquí porque la
     * leen el panel al abrir una fecha, el copy que la promete y la app.
     *
     * **24**, decisión de Michael. Lo que compra: un día más para que se
     * apunte gente, que con poco volumen es la diferencia entre armar una
     * mesa y no armarla.
     *
     * Lo que cuesta, para que nadie lo descubra tarde: operación se queda con
     * menos de un día entre el cierre y la cena para armar las mesas y
     * reservar los restaurantes. Y el aviso de que una fecha se cancela no
     * puede darse antes del cierre, así que esa antelación queda acotada por
     * esta misma cifra.
     *
     * El copy que la menciona la LEE de aquí —la portada, Legal, la pantalla
     * de pago, el correo de fecha cancelada y el panel—, así que moverla es
     * cambiar este número y nada más. Estuvo escrita a mano en cinco sitios y
     * bajarla dejaba cuatro mintiendo.
     */
    HORAS_DE_CIERRE: 24,

    /**
     * Cuántos días guardamos la cédula y la selfie después de verificar.
     *
     * CIENTO VEINTE desde el 13-10. Estaba en 90 y lo sube Michael mientras
     * arranca el club: sin historial de comportamiento todavía, poder volver
     * a mirar quién era alguien vale más que el ahorro de no guardarlo.
     *
     * Vive aquí porque el número estaba escrito a mano en SEIS sitios: la
     * función de la base que decide qué purgar, la pantalla de verificación
     * —que promete la fecha de borrado—, la ficha del miembro en Operación,
     * Mi cuenta, el legal y el propio cron. Es exactamente la forma del
     * fallo que ya costó caro con el precio: se baja en cinco y el que se
     * escapa deja una pantalla prometiendo una cosa y el borrado haciendo
     * otra. Sobre documentos de identidad, eso no es un descuadre de copy.
     *
     * La base tiene el suyo en `documentos_a_purgar()` y no puede leer este
     * fichero: si se cambia aquí, hace falta una migración. El comprobador
     * vigila que los dos digan lo mismo.
     */
    DIAS_GUARDA_FOTOS: 120,

    /**
     * Lo más largo que admite una respuesta escrita a mano. Hoy solo hay
     * una: «¿Dónde trabajas?».
     *
     * Vive aquí porque el número estaba en DOS sitios que no se hablaban: el
     * validador del servidor y la app, que lleva su propio `MAX_TEXTO`. La
     * web no lo tenía en ninguno, y por eso el campo dejaba escribir sin
     * límite y el servidor lo rechazaba después.
     *
     * Lo que eso provocó, el 14-10 entre las 10:38 y las 10:42: DIEZ
     * rechazos, todos de `empleador`. Y en el peor sitio posible — el
     * empleador se reenvía al pulsar «Terminar», así que el «esa respuesta
     * no cuadra» aparecía en la última pantalla, después de diecisiete
     * preguntas, sin decir cuál era la respuesta mala. La persona no tenía
     * forma de saber qué arreglar.
     *
     * Un límite que la pantalla no enseña no es un límite: es una trampa al
     * final del recorrido.
     */
    MAX_TEXTO: 120,

    /**
     * El juego de la mesa.
     *
     * El mazo aprobado vive en `app-mobile/JUEGO.md` y se copia aquí a
     * propósito: aquí es donde lo leen los dos, la app y la web. Cambiar una
     * pregunta es cambiarla en este fichero y en ese documento, no en cinco
     * pantallas.
     *
     * **El juego no necesita nada del servidor.** No hay estado por mesa, ni
     * sincronización, ni una llamada que pueda fallar en un restaurante con
     * mal wifi. Lo único que hace falta para que seis teléfonos vean lo mismo
     * es el id de la mesa, que todos ya tienen, y `preguntasDeRonda`.
     */
    /**
     * «7:30 p.m.» → «7:30».
     *
     * En la columna de horas del paso a paso no cabe el sufijo, y repetir
     * «p.m.» ocho veces seguidas no añade nada: la cena entera pasa en la
     * misma franja. Vive aquí porque la columna es igual en la app.
     */
    horaCorta: function (hora) {
      return String(hora == null ? '' : hora).replace(/\s*[ap]\.\s?m\.$/i, '').trim()
    },

    /**
     * El guion de la mesa: los momentos de una cena, con su hora real.
     *
     * Sustituye al anfitrión que no podemos pagar. Lo ve toda la mesa y la
     * propia mesa elige a «la voz de Aro», que lo va leyendo; no hay anfitrión
     * elegido por el servidor (se descartó el 14-10: demasiado lío).
     *
     * Vive aquí porque lo pintan la app y la web, y es texto que Michael
     * aprobó una vez. Lo escribió el agente de la app y lo pidió compartido
     * —«súbelos a reglas.js y la app los lee de ahí»—: dos copias de ocho
     * párrafos son dos guiones distintos en cuanto alguien corrija una coma.
     *
     * Genérico a propósito: ni horas fijas ni bares. Las horas salen de
     * cuándo empieza y de hasta cuándo nos deja la mesa el restaurante, así
     * que un brunch reutiliza esto con las suyas.
     */
    GUION: {
      titulo: 'Paso a paso',
      bajada: 'Una guía, no un horario. Cada mesa va a su ritmo.',
      ahora: 'AHORA',

      /**
       * Lo que dura una mesa: DOS HORAS, siempre (Michael, 15-10).
       *
       * Se intentó sacarlo de `restaurants.last_seating`, y es otra cosa: esa
       * columna es lo más tarde que puede EMPEZAR una cena, no hasta cuándo
       * nos dejan la mesa. Con ella, un sitio que sienta hasta las diez daba
       * una mesa de dos horas y media para una cena de las 7:30 y de once
       * horas para un brunch de las once.
       *
       * La reserva es de dos horas y el guion cabe en ellas. El día que un
       * restaurante nos deje otra cosa, será un dato suyo que diga eso.
       */
      duracionDeLaMesa: 120,

      /**
       * Los momentos, en orden.
       *
       * `desde` dice contra qué se mide: `inicio` es la hora de la cena y
       * `cierre` es cuándo nos quitan la mesa. Los dos últimos se cuentan
       * desde el final a propósito: «la cuenta» no es media hora después de
       * empezar, es media hora antes de que haya que irse.
       */
      momentos: [
        { clave: 'llegada', desde: 'inicio', min: 0, nombre: 'Mientras llegan',
          texto: 'Pidan algo de tomar si quieren. Esperamos a todos hasta {limite}.' },
        // A los quince minutos se pide, falte quien falte: con los creadores,
        // el 10-10, se esperó con hambre.
        { clave: 'voz', desde: 'inicio', min: 15, nombre: 'La voz de Aro',
          texto: 'Antes de pedir, elijan a alguien que vaya leyendo en voz alta cada momento de esta lista. Si nadie se ofrece, le toca a quien llegó de último.' },
        { clave: 'pedir', desde: 'inicio', min: 15, nombre: 'A pedir',
          texto: 'Falte quien falte, pidan la comida. Quien llegue después se suma sin problema.' },
        { clave: 'vuelta', desde: 'inicio', min: 20, nombre: 'Una vuelta rápida',
          texto: 'Tu nombre y qué haces cuando no trabajas.' },
        // El juego en dos tiempos: la ronda ligera mientras llega la comida, y
        // el rescate cuando baja la conversación.
        { clave: 'hielo', desde: 'inicio', min: 35, nombre: 'Para romper el hielo',
          texto: 'Mientras llega la comida, la primera ronda del juego.' },
        { clave: 'tema', desde: 'inicio', min: 60, nombre: 'Si se acaba el tema',
          texto: 'Sigan con el juego donde lo dejaron. Se puede pasar.' },
        { clave: 'cuenta', desde: 'cierre', min: -30, nombre: 'Lo último y la cuenta',
          texto: 'Pidan lo último que les provoque y luego la cuenta, cada quien lo suyo. Puede haber otra reserva esperando la mesa.' },
        { clave: 'despedida', desde: 'cierre', min: 0, nombre: 'Despedida',
          texto: 'Si hay ganas de seguir, busquen un sitio cerca. Si alguien te cayó bien, díselo.' },
      ],

      /** Los dos que enlazan con el juego, con el texto de su botón. */
      delJuego: {
        hielo: 'Abrir el juego · ronda 1',
        tema: 'Seguir el juego · rondas 2 y 3',
      },

      /** Los sitios para seguir, que elige operación en la ficha del local. */
      seguir: {
        titulo: 'SI QUIEREN SEGUIR',
        aPie: '{n} min a pie',
        comoLlegar: 'Cómo llegar',
      },
    },

    /**
     * Los momentos de ESTA mesa, con su hora puesta.
     *
     * Devuelve `[]` sin hora de inicio: sin eso no hay guion que pintar, y es
     * mejor que una lista de horas inventadas.
     *
     * `zona` es la de la ciudad de esa fecha, como en todo lo demás: el guion
     * de una cena de Caracas no se cuenta con el reloj de quien mire.
     *
     * La mesa dura dos horas, siempre. Lo que un restaurante nos deje no es
     * un dato que tengamos: ver `duracionDeLaMesa`.
     */
    pasosDeLaMesa: function (empiezaEn, zona) {
      var t = empiezaEn ? Date.parse(empiezaEn) : NaN
      if (!isFinite(t)) return []

      var MIN = 60000
      var G = api.GUION
      var fin = t + G.duracionDeLaMesa * MIN

      var cuando = function (m) {
        return (m.desde === 'cierre' ? fin : t) + m.min * MIN
      }

      // El límite de «esperamos a todos hasta…» es la hora en que se pide, no
      // un número escrito aparte: si mañana se adelanta, la frase se mueve
      // con ella.
      var pedir = null
      for (var i = 0; i < G.momentos.length; i++) {
        if (G.momentos[i].clave === 'pedir') pedir = cuando(G.momentos[i])
      }
      // Sin el «p.m.»: la frase ya está dentro de una cena, el sufijo repetido
      // no añade nada y además choca con el punto final —«hasta las 7:45 p.m..»—.
      var limite = pedir == null ? '' : api.horaCorta(api.horaDe(new Date(pedir).toISOString(), zona))
      // «la una» y no «las una». Es la única hora del reloj con artículo en
      // singular, y cae justo en la franja de un brunch.
      var conArticulo = /^1:/.test(limite) ? 'la ' + limite : 'las ' + limite

      return G.momentos.map(function (m) {
        var en = cuando(m)
        return {
          clave: m.clave,
          en: new Date(en).toISOString(),
          hora: api.horaDe(new Date(en).toISOString(), zona) || '',
          nombre: m.nombre,
          texto: m.texto.replace('{limite}', conArticulo),
          botonJuego: G.delJuego[m.clave] || '',
        }
      })
    },

    /**
     * En qué punto está la mesa: antes de empezar, en curso, o terminada
     * desde la despedida. Decide el sello de la tarjeta y cuál se abre.
     */
    momentoDeLaMesa: function (pasos, ahora) {
      if (!pasos || !pasos.length) return 'antes'
      if (ahora < Date.parse(pasos[0].en)) return 'antes'
      return ahora >= Date.parse(pasos[pasos.length - 1].en) ? 'terminada' : 'curso'
    },

    /**
     * Cuál es el momento en curso: el último que ya empezó.
     *
     * Por HORA y no por posición, porque dos momentos pueden compartirla —la
     * voz y pedir son los dos a y cuarto— y entonces «el actual» son los dos.
     * Devuelve el índice del primero de ellos, o -1 antes de empezar.
     */
    enCursoDeLaMesa: function (pasos, ahora) {
      var en = null
      for (var i = 0; i < (pasos || []).length; i++) {
        if (Date.parse(pasos[i].en) <= ahora) en = pasos[i].en
      }
      if (en == null) return -1
      for (var j = 0; j < pasos.length; j++) if (pasos[j].en === en) return j
      return -1
    },

    JUEGO: {
      /** Cuántas salen de cada mazo de diez. */
      porRonda: 2,

      /**
       * Cuándo se abre, en minutos respecto a `starts_at`.
       *
       * **A la hora de la cena, ni un minuto antes** (Michael, 06-10): si se
       * abriera media hora antes, quien llega pronto se lee las preguntas y
       * llega a la mesa con las respuestas pensadas, que es justo lo que el
       * juego no quiere.
       *
       * Y se cierra cuando la cena se da por terminada, que son CINCO horas
       * (`FIN_CENA`, en `src/lib/ventana-mesa.ts`, que lee esta cifra). Eran
       * cuatro, y esa hora de diferencia se veía: de la hora 4 a la 5, Mi
       * mesa seguía diciendo «Abierto · Hoy» y el juego ya no estaba. Dos
       * ideas de cuándo se acaba una cena son una idea y media.
       */
      abreMin: 0,
      cierraMin: 300,

      /**
       * El subtítulo de la pantalla de reglas.
       *
       * Decía «Tres rondas · 15 minutos», y los quince minutos se cayeron el
       * 10-10 de la tarjeta de Mi mesa —nadie cronometra una cena y sonaba a
       * compromiso— pero se quedaron aquí, que es la pantalla siguiente.
       * Ahora dice lo único que de verdad hay que saber antes de empezar: que
       * la última ronda no es obligatoria.
       *
       * Vive aquí y no en cada pantalla porque es la cuarta vez que esta
       * frase se escribe en dos sitios.
       */
      subtituloReglas: 'Tres rondas · la última, opcional',

      /**
       * Se enseñan antes de empezar, en este orden. La cuarta es la de la
       * entrega 20 de Design (Michael, 15-10): que la última es opcional ya
       * lo dice la pausa antes de la ronda 3, con «Terminar aquí».
       */
      reglas: [
        'Una persona lee en voz alta, desde su teléfono.',
        'Responden todos, empezando por quien leyó.',
        'Cualquiera puede pasar, sin explicar nada.',
        'Tres rondas, de menos a más.',
      ],

      /** Cuando se acaba la ronda 3. */
      final: 'Hasta aquí el juego. Lo demás es suyo.',

      rondas: [
        {
          clave: 'para-arrancar',
          titulo: 'Para arrancar',
          bajada: 'Ligera. Que cualquiera responda sin pensarlo dos veces.',
          /**
           * Lo que dice la ronda EN LA TARJETA de Mi mesa, que es otro sitio
           * y otra longitud: ahí van las tres seguidas y una frase de línea y
           * media las hace ilegibles. Entrega 20.
           *
           * Las tres `enLaTarjeta` están PENDIENTES DE MICHAEL (Design, 15-10).
           * Mientras tanto se pintan estas, que son las que ya enseña la app.
           */
          enLaTarjeta: 'Ligera. Luego, a comer.',
          /** Cuándo toca. La hora de la primera sale del guion, no de aquí. */
          cuando: 'MIENTRAS LLEGA LA COMIDA',
          preguntas: [
            '¿Cuál es tu plan perfecto de domingo en Caracas?',
            '¿Qué comida no dejarías de comer nunca?',
            '¿Playa o montaña, y por qué?',
            'Si pudieras vivir un año en cualquier ciudad, ¿cuál sería?',
            '¿Qué canción pones cuando necesitas ánimo?',
            '¿Cuál es tu talento más inútil?',
            '¿Qué serie o película le recomiendas a todo el mundo?',
            '¿Qué te gustaba de chamo o chama que todavía te gusta?',
            'Si mañana tuvieras el día libre, ¿qué harías primero?',
            '¿A qué le dices que sí con demasiada facilidad?',
          ],
        },
        {
          clave: 'un-poco-mas-de-ti',
          titulo: 'Un poco más de ti',
          bajada: 'Personal, pero sin exponerse.',
          enLaTarjeta: 'Si la mesa va bien sola, no hace falta.',
          cuando: 'SI SE ACABA EL TEMA',
          preguntas: [
            '¿Qué te tiene con ilusión estos días, aunque sea algo pequeño?',
            '¿Qué haces que te hace perder la noción del tiempo?',
            '¿Qué aprendiste este año que no esperabas aprender?',
            '¿En qué eres mejor de lo que la gente imagina?',
            '¿Qué plan llevas tiempo diciendo que vas a hacer?',
            '¿Quién te enseñó algo que todavía usas?',
            '¿Qué te hace sentir en casa, estés donde estés?',
            '¿Qué decisión tomaste que hoy volverías a tomar?',
            '¿En qué has cambiado de opinión en los últimos años?',
            '¿Qué te gustaría que te salga bien este año?',
            '¿Qué te cuesta pedir?',
          ],
        },
        {
          clave: 'mas-hondo',
          titulo: 'Si la mesa quiere ir más hondo',
          bajada: 'Más hondo, y cualquiera puede pasar.',
          enLaTarjeta: 'Más personal. Cualquiera puede pasar.',
          cuando: 'SOLO SI A LA MESA LE PROVOCA',
          preguntas: [
            '¿Qué es lo más valiente que has hecho?',
            '¿Qué piensa la gente de ti que no es del todo así?',
            '¿Qué le dirías a la persona que eras hace diez años?',
            '¿De qué te sientes orgulloso u orgullosa y casi nunca lo cuentas?',
            '¿Qué te gustaría que te preguntaran más seguido?',
            '¿Qué cosa pequeña te arregló un mal día hace poco?',
            '¿Qué te gustaría hacer antes de que se te pase el momento?',
            '¿Qué momento de tu vida te gustaría volver a vivir?',
            '¿Quién ha sido importante en tu vida sin saberlo?',
            '¿Qué te costó mucho y hoy agradeces?',
            '¿Qué te da miedo intentar?',
          ],
        },
      ],
    },

    /**
     * Las cuatro preguntas de una ronda, para una mesa.
     *
     * **Deterministas, y por eso vive aquí.** Seis teléfonos tienen que
     * enseñar las mismas preguntas en el mismo orden sin hablar entre ellos y
     * sin preguntarle al servidor, que en un restaurante con mal wifi es la
     * diferencia entre un juego y una pantalla cargando. La semilla sale de
     * lo único que todos comparten: el id de la mesa y la ronda.
     *
     * Por eso también se puede cambiar de lector: quien abra el juego en SU
     * teléfono en la ronda 2 ve exactamente lo que verían los demás.
     *
     * Nada de `Math.random` ni de la hora: las dos darían una lista distinta
     * por teléfono. Y nada de coma flotante en el revoltijo —`Math.imul` y
     * `>>> 0`, enteros de 32 bits— para que la app y el navegador no puedan
     * discrepar por cómo redondea cada motor.
     *
     * La ronda se puede pasar como índice (0, 1, 2) o como clave
     * («un-poco-mas-de-ti»): las dos se resuelven a la MISMA clave antes de
     * sembrar, así que dan el mismo resultado.
     */
    preguntasDeRonda: function (mesaId, ronda) {
      var rondas = api.JUEGO.rondas
      var r = null
      for (var i = 0; i < rondas.length; i++) {
        if (i === ronda || rondas[i].clave === ronda) { r = rondas[i]; break }
      }
      if (!r) return []

      // FNV-1a de 32 bits sobre «mesa:ronda». Pequeño, sin dependencias y
      // con el mismo resultado en todos los motores.
      var semilla = 2166136261
      var texto = String(mesaId || '') + ':' + r.clave
      for (var k = 0; k < texto.length; k++) {
        semilla ^= texto.charCodeAt(k)
        semilla = Math.imul(semilla, 16777619) >>> 0
      }

      // mulberry32: un generador de una línea, estable y sin estado global.
      var siguiente = function () {
        semilla = (semilla + 0x6d2b79f5) >>> 0
        var t = semilla
        t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0
        t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0
        return (t ^ (t >>> 14)) >>> 0
      }

      // Fisher-Yates con esa semilla, sobre una copia: el mazo no se toca.
      var mazo = r.preguntas.slice()
      for (var j = mazo.length - 1; j > 0; j--) {
        var m = siguiente() % (j + 1)
        var tmp = mazo[j]
        mazo[j] = mazo[m]
        mazo[m] = tmp
      }

      return mazo.slice(0, api.JUEGO.porRonda)
    },

    /**
     * Cómo se llama cada formato, para enseñarlo.
     *
     * Estaba escrito cuatro veces: en los correos, en el panel, en tres
     * pantallas del miembro y en la app. Mi mesa tenía «Cena · viernes 16»
     * con la palabra dentro de la frase, así que el brunch del domingo salía
     * llamándose cena mientras el resto de la pantalla ya decía lo correcto.
     *
     * Aquí porque lo leen los tres: navegador, servidor y app.
     */
    NOMBRES_DE_FORMATO: {
      dinner: 'Cena', foodie_dinner: 'Cena foodie', women_dinner: 'Cena de mujeres',
      drinks: 'Drinks', coffee: 'Coffee', brunch: 'Brunch', women_brunch: 'Brunch de mujeres',
      walk: 'Caminata', hike: 'Senderismo', run: 'Correr',
      padel: 'Pádel', pilates: 'Pilates', cycling: 'Ciclismo',
    },

    /** Los formatos que salen a la calle: ahí no hay mesa. */
    DE_MOVIMIENTO: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],

    /**
     * Los que son una cena. Son los únicos que pueden decir «cenas».
     *
     * La voz se partía en dos —mesa o grupo— y el verbo salía de ahí: si hay
     * mesa, se cena. Pero un café a las diez de la mañana tiene mesa, y un
     * brunch del domingo a las once también, así que el correo de la
     * revelación les decía «CON QUIÉN CENAS» y Mi mesa, después, «Cenaste
     * en». Los drinks de las ocho llevan el mismo error desde que existen.
     *
     * Son tres y no una familia porque esto no es «dónde se sienta la
     * gente», es qué comida es. La lista dice quién SÍ cena; lo que no esté
     * aquí usa la frase neutra. Así un formato nuevo —un almuerzo, una
     * merienda— entra diciendo algo verdadero sin que nadie se acuerde de
     * esta tabla.
     */
    DE_CENA: ['dinner', 'foodie_dinner', 'women_dinner'],

    /**
     * La voz de un formato. Sin formato —o con uno que no conocemos— se
     * habla de mesa, que es lo que era el producto entero hasta ahora.
     */
    vozDe: function (formato) {
      var f = String(formato || '')
      if (api.DE_MOVIMIENTO.indexOf(f) >= 0) return api.VOZ_GRUPO
      if (api.DE_CENA.indexOf(f) >= 0) return vozDeCena()
      return api.VOZ_MESA
    },

    /**
     * Las preguntas frecuentes, en un solo sitio.
     *
     * Vivían literales dentro de la landing, con un comentario explicando que
     * no podían ser una variable porque el comprobador las cruza palabra por
     * palabra con el JSON-LD del `<head>`. Eso valía mientras hubiera una sola
     * pantalla; con la página de ayuda —que la App Store exige para publicar—
     * serían tres copias de lo mismo.
     *
     * Siguen siendo dos a la fuerza: esta, que es la que leen las personas, y
     * la del JSON-LD, que es la que leen los buscadores y los asistentes (un
     * rastreador no ejecuta JavaScript, así que una lista armada al vuelo para
     * él no existe). El comprobador cruza las dos.
     */
    FRECUENTES: [
      ['¿Qué incluye lo que pago?', 'Los 10 ref cubren armar tu mesa —quiénes se sientan contigo y por qué—, la verificación de identidad de todo el grupo y el restaurante reservado a tu nombre. Tu consumo lo pagas en el sitio, como en cualquier salida: desde 20 ref según dónde sea. Nos dices tu tramo antes y elegimos el restaurante con el número más bajo de la mesa.'],
      ['¿Y si no me cae bien nadie?', 'Pasa, y no es un fracaso. Son dos horas, a las nueve estás libre y no le debes nada a nadie. Nos lo cuentas después y eso entra en cómo armamos tu próxima mesa: qué no funcionó y con quién no volver a sentarte.'],
      ['¿Puedo ir con un amigo?', 'No. Todo el grupo son desconocidos entre sí, incluidos ustedes dos. Con una pareja conocida en la mesa el resto se convierte en público, y eso rompe la noche para los demás.'],
      ['¿Cómo sé que las otras personas son reales?', 'Porque pasaron por lo mismo que tú: documento de identidad, una foto y una revisión humana que compara las dos. En la pantalla de tu mesa aparece explícito que todo el grupo tiene identidad verificada y edad confirmada.'],
      ['¿A qué hora es y cuánto dura?', 'La hora va en cada fecha, la ves antes de apartar tu puesto, y dura unas dos horas. Es a propósito: un plan que no se come la noche entera es un plan al que se dice que sí.'],
      ['¿Y si soy el más joven de la mesa?', 'No lo vas a ser por mucho. Entre la persona más joven y la mayor de una mesa no hay más de diez años, así que si tienes 24 y eres el más joven, el mayor tendrá 34 como mucho. Es una regla de cómo armamos las mesas, no una casualidad.'],
      ['¿Y si soy vegetariano o tengo una alergia?', 'Nos lo dices en el perfil y elegimos un sitio donde puedas comer sin negociar con la carta. No se lo contamos a la mesa: si quieres explicarlo tú, es cosa tuya.'],
      ['¿Cómo sé dónde es, y qué pasa si llego tarde?', 'El día de la cena, a mediodía, se abre todo: restaurante, dirección y tu número de mesa. Si se te hace tarde, avisas con un toque y se lo decimos a la mesa. Nadie se queda mirando la puerta.'],
      ['¿Qué pasa si alguien se comporta mal?', 'Lo reportas desde tu mesa después y lo lee una persona el mismo día. Puedes bloquear a alguien para que nunca vuelva a coincidir contigo sin que se entere, y quien acumula reportes sale del club. Sin escándalo y sin apelación pública.'],
      ['¿Por qué preguntan mi edad y mi género?', 'Para que el grupo tenga referencias parecidas y esté balanceado. No se muestran a los demás: de ti solo ven el nombre con el que quieres que te llamen y tu sector.'],
      ['¿Cuándo hay mesa en mi zona?', 'Abrimos donde se junta suficiente gente que pueda llegar. Marca las tuyas arriba y te escribimos el día que se abre la primera. No antes: no queremos escribirte para nada.'],
    ],

    /** Valida un conjunto. Devuelve el primer campo que falla, o null. */
    primerFallo: function (valores) {
      for (var campo in valores) {
        if (!Object.prototype.hasOwnProperty.call(valores, campo)) continue
        if (!api.valido(campo, valores[campo])) return campo
      }
      return null
    },
  }

  /**
   * La voz de una cena: la de la mesa, con los verbos de cenar.
   *
   * Copia en vez de una cuarta tabla escrita a mano: de las dieciocho
   * palabras de `VOZ_MESA` una cena solo cambia dos, y una tabla entera para
   * eso son dieciséis sitios donde divergir. Se arma una vez y se guarda.
   */
  var cena = null
  function vozDeCena() {
    if (cena) return cena
    cena = {}
    for (var k in api.VOZ_MESA) {
      if (Object.prototype.hasOwnProperty.call(api.VOZ_MESA, k)) cena[k] = api.VOZ_MESA[k]
    }
    cena.conQuien = 'CON QUIÉN CENAS'
    cena.estuviste = 'Cenaste en'
    cena.vasCon = 'Cenas con cinco personas.'
    return cena
  }

  raiz.AroReglas = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
