import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { color, tinta, tiempo } from './tokens'

/**
 * La marca: un aro con seis puntos. Cinco del color de la tinta y UNO en
 * terracota, que es la persona.
 *
 * La geometría es la de la web (viewBox 24, radio 8.6, puntos de 1.9) y es
 * una sola: la usan la marca quieta de la cabecera y el aro de carga.
 */

/** Los seis puntos, empezando por el de la persona (a las tres) y en sentido horario. */
const PUNTOS: ReadonlyArray<readonly [number, number]> = [
  [20.6, 12],
  [16.3, 19.45],
  [7.7, 19.45],
  [3.4, 12],
  [7.7, 4.55],
  [16.3, 4.55],
]

type Props = { tam?: number; anillo: string; grosor: number; puntos: readonly string[] }

function Dibujo({ tam = 22, anillo, grosor, puntos }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.6} stroke={anillo} strokeWidth={grosor} />
      {PUNTOS.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={1.9} fill={puntos[i]} />
      ))}
    </Svg>
  )
}

/** La marca quieta, como en la cabecera de cada pantalla. */
export function Marca({ tam = 22 }: { tam?: number }) {
  return (
    <Dibujo
      tam={tam}
      anillo={color.verdeProfundo}
      grosor={1.8}
      puntos={[color.terracota, ...Array(5).fill(color.verdeProfundo)]}
    />
  )
}

/**
 * El aro de carga: el punto terracota va delante y los demás se desvanecen
 * detrás, como una estela. Los alfas son los de la web.
 */
const ESTELA = [color.terracota, tinta(0.48), tinta(0.4), tinta(0.32), tinta(0.24), tinta(0.16)]

/**
 * Gira un CONTENEDOR, nunca el propio SVG.
 *
 * En la web esto costó una tarde: Safari resolvía el `transform-origin` en
 * porcentaje de un elemento SVG contra su `viewBox` y no contra su caja, y el
 * aro orbitaba en vez de girar. En React Native una `View` gira siempre sobre
 * su centro, y se mantiene la misma regla para que la trampa no vuelva si
 * algún día esto se pinta con react-native-web.
 *
 * Con «reducir movimiento» del sistema, el aro se queda quieto: un giro
 * infinito no se puede acortar, solo parar.
 */
export function AroCarga({ tam = 54 }: { tam?: number }) {
  const giro = useRef(new Animated.Value(0)).current
  const [quieto, setQuieto] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setQuieto)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setQuieto)
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (quieto) {
      giro.stopAnimation()
      giro.setValue(0)
      return
    }
    const vuelta = Animated.loop(
      Animated.timing(giro, {
        toValue: 1,
        duration: tiempo.vueltaAro,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    vuelta.start()
    return () => vuelta.stop()
  }, [quieto, giro])

  const rotate = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: tam, height: tam, transform: [{ rotate }] }}
    >
      <View style={{ pointerEvents: 'none' }}>
        <Dibujo tam={tam} anillo={tinta(0.2)} grosor={1.5} puntos={ESTELA} />
      </View>
    </Animated.View>
  )
}
