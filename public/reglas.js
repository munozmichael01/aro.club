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

    PRECIO_USD: 7,
    precioTexto: function () {
      return this.PRECIO_USD + ' USD'
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

    /**
     * Las cuatro preguntas de la puerta.
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
     * `zonas` va sin opciones a propósito. Las zonas se abren y se cierran
     * desde el panel, así que las trae `/api/zonas` en caliente; escritas a
     * mano se quedaron en diez cuando la base tenía trece, y quien vivía en
     * las otras tres no podía decirlo.
     *
     * Los códigos son los del catálogo (`questions`), que es lo que manda al
     * guardar. `comprobar-cuestionario.mjs` lo verifica contra la base: un
     * código que no exista ahí no llega a producción.
     */
    PUERTA: {
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

    /** El orden en que se hacen. */
    ORDEN_PUERTA: ['arraigo', 'zonas', 'dias', 'temas'],

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
    },

    VOZ_GRUPO: {
      unidad: 'grupo', unidades: 'grupos', Unidad: 'Grupo', Unidades: 'Grupos',
      art: 'un', Art: 'Un', esta: 'este', tu: 'tu', La: 'El', el: 'el',
      sitio: 'punto de encuentro', Sitio: 'Punto de encuentro', sitioCorto: 'el punto',
      sentados: 'repartidos', juntarse: 'juntarse', mia: 'Mi grupo', TU: 'TU GRUPO',
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
       * Y se cierra a las cuatro horas porque a esa altura la mesa o se
       * disolvió o ya no lo necesita, y una pantalla que sigue ofreciendo
       * preguntas a la una de la mañana es ruido.
       */
      abreMin: 0,
      cierraMin: 240,

      /** Se enseñan antes de empezar, en este orden. */
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
          clave: 'quien-eres',
          titulo: 'Quién eres hoy',
          bajada: 'Fácil. Para abrir la mesa sin exigir nada.',
          preguntas: [
            '¿Qué te tiene con ilusión estos días, aunque sea algo pequeño?',
            '¿Qué haces que te hace perder la noción del tiempo?',
            '¿Cuándo fue la última vez que te reíste hasta llorar, y de qué?',
            'Si mañana tuvieras el día libre y sin compromisos, ¿qué harías desde que te levantas?',
            '¿Qué cosa simple te arregla un mal día?',
            '¿Qué aprendiste este año que no esperabas aprender?',
            '¿Cuál es el plan que siempre dices que vas a hacer y nunca haces?',
            '¿Qué canción, libro o serie te tiene enganchado o enganchada ahora?',
            '¿En qué eres mejor de lo que la gente imagina?',
            '¿Qué te gustaba de chamo o chama que todavía te gusta?',
          ],
        },
        {
          clave: 'lo-que-te-mueve',
          titulo: 'Lo que te mueve',
          bajada: 'Decisiones, cambios, lo que importa.',
          preguntas: [
            '¿Qué decisión tomaste que la gente no entendió y hoy volverías a tomar?',
            '¿En qué has cambiado de opinión en los últimos años?',
            '¿Qué te da miedo intentar, aunque te gustaría?',
            '¿Quién te enseñó algo que todavía usas todos los días?',
            '¿Qué es lo más valiente que has hecho?',
            '¿Qué te hace sentir en casa, estés donde estés?',
            '¿Qué te gustaría que te salga bien en el próximo año?',
            '¿A qué le dices que sí con demasiada facilidad?',
            '¿Qué haces cuando nadie te ve que dice mucho de ti?',
            '¿De qué estás orgulloso u orgullosa y casi nunca lo cuentas?',
          ],
        },
        {
          clave: 'lo-que-no-se-dice',
          titulo: 'Lo que no se suele decir',
          bajada: 'Más profunda. Aquí más que nunca: cualquiera puede pasar.',
          preguntas: [
            '¿Qué piensa la gente de ti que no es verdad?',
            '¿Cuándo fue la última vez que te sentiste en soledad de verdad?',
            '¿Qué le dirías a la persona que eras hace diez años?',
            '¿Qué te gustaría que esta mesa supiera de ti y nadie te pregunta?',
            '¿Qué te cuesta pedir?',
            '¿Qué te gustaría que te preguntaran más seguido?',
            '¿Qué conversación tienes pendiente con alguien?',
            '¿Qué parte de ti estás aprendiendo a querer?',
            '¿Qué te gustaría hacer antes de que se te pase el momento?',
            'Si esta fuera la última cena que compartes con gente nueva, ¿qué te llevarías de ella?',
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
     * («lo-que-te-mueve»): las dos se resuelven a la MISMA clave antes de
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

    /** Los formatos que salen a la calle: ahí no hay mesa. */
    DE_MOVIMIENTO: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],

    /**
     * La voz de un formato. Sin formato —o con uno que no conocemos— se
     * habla de mesa, que es lo que era el producto entero hasta ahora.
     */
    vozDe: function (formato) {
      return api.DE_MOVIMIENTO.indexOf(String(formato || '')) >= 0 ? api.VOZ_GRUPO : api.VOZ_MESA
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
      ['¿Qué incluye lo que pago?', 'Los 7 USD cubren el emparejamiento, la verificación de todo el grupo y la mesa reservada a tu nombre. Tu consumo lo pagas en el sitio, como en cualquier salida: entre 20 y 35 USD según dónde sea. Nos dices tu tramo antes y elegimos el restaurante con el número más bajo de la mesa.'],
      ['¿Y si no me cae bien nadie?', 'Pasa, y no es un fracaso. Son dos horas, a las nueve estás libre y no le debes nada a nadie. Nos lo cuentas después y eso entra en el emparejamiento de la próxima: qué no funcionó y con quién no volver a sentarte.'],
      ['¿Puedo ir con un amigo?', 'No. Todo el grupo son desconocidos entre sí, incluidos ustedes dos. Con una pareja conocida en la mesa el resto se convierte en público, y eso rompe la noche para los demás.'],
      ['¿Cómo sé que las otras personas son reales?', 'Porque pasaron por lo mismo que tú: documento de identidad, una foto y una revisión humana que compara las dos. En la pantalla de tu mesa aparece explícito que todo el grupo tiene identidad verificada y edad confirmada.'],
      ['¿A qué hora es y cuánto dura?', 'La hora va en cada fecha, la ves antes de apartar tu puesto, y dura unas dos horas. Es a propósito: un plan que no se come la noche entera es un plan al que se dice que sí.'],
      ['¿Y si soy el más joven de la mesa?', 'No lo vas a ser por mucho. Entre la persona más joven y la mayor de una mesa no hay más de diez años, así que si tienes 24 y eres el más joven, el mayor tendrá 34 como mucho. Es una regla del emparejamiento, no una casualidad.'],
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

  raiz.AroReglas = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
