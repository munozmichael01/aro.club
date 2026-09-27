import type { ReactNode } from 'react'
import { Text, type TextProps } from 'react-native'

import { color, tipo } from './tokens'

export type Variante = keyof typeof tipo

const TONOS = {
  tinta: color.verdeProfundo,
  cuerpo: color.cuerpo,
  secundario: color.secundario,
  verde: color.verde,
  terracota: color.terracota,
  crema: color.crema,
  sobreVerdeSecundario: color.sobreVerdeSecundario,
} as const

export type Tono = keyof typeof TONOS

/** Color por defecto de cada variante, como en la hoja: titulares en tinta, cuerpo en verde medio. */
const TONO_POR_DEFECTO: Record<Variante, Tono> = {
  display: 'tinta',
  titulo: 'tinta',
  subtitulo: 'tinta',
  cuerpoGrande: 'cuerpo',
  cuerpo: 'cuerpo',
  etiqueta: 'secundario',
  cifra: 'tinta',
}

type Props = TextProps & { variante?: Variante; tono?: Tono; children: ReactNode }

/**
 * Todo el texto de la app pasa por aquí.
 *
 * El tamaño de letra del sistema se respeta siempre (`allowFontScaling` va
 * por defecto): el criterio 9.6 pide que todo se lea con la letra al máximo,
 * y eso se resuelve con cajas que crecen, no desactivando el escalado.
 */
export function Texto({ variante = 'cuerpo', tono, style, children, ...resto }: Props) {
  const c = TONOS[tono ?? TONO_POR_DEFECTO[variante]]
  return (
    <Text {...resto} style={[tipo[variante], { color: c }, style]}>
      {children}
    </Text>
  )
}

/**
 * Énfasis dentro de un titular: terracota, nunca itálica. Young Serif no
 * tiene itálica y el sistema la falsificaría — «aparece justo la debilidad
 * que la fuente vino a resolver».
 */
export function Enfasis({ children }: { children: ReactNode }) {
  return <Text style={{ color: color.terracota }}>{children}</Text>
}
