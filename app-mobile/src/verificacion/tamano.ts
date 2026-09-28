/**
 * A qué tamaño se encoge una foto antes de subirla. Puro, para probarlo.
 *
 * Como la web: mil seiscientos píxeles de lado largo sobran para que una
 * persona lea una cédula, y dejan la foto en unos trescientos kilos. Una
 * foto de iPhone entera son tres a ocho megas, y el servidor no acepta más de
 * cuatro (y Vercel corta en 4,5): cruda, ni llegaba.
 */
export const LADO_LARGO = 1600

/** El `resize` a pedir, o `null` si ya es pequeña (no se reescala, solo se recomprime). */
export function reescalado(ancho: number, alto: number, lado = LADO_LARGO): { width: number } | { height: number } | null {
  if (Math.max(ancho, alto) <= lado) return null
  return ancho >= alto ? { width: lado } : { height: lado }
}
