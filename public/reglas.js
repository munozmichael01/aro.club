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
        return d.length >= 8 && d.length <= 15
      },
      ayuda: 'Con el prefijo de tu país. Entre 8 y 15 dígitos.',
    },

    telefonoPagoMovil: {
      etiqueta: 'Teléfono',
      filtrar: soloDigitos(10),
      valido: function (v) {
        return /^\d{10}$/.test(String(v || ''))
      },
      ayuda: 'Diez dígitos, sin el +58. Es el número registrado en tu banco.',
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
        var d = String(v == null ? '' : v).replace(/\D/g, '').slice(0, 8)
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
    aE164: function (valor) {
      var v = String(valor == null ? '' : valor).trim()
      var digitos = v.replace(/\D/g, '')
      if (!digitos) return ''

      // El '+58 +58' que ya aparecio una vez en un perfil. Un numero
      // venezolano es 58 y diez cifras que empiezan por 4, asi que un
      // '5858' al principio solo puede ser el prefijo puesto dos veces:
      // ni el filtro ni el validador lo cazaban y se guardaba tal cual.
      while (digitos.indexOf('5858') === 0) digitos = digitos.slice(2)

      // Con prefijo escrito, manda quien escribe.
      if (v.charAt(0) === '+') return '+' + digitos
      // Sin prefijo: venezolano, que es la unica ciudad abierta.
      return '+58' + digitos.replace(/^58/, '')
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

    /** Los formatos que salen a la calle: ahí no hay mesa. */
    DE_MOVIMIENTO: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],

    /**
     * La voz de un formato. Sin formato —o con uno que no conocemos— se
     * habla de mesa, que es lo que era el producto entero hasta ahora.
     */
    vozDe: function (formato) {
      return api.DE_MOVIMIENTO.indexOf(String(formato || '')) >= 0 ? api.VOZ_GRUPO : api.VOZ_MESA
    },

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
