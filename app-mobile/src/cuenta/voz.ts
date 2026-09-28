import { useSyncExternalStore } from 'react'

import { reglas } from '../reglas'

/**
 * Cómo se llama la pestaña de la mesa: «Mi mesa», o «Mi grupo» si lo
 * reservado es de movimiento. La barra vive fuera de las pantallas, así que
 * el Inicio le cuenta aquí el formato de la reserva cuando lo sabe.
 */
let formato: string | null = null
const oyentes = new Set<() => void>()

export function contarFormato(f: string | null | undefined) {
  if ((f ?? null) === formato) return
  formato = f ?? null
  oyentes.forEach((o) => o())
}

export function useNombreMesa() {
  const f = useSyncExternalStore(
    (o) => (oyentes.add(o), () => oyentes.delete(o)),
    () => formato,
    () => formato,
  )
  return reglas.vozDe(f).mia
}
