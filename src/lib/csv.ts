/**
 * Las descargas del panel en CSV: los leads y la lista de Gente.
 *
 * Punto y coma, que es lo que abre bien un Excel en español sin pedir nada.
 * Y BOM delante, o los acentos salen rotos.
 */
export function csv(filas: string[][]): string {
  const escapar = (v: string) => {
    // Lo que empieza por = + - @ Excel lo ejecuta como fórmula: un nombre
    // escrito «=HYPERLINK(…)» por quien se apuntó se abriría como enlace en
    // la computadora de operación. Con el apóstrofo delante es texto, y el
    // teléfono (+58…) se queda entero en vez de leerse como 5,84E+11.
    const crudo = String(v ?? '')
    const t = /^[=+\-@\t\r]/.test(crudo) ? "'" + crudo : crudo
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
  }
  return '﻿' + filas.map((f) => f.map(escapar).join(';')).join('\r\n') + '\r\n'
}
