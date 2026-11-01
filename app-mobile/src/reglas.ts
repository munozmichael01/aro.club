/**
 * Las reglas de entrada: el MISMO `public/reglas.js` que cargan el
 * navegador y el servidor. Se importa, no se reescribe (PEDIDO §6 bis).
 *
 * Aquí solo van los tipos de lo que la app usa. La lógica no se toca.
 */
import crudo from '../../public/reglas.js'

export type Campo =
  | 'correo'
  | 'clave'
  | 'telefonoPerfil'
  | 'dia'
  | 'mes'
  | 'anio'
  | 'cedula'
  | 'referencia'
  | 'telefonoPagoMovil'
  | 'telefonoBizum'
  | 'fechaPago'
  | 'otp'
  | 'banco'

type Api = {
  filtrar: (campo: Campo, valor: unknown) => string
  valido: (campo: Campo, valor: unknown) => boolean
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
  PREFIJOS: { codigo: string; pais: string }[]
  partirTelefono: (e164: string) => { prefijo: string; resto: string }
  aE164: (valor: string) => string
  /** «DD/MM/AAAA» → «AAAA-MM-DD», o '' si no cuadra. */
  fechaAISO: (v: string) => string
  /** «AAAA-MM-DD» → «DD/MM/AAAA», o '' si no cuadra. */
  fechaDesdeISO: (v: string) => string
  PRECIO_USD: number
  /** Lo más largo que admite una respuesta escrita (hoy, «¿Dónde trabajas?»). */
  MAX_TEXTO: number
  /** Cuándo cierra una fecha (20-10): las cenas a medianoche al empezar su día; los planes de mañana, a las 5:00 p.m. del día anterior. */
  cierreDe: (inicioIso: string) => string | null
  /** «se cierra a medianoche, cuando empieza el viernes» / «se cierra el sábado a las 5:00 p.m.»: lo mismo en web, app y correos. Con `cierreIso` (el `cierraEn` real de la fecha), si se movió a mano, dice esa hora (c29a108). */
  textoCierre: (inicioIso: string, zona?: string | null, cierreIso?: string | null) => string
  /** El juego de la mesa (mazo aprobado por Michael, JUEGO.md). */
  JUEGO: JuegoDeMesa
  /** Las `porRonda` preguntas de una ronda, deterministas por mesa: todos los teléfonos de la mesa ven las mismas. `ronda` = índice o clave; `[]` si no existe. */
  preguntasDeRonda: (mesaId: string, ronda: number | string) => string[]
  precioTexto: () => string
  /** La zona del producto. Cuando `cities` tenga su columna, se cambia aquí para web y app. */
  ZONA: string
  /** «sábado»: el nombre del día de una fecha, en `ZONA`. `null` si la fecha no vale. */
  diaDe: (iso: string | null | undefined, zona?: string | null) => string | null
  /** «12:00 p.m.»: la hora de una fecha, en `ZONA`. La misma que usan los correos. */
  horaDe: (iso: string | null | undefined, zona?: string | null) => string | null
  /** «Viernes y sábado»: los días en que caen unas fechas, en orden y sin repetir. `''` sin fechas. */
  diasDe: (fechas: { iso: string; zona?: string | null }[]) => string
  /** «enero» … «diciembre», en minúscula. */
  MESES: string[]
  /** «siete y media de la noche», «7:20 p.m.» con minutos sueltos. */
  horaEnLetra: (horas: number, minutos: number) => string
  /** Las partes de una fecha en la zona que se pase (`zonaHoraria` de esa fecha); sin zona, `ZONA`. */
  partesDe: (iso: string | null | undefined, zona?: string | null) => PartesFecha | null
  /** 0 esta semana · 1 la que viene · 2 más adelante. Lunes a domingo, en la zona de la fecha; el domingo ya es la que empieza. `ahora` opcional (58f40f4). */
  semanaDe: (iso: string, zona?: string | null, ahora?: number) => 0 | 1 | 2
  /** Los días que se guardan la cédula y la selfie tras aprobarse: lo que dice Privacidad (120). Nunca escrito a mano. */
  DIAS_GUARDA_FOTOS: number
  /** Cuántas horas antes hay que avisar para cancelar con crédito o cambiar de fecha (24). No es `HORAS_DE_CIERRE`, aunque hoy valgan igual. */
  HORAS_DE_MARGEN: number
  /** Cuándo se revela un plan: el ISO de la fecha si lo trae, o el de la regla (mediodía, o la víspera a las 6 en los de mañana). */
  /** «El día de la cena, al mediodía» / «La víspera, a las seis de la tarde»; '' sin fecha (f0e8a7e). */
  cuandoSeRevela: (inicioIso: string, zona?: string | null, revelaIso?: string | null, formato?: string | null) => string
  /** «Seguir en contacto» y Pasadas (reglas.js, 31-10): todo su copy, el mismo de la web y los correos. */
  CONTACTO: Contacto
  /** +1 acompañante (entrega mas-uno, 01-11): todo su copy, el mismo de la web. */
  MAS_UNO: MasUno
  /** «Estás dentro» (reglas.js, 31-10). De momento la app solo lee si un plan tiene tarjetas para historias. */
  DENTRO: {
    conTarjetas: (formato: string) => boolean
    /** 'historia' (cena, brunch: TarjetaHistoria), 'plan' (drinks, café: TarjetaPlan) o null (movimiento). */
    tarjetaDe: (formato: string) => 'historia' | 'plan' | null
    variantes: (conCodigo: boolean, formato?: string, masUno?: boolean) => number[]
    cuandoSeSabe: (revelaIso: string | null | undefined, zona?: string | null) => string
    /** Todo lo que pinta TarjetaPlan (entrega drinks-cafe, aprobada el 31-10). Null fuera de drinks y café. */
    tarjetaPlan: (
      plan: { empiezaEn: string; revelaEn?: string | null; zonaHoraria?: string | null; formato?: string | null; zonas?: string[] },
      codigo: string | null,
    ) => DatosPlan | null
  }
  /** La familia de un formato (cenas, brunch, drinks, coffee, movimiento), de `FAMILIAS`. */
  familiaDe: (formato: string) => { clave: 'cenas' | 'brunch' | 'drinks' | 'coffee' | 'movimiento' | string }
  /** «Cómo funciona» en tres tarjetas: los textos de la web y la app, en un solo sitio (f0e8a7e). */
  COMO_FUNCIONA: {
    titulo: string
    fila: { titulo: string; bajada: string }
    filaMesa: { titulo: string; bajada: string }
    siguiente: string
    entendido: string
    etiquetas: { antes: string; durante: string; despues: string }
    iconos: { antes: string; durante: string; despues: string }
    primeraVez: { sello: (plan: string) => string; titulo: string; tituloDia: string }
    pie: (miMesa: string) => string
    cuentaDe: (i: number, n: number) => string
    tarjetas: (tipo: 'cena' | 'brunch' | 'grupo', cuando: string) => { clave: 'antes' | 'durante' | 'despues'; icono: string; titulo: string; cuerpo: string }[]
    tipoDe: (formato: string | null | undefined) => 'cena' | 'brunch' | 'grupo'
  }
  /** «una», «dos», «tres»… en femenino (personas, cenas). */
  enLetra: (n: number) => string
  /** «Una mesa son seis», «4 apuntados · faltan 2 para la primera mesa»… con cuántos van juntos en ESA fecha (31-10). */
  fraseDeApuntados: (n: number, porMesa?: number | null) => string
  revelaDe: (inicioIso: string, zona?: string | null, revelaIso?: string | null) => { cuando: string; mismoDia: boolean; dia: string; hora: string; enLetra: string } | null
  /** El arraigo dicho de otra persona («Volvió al país»), por código (f8f4cf5). */
  ARRAIGO_EN_LA_MESA: Record<string, string>
  /** Los tramos de gasto de la encuesta, [texto, punto medio]: se guarda el punto medio. Uno para app, web y panel. */
  TRAMOS_GASTO: [string, number][]
  /** Las cuatro preguntas de la puerta, UN sitio para web y app. Opciones como [texto, código]. */
  PUERTA: Record<string, PreguntaPuerta>
  ORDEN_PUERTA: string[]
  /** La puerta entera: la ciudad y, si está abierta, las cuatro (15-10). `abierta` indefinido: aún no lo dijo. */
  pasosDePuerta: (abierta?: boolean) => string[]
  /** Lo que se le dice a quien vive donde todavía no abrimos. */
  CIUDAD_CERRADA: (nombre: string | null | undefined, slug: string) => { titulo: string; bajada: string }
  /** Mesa o grupo según el formato: «Mi mesa» / «Mi grupo», y el resto del vocabulario. */
  /** Los bancos de Venezuela, por código: se guarda el código, que es lo que sale en el movimiento. */
  BANCOS: { codigo: string; nombre: string }[]
  /** Qué regla aplica a un campo de un método de pago (`null`: solo que no esté vacío). */
  campoDe: (definicion: CampoDePago) => Campo | null
  vozDe: (formato: string | null | undefined) => { unidad: 'mesa' | 'grupo'; mia: string } & Record<string, string>
  /** Las cenas: lo que se dice «cenas» y lleva la nota de la encuesta «Pensado para cenas». */
  DE_CENA: string[]
  /** La Mi mesa completa (foto de la entrada, paso a paso, juego): las cenas y el brunch (Michael, 24-10). */
  DE_MESA_COMPLETA: string[]
  tieneMesaCompleta: (formato: string | null | undefined) => boolean
  /** El guion de la mesa (paso a paso), compartido con la web desde el 15-10. */
  GUION: {
    titulo: string
    bajada: string
    ahora: string
    duracionDeLaMesa: number
    momentos: { clave: string; desde: 'inicio' | 'cierre'; min: number; nombre: string; texto: string }[]
    delJuego: Record<string, string>
    seguir: { titulo: string; aPie: string; comoLlegar: string }
  }
  /** Los momentos de esta mesa con su hora puesta, en la zona de la ciudad. `[]` sin hora de inicio. */
  pasosDeLaMesa: (empiezaEn: string | null | undefined, zona?: string | null, formato?: string | null) => PasoDeLaMesa[]
  momentoDeLaMesa: (pasos: PasoDeLaMesa[], ahora: number) => 'antes' | 'curso' | 'terminada'
  /** El índice del primero de los momentos en curso, o -1. */
  enCursoDeLaMesa: (pasos: PasoDeLaMesa[], ahora: number) => number
  /** «7:30 p.m.» → «7:30». */
  horaCorta: (hora: string | null | undefined) => string
}

