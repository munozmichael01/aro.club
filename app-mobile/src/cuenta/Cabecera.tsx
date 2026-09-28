import { Pressable, StyleSheet, View } from 'react-native'

import { Marca, Texto, color, fuente, medida, radio, tinta } from '../diseno'
import * as T from '../texto/cuenta'

/**
 * La cabecera: la marca, la puerta al panel si es de operación, y cerrar
 * sesión. La comparten las tres pestañas (Inicio, Mi mesa, Perfil), como
 * en la web, donde salir está en las tres.
 */
export function Cabecera(p: { esOps?: boolean; saliendo: boolean; alOperacion?: () => void; alSalir: () => void; arriba: number }) {
  return (
    <View style={[estilos.cabecera, { paddingTop: p.arriba }]}>
      <View style={estilos.cabeceraFila}>
        <View style={estilos.marca} accessibilityRole="header">
          <Marca tam={22} />
          <Texto variante="marca">Aro Club</Texto>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {p.esOps ? (
            <Pressable onPress={p.alOperacion} accessibilityRole="link" style={estilos.operacion}>
              <Texto variante="etiqueta" tono="verde" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0.5 }}>
                {T.nav.operacion}
              </Texto>
            </Pressable>
          ) : null}
          <Pressable onPress={p.alSalir} disabled={p.saliendo} accessibilityRole="button" style={estilos.salir}>
            <Texto variante="cuerpoChico" tono="secundario" style={{ fontFamily: fuente.textoMedia }}>
              {p.saliendo ? T.nav.saliendo : T.nav.salir}
            </Texto>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  cabecera: { backgroundColor: color.crema, borderBottomWidth: 1, borderBottomColor: tinta(0.1) },
  cabeceraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: medida.margenLateral,
    minHeight: 56,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: medida.toqueMinimo },
  operacion: {
    minHeight: medida.toqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: tinta(0.22),
  },
  salir: { minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 8 },
})
