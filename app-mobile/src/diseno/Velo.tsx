import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AroCarga } from './Aro'
import { Texto } from './Texto'
import { color, tiempo } from './tokens'
import { esperaConUmbral } from './velo-tiempo'

/**
 * El velo de carga: mientras no se sabe qué pintar, se enseña la marca.
 *
 * Tiene dos límites, los dos aprendidos en la web (`Datos base.dc.html`):
 *
 *  - **Un suelo de medio segundo.** Con datos buenos, la API contesta en poco
 *    más de cien milisegundos: el aro aparece y desaparece antes de que
 *    nadie lo vea, y lo que queda es un fogonazo que se lee como que la
 *    pantalla falló. El estado nuevo se aplica AL MOMENTO; lo único que
 *    espera es dejar de tapar. Una respuesta rápida no parpadea, y una lenta
 *    no espera de más.
 *  - **Un tope de seis segundos.** Si el servidor no contesta, se pinta lo
 *    que haya. Un velo que no se levanta nunca es peor que el salto que vino
 *    a quitar.
 */
export function useVelo() {
  const [tapado, setTapado] = useState(true)
  const empezo = useRef(Date.now())
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    temporizadores.current.push(setTimeout(() => setTapado(false), tiempo.veloTope))
    return () => temporizadores.current.forEach(clearTimeout)
  }, [])

  /** Llamar cuando ya se sabe qué pintar. */
  const levantar = useCallback(() => {
    const falta = esperaConUmbral(empezo.current, Date.now(), tiempo.umbral, tiempo.minimoVisible)
    if (falta === 0) setTapado(false)
    else temporizadores.current.push(setTimeout(() => setTapado(false), falta))
  }, [])

  return { tapado, levantar }
}

/**
 * Lo que se ve mientras está tapado: el aro de 54 y «Un momento», como en la
 * web. Solo al arrancar y en Datos, Cuestionario y Verificación, mientras se
 * decide a qué paso vas; en el resto hay esqueleto (entrega carga, 03-11).
 *
 * Los primeros 0,4 s es solo el fondo: si la respuesta llega antes, para la
 * persona no hubo espera, y un aro que aparece y se va se lee como un fallo.
 */
export function Velo({ sobreVerde }: { sobreVerde?: boolean }) {
  const [aVista, setAVista] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAVista(true), tiempo.umbral)
    return () => clearTimeout(t)
  }, [])
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Un momento"
      style={[estilos.velo, { backgroundColor: sobreVerde ? color.verdeProfundo : color.crema }]}
    >
      {aVista ? (
        <>
          <AroCarga tam={54} sobreVerde={sobreVerde} />
          <Texto variante="cuerpo" tono={sobreVerde ? 'sobreVerdeSecundario' : 'secundario'}>
            Un momento
          </Texto>
        </>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  velo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 300 },
})
