import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { Texto } from './Texto'
import { color, radio, terracotaAlfa, tinta, verdeAlfa } from './tokens'

/**
 * Los avisos de la hoja del sistema (§06): «nada dice “algo salió mal”».
 * Cada uno dice qué pasó y qué hacer. Cuatro tonos, y el icono en SVG, no
 * un «!» o un «✓» tecleados.
 */
export type TonoAviso = 'exito' | 'info' | 'neutro' | 'ojo'

const TONOS: Record<TonoAviso, { fondo: string; icono: string; borde?: string }> = {
  exito: { fondo: verdeAlfa(0.09), icono: color.verde },
  info: { fondo: color.cremaElevada, icono: color.verde },
  neutro: { fondo: 'transparent', icono: color.secundario, borde: tinta(0.16) },
  ojo: { fondo: terracotaAlfa(0.08), icono: color.terracota },
}

function Icono({ tono }: { tono: TonoAviso }) {
  const c = TONOS[tono].icono
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={11} fill={c} />
      {tono === 'exito' ? (
        <Path d="M6.8 11.3 9.6 14l5.6-6" stroke={color.crema} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <Path d="M11 6.2v6.2" stroke={color.crema} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={11} cy={15.6} r={1.2} fill={color.crema} />
        </>
      )}
    </Svg>
  )
}

export function Aviso({ tono = 'ojo', titulo, children }: { tono?: TonoAviso; titulo?: string; children?: ReactNode }) {
  const t = TONOS[tono]
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.caja, { backgroundColor: t.fondo }, t.borde ? { borderWidth: 1, borderColor: t.borde } : null]}
    >
      <Icono tono={tono} />
      <View style={{ flex: 1, gap: 3 }}>
        {titulo ? (
          <Texto variante="rotulo" tono={tono === 'ojo' ? 'terracota' : 'tinta'}>
            {titulo}
          </Texto>
        ) : null}
        {children ? <Texto variante="cuerpoChico">{children}</Texto> : null}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: radio.bloque, paddingVertical: 14, paddingHorizontal: 16 },
})
