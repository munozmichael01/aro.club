/**
 * Cuánto falta para poder levantar el velo. Puro, para probarlo sin React.
 *
 * `0` si ya pasó el suelo: se levanta al momento. Si no, lo que queda hasta
 * el suelo, y ni un milisegundo más: una respuesta lenta no espera de más.
 */
export function esperaParaLevantar(empezo: number, ahora: number, suelo: number): number {
  return Math.max(0, suelo - (ahora - empezo))
}

/**
 * Lo mismo con el umbral de la entrega carga (03-11): el velo no se enseña
 * hasta los 0,4 s. Si la respuesta llega antes, nunca se vio y se levanta al
 * momento. Si llega después, se vio desde el umbral y se queda el suelo
 * entero a partir de ahí.
 */
export function esperaConUmbral(empezo: number, ahora: number, umbral: number, suelo: number): number {
  if (ahora - empezo < umbral) return 0
  return esperaParaLevantar(empezo + umbral, ahora, suelo)
}
