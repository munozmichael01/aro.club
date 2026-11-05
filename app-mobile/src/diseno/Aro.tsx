import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { useMovimientoReducido } from './movimiento'
import { color, cremaAlfa, tinta, tiempo } from './tokens'

/**
 * La marca: un aro con seis puntos. Cinco del color de la tinta y UNO en
 * terracota, que es la persona.
 *
 * La geometría es la de `marca/` (entrega 17 de Design, cuadrícula de 240):
 * anillo de radio 86 con trazo 24 y puntos de radio 25. Aquí, en viewBox 24:
 * 8.6, 2.4 y 2.5. Es una sola: la usan la marca quieta de la cabecera y el
 * aro de carga. A tamaños muy chicos (16 px) los puntos se funden con el
 * anillo; por debajo de ~20 px, mejor no usarla.
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

/** El trazo del anillo de la entrega 17 (24 sobre 240). */
const TRAZO = 2.4

type Props = { tam?: number; anillo: string; grosor: number; puntos: readonly string[] }

function Dibujo({ tam = 22, anillo, grosor, puntos }: Props) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.6} stroke={anillo} strokeWidth={grosor} />
      {PUNTOS.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={2.5} fill={puntos[i]} />
      ))}
    </Svg>
  )
}

/**
 * La marca quieta, como en la cabecera de cada pantalla. Sobre verde
 * profundo va en verde claro con el punto en terracota clara, como en el pie
 * de la web.
 */
export function Marca({ tam = 22, sobreVerde, crema }: { tam?: number; sobreVerde?: boolean; crema?: boolean }) {
  // `crema`: sobre verde, en crema entero, como la cabecera de Entrar en la web.
  const trazo = crema ? color.crema : sobreVerde ? color.sobreVerdeSecundario : color.verdeProfundo
  const tuyo = sobreVerde || crema ? color.terracotaSobreVerde : color.terracota
  return <Dibujo tam={tam} anillo={trazo} grosor={TRAZO} puntos={[tuyo, ...Array(5).fill(trazo)]} />
}

/**
 * El aro de carga (entrega carga, 03-11): se LLENA punto a punto, como se
 * llena una mesa. Primero el terracota, que eres tú; con los seis encendidos
 * se apagan juntos y vuelve a empezar. Nunca se queda lleno: lleno diría que
 * terminó, y no lo sabemos. Antes giraba con una estela.
 *
 * El anillo queda quieto y fino (trazo 1,5 al 20 % de la tinta); lo que se
 * mueve es la opacidad de cada punto, de 0,16 a 1 en su turno (6, 18, 30, 42,
 * 54 y 66 % de la vuelta), encendidos hasta el 84 % y apagados hacia el 96 %.
 * Los puntos van en `View` encima del SVG, para que la opacidad la anime el
 * hilo nativo: en un `Circle` de SVG no se puede.
 *
 * Cuatro tamaños, ni uno más: 20 (botón), 28 (dentro de un bloque), 40
 * (pantalla) y 54 (velo). Por debajo de 20 los puntos se funden con el anillo.
 *
 * Con «reducir movimiento», los seis encendidos y quietos: dice «ocupado» sin
 * moverse.
 */
export type TamAro = 20 | 28 | 40 | 54

const TURNOS = [0.06, 0.18, 0.3, 0.42, 0.54, 0.66]

export function AroCarga({ tam = 54, sobreVerde }: { tam?: TamAro; sobreVerde?: boolean }) {
  const vuelta = useRef(new Animated.Value(0)).current
  const quieto = useMovimientoReducido()

  useEffect(() => {
    if (quieto) return
    vuelta.setValue(0)
    const a = Animated.loop(Animated.timing(vuelta, { toValue: 1, duration: tiempo.vueltaAro, easing: Easing.linear, useNativeDriver: true }))
    a.start()
    return () => a.stop()
  }, [quieto, vuelta])

  const k = tam / 24
  const punto = 5 * k
  const tinta_ = sobreVerde ? color.crema : color.verdeProfundo
  const tuyo = sobreVerde ? color.terracotaSobreVerde : color.terracota

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: tam, height: tam, pointerEvents: 'none' }}>
      <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8.6} stroke={sobreVerde ? cremaAlfa(0.2) : tinta(0.2)} strokeWidth={1.5} />
      </Svg>
      {PUNTOS.map(([cx, cy], i) => {
        const s = TURNOS[i]
        const opacity = quieto
          ? 1
          : vuelta.interpolate({ inputRange: [0, s - 0.01, s, 0.84, 0.96, 1], outputRange: [0.16, 0.16, 1, 1, 0.16, 0.16] })
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: cx * k - punto / 2,
              top: cy * k - punto / 2,
              width: punto,
              height: punto,
              borderRadius: punto / 2,
              backgroundColor: i === 0 ? tuyo : tinta_,
              opacity,
            }}
          />
        )
      })}
    </View>
  )
}
