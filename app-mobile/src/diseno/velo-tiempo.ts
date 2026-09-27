/**
 * Cuánto falta para poder levantar el velo. Puro, para probarlo sin React.
 *
 * `0` si ya pasó el suelo: se levanta al momento. Si no, lo que queda hasta
 * el suelo, y ni un milisegundo más: una respuesta lenta no espera de más.
 */
export function esperaParaLevantar(empezo: number, ahora: number, suelo: number): number {
  return Math.max(0, suelo - (ahora - empezo))
}