export type PasoDeLaMesa = { clave: string; en: string; hora: string; nombre: string; texto: string; botonJuego: string }

/** Un campo de un método de pago, tal como lo define `payment_methods.campos`. */
export type CampoDePago = {
  campo: string
  etiqueta: string
  tipo?: 'tel' | 'documento' | 'banco' | 'fecha' | 'numero' | 'texto' | string
  prefijo?: string
  conTipo?: boolean
  largo?: number
  requerido?: boolean
}

export type PartesFecha = {
  /** «sábado» */
  dia: string
  /** 0 = domingo */
  diaNumero: number
  numero: number
  /** «octubre» */
  mes: string
  mesNumero: number
  ano: number
  horas: number
  minutos: number
  /** «8:00 p.m.» */
  hora: string | null
}

export type PreguntaPuerta = {
  clave: string
  etiqueta: string
  tipo: 'unica' | 'multi'
  pregunta: string
  ayuda: string | null
  min?: number
  max?: number
  /** [texto, código]. Vacío en zonas: esas vienen de /api/zonas. */
  opciones: [string, string][]
}

export type RondaDeJuego = { clave: string; titulo: string; bajada: string; preguntas: string[]; /** La bajada corta de la tarjeta de Mi mesa. */ enLaTarjeta?: string; /** «MIENTRAS LLEGA LA COMIDA». */ cuando?: string }
export type JuegoDeMesa = {
  rondas: RondaDeJuego[]
  porRonda: number
  /** Minutos respecto a `starts_at`: se abre a `abreMin` (negativo, antes) y se cierra a `cierraMin`. */
  abreMin: number
  cierraMin: number
  reglas: string[]
  /** «Tres rondas · la última, opcional»: el subtítulo de la pantalla de reglas. */
  subtituloReglas: string
  final: string
  /**
   * El juego por temáticas (entrega tematicas de Design, 29-10), cuando esté
   * aprobado y en `reglas.js`. Mientras no venga, la app juega por rondas.
   */
  tematicas?: TematicaDeJuego[]
}

