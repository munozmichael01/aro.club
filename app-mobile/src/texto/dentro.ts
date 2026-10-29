import { reglas } from '../reglas'

/**
 * «Estás dentro», calcado de la entrega estas-dentro de Design (29-10). A: al
 * reportar el pago. B: al confirmarlo, o al instante con crédito o cupón.
 */

export const A = {
  sello: 'PAGO EN REVISIÓN',
  titulo: 'Tu puesto está apartado.',
  bajada: 'Una persona cuadra tu pago con el banco, normalmente en menos de una hora. Te avisamos al confirmarlo. No hace falta que dejes esto abierto.',
  pasos: [
    { t: 'Tu puesto está apartado', d: 'Nadie más lo puede tomar.' },
    { t: 'Lo cuadramos con el banco', d: 'Una persona compara tu reporte con el movimiento real.' },
    { t: 'Te avisamos al confirmarlo', d: 'Con un correo y un aviso en la app. Ahí estás dentro.' },
  ],
  luego: 'Cuando confirmemos el pago, podrás compartir tu plan.',
}

export const B = {
  titulo: 'Estás dentro.',
  credito: { sello: 'RESERVA CONFIRMADA', bajada: 'Pagaste con crédito. No hace falta nada más.' },
  confirmado: { sello: 'PAGO CONFIRMADO', bajada: 'Cuadramos tu pago con el banco. Te mandamos el comprobante por correo.' },
  /**
   * Al reportar el pago, ya «Estás dentro» (Michael, 29-10: nunca se ha
   * rechazado un pago y, si algo falla, escribe él). Sin decir «confirmado»,
   * que todavía no lo es.
   */
  reportado: { sello: 'PUESTO APARTADO', bajada: 'Reportaste tu pago. Lo cuadramos con el banco y, si algo no cuadra, te escribimos.' },
  /** Cuando no sabemos cómo pagó (la primera apertura tras confirmar). */
  sinSaber: { sello: 'RESERVA CONFIRMADA', bajada: null as string | null },
  compartir: 'Compartir mi plan',
}

export const calendario = { anadir: 'Añadir al calendario', yaEsta: 'Ya está en tu calendario' }
export const verMesa = 'Ver mi mesa'

/** Qué se abre en la revelación, según haya mesa o grupo (V de la entrega). */
export const revela = (esMesa: boolean) =>
  esMesa ? 'Se abre todo: el sitio, la dirección, tu número de mesa y quiénes van.' : 'Se abre todo: el punto de encuentro y quiénes van.'

export const cancela = (esMesa: boolean) =>
  `Cancelas con más de ${reglas.HORAS_DE_MARGEN} horas y recuperas el crédito completo. Con menos, se pierde: ${esMesa ? 'la mesa ya está armada' : 'el grupo ya está armado'}.`

/** El evento de calendario (HANDOFF de la entrega): «Aro Club · Cena». */
export const evento = {
  titulo: (plan: string) => `Aro Club · ${plan}`,
  descripcion: (cuando: string) => `El sitio se abre ${cuando}. Los detalles están en Mi mesa.`,
}

/**
 * Lo que acompaña al compartir (REFERIDOS.md, aprobado por Michael el 29-10).
 * Sin código todavía (los referidos no están construidos), la frase del
 * código no va.
 */
export const mensaje = (codigo: string | null) =>
  codigo
    ? `Estoy en Aro Club: cenas con gente que no conoces, en grupos pequeños y todos verificados. El sitio lo eligen ellos. Con mi código ${codigo} tu primera fecha tiene un 20% de descuento: aro.club/i/${codigo}`
    : 'Estoy en Aro Club: cenas con gente que no conoces, en grupos pequeños y todos verificados. El sitio lo eligen ellos: aro.club'

export const sinRespuesta = {
  cargar: 'No pudimos cargar tu plan. Revisa la conexión y vuelve a intentarlo.',
  reintentar: 'Reintentar',
}
