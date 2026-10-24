import 'server-only'

/**
 * Preguntar por una lista larga de ids, en trozos, y sin fallar en silencio.
 *
 * PostgREST mete el `in` dentro de la URL. Con unos seiscientos y pico ids
 * la petición se pasa de largo y vuelve con un 400, y el cliente de Supabase
 * NO lanza: deja `data` en nulo y el error en su sitio. Un filtro escrito
 * como «de los que están en esta lista, quita a los que cumplan X» se
 * convierte entonces en «no quites a nadie», y una consulta que construye
 * una lista devuelve la lista vacía. Las dos salidas son malas y ninguna
 * falla por ningún sitio.
 *
 * Es lo que dejó al club sin un solo «abrimos zona» desde el 17 de octubre.
 * Ese día los interesados en Chacao y Los Palos Grandes pasaron de seiscientos:
 * la consulta final —a quién escribir— empezó a devolver 400, la lista salía
 * vacía y la ruta contestaba «avisados: 0» con un 200 limpio. Doce fechas se
 * abrieron sin que lo supiera nadie.
 *
 * Así que se pregunta por trozos y el error se LEVANTA. Quién recibe un
 * correo no se puede decidir con una consulta que a lo mejor contestó.
 */

/**
 * Cuántos ids por vuelta.
 *
 * El corte real estaba entre 600 y 650 con uuids. 300 deja sitio de sobra
 * para los filtros que van en la misma URL y para el día que un id sea más
 * largo, y son dos vueltas donde antes había una.
 */
const POR_TROZO = 300

type Respuesta<T> = { data: T[] | null; error: { message: string } | null }

export async function enTrozos<T>(
  ids: string[],
  consulta: (trozo: string[]) => PromiseLike<Respuesta<T>>,
  queEs = 'la consulta',
): Promise<T[]> {
  if (!ids.length) return []

  const salida: T[] = []
  for (let i = 0; i < ids.length; i += POR_TROZO) {
    const { data, error } = await consulta(ids.slice(i, i + POR_TROZO))
    if (error) throw new Error(`No se pudo leer ${queEs}: ${error.message}`)
    if (data) salida.push(...data)
  }
  return salida
}
