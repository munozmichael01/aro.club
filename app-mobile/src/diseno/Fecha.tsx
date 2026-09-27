import { StyleSheet, View } from 'react-native'

import { Campo } from './Campo'
import { Opcion } from './Opcion'
import { Texto } from './Texto'
import { tipo } from './tokens'

/**
 * El selector de fecha del producto: día, los doce meses y año. Es el
 * mismo en los datos personales y en el cuestionario —la web lo dejó
 * escrito: «no se reinventa»—, así que vive aquí una vez.
 *
 * Lo que se puede teclear lo filtra quien lo usa (con `reglas.js`).
 */
type Props = {
  dia: string
  mes: number
  anio: string
  meses: string[]
  textos: { dia: string; mes: string; anio: string; ejemploDia: string; ejemploAnio: string }
  onDia: (v: string) => void
  onMes: (m: number) => void
  onAnio: (v: string) => void
}

function Etiqueta({ children, suelta }: { children: string; suelta?: boolean }) {
  return (
    <Texto variante="etiqueta" tono="cuerpo" style={{ marginTop: suelta ? 26 : 0, marginBottom: 11 }}>
      {children}
    </Texto>
  )
}

export function Fecha(p: Props) {
  return (
    <View>
      <Etiqueta>{p.textos.dia}</Etiqueta>
      <View style={{ width: 136 }}>
        <Campo
          value={p.dia}
          onChangeText={p.onDia}
          placeholder={p.textos.ejemploDia}
          keyboardType="number-pad"
          maxLength={2}
          style={estilos.cifra}
          accessibilityLabel={p.textos.dia}
        />
      </View>
      <Etiqueta suelta>{p.textos.mes}</Etiqueta>
      <View style={estilos.meses}>
        {p.meses.map((m, i) => (
          <View key={m} style={{ width: '31%' }}>
            <Opcion texto={m} marcada={p.mes === i + 1} onPress={() => p.onMes(i + 1)} />
          </View>
        ))}
      </View>
      <Etiqueta suelta>{p.textos.anio}</Etiqueta>
      <View style={{ width: 136 }}>
        <Campo
          value={p.anio}
          onChangeText={p.onAnio}
          placeholder={p.textos.ejemploAnio}
          keyboardType="number-pad"
          maxLength={4}
          style={estilos.cifra}
          accessibilityLabel={p.textos.anio}
        />
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  cifra: { ...tipo.cifraCampo, textAlign: 'center' },
  meses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
})
