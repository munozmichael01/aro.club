import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'

import { tiempo } from './tokens'

/**
 * «Reducir movimiento» del sistema (entrega carga, 03-11): nada late ni gira.
 * La espera se sigue entendiendo por la forma y por el texto. Lo único que se
 * queda es el fundido de 180 ms, porque cambiar la opacidad no es movimiento.
 */
export function useMovimientoReducido() {
  const [r, setR] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {})
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setR)
    return () => s.remove()
  }, [])
  return r
}

/**
 * EL latido de los huesos: uno para toda la app, así todos los huesos de una
 * pantalla laten juntos (de 1 a 0,5 y vuelta, en 1,6 s, lento). Cada hueso
 * pide su turno y el bucle se para cuando no queda ninguno a la vista.
 */
const latido = new Animated.Value(1)
let usando = 0
let bucle: Animated.CompositeAnimation | null = null

function arrancar() {
  if (bucle) return
  const mitad = tiempo.latido / 2
  bucle = Animated.loop(
    Animated.sequence([
      Animated.timing(latido, { toValue: 0.5, duration: mitad, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(latido, { toValue: 1, duration: mitad, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  )
  bucle.start()
}

function parar() {
  bucle?.stop()
  bucle = null
  latido.setValue(1)
}

/** La opacidad del latido compartido, o 1 quieta con «reducir movimiento». */
export function useLatidoCompartido(): Animated.Value | 1 {
  const quieto = useMovimientoReducido()
  useEffect(() => {
    if (quieto) return
    usando += 1
    arrancar()
    return () => {
      usando -= 1
      if (usando <= 0) {
        usando = 0
        parar()
      }
    }
  }, [quieto])
  return quieto ? 1 : latido
}

/**
 * La regla del umbral: algo que espera solo se enseña si la espera pasa de
 * 0,4 s, y una vez a la vista se queda al menos 0,5 s. Un aro o un esqueleto
 * que aparece y se va se lee como un fallo.
 *
 * `esperando` es lo que pasa de verdad; lo que devuelve es si hay que
 * enseñarlo.
 */
export function useUmbral(esperando: boolean): boolean {
  const [visible, setVisible] = useState(false)
  const desde = useRef(0)
  useEffect(() => {
    if (esperando) {
      if (visible) return
      const t = setTimeout(() => {
        desde.current = Date.now()
        setVisible(true)
      }, tiempo.umbral)
      return () => clearTimeout(t)
    }
    if (!visible) return
    const falta = Math.max(0, tiempo.minimoVisible - (Date.now() - desde.current))
    const t = setTimeout(() => setVisible(false), falta)
    return () => clearTimeout(t)
  }, [esperando, visible])
  return visible
}
