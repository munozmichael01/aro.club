/**
 * Las columnas que FIRMAN algo con un perfil, y por eso impiden borrarlo.
 *
 * Una cuenta de operación deja rastro por todas partes: cada cédula que
 * aprobó, cada pago que revisó, cada reparto que lanzó, cada local que
 * desactivó. Todas estas columnas apuntan a `profiles(id)` SIN `on delete`,
 * así que cualquiera de ellas bloquea el borrado del perfil — y el error de
 * Postgres menciona solo la primera: se suelta una y aparece la siguiente.
 *
 * ESTABAN ESCRITAS EN DOS GUIONES Y LAS DOS LISTAS SE QUEDARON CORTAS.
 * `cuenta-demo.mjs` llevaba nueve y `ops-test.mjs` ninguna. Faltaban cuatro
 * —`ops_audit_log.actor_id`, `matching_runs.published_by`,
 * `matching_runs.forced_by` y `restaurants.deactivated_by`— que se añadieron
 * en migraciones posteriores a esa lista, que es como se queda vieja una
 * lista copiada: nadie vuelve a ella al añadir una columna.
 *
 * SE SUELTA LA FIRMA, NO SE BORRA LA FILA. La aprobación de alguien no deja
 * de haber ocurrido porque la cuenta que la firmó fuera de prueba, y borrar
 * esas filas le quitaría la verificación a una persona que sí la tiene.
 *
 * Cómo se saca la lista otra vez, el día que haya una columna nueva:
 *
 *   grep -rn "references profiles(id)" supabase/migrations/*.sql | grep -v "on delete"
 *
 * Las que llevan `on delete set null` o `on delete cascade` NO van aquí: esas
 * se sueltan o se caen solas.
 */
export const FIRMAS = [
  ['verifications', 'reviewed_by'],
  ['employer_aliases', 'confirmed_by'],
  ['exclusions', 'created_by'],
  ['bookings', 'attended_marked_by'],
  ['fx_rates', 'set_by'],
  ['payments', 'reviewed_by'],
  ['matching_runs', 'created_by'],
  ['matching_runs', 'published_by'],
  ['matching_runs', 'forced_by'],
  ['incident_reports', 'resolved_by'],
  ['waitlist', 'converted_profile_id'],
  ['ops_audit_log', 'actor_id'],
  ['restaurants', 'deactivated_by'],
]

/**
 * Suelta las firmas de un perfil y lo borra, con su usuario de auth.
 *
 * Devuelve `null` si salió bien, o el motivo. Lo que NO hace es devolver algo
 * que parezca bien cuando no lo fue: `ops-test.mjs` imprimía «borrada» sin
 * mirar el error, y la cuenta seguía ahí con rol `ops` y con su contraseña
 * escrita en un fichero de un repositorio público.
 */
export async function borrarCuentaDeOperacion(admin, id) {
  for (const [tabla, columna] of FIRMAS) {
    const { error } = await admin.from(tabla).update({ [columna]: null }).eq(columna, id)
    if (error) console.error(`  aviso: ${tabla}.${columna} → ${error.message}`)
  }

  const { error: ep } = await admin.from('profiles').delete().eq('id', id)
  if (ep) return 'no se pudo borrar el perfil: ' + ep.message

  const { error: eu } = await admin.auth.admin.deleteUser(id)
  if (eu) return 'no se pudo borrar el usuario: ' + (eu.message || JSON.stringify(eu))

  return null
}
