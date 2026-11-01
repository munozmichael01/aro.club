/**
 * +1 acompañante (entrega mas-uno de Design, 01-11), sin React. El servidor
 * decide el estado (contrato «Para Móvil» del agente, 7c5ac12 y 5b29bfd); el
 * copy sale de `AroReglas.MAS_UNO`, el mismo de la web.
 */

/** Lo de quien reserva: en /api/mi-mesa, /api/mi-cuenta (reserva) y /api/estas-dentro. */
export type MasUno = {
  enlace: string | null
  estado: 'sin-usar' | 'registrado' | 'confirmado' | 'cancelada'
  /** Nombre de pila de quien se registró con el enlace. */
  nombre: string | null
  cierraEn: string | null
  /** «jueves 5 a las 7:00 p.m.», sin «el». */
  plazo: string | null
  /** El mensaje entero que acompaña al enlace (MAS_UNO.mensaje). */
  mensaje: string | null
  /** Para «Cambiar de acompañante» (POST /api/mas-uno). */
  reservaId?: string | null
  /** En la cancelada (4E): la fecha, para el sello «CENA +1 · VIERNES 6 · CANCELADA». */
  empiezaEn?: string | null
  zonaHoraria?: string | null
}

/** Quien entró por un enlace y aún no se ha verificado (5D), en /api/mi-mesa fase 'sin-reserva'. */
export type Pendiente = {
  invita: string | null
  eventoId: string
  formato: string | null
  empiezaEn: string
  revelaEn: string | null
  cierraEn: string | null
  plazo: string | null
  zonaHoraria: string | null
  zonas: string[]
}

/** «aro.club/m/K7Q2M…»: el enlace sin el protocolo, como lo enseña la maqueta. */
export const enlaceCorto = (enlace: string) => enlace.replace(/^https?:\/\//, '')

export type Persona = { id: string; nombre: string; sector: string; vieneCon?: string | null }

/**
 * «Con quién cenas» en dúos (6B). El servidor ya los manda en orden, el tuyo
 * primero y cada dúo junto (5b29bfd); aquí se cortan de dos en dos. Tu dúo es
 * el de quien apunta a alguien que no está en la lista (tú). Si alguien quedó
 * suelto (un dúo a medias), va solo en su tarjeta.
 */
export function duos<T extends Persona>(gente: T[]): { tuyo: boolean; gente: (T | { yo: true })[] }[] {
  const ids = new Set(gente.map((g) => g.id))
  const mio = gente.find((g) => g.vieneCon && !ids.has(g.vieneCon))
  const salida: { tuyo: boolean; gente: (T | { yo: true })[] }[] = []
  if (mio) salida.push({ tuyo: true, gente: [{ yo: true }, mio] })
  const resto = gente.filter((g) => g !== mio)
  const usados = new Set<string>()
  for (const g of resto) {
    if (usados.has(g.id)) continue
    usados.add(g.id)
    const pareja = resto.find((x) => x.id === g.vieneCon && !usados.has(x.id))
    if (pareja) usados.add(pareja.id)
    salida.push({ tuyo: false, gente: pareja ? [g, pareja] : [g] })
  }
  return salida
}
