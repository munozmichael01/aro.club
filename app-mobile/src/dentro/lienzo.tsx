import type { ReactNode } from 'react'
import { Text, type TextStyle, type ViewStyle } from 'react-native'

import { SUELO_INTERLINEADO } from '../diseno'

/**
 * Lo común de las tarjetas para historias (TarjetaHistoria y TarjetaPlan):
 * se dibujan en las medidas de la maqueta, 1080 × 1920, multiplicadas por
 * `k = ancho / 1080`. La misma tarjeta sirve de miniatura y, a 1080 px
 * reales, de imagen para la captura.
 *
 * El interlineado de las maquetas baja de lo que aguantan las fuentes. En
 * React Native eso recorta tildes, así que cada texto lleva el suelo de su
 * familia y devuelve la diferencia con márgenes negativos: la caja ocupa lo
 * mismo que en la maqueta y nada se corta. `arriba` es el margen de la
 * maqueta ya descontada esa diferencia.
 */
export function lienzo(ancho: number, ink: string) {
  const n = (x: number) => (x * ancho) / 1080

  function T(p: { f: string; s: number; lh?: number; ls?: number; c?: string; o?: number; arriba?: number; style?: TextStyle; lineas?: number; children: ReactNode }) {
    const lh = p.lh ?? 1.2
    const suelo = Math.max(lh, SUELO_INTERLINEADO[p.f] ?? 1.21)
    const sobra = ((suelo - lh) * p.s) / 2
    return (
      <Text
        allowFontScaling={false}
        numberOfLines={p.lineas}
        ellipsizeMode="clip"
        style={[
          {
            fontFamily: p.f,
            fontSize: n(p.s),
            lineHeight: n(p.s * suelo),
            letterSpacing: n((p.ls ?? 0) * p.s),
            color: p.c ?? ink,
            opacity: p.o,
            marginVertical: n(-sobra),
          },
          p.arriba != null ? { marginTop: n(p.arriba - sobra) } : null,
          p.style,
        ]}
      >
        {p.children}
      </Text>
    )
  }

  /** Posición absoluta con los números de la maqueta. */
  const abs = (s: ViewStyle): ViewStyle => {
    const o: ViewStyle = { position: 'absolute' }
    for (const [key, val] of Object.entries(s)) (o as Record<string, unknown>)[key] = typeof val === 'number' ? n(val) : val
    return o
  }

  return { n, T, abs }
}
