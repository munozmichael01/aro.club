/**
 * Datos simulados para la pasada de pintado.
 *
 * Lo justo para que cada pantalla entre en su rama principal y pinte. NO es
 * un espejo del servidor: si una ruta cambia de forma, lo que falla es el
 * contrato con la pantalla, y eso lo vigila `comprobar-pantallas`. Esto solo
 * tiene que conseguir que la pantalla exista para poder mirarla.
 *
 * Los `casos` de una pantalla son estados distintos de la MISMA pantalla
 * —Mi mesa antes, durante y después de la cena— porque el fallo de hoy vivía
 * en una sola de las tres ramas.
 */

const HOY = new Date()
const en = (h) => new Date(HOY.getTime() + h * 3600_000).toISOString()

const MESA_ABIERTA = {
  fase: 'abierta',
  mesaId: '11111111-1111-4111-8111-111111111111',
  eventoId: '22222222-2222-4222-8222-222222222222',
  numeroMesa: 3,
  mesaUnica: false,
  formato: 'dinner',
  zonaHoraria: 'America/Caracas',
  empiezaEn: en(2),
  revelaEn: en(-5),
  restaurante: 'Vittoria Cucina',
  direccion: 'Av. Francisco de Miranda, Chacao',
  mapa: 'https://maps.google.com/?q=1,1',
  mapaApple: 'https://maps.apple.com/?q=1,1',
  fotoEntrada: null,
  grabamos: true,
  permisoGrabacion: null,
  ajustes: { sonCuantos: 5, caben: 6, seSumoAlguien: true, alguienCancelo: true, teMovimos: false },
  paraSeguir: [],
  companeros: [
    { id: 'a1', nombre: 'Ana', inicial: 'A', sector: 'Diseño', arraigo: 'volvio', seUnioDespues: false },
    { id: 'a2', nombre: 'Luis', inicial: 'L', sector: 'Banca', arraigo: 'interior', seUnioDespues: true },
    { id: 'a3', nombre: 'Marta', inicial: 'M', sector: 'Salud', arraigo: 'remoto', seUnioDespues: false },
    { id: 'a4', nombre: 'Pedro', inicial: 'P', sector: 'Obra', seUnioDespues: false },
  ],
  todosVerificados: true,
  yaValoro: false,
  yaReporto: null,
  yaBloqueados: [],
}

/**
 * OJO con lo que esta pasada NO cubre.
 *
 * Operación no tiene datos simulados, así que de ella solo se mira el estado
 * vacío: sin fechas no hay tarjetas de mesa, y la mitad de su código no llega
 * a ejecutarse. El 17-10 metí un `AroReglas.horaDe` en una tarjeta de mesa
 * —el panel no carga `reglas.js`— y esta pasada dijo que todo bien, porque
 * sin mesas esa línea no se ejecuta. Lo cacé abriendo el panel con datos.
 *
 * Mientras Operación no tenga su propio juego de datos: el panel se abre a
 * mano antes de subirlo, como Mi mesa.
 */
