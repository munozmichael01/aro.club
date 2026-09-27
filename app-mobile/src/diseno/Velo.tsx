import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { AroCarga } from './Aro'
import { Texto } from './Texto'
import { tiempo } from './tokens'
import { esperaParaLevantar } from './velo-tiempo'

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
    const falta = esperaParaLevantar(empezo.current, Date.now(), tiempo.veloMinimo)
    if (falta === 0) setTapado(false)
    else temporizadores.current.push(setTimeout(() => setTapado(false), falta))
  }, [])

  return { tapado, levantar }
}

/** Lo que se ve mientras está tapado: el aro y «Un momento», como en la web. */
export function Velo() {
  return (
    <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={estilos.velo}>
      <AroCarga />
      <Texto variante="cuerpo" tono="secundario">
        Un momento
      </Texto>
    </View>
  )
}

const estilos = StyleSheet.create({
  velo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 300 },
})
