import { randomBytes } from 'node:crypto'

/**
 * Las contraseñas de las cuentas de prueba, fuera del código.
 *
 * ESTE REPOSITORIO ES PÚBLICO. Había cuatro guiones con una contraseña
 * escrita dentro —`banco-pruebas`, `cuenta-demo`, `ops-test` y
 * `sembrar-mesa`—, y una de esas cuentas tenía rol `ops`: entraba al panel de
 * operación, veía cédulas y pagos de gente real. Cualquiera que leyera el
 * repositorio tenía el usuario y la contraseña.
 *
 * `cuenta-revision.mjs` ya lo había resuelto bien —genera y imprime, no
 * escribe— y esto es lo mismo, en un sitio, para que no haya que acordarse.
 *
 * CAMBIARLO NO BORRA EL PASADO: las contraseñas viejas siguen en el historial
 * de git y hay que darlas por quemadas. Lo que sostiene esto no es el secreto
 * de la contraseña, es que las cuentas se borran al terminar.
 *
 * Dos modos, y la diferencia importa:
 *
 *  - `obligatoria: true` — no hay contraseña si no está la variable, y el
 *    guion para. Es para la cuenta con rol en el panel: generar una al vuelo
 *    dejaría una cuenta de operación viva con una contraseña que solo vio
 *    quien miró la terminal ese día.
 *
 *  - por defecto — si no hay variable se genera una y se IMPRIME. Es para las
 *    cuentas desechables: lo que hace falta es poder entrar hoy, no recordarla
 *    mañana.
 */
export function claveDe(variable, { obligatoria = false, para = 'la cuenta' } = {}) {
  const puesta = (process.env[variable] ?? '').trim()
  if (puesta) return puesta

  if (obligatoria) {
    console.error(`✗ Falta ${variable}.`)
    console.error(`  Es la contraseña de ${para} y no tiene valor por defecto a propósito:`)
    console.error('  este repositorio es público y esa cuenta entra al panel de operación.')
    console.error(`\n  ${variable}='…' node ${process.argv[1].split('/').pop()}`)
    process.exit(1)
  }

  const generada = 'Aro-' + randomBytes(9).toString('base64url')
  console.log(`Contraseña generada para ${para}: ${generada}`)
  console.log(`   (se imprime una vez. Para fijarla, pon ${variable} en el entorno.)\n`)
  return generada
}
