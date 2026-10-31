/**
 * Cuánto mide un texto en una fuente, leído del propio TTF.
 *
 * Para hacer a mano el `text-wrap: balance` de la maqueta, que Satori no
 * tiene: con la medida de cada palabra se busca el ancho más estrecho que
 * mantiene el mismo número de líneas, que es lo que hace el navegador.
 *
 * Solo el avance de cada glifo (`cmap` formato 4 + `hmtx`), sin el kerning:
 * para decidir dónde corta una línea sobra.
 */
export type Medida = (texto: string, tam: number, espaciado?: number) => number

export function medidor(ttf: Buffer): Medida {
  const tablas = new Map<string, number>()
  const n = ttf.readUInt16BE(4)
  for (let i = 0; i < n; i++) {
    const p = 12 + i * 16
    tablas.set(ttf.toString('latin1', p, p + 4), ttf.readUInt32BE(p + 8))
  }
  const head = tablas.get('head')!
  const hhea = tablas.get('hhea')!
  const hmtx = tablas.get('hmtx')!
  const cmap = tablas.get('cmap')!
  const porEm = ttf.readUInt16BE(head + 18)
  const metricas = ttf.readUInt16BE(hhea + 34)

  // La subtabla Unicode BMP (plataforma 3, codificación 1), formato 4.
  let sub = 0
  for (let i = 0, k = ttf.readUInt16BE(cmap + 2); i < k; i++) {
    const p = cmap + 4 + i * 8
    if (ttf.readUInt16BE(p) === 3 && ttf.readUInt16BE(p + 2) === 1) sub = cmap + ttf.readUInt32BE(p + 4)
  }
  const segs = ttf.readUInt16BE(sub + 6) / 2
  const fin = sub + 14
  const ini = fin + segs * 2 + 2
  const delta = ini + segs * 2
  const rango = delta + segs * 2

  const glifo = (c: number) => {
    for (let s = 0; s < segs; s++) {
      if (ttf.readUInt16BE(fin + s * 2) < c) continue
      const desde = ttf.readUInt16BE(ini + s * 2)
      if (desde > c) return 0
      const d = ttf.readInt16BE(delta + s * 2)
      const r = ttf.readUInt16BE(rango + s * 2)
      if (!r) return (c + d) & 0xffff
      const g = ttf.readUInt16BE(rango + s * 2 + r + (c - desde) * 2)
      return g ? (g + d) & 0xffff : 0
    }
    return 0
  }
  const avance = (g: number) => ttf.readUInt16BE(hmtx + Math.min(g, metricas - 1) * 4)

  const cache = new Map<number, number>()
  return (texto, tam, espaciado = 0) => {
    let u = 0
    for (const ch of texto) {
      const c = ch.codePointAt(0)!
      if (!cache.has(c)) cache.set(c, avance(glifo(c)))
      u += cache.get(c)!
    }
    return (u / porEm) * tam + espaciado * [...texto].length
  }
}

/**
 * El ancho más estrecho que deja el texto en las mismas líneas que el ancho
 * máximo: el `text-wrap: balance` de CSS.
 *
 * Cuenta las líneas como las arma flexbox con una caja por palabra, que es
 * como las pinta `Frase`: cada palabra lleva su espacio como margen derecho,
 * y ese margen OCUPA SITIO también al final de la línea. Contarlo como un
 * espacio entre palabras —como lo haría un texto normal— daba un ancho dos o
 * tres píxeles corto, y Satori bajaba una palabra de más.
 */
export function anchoEquilibrado(palabras: number[], espacio: number, maximo: number): number {
  // Yoga, el motor de cajas de Satori, redondea cada caja al píxel siguiente:
  // en una línea de cinco palabras son dos o tres píxeles que el cálculo
  // tiene que saber, o la última palabra baja de línea.
  const cajas = palabras.map((p, i) => Math.ceil(p) + 1 + (i < palabras.length - 1 ? espacio : 0))
  const lineas = (w: number) => {
    let n = 1
    let x = 0
    for (const c of cajas) {
      if (x && x + c > w) {
        n++
        x = c
      } else x += c
    }
    return n
  }
  const objetivo = lineas(maximo)
  let lo = Math.max(...cajas)
  let hi = maximo
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2
    if (lineas(mid) <= objetivo) hi = mid
    else lo = mid
  }
  return Math.min(maximo, Math.ceil(hi) + 1)
}
