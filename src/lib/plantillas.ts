import 'server-only'

/**
 * El motor de plantillas de los correos. Cuatro cosas, y ninguna más.
 *
 * Las trece plantillas de Design son HTML de verdad —tablas, estilos en
 * línea, lo que hace falta para que un correo se vea igual en Gmail y en
 * Outlook— con el ejemplo escrito dentro: «Daniela», «Cardenal», «jueves 14».
 * Convertirlas en plantillas es marcar dónde va cada dato.
 *
 * No se mete una librería para esto. Una plantilla de correo necesita
 * sustituir, decidir si un bloque sale, y repetir una lista: eso son treinta
 * líneas. Lo que sí hace falta es que ESCAPE, porque aquí entran nombres que
 * escribió gente —y un apellido con un `<` rompe el correo entero, o algo
 * peor—. Escapar es lo único que no puede fallar.
 *
 *   {{ nombre }}          el valor, escapado
 *   {{{ enlace }}}        el valor crudo: solo para URLs que construimos aquí
 *   {{#si hayAlgo}}…{{/si}}   el bloque sale si el valor es cierto
 *   {{#no hayAlgo}}…{{/no}}   y este si no lo es
 *   {{#cada gente}}…{{/cada}} una vez por elemento, con {{ . }} dentro
 */

export type Valores = Record<string, unknown>

/** Lo que convierte un nombre en algo que no puede romper el HTML. */
function escapar(v: unknown): string {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Cierto de verdad: cero y cadena vacía NO pintan el bloque. */
function hay(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  return v != null && v !== false && v !== '' && v !== 0
}

function valorDe(datos: Valores, clave: string): unknown {
  const limpia = clave.trim()
  if (limpia === '.') return datos['.']
  // `mesa.numero` para no tener que aplanar todo antes de pintar.
  return limpia.split('.').reduce<unknown>((v, parte) => {
    if (v == null || typeof v !== 'object') return undefined
    return (v as Record<string, unknown>)[parte]
  }, datos)
}

export function pintar(plantilla: string, datos: Valores): string {
  let salida = plantilla

  /**
   * Los bloques primero, contando los que se abren dentro.
   *
   * Esto era una expresión regular con `[\s\S]*?`, y lo no-codicioso cerraba
   * el bloque en el PRIMER `{{/si}}` que encontrara. Con un `{{#si}}` dentro
   * de otro —que es lo que trae la plantilla 23, «y dos fechas más» dentro
   * de «hay aperturas»— el de fuera se cerraba en el de dentro y la mitad
   * del correo desaparecía. No fallaba: salía un correo más corto.
   *
   * Con tope: una plantilla mal cerrada no puede colgar el proceso que manda
   * los correos. Si se pasa, sale lo que haya y se ve en el log.
   */
  const abre = /\{\{#(si|no|cada)\s+([\w.]+)\}\}/
  let vueltas = 0
  for (;;) {
    const m = abre.exec(salida)
    if (!m || vueltas++ >= 100) break

    const tipo = m[1]
    const clave = m[2]
    const desde = m.index + m[0].length

    // Hasta su cierre, saltándose los que se abren por el camino.
    const marcas = new RegExp('\\{\\{(#' + tipo + '\\s+[\\w.]+|/' + tipo + ')\\}\\}', 'g')
    marcas.lastIndex = desde
    let nivel = 1
    let hasta = -1
    let fin = -1
    for (;;) {
      const t = marcas.exec(salida)
      if (!t) break
      if (t[1].charAt(0) === '#') nivel++
      else if (--nivel === 0) { hasta = t.index; fin = t.index + t[0].length; break }
    }

    if (hasta < 0) {
      console.error('[plantillas] bloque sin cerrar:', tipo, clave)
      break
    }

    const cuerpo = salida.slice(desde, hasta)
    const v = valorDe(datos, clave)
    let pintado = ''
    if (tipo === 'si') pintado = hay(v) ? cuerpo : ''
    else if (tipo === 'no') pintado = hay(v) ? '' : cuerpo
    else if (Array.isArray(v)) {
      pintado = v
        .map((item) =>
          pintar(cuerpo, typeof item === 'object' && item != null
            ? { ...datos, ...(item as Valores), '.': item }
            : { ...datos, '.': item }),
        )
        .join('')
    }

    salida = salida.slice(0, m.index) + pintado + salida.slice(fin)
  }

  if (vueltas >= 100) console.error('[plantillas] demasiadas vueltas: ¿un bloque sin cerrar?')

  // Crudo: solo para lo que construimos nosotros —una URL firmada, un enlace
  // de recuperación—. Nunca para algo que escribió una persona.
  salida = salida.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, clave: string) =>
    String(valorDe(datos, clave) ?? ''),
  )

  salida = salida.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, clave: string) =>
    escapar(valorDe(datos, clave)),
  )

  return salida
}

/**
 * Lo que se ve en la bandeja antes de abrir: el asunto y la línea de debajo.
 *
 * Salen del `<title>` y del primer párrafo oculto de la plantilla, que es
 * donde Design los puso. Sacarlos de ahí y no de una tabla aparte es lo que
 * evita que el asunto diga una cosa y el correo otra.
 */
export function asuntoDe(html: string): string {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i)
  if (!m) return 'Aro Club'
  return m[1].replace(/\s+/g, ' ').trim()
}
