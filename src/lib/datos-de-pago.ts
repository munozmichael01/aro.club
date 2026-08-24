import 'server-only'

/**
 * Lo que se PINTA y lo que se COPIA, que no son lo mismo.
 *
 * Los datos de la cuenta se leen a ojo y se pegan en la app del banco, y
 * cada casilla del banco quiere el valor pelado. `V-19.064.051` se lee bien
 * y no se puede pegar: el tipo de documento se elige de una lista aparte, y
 * la V dentro del campo numérico lo rompe. Lo mismo el punto de los miles del
 * monto y los espacios del teléfono.
 *
 * Sale del SERVIDOR, junto al valor de pintar. Resolviéndolo en la pantalla
 * queda atado a cómo están escritos hoy esos valores, y el día que se
 * encienda Zelle hay que volver a tocarla — que es justo lo que no se quiere.
 *
 * ## Por nombre de campo, no adivinando por la forma
 *
 * Un documento y un teléfono son los dos números con separadores; qué hay que
 * quitarle a cada uno depende de qué es, no de cómo se ve. Y el correo de
 * Zelle no se toca: pelarlo lo destruiría.
 *
 * Lo que no cae en ninguna regla se copia tal cual. Es la respuesta correcta
 * para un nombre de titular, y es la respuesta segura para un campo que
 * alguien añada mañana: peor que no limpiarlo sería limpiarlo mal.
 */

/** Sin tildes y en minúscula, para reconocer «Teléfono» y «telefono». */
function plano(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const soloDigitos = (v: string) => v.replace(/\D/g, '')

/**
 * El código del banco: los cuatro dígitos de delante.
 *
 * `0114 · Bancaribe` se copia `0114`, que es lo que pide la casilla. Con
 * `soloDigitos` a secas saldría `0114` igual hoy, pero el día que un banco
 * lleve un número en el nombre —«100% Banco»— saldría pegado.
 */
function codigoDeBanco(v: string): string {
  const m = v.match(/\b(\d{4})\b/)
  return m ? m[1] : soloDigitos(v)
}

const REGLAS: [RegExp, (v: string) => string][] = [
  // El documento pierde la letra Y los puntos: `V-19.064.051` → `19064051`.
  [/^(documento|cedula|rif|identificacion)/, soloDigitos],
  [/^(telefono|movil|celular)/, soloDigitos],
  [/^banco/, codigoDeBanco],
  // Cuenta, referencia: números con separadores que el banco quiere pelados.
  [/^(cuenta|nro|numero|referencia)/, soloDigitos],
]

export function comoSeCopia(campo: string, valor: string): string {
  const k = plano(campo)
  for (const [patron, limpiar] of REGLAS) {
    if (patron.test(k)) return limpiar(valor)
  }
  return valor.trim()
}

/**
 * El monto: se pinta `1.234,56 Bs` y se copia `1234,56`.
 *
 * El separador de miles rompe el campo, y la moneda detrás también. La coma
 * de los decimales se queda: es la que espera un banco venezolano.
 */
export function montoParaCopiar(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toFixed(2).replace('.', ',')
}

export function montoParaPintar(n: number | null | undefined, moneda: string): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const [entero, dec] = n.toFixed(2).split('.')
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} ${moneda}`
}

export type DatoDePago = { campo: string; valor: string; copiar: string }

/**
 * Los datos de un método, listos para pintar y para copiar.
 *
 * El monto va DENTRO de la lista y no aparte: es un dato más que hay que
 * pegar en el banco, y tenerlo fuera es lo que hacía que su botón de copiar
 * se llevara el punto de los miles y la moneda.
 */
export function datosDePago(
  cuenta: Record<string, unknown> | null,
  monto: number | null,
  moneda: string,
): DatoDePago[] {
  const datos: DatoDePago[] = []

  for (const [campo, crudo] of Object.entries(cuenta ?? {})) {
    // Una marca interna, no un dato de la cuenta.
    if (campo === 'pendiente_de_datos_reales') continue
    const valor = String(crudo ?? '')
    if (!valor) continue
    datos.push({ campo, valor, copiar: comoSeCopia(campo, valor) })
  }

  if (monto != null) {
    datos.push({
      campo: 'Monto exacto',
      valor: montoParaPintar(monto, moneda),
      copiar: montoParaCopiar(monto),
    })
  }

  return datos
}
