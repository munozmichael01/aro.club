import type { ReactNode } from 'react'
import { Animated, View, type DimensionValue, type ViewStyle } from 'react-native'

import { useLatidoCompartido } from './movimiento'
import { cremaAlfa, radio, tinta, tipo } from './tokens'
import type { Variante } from './Texto'

/**
 * Un hueso: el hueco de una línea que todavía no llegó (entrega carga, 03-11).
 *
 * Mide LA LÍNEA que reemplaza: pinta una caja con el interlineado real de su
 * variante y el hueso centrado dentro, al ~75 % del tamaño de la letra. Así,
 * cuando llega el texto, nada se mueve. Sin brillo que barre y sin sombras:
 * todos laten juntos con el latido compartido (`movimiento.ts`).
 *
 * `lineas` repite la caja: la última línea va al `ultima` del ancho, como un
 * párrafo que no llena su renglón.
 */
type Props = {
  variante?: Variante
  ancho?: DimensionValue
  lineas?: number
  ultima?: DimensionValue
  sobreVerde?: boolean
  estilo?: ViewStyle
}

const color = (sobreVerde?: boolean) => (sobreVerde ? cremaAlfa(0.12) : tinta(0.08))

/** Radio de la barra según su alto, como en la maqueta: 11 → 6, 24 → 7, 34 → 8. */
const radioDe = (alto: number) => Math.min(8, alto <= 12 ? alto / 2 : 5 + alto / 12)

export function Hueso({ variante = 'cuerpo', ancho = '100%', lineas = 1, ultima = '60%', sobreVerde, estilo }: Props) {
  const o = useLatidoCompartido()
  const t = tipo[variante] as { fontSize: number; lineHeight: number }
  const alto = Math.round(t.fontSize * 0.75)
  const relleno = (t.lineHeight - alto) / 2
  return (
    <View style={estilo} aria-hidden>
      {Array.from({ length: lineas }, (_, i) => (
        <View key={i} style={{ paddingVertical: relleno }}>
          <Animated.View
            style={{
              height: alto,
              width: lineas > 1 && i === lineas - 1 ? ultima : ancho,
              maxWidth: '100%',
              borderRadius: radioDe(alto),
              backgroundColor: color(sobreVerde),
              opacity: o,
            }}
          />
        </View>
      ))}
    </View>
  )
}

/**
 * Un hueso con forma libre: la foto, el sello en cápsula, un botón cuyo texto
 * depende de los datos, el círculo de una persona.
 */
export function HuesoForma({
  alto,
  ancho = '100%',
  capsula,
  redondo,
  curva,
  sobreVerde,
  estilo,
}: {
  alto: number
  ancho?: DimensionValue
  capsula?: boolean
  redondo?: boolean
  curva?: number
  sobreVerde?: boolean
  estilo?: ViewStyle
}) {
  const o = useLatidoCompartido()
  return (
    <Animated.View
      aria-hidden
      style={[
        {
          height: alto,
          width: redondo ? alto : ancho,
          maxWidth: '100%',
          borderRadius: capsula ? radio.capsula : redondo ? alto / 2 : (curva ?? radioDe(alto)),
          backgroundColor: color(sobreVerde),
          opacity: o,
        },
        estilo,
      ]}
    />
  )
}

/**
 * El envoltorio de un esqueleto: dice «cargando» al lector de pantalla una
 * sola vez, en vez de que lea cada hueso.
 */
export function Esqueleto({ etiqueta, children, estilo }: { etiqueta: string; children: ReactNode; estilo?: ViewStyle }) {
  return (
    <View aria-busy accessibilityRole="progressbar" accessibilityLabel={etiqueta} style={estilo}>
      {children}
    </View>
  )
}
