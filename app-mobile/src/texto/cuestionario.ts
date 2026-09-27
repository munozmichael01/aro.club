/**
 * El texto del cuestionario que NO está en el catálogo, copiado de
 * `Cuestionario.dc.html`: los títulos y propósitos de las cinco pantallas,
 * el nombre corto de cada pregunta («Falta tu sector») y los avisos.
 * Las preguntas, opciones y ayudas salen del catálogo (/api/questions).
 * Casilla B de TEXTO-tres-superficies.
 */

export const pantallas = [
  {
    titulo: 'Tu contexto',
    proposito: 'Con esto evitamos sentarte con alguien de tu misma empresa y armamos mesas donde las historias se entiendan entre sí.',
  },
  {
    titulo: 'Cómo eres en la mesa',
    proposito: 'Una mesa donde todos llevan la conversación no funciona, y una donde nadie la lleva tampoco. Nada de esto se le muestra a nadie.',
  },
  {
    titulo: 'De qué hablas',
    proposito: 'Es lo que más pesa a la hora de armar el grupo: dos horas se sostienen con temas, no con datos.',
  },
  {
    titulo: 'Qué buscas y cuánto',
    proposito: 'El rango que marques es el techo del sitio que elegimos. Nadie ve tu respuesta y no hay mesa mejor por gastar más.',
  },
  {
    titulo: 'Logística',
    proposito: 'Lo último. Con esto sabemos a qué mesa puedes llegar de verdad y qué sitio elegir.',
  },
]

/** Cómo se nombra cada pregunta cuando es la que falta. */
export const corto: Record<string, string> = {
  nacimiento: 'cuándo naciste',
  genero: 'tu género',
  arraigo: 'tu historia',
  sector: 'tu sector',
  empleador: 'dónde trabajas',
  momento: 'en qué momento estás',
  rol: 'cómo eres en la mesa',
  motivo: 'qué te trae',
  romance: 'si buscas algo romántico',
  temas: 'de qué hablas',
  evitar: 'qué prefieres esquivar',
  actividades: 'qué haces',
  planes: 'qué planes te interesan',
  peso: 'qué pesa más',
  comidas: 'tus comidas',
  gasto: 'tu presupuesto',
  zonas: 'tus zonas',
  dias: 'tus días',
  idiomas: 'tus idiomas',
  dieta: 'tu dieta',
}

export const progreso = (pantalla: number, total: number) => `PANTALLA ${pantalla + 1} DE ${total}`
export const completo = 'COMPLETO'

export const selloFalta = 'TE FALTA ESTA'
export const opcional = 'OPCIONAL'

export const contador = (n: number, min: number | null, max: number) => {
  const falta = min ? Math.max(0, min - n) : 0
  if (falta > 0) return n === 0 ? `Elige entre ${min} y ${max}` : falta === 1 ? 'Te falta 1' : `Te faltan ${falta}`
  return n >= max ? `Llegaste al máximo de ${max}` : `${n} de ${max}`
}

/** El atajo de zonas: no es una zona, marca todas. */
export const todasLasZonas = 'Cualquier zona de la ciudad'
export const empleadorEjemplo = 'Empieza a escribir'

export const edadMenor = 'Aro es para mayores de 18'
export const edad = (n: number) => `${n} años`

export const retomada = (pantalla: number) => `Te quedaste en la pantalla ${pantalla + 1}. Lo anterior está guardado.`
export const cerrar = 'Cerrar'

export const heredadas = (n: number) =>
  n === 1
    ? 'Una pregunta de esta pantalla ya la respondiste al registrarte. La saltamos.'
    : `${n} preguntas de esta pantalla ya las respondiste al registrarte. Las saltamos.`

export const boton = {
  continuar: 'Continuar',
  terminar: 'Terminar',
  faltaUna: (corto: string | undefined) => (corto ? `Falta ${corto}` : 'Falta una respuesta'),
  faltan: (n: number) => `Faltan ${n} en esta pantalla`,
  atras: 'Atrás',
}

export const pie = {
  guardado: 'Guardado. Puedes salir y volver cuando quieras.',
  alMomento: 'Guardamos cada respuesta al momento.',
  despues: 'Seguir después',
}

export const sinSesion = {
  titulo: (algoGuardado: boolean) => (algoGuardado ? 'Se cortó a mitad.' : 'Necesitamos saber quién eres.'),
  cuerpo: (algoGuardado: boolean) =>
    algoGuardado
      ? 'Lo que contestaste hasta ahora está guardado: se guarda respuesta a respuesta. La última no llegó a guardarse. Entra otra vez y sigues desde ahí.'
      : 'Sin identificarte no podemos guardar nada de lo que contestes, así que preferimos no hacerte empezar. Entra y seguimos.',
  entrar: 'Entrar',
  nueva: 'Todavía no tengo cuenta',
}

const LETRAS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']

export const cierre = {
  titulo: 'Listo. Ya podemos sentarte.',
  /** El número sale del catálogo (las obligatorias), no escrito a mano. */
  cuerpo: (obligatorias: number) => {
    const t = LETRAS[obligatorias] ?? String(obligatorias)
    return `${t.charAt(0).toUpperCase() + t.slice(1)} ${obligatorias === 1 ? 'respuesta' : 'respuestas'}. Con esto el algoritmo ya puede armar una mesa donde encajes, no una mesa cualquiera con un puesto libre.`
  },
  falta: 'LO QUE FALTA',
  textoFalta: (donde: string) =>
    donde === 'cuenta'
      ? 'Solo la contraseña con la que vuelves a entrar. Tus datos ya están guardados.'
      : 'Cómo te llamas, cómo quieres que te llamen en la mesa y a qué número te escribimos el día del encuentro. Ahí mismo creas tu cuenta.',
  continuar: 'Continuar',
}

/** Lo que el servidor no dice porque no contestó (casilla C). */
export const sinRespuesta = {
  guardar: 'No pudimos guardar esa respuesta. Revisa tu conexión.',
  cargar: 'No pudimos cargar tus respuestas. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
  /** La web enseña los códigos crudos («sector, empleador»); aquí, sus nombres. */
  faltanTodavia: (nombres: string[]) => `Todavía faltan respuestas: ${nombres.join(', ')}.`,
}
