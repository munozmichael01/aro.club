import Svg, { Circle, Path } from 'react-native-svg'

/**
 * Los iconos que la web pinta con glifos de texto (◗ ◇ ◢ ◉ ✓ → ×). Un glifo
 * depende de la fuente del sistema —en Android sale otro dibujo, o un
 * emoji— y la regla es SVG propio del sistema de diseño, no caracteres.
 * Mismas formas que los glifos, para que la agenda se escanee igual.
 */

type P = { tam?: number; color: string }

/** Cenas (◗): el medio plato. */
export function IconoCenas({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M5 2.5a5.5 5.5 0 0 1 0 11z" fill={color} />
    </Svg>
  )
}

/** Drinks (◇). */
export function IconoDrinks({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M8 2.2 13.8 8 8 13.8 2.2 8z" fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

/** Movimiento (◢): la cuesta. */
export function IconoMovimiento({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M13.5 2.5v11h-11z" fill={color} />
    </Svg>
  )
}

/** Coffee (◉). */
export function IconoCoffee({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={5.6} fill="none" stroke={color} strokeWidth={1.4} />
      <Circle cx={8} cy={8} r={3} fill={color} />
    </Svg>
  )
}

export const ICONO_FORMATO = { dinner: IconoCenas, drinks: IconoDrinks, movement: IconoMovimiento, coffee: IconoCoffee } as const

export function IconoCheck({ tam = 14, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M3.2 8.4 6.4 11.5l6.4-7" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoFlecha({ tam = 14, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoCruz({ tam = 14, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M4 4l8 8M12 4l-8 8" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  )
}

/** Una fecha cerrada (·). */
export function IconoPunto({ tam = 14, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={1.8} fill={color} />
    </Svg>
  )
}

/** «›»: una fila que se abre. */
export function IconoAbrir({ tam = 14, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
