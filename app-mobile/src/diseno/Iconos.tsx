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

/** Brunch: el sol saliendo sobre la línea, medio disco apoyado en el horizonte (entrega 21). */
export function IconoBrunch({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M3.4 10.6a4.6 4.6 0 0 1 9.2 0z" fill={color} />
      <Path d="M2 13h12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export const ICONO_FORMATO = { dinner: IconoCenas, drinks: IconoDrinks, movement: IconoMovimiento, coffee: IconoCoffee, brunch: IconoBrunch } as const

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

/** Campana: la pregunta de los avisos. */
export function IconoCampana({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path
        d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.9H4.4zM10 20.6a2.1 2.1 0 0 0 4 0"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Candado: el juego de la mesa, antes de su hora. */
export function IconoCandado({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 10.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10.5V7.5a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Atrás (‹): el círculo de «pregunta anterior» del juego. */
export function IconoAtras({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Calendario: «Añadir al calendario» (entrega estas-dentro). */
export function IconoCalendario({ tam = 18, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 5h11a3 3 0 0 1 3 3v9.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

/** Compartir: la flecha que sale de la bandeja (entrega estas-dentro). */
export function IconoCompartir({ tam = 18, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Reloj: la nota de cancelar (entrega estas-dentro). */
export function IconoReloj({ tam = 16, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

/** Los botones de «Comparte tu plan» (entrega estas-dentro, C1): guardar, historias, TikTok, WhatsApp y más. */
const TRAZOS_COMPARTIR = {
  guardar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  historias: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM17 6.5h.01',
  tiktok: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.6 2.6 2.4 4.4 5 5',
  whatsapp: 'M21 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.6A8.5 8.5 0 1 1 21 12Z',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
} as const
export function IconoComparteCon({ tam = 24, color, con }: P & { con: keyof typeof TRAZOS_COMPARTIR }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={TRAZOS_COMPARTIR[con]} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