/** Una temática: la mesa la elige. Lo visual (color, icono) es de la app, por posición. */
export type TematicaDeJuego = { clave: string; nombre: string; linea: string; preguntas: string[]; estilo?: { fondo: string; tinta: string; suave: string; icono: string } }

// JavaScript sin tipos a propósito: se declara la forma que la app usa y se
// fía de ella. Si `reglas.js` cambiara esa forma, lo cazan las pruebas.
type Nombres = (lista: string[]) => string
type Contacto = {
  DIAS: number
  nombres: Nombres
  hasta: (cierraIso: string, zona?: string | null) => string
  quedan: (cierraIso: string, zona?: string | null, ahora?: number) => string
  quedanCorto: (cierraIso: string, zona?: string | null, ahora?: number) => string
  plazoDeOtra: (nombre: string, cierraIso: string, zona?: string | null) => string
  linea: { encuesta: (dia: string) => string; porConfirmar: (lista: string[], cuanto: string) => string; coincidiste: Nombres; verLoQueDejo: (n: number) => string; elige: (cuanto: string) => string }
  A: {
    titulo: (nombre: string) => string
    tituloVarios: string
    telefono: (varios: boolean) => string
    telefonoNota: string
    telefonoFalta: string
    redes: string
    opcional: string
    soloSi: (nombre: string) => string
    compartir: string
    prefieroNo: string
    noSeEntera: (nombre: string) => string
    seLoMandamos: string
    soloAQuien: string
    compartirCon: (marcadas: string[], total: number) => string
    prefieroNoNadie: string
  }
  B: { titulo: (nombre: string) => string; bajada: string; loQueVas: string; cambiar: string; enCualquierCaso: string; prefieroNo: string; aSuRitmo: string; teAvisamos: string }
  C: { titulo: (nombre: string) => string; bajada: string; teDejo: (nombre: string) => string; whatsapp: string; abrir: string; leDejaste: string; nota: string }
  D: { titulo: string; bajada: string; agenda: string; verAgenda: string }
  E: { titulo: string; bajada: (nombre: string) => string; puedesCambiar: (cierraIso: string, zona?: string | null) => string; elegir: string }
  sellos: Record<'A' | 'B' | 'C' | 'D' | 'E', string>
  compartirTambien: (nombre: string) => string
  loQueCompartes: string
  cambiar: string
  pasadas: {
    encuesta: string
    contacto: string
    nuevo: { coincidencia: Nombres; cruce: (nombre: string) => string; sinCruce: string }
    estado: Partial<Record<string, string>>
    vacia: { titulo: string; bajada: string; boton: string }
    misCenas: (n: number) => string
  }
  cena: {
    pestanas: { proxima: string; pasadas: string }
    seguir: string
    conQuien: string
    verAgenda: string
    encuesta: { titulo: string; bajada: string }
    encuestaProxima: { titulo: (dia: string) => string; bajada: string }
    contar: string
    contada: { titulo: string; cuando: (iso: string | null | undefined, zona?: string | null) => string; ver: string }
    mesa: (n: number | null | undefined) => string
    preguntaAnterior: { titulo: (esMesa: boolean) => string; nota: string; guardar: string; nadie: string }
  }
  enlaces: { whatsapp: (e164: string) => string; instagram: (u: string) => string; tiktok: (u: string) => string }
}

