import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { AroCarga } from './Aro'
import { useUmbral } from './movimiento'
import { color, cremaAlfa, fuente, medida, radio, tiempo, tinta, verdeAlfa } from './tokens'

/**
 * Los botones de la hoja del sistema (§04): tres, y ninguno por debajo de
 * 44 px. Primario para el único paso siguiente, secundario para lo que
 * también sirve, fantasma para lo que se puede saltar. **Nunca dos
 * primarios en la misma vista.** Más la variante primaria sobre fondo verde.
 *
 * Cada uno tiene tres estados —reposo, presionado, deshabilitado— con los
 * colores exactos de la hoja.
 */
export type TipoBoton =
  | 'primario'
  | 'secundario'
  | 'fantasma'
  | 'sobreVerde'
  | 'secundarioSobreVerde'
  | 'fantasmaSobreVerde'
  | 'grave'

type Estado = { fondo: string; texto: string; borde?: string }

const ESTADOS: Record<TipoBoton, { reposo: Estado; presionado: Estado; inerte: Estado }> = {
  primario: {
    reposo: { fondo: color.verde, texto: color.crema },
    presionado: { fondo: color.terracota, texto: color.sobreTerracota },
    inerte: { fondo: verdeAlfa(0.13), texto: color.cuerpo },
  },
  secundario: {
    reposo: { fondo: 'transparent', texto: color.verde, borde: tinta(0.22) },
    presionado: { fondo: color.cremaElevada, texto: color.terracota, borde: color.terracota },
    inerte: { fondo: 'transparent', texto: color.inerte, borde: tinta(0.1) },
  },
  fantasma: {
    reposo: { fondo: 'transparent', texto: color.secundario },
    presionado: { fondo: 'transparent', texto: color.terracota },
    inerte: { fondo: 'transparent', texto: color.inerte },
  },
  sobreVerde: {
    reposo: { fondo: color.crema, texto: color.verdeProfundo },
    presionado: { fondo: color.terracotaSobreVerde, texto: color.verdeProfundo },
    inerte: { fondo: cremaAlfa(0.16), texto: color.cuerpoSobreVerde },
  },
  // Los dos del registro, sobre verde profundo: «Entrar a mi cuenta» y
  // «Atrás» / «Lo hago después» / «Usar otro correo».
  secundarioSobreVerde: {
    reposo: { fondo: 'transparent', texto: color.crema, borde: cremaAlfa(0.34) },
    presionado: { fondo: color.crema, texto: color.verdeProfundo, borde: color.crema },
    inerte: { fondo: 'transparent', texto: color.cuerpoSobreVerde, borde: cremaAlfa(0.16) },
  },
  // Enviar un reporte en Mi mesa: la única acción grave del producto, en la
  // terracota más oscura de la web (#6E340F). No es el primario: no es «el
  // paso siguiente», es algo que se hace con cuidado.
  grave: {
    reposo: { fondo: '#6E340F', texto: color.sobreTerracota },
    presionado: { fondo: color.terracota, texto: color.sobreTerracota },
    inerte: { fondo: tinta(0.12), texto: color.cuerpo },
  },
  fantasmaSobreVerde: {
    reposo: { fondo: 'transparent', texto: color.sobreVerdeSecundario },
    presionado: { fondo: 'transparent', texto: color.terracotaSobreVerde },
    inerte: { fondo: 'transparent', texto: cremaAlfa(0.3) },
  },
}

type Props = Omit<PressableProps, 'children' | 'style'> & {
  tipo?: TipoBoton
  texto: string
  /** Ocupa todo el ancho: lo normal en celular para el paso siguiente. */
  ancho?: boolean
  /**
   * Se VE apagado pero se puede pulsar: el «Faltan 2 en esta pantalla» del
   * cuestionario, que al pulsarlo lleva a lo que falta. Un botón muerto en
   * una pantalla que parece terminada se lee como que está rota.
   */
  apagado?: boolean
  /**
   * Un paso en curso (entrega carga, 03-11): el botón que tocaste sigue siendo
   * ese botón. Mismo color, mismo texto; a la izquierda entra el aro de 20 y
   * deja de responder. Un texto que cambia («Guardando…») mueve el botón y
   * parece otra acción; uno apagado parece que algo falló. El valor es lo que
   * oye el lector de pantalla («Apartando tu puesto»); `true` lee el texto.
   */
  trabajando?: boolean | string
  /** Terminó bien sin cambiar de pantalla: un check 0,6 s en el sitio del aro (`useTrabajo`). */
  listo?: boolean
}