export const PANTALLAS = {
  'Aro Club - Mi mesa.dc.html': [
    {
      caso: 'mesa corta',
      rutas: {
        '/api/mi-mesa': {
          ...MESA_ABIERTA,
          mesaCorta: 'Son cuatro: esta vez no completamos la mesa de seis, pero creemos que cuatro desconocidos son suficientes para pasarla bien.',
          avisoDosHoras: 'La mesa es tuya por dos horas, de 7:00 p.m. a 9:00 p.m. El restaurante puede tener otra reserva esperando esa mesa, así que tenlo en cuenta para la sobremesa. Si quieren seguir, en el paso a paso hay sitios cerca.',
        },
      },
    },
    /**
     * Y la de siete, que es la misma ranura al revés.
     *
     * Desde el 24-10 una mesa se puede estirar una o dos sillas, y la frase
     * que lo explica sale por `mesaCorta`, el mismo campo: el nombre se
     * queda como está porque lo lee la app y un campo no cambia de forma.
     * Aquí se mira que la ranura pinte con el texto de arriba, no solo con
     * el de abajo.
     */
    {
      caso: 'mesa de siete',
      rutas: {
        '/api/mi-mesa': {
          ...MESA_ABIERTA,
          mesaCorta: 'Son siete: esta vez encajaba una persona más y preferimos sentarla aquí antes que dejarla sin mesa.',
          ajustes: { sonCuantos: 7, caben: 6, seSumoAlguien: false, alguienCancelo: false, teMovimos: false },
        },
      },
    },
    { caso: 'abierta', rutas: { '/api/mi-mesa': MESA_ABIERTA } },
    /**
     * Y el brunch con la mesa entera.
     *
     * Desde el 24-10 un brunch lleva la misma Mi mesa que una cena: foto de
     * la entrada, paso a paso, juego y aviso de dos horas. Lo que NO lleva
     * son bares, y eso viaja en `paraSeguir` vacío desde el servidor: de ahí
     * cuelgan la coletilla de «hay sitios cerca» y el bloque del paso a
     * paso, así que el caso tiene que traerlo vacío para que se mire lo que
     * de verdad va a ver esa gente.
     */
    {
      caso: 'brunch',
      rutas: {
        '/api/mi-mesa': {
          ...MESA_ABIERTA,
          formato: 'brunch',
          paraSeguir: [],
          avisoDosHoras: 'La mesa es tuya por dos horas, de 11:00 a.m. a 1:00 p.m. El restaurante puede tener otra reserva esperando esa mesa, así que tenlo en cuenta para la sobremesa.',
        },
      },
    },
    {
      caso: 'cerrada',
      rutas: {
        '/api/mi-mesa': {
          fase: 'cerrada', formato: 'dinner', revelaEn: en(3), empiezaEn: en(10),
          zonaHoraria: 'America/Caracas', zonas: ['Chacao'], faltanSegundos: 10800,
        },
      },
    },
    {
      caso: 'pasada',
      rutas: { '/api/mi-mesa': { ...MESA_ABIERTA, fase: 'pasada', empiezaEn: en(-8) } },
    },
    {
      caso: 'me movieron',
      rutas: { '/api/mi-mesa': { ...MESA_ABIERTA, ajustes: { sonCuantos: 6, caben: 6, seSumoAlguien: false, alguienCancelo: false, teMovimos: true } } },
    },
    {
      caso: 'sin mesa',
      rutas: {
        '/api/mi-mesa': {
          fase: 'sin-mesa', formato: 'dinner', empiezaEn: en(5),
          zonaHoraria: 'America/Caracas', creditoDevuelto: true,
        },
      },
    },
  ],

  /**
   * La agenda pública, con fechas y sin ellas.
   *
   * Es la única pantalla que no se sirve sola —la sirve
   * `src/app/agenda/route.ts`, que le pega el JSON-LD— pero lo que se mira
   * aquí es lo mismo que en las demás: que pinte. El estado vacío va aparte
   * porque es un bloque distinto, no la misma rejilla con cero tarjetas.
   */
  'Aro Club - Agenda.dc.html': [
    {
      caso: 'con fechas',
      rutas: {
        '/api/agenda': {
          zonas: ['Chacao', 'Los Palos Grandes'],
          fechas: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              formato: 'dinner', nombreFormato: 'Cena',
              empiezaEn: en(30), cierraEn: en(20), creadaEn: en(-48),
              zonaHoraria: 'America/Caracas', zonas: ['Chacao'],
              precioUsd: 10, apuntados: 7,
              edadMinima: null, edadMaxima: null, idioma: null, etiquetaIdioma: null,
            },
            {
              id: '44444444-4444-4444-8444-444444444444',
              formato: 'dinner', nombreFormato: 'Cena',
              empiezaEn: en(54), cierraEn: en(44), creadaEn: en(-47),
              zonaHoraria: 'America/Caracas', zonas: ['Chacao', 'Los Palos Grandes'],
              precioUsd: 10, apuntados: 2,
              edadMinima: 40, edadMaxima: null, idioma: null, etiquetaIdioma: null,
            },
            {
              id: '55555555-5555-4555-8555-555555555555',
              formato: 'brunch', nombreFormato: 'Brunch',
              empiezaEn: en(78), cierraEn: en(68), creadaEn: en(-46),
              zonaHoraria: 'America/Caracas', zonas: ['Chacao'],
              precioUsd: 10, apuntados: 4,
              edadMinima: null, edadMaxima: null, idioma: 'en', etiquetaIdioma: 'En inglés',
            },
          ],
        },
      },
    },
    { caso: 'sin fechas', rutas: { '/api/agenda': { fechas: [], zonas: [] } } },
  ],

  /**
   * El reembolso, en sus dos caras: la de pedirlo y la de ya haberlo pedido.
   *
   * Sin datos simulados esta pantalla se va a `/entrar`, que en el servidor
   * de pruebas es un 404, y el comprobador la veía en blanco con razón.
   */
  'Aro Club - Reembolso.dc.html': [
    {
      caso: 'puede pedirlo',
      rutas: {
        '/api/mi-cuenta': {
          nombre: 'Ana', esOps: false, porValorar: null, planes: [], agenda: [], proximaFecha: null,
          estado: 'verified', ciudad: 'caracas', paso: null, donde: [], puedeReservar: true,
          verif: { estado: 'approved' }, motivoRechazo: null,
          respuestas: { faltan: 0, total: 17 }, creditos: 1, reserva: null,
          reembolso: {
            puede: true, hasta: en(72), precio: 10, montoBs: 9931.76, tasa: 993.176,
            estado: null, solicitadoEn: null, reembolsadoEn: null, referencia: null,
          },
        },
      },
    },
    {
      caso: 'ya lo pidió',
      rutas: {
        '/api/mi-cuenta': {
          nombre: 'Ana', esOps: false, porValorar: null, planes: [], agenda: [], proximaFecha: null,
          estado: 'verified', ciudad: 'caracas', paso: null, donde: [], puedeReservar: true,
          verif: { estado: 'approved' }, motivoRechazo: null,
          respuestas: { faltan: 0, total: 17 }, creditos: 0, reserva: null,
          reembolso: {
            puede: false, hasta: en(72), precio: 10, montoBs: 9931.76, tasa: 993.176,
            estado: 'pendiente', solicitadoEn: en(-2), reembolsadoEn: null, referencia: null,
          },
        },
      },
    },
  ],

  'Aro Club - Mi cuenta.dc.html': [{
    caso: 'con reserva',
    rutas: {
      '/api/mi-cuenta': {
        nombre: 'Ana', esOps: false, porValorar: null, planes: [], agenda: [], proximaFecha: null,
        estado: 'verified', ciudad: 'caracas', paso: null, donde: [], puedeReservar: true,
        verif: { estado: 'approved' }, motivoRechazo: null,
        respuestas: { faltan: 0, total: 17 }, creditos: 1, reserva: null,
      },
      '/api/mi-mesa': MESA_ABIERTA,
      '/api/mis-exclusiones': { exclusiones: [] },
    },
  }],

  'Aro Club - Mi perfil.dc.html': [{
    caso: 'perfil',
    rutas: {
      '/api/mi-perfil': {
        base: { nombre: 'Ana', trato: 'Ana', nacimiento: '1995-04-12', genero: 'mujer', telefono: '+584141234567', ciudad: 'caracas' },
        correo: 'ana@aro.club',
        respuestas: [],
        bloques: [],
        cenas: [],
        credenciales: { correo: 'ana@aro.club', tieneClave: true, google: false, apple: false },
      },
      '/api/mi-cuenta': { nombre: 'Ana', esOps: false, planes: [], agenda: [], estado: 'verified', creditos: 0, respuestas: { faltan: 0, total: 17 }, verif: { estado: 'approved' }, donde: [], puedeReservar: true },
      '/api/ciudades': { ciudades: [{ slug: 'caracas', nombre: 'Caracas', abierta: true }] },
    },
  }],

  /**
   * Datos base va SIN simular: sin sesión es cuando pide el correo, que es
   * su primer paso de verdad y lo que ve quien llega de la campaña.
   *
   * Su estado «ya hay datos» no está cubierto: con una respuesta inventada
   * la pantalla no pinta, y no sé si es que le falta algún campo al invento
   * o si hay una rama que no pinta de verdad. Queda dicho en vez de
   * apañado con un dato a medida que haga pasar la prueba.
   */

  'Aro Club - Cancelar.dc.html': [{
    caso: 'con reserva',
    rutas: {
      '/api/cancelar': { reserva: { id: '1', cuando: en(30), sitio: null, zonaHoraria: 'America/Caracas' }, devuelve: true },
    },
  }],

  'Aro Club - Verificacion.dc.html': [{
    caso: 'pendiente',
    rutas: { '/api/verificacion': { estado: 'pending', nombre: 'Ana', documento: null, selfie: null } },
  }],
}
