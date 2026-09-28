import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { color, cremaAlfa, fuente, medida, radio, tinta } from './tokens'

/**
 * El kit de pregunta (hoja del sistema, §05): «el componente que aparece
 * 17 veces». Un solo indicador para los tres tipos: un aro de 20 px que se
 * rellena de terracota. La ficha no cambia de ancho al marcarla.
 *
 * Dos fondos, porque el producto lo pide: sobre crema (el cuestionario) y
 * sobre verde profundo (las cuatro preguntas del registro).
 *
 * `unica` es la fila ancha de las preguntas de una sola respuesta; si no,
 * es la píldora que se envuelve en filas.
 */
type Props = {
  texto: string
  marcada: boolean
  onPress: () => void
  unica?: boolean
  fondo?: 'crema' | 'verde'
  /** Hay tope y esta no está marcada: se atenúa, pero se puede tocar (ver `nota` en la pantalla). */
  enTope?: boolean
  /** Texto a la derecha: el sector de una persona en Mi mesa. */
  pie?: string
  /** El pie en terracota: «Bloqueada por tu reporte». */
  pieFuerte?: boolean
  /** Fija: se ve marcada y no se puede desmarcar. */
  fija?: boolean
}

const TONOS = {
  crema: {
    borde: tinta(0.18),
    bordeMarcada: color.terracota,
    fondoUnica: 'transparent',
    fondoMarcada: color.crema,
    texto: color.verdeProfundo,
    textoMarcada: color.verdeProfundo,
    aro: tinta(0.3),
    aroMarcada: color.terracota,
  },
  verde: {
    borde: cremaAlfa(0.24),
    bordeMarcada: color.crema,
    fondoUnica: cremaAlfa(0.06),
    fondoMarcada: color.crema,
    // La maqueta usa #E8F0E9 aquí; el papel es «texto sobre verde» y ese es
    // el crema. Anotado, no replicado (PEDIDO §6 bis).
    texto: color.crema,
    textoMarcada: color.verdeProfundo,
    aro: cremaAlfa(0.42),
    aroMarcada: color.verdeProfundo,
  },
} as const

function Visto() {
  return (
    <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
      <Path d="M2.5 6.3 5 8.6l4.6-5.2" stroke={color.sobreTerracota} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Opcion({ texto, marcada, onPress, unica, fondo = 'crema', enTope, pie, pieFuerte, fija }: Props) {
  const t = TONOS[fondo]
  return (
    <Pressable
      onPress={fija ? undefined : onPress}
      aria-disabled={fija || undefined}
      accessibilityRole={unica ? 'radio' : 'checkbox'}
      aria-checked={marcada}
      style={[
        estilos.base,
        unica ? estilos.unica : estilos.pildora,
        {
          borderColor: marcada ? t.bordeMarcada : t.borde,
          backgroundColor: marcada ? t.fondoMarcada : unica ? t.fondoUnica : 'transparent',
          opacity: enTope ? 0.45 : 1,
        },
      ]}
    >
      <View
        style={[
          estilos.aro,
          { borderColor: marcada ? t.aroMarcada : t.aro, backgroundColor: marcada ? color.terracotaRelleno : 'transparent' },
        ]}
      >
        {marcada ? <Visto /> : null}
      </View>
      <Text
        style={[
          estilos.texto,
          { fontFamily: marcada ? fuente.textoSemi : fuente.texto, color: marcada ? t.textoMarcada : t.texto },
          unica ? { fontSize: 16 } : null,
          pie ? { flex: 1 } : null,
        ]}
      >
        {texto}
      </Text>
      {pie ? (
        <Text style={[estilos.pie, { color: pieFuerte ? color.terracota : fondo === 'verde' ? t.texto : color.cuerpo, fontFamily: pieFuerte ? fuente.textoMedia : fuente.texto }]}>
          {pie}
        </Text>
      ) : null}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radio.capsula },
  unica: { gap: 14, alignSelf: 'stretch', minHeight: medida.opcion, paddingVertical: 14, paddingHorizontal: 20 },
  pildora: { gap: 10, minHeight: 52, paddingVertical: 12, paddingLeft: 16, paddingRight: 20 },
  aro: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 15, lineHeight: 20, letterSpacing: -0.15, flexShrink: 1 },
  pie: { fontSize: 13, lineHeight: 17, flexShrink: 0, maxWidth: '45%', textAlign: 'right' },
})
