import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { Opcion } from './Opcion'
import { Texto } from './Texto'
import { color, medida, radio, tinta } from './tokens'

/**
 * El desplegable. En la web es un `<select>`; en el celular no hay, y el
 * del sistema no se puede vestir. Es una cápsula como `Campo` que abre una
 * hoja con las opciones del kit de pregunta.
 */
type Props<T extends string> = {
  etiqueta: string
  valor: T
  opciones: { valor: T; texto: string }[]
  /** Lo que se ve en la cápsula cerrada, si es más corto que el texto de la lista. */
  corto?: (v: T) => string
  onCambio: (v: T) => void
  ancho?: number
}

function Flecha() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Path d="M2.5 4.5 6 8l3.5-3.5" stroke={color.verdeProfundo} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Selector<T extends string>({ etiqueta, valor, opciones, corto, onCambio, ancho }: Props<T>) {
  const [abierto, setAbierto] = useState(false)
  const insets = useSafeAreaInsets()
  const actual = opciones.find((o) => o.valor === valor)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${actual?.texto ?? ''}`}
        onPress={() => setAbierto(true)}
        style={[estilos.capsula, ancho ? { width: ancho } : null]}
      >
        <Texto variante="cuerpo" tono="tinta" numberOfLines={1} style={{ flexShrink: 1 }}>
          {corto ? corto(valor) : actual?.texto}
        </Texto>
        <Flecha />
      </Pressable>
      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.fondo} onPress={() => setAbierto(false)} accessibilityLabel="Cerrar" />
        <View style={[estilos.hoja, { paddingBottom: insets.bottom + 16 }]}>
          <Texto variante="etiqueta" style={{ marginBottom: 14 }}>
            {etiqueta.toUpperCase()}
          </Texto>
          <FlatList
            data={opciones}
            keyExtractor={(o) => o.valor || '—'}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Opcion
                unica
                texto={item.texto}
                marcada={item.valor === valor}
                onPress={() => {
                  onCambio(item.valor)
                  setAbierto(false)
                }}
              />
            )}
          />
        </View>
      </Modal>
    </>
  )
}

const estilos = StyleSheet.create({
  capsula: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: tinta(0.22),
    backgroundColor: color.cremaElevada,
  },
  fondo: { flex: 1, backgroundColor: tinta(0.35) },
  hoja: {
    maxHeight: '72%',
    backgroundColor: color.crema,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 22,
    paddingHorizontal: medida.margenLateral,
  },
})