/** El fondo del botón es verde: el aro y el check van en crema. */
const SOBRE_VERDE: Record<TipoBoton, boolean> = {
  primario: true,
  grave: true,
  secundarioSobreVerde: true,
  fantasmaSobreVerde: true,
  secundario: false,
  fantasma: false,
  sobreVerde: false,
}

function Check({ c }: { c: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Boton({ tipo = 'primario', texto, ancho, disabled, apagado, trabajando, listo, ...resto }: Props) {
  const fantasma = tipo === 'fantasma' || tipo === 'fantasmaSobreVerde'
  const ocupado = !!trabajando
  // El toque se bloquea al momento; el aro, solo si la espera pasa de 0,4 s.
  const aro = useUmbral(ocupado)
  const conAro = aro || !!listo
  return (
    <Pressable
      {...resto}
      disabled={disabled || ocupado}
      accessibilityRole="button"
      aria-disabled={!!disabled}
      aria-busy={ocupado}
      accessibilityLabel={typeof trabajando === 'string' ? trabajando : resto.accessibilityLabel}
      style={({ pressed }) => {
        // Trabajando no es inerte: conserva su color de reposo.
        const e = ESTADOS[tipo][disabled || apagado ? 'inerte' : pressed && !ocupado ? 'presionado' : 'reposo']
        return [
          estilos.base,
          conAro && estilos.conAro,
          ancho && estilos.ancho,
          { backgroundColor: e.fondo },
          e.borde ? { borderWidth: 1, borderColor: e.borde } : null,
        ]
      }}
    >
      {({ pressed }) => {
        const e = ESTADOS[tipo][disabled || apagado ? 'inerte' : pressed && !ocupado ? 'presionado' : 'reposo']
        return (
          <View style={estilos.fila}>
            {aro ? <AroCarga tam={20} sobreVerde={SOBRE_VERDE[tipo]} /> : listo ? <Check c={e.texto} /> : null}
            <Text style={[estilos.texto, fantasma && estilos.textoFantasma, { color: e.texto }]}>{texto}</Text>
          </View>
        )
      }}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: {
    // `minHeight`, no `height`: con la letra del sistema al máximo el botón
    // crece en vez de cortar el texto (criterio 9.6).
    minHeight: medida.boton,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radio.capsula,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ancho: { alignSelf: 'stretch' },
  // 24 de relleno pasan a 18 + aro + 10 a la izquierda.
  conAro: { paddingLeft: 18 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  texto: { fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, textAlign: 'center' },
  textoFantasma: {
    fontFamily: fuente.textoMedia,
    textDecorationLine: 'underline',
  },
})

/**
 * El estado de un botón que trabaja: `correr` pone el aro, espera la acción y
 * vuelve al reposo. Si la acción devuelve `'listo'` (terminó bien y la
 * pantalla no cambia), el aro pasa a un check durante 0,6 s. Si devuelve otra
 * cosa o lanza, vuelve al reposo sin check: el aviso lo pinta la pantalla
 * encima del botón, y lo escrito sigue ahí.
 */
export function useTrabajo() {
  const [trabajando, setTrabajando] = useState(false)
  const [listo, setListo] = useState(false)
  const vivo = useRef(true)
  const enCurso = useRef(false)
  useEffect(() => () => void (vivo.current = false), [])
  const correr = useCallback(async <T,>(accion: () => Promise<T>): Promise<T | undefined> => {
    if (enCurso.current) return undefined
    enCurso.current = true
    setListo(false)
    setTrabajando(true)
    try {
      const r = await accion()
      if (vivo.current && r === 'listo') {
        setListo(true)
        setTimeout(() => vivo.current && setListo(false), tiempo.listo)
      }
      return r
    } finally {
      enCurso.current = false
      if (vivo.current) setTrabajando(false)
    }
  }, [])
  return { trabajando, listo, correr }
}
