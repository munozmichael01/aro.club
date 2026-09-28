import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { Texto, color, fuente, medida, tinta } from '../diseno'
import * as T from '../texto/cuenta'
import { useNombreMesa } from './voz'

/**
 * La barra de abajo de la cuenta: Inicio, Mi mesa y Perfil, SIEMPRE las
 * tres. En la web «Mi mesa» solo aparece con reserva; aquí se decidió
 * (28-09) que esté siempre: una barra que cambia de forma entre visitas
 * desorienta más de lo que ahorra, y sin reserva esa pantalla ya lo dice.
 *
 * Iconos propios en SVG: la mesa es el aro —seis puestos alrededor—, que
 * es literalmente lo que es.
 */

function IconoInicio({ c }: { c: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="none" stroke={c} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  )
}

function IconoMesa({ c, tuyo }: { c: string; tuyo: string }) {
  const puestos = [0, 60, 120, 180, 240, 300].map((g) => [12 + 8.6 * Math.cos((g * Math.PI) / 180), 12 + 8.6 * Math.sin((g * Math.PI) / 180)])
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.6} fill="none" stroke={c} strokeWidth={1.6} />
      {puestos.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.9} fill={i === 0 ? tuyo : c} />
      ))}
    </Svg>
  )
}

function IconoPerfil({ c }: { c: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={3.8} fill="none" stroke={c} strokeWidth={1.7} />
      <Path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" fill="none" stroke={c} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  )
}

export function Pestanas({ state, navigation, insets }: BottomTabBarProps) {
  const mesa = useNombreMesa()
  const nombres: Record<string, string> = { cuenta: T.nav.inicio, mesa, perfil: T.nav.perfil }
  return (
    <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {state.routes.map((r, i) => {
        const on = state.index === i
        const c = on ? color.verde : color.secundario
        const pulsar = () => {
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true })
          if (!on && !e.defaultPrevented) navigation.navigate(r.name)
        }
        return (
          <Pressable key={r.key} onPress={pulsar} accessibilityRole="tab" aria-selected={on} style={estilos.pestana}>
            {r.name === 'cuenta' ? <IconoInicio c={c} /> : r.name === 'mesa' ? <IconoMesa c={c} tuyo={on ? color.terracota : c} /> : <IconoPerfil c={c} />}
            <Texto variante="etiqueta" style={{ color: c, letterSpacing: 0, fontFamily: on ? fuente.textoSemi : fuente.textoMedia }}>
              {nombres[r.name] ?? r.name}
            </Texto>
          </Pressable>
        )
      })}
    </View>
  )
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', backgroundColor: color.crema, borderTopWidth: 1, borderTopColor: tinta(0.1), paddingTop: 6 },
  pestana: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: medida.toqueMinimo + 8 },
})
