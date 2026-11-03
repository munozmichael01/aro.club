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

/** Drinks: la copa, con el trazo de la cúpula del brunch (como la web, 31-10). Era un rombo que no decía nada. */
export function IconoDrinks({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 16 16">
      <Path d="M3.3 3.2h9.4L8 8.4z" fill={color} />
      <Path d="M8 8.4V12.8M5.5 12.8h5" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
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

/** Pin: una zona de la ciudad (el aviso de zonas al reservar, como la web). */
export function IconoPin({ tam = 12, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={9.5} r={2.4} stroke={color} strokeWidth={2.6} />
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

/** El galón de una fila que lleva a otra parte (entrega estas-dentro, C2). */
export function IconoGalon({ tam = 18, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Seguir en contacto (entrega mi-mesa-pasadas, 31-10): teléfono, Instagram, TikTok, candado, flecha que sale y lápiz. */
export function IconoTelefono({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoInstagram({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 3.5h7a5 5 0 0 1 5 5v7a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5v-7a5 5 0 0 1 5-5Z" stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.8} />
      <Circle cx={17.2} cy={6.8} r={0.9} fill={color} />
    </Svg>
  )
}

export function IconoTiktok({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5M14 3.5c.4 2.6 2.3 4.4 5 4.6" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoCerrado({ tam = 18, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

/** A pie (entrega segundo-acto, 03-11): «A 6 minutos a pie de tu mesa». */
export function IconoAPie({ tam = 17, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Circle cx={13} cy={4.5} r={1.5} stroke={color} strokeWidth={2} />
      <Path d="M9 21l2-6 3 2v4M8 10l3-2 3 3 3 1M11 8l-1 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoSale({ tam = 15, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17L17 7M9 7h8v8" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconoLapiz({ tam = 16, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h4L19 9l-4-4L4 16z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Los dos aros que no se cruzan (D, «No se cruzaron»). */
export function IconoSinCruce({ tam = 120 }: { tam?: number }) {
  return (
    <Svg width={tam} height={tam / 2} viewBox="0 0 120 60" fill="none">
      <Circle cx={34} cy={30} r={24} stroke="#9CBBA6" strokeWidth={5} />
      <Circle cx={86} cy={30} r={24} stroke="#E39C63" strokeWidth={5} />
    </Svg>
  )
}

/**
 * El dibujo propio del +1 (entrega mas-uno): dos puntos juntos, el tuyo
 * macizo y el de tu acompañante en contorno. `punteado`: todavía no viene
 * (el botón de invitar).
 */
export function IconoDuo({ tam = 18, color, lleno, punteado }: P & { lleno?: string; punteado?: boolean }) {
  return (
    <Svg width={tam} height={(tam * 2) / 3} viewBox="0 0 30 20">
      <Circle cx={10} cy={10} r={punteado ? 7 : 6.5} fill={lleno ?? color} />
      <Circle cx={20} cy={10} r={punteado ? 7 : 6.5} fill="none" stroke={color} strokeWidth={2.4} strokeDasharray={punteado ? [3.5, 2.6] : undefined} />
    </Svg>
  )
}

/** La flecha que vuelve: «te devolvemos dos créditos» (el aviso del +1). */
export function IconoDevolver({ tam = 20, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Un teléfono: «Compartir mi plan en historias» (entrega mas-uno, 3A). */
export function IconoHistoria({ tam = 16, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M9 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM10 7h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

/** La cédula: «Verifícate para sentarte» (entrega mas-uno, 5D). */
export function IconoCedula({ tam = 22, color }: P) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5.5h12a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 16V8A2.5 2.5 0 0 1 6 5.5zM14 10.5h3.5M14 13.5h2.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={12} r={2.2} stroke={color} strokeWidth={1.9} />
    </Svg>
  )
}