type Trozos = [string, string] | string[]

/** `AroReglas.MAS_UNO` (5b29bfd). Los trozos de dos: el segundo va en negrita. */
export type MasUno = {
  nombre: string
  marca: string
  DUOS: { minimo: number; maximo: number; bueno: number }
  fraseDeDuos: (puestos: number) => string
  avanceDeDuos: (puestos: number) => number
  plazo: (cierreIso: string, zona?: string | null) => string
  hoja: { titulo: string; bajada: string; tuPuesto: string; suPuesto: string; total: string; nota: string; boton: (creditos: number) => string; botonPrecio: (precio: string) => string }
  aviso: { sello: string; titulo: string; plazo: (plazo: string) => Trozos; cancela: Trozos; casilla: string; falta: string }
  pago: { titulo: string; total: string }
  dentro: { sello: string; titulo: string; bajada: (plazo: string) => string[]; invitar: string; historias: string; cancela: () => string }
  mensaje: (inv: { dia: string; hora: string; zonas: string; plazo: string; enlace: string }) => string
  tituloDelEnlace: (nombre: string | null) => string
  tarjeta: {
    cabecera: string
    sellos: Record<'sin-usar' | 'registrado' | 'confirmado', string>
    sinUsar: { titulo: string; bajada: (plazo: string) => string[] }
    copiar: string
    copiado: string
    compartir: string
    registrado: { titulo: (nombre: string | null) => string; creo: string; falta: string; faltaDetalle: (plazo: string) => string; nota: string }
    confirmado: { titulo: (nombre: string | null) => string; bajada: (revela: string | null) => string }
    cambiar: string
    cambio: { titulo: string; cuerpo: (nombre: string | null) => string; plazo: (plazo: string) => string; si: string; no: string }
    cancelada: { sello: (dia: string) => string; titulo: string; bajada: (cierre: string | null) => string; creditos: string; creditosTexto: string; creditosNota: string; boton: string }
  }
  invitado: {
    sello: string
    titulo: (nombre: string | null) => string
    fechaSello: string
    donde: (zonas: string, revela: string | null) => string
    cuerpo: (nombre: string | null) => Trozos
    faltaTitulo: (plazo: string) => string
    pasosSinCuenta: [string, string][]
    tienesCuenta: [string, (nombre: string | null) => string]
    verificada: [string, string]
    porVerificar: [string, string]
    alta: string
    entrar: string
    aceptar: string
    noPuedo: string
    aceptada: string
    usada: { titulo: string; linea: string }
    anulada: { titulo: string; linea: (nombre: string | null) => string }
    cerrada: { titulo: string; linea: string }
    propia: { titulo: string; linea: string }
    socio: string
    agenda: string
  }
  acompanante: { verificate: (plazo: string) => Trozos; esperando: string; selloPendiente: string; selloDentro: string; pie: (invita: string | null) => string; cancela: (invita: string | null) => string }
  vienesCon: (nombre: string | null) => string
  vasCon: (nombre: string | null) => string
  mesa: { tuDuo: string; bajada: (duos: number) => string; pareja: (a: string, b: string) => string }
}

/** Lo de `DENTRO.tarjetaPlan`. `revelaDia` vacío: se sabe el mismo día. */
export type DatosPlan = {
  plan: 'Drinks' | 'Café'
  cafe: boolean
  dia: string
  diaSemana: string
  numero: string
  hora: string
  zona: string
  codigo: string | null
  revelaDia: string
  revelaNum: string
  revelaSufijo: string
  sello: string
  sitioMayus: string
  frase1: string
  frase3: string
  cierre3: string
  titulo4: string
  cuerpo4: string
  frase5: string
  pregunta6: string
}

export const reglas = crudo as unknown as Api
