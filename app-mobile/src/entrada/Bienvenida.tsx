import { StatusBar } from 'expo-status-bar'
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Boton, Enfasis, Texto, color, fuente, medida } from '../diseno'
import * as T from '../texto/entrada'

/**
 * Lo primero que se ve al abrir la app sin sesión: 1b de
 * `Design/Aro Club - Bienvenida app.dc.html`. Arriba las cuatro polaroids,
 * debajo el titular del hero, la línea de apoyo, «Encuentra tu mesa» y
 * «Ya tengo cuenta · Entrar». Pensada para verse sin scroll en 390 × 844;
 * en un teléfono más pequeño o con la letra al máximo, se desplaza.
 *
 * Diferencias con la maqueta, por las reglas de la app:
 * - el fondo es `verdeProfundo` y no #0F2820, y la línea de apoyo va en
 *   `cuerpoSobreVerde` y no #E4EDE6: un valor por papel (§6 bis);
 * - las fotos llevan el filtro de marca cocido (`scripts/cocer-foto.py`),
 *   como todas las de la app;
 * - el titular dice «esta semana», no «el jueves».
 *
 * Sin permisos, sin precio y sin ciudad (notas de Design).
 */

const FOTOS: Record<string, number> = {
  dinner: require('../../assets/fotos/filtro-cenas.jpg'),
  drinks: require('../../assets/fotos/filtro-drinks.jpg'),
  coffee: require('../../assets/fotos/filtro-coffee.jpg'),
  movement: require('../../assets/fotos/filtro-movimiento.jpg'),
}

/**
 * Dónde cae cada polaroid. La maqueta (346 × 292) montaba la fila de abajo
 * sobre la de arriba y tapaba la mitad de Cenas y Drinks, con sus nombres
 * (Michael, 02-10-2026): ahora la segunda fila empieza
 * donde acaba el nombre de la primera. Se siguen tocando, como polaroids
 * sobre una mesa, pero ninguna tapa la foto ni el nombre de otra.
 */
const SITIO = [
  { x: 20, y: 2, giro: '-5deg' },
  { x: 174, y: 0, giro: '4deg' },
  { x: 28, y: 190, giro: '3deg' },
  { x: 178, y: 186, giro: '-4deg' },
]
const FOTO = 136
const ANCHO_MAQUETA = 346
const ALTO_MAQUETA = 384

function Polaroids({ ancho }: { ancho: number }) {
  // Se escala con el ancho, sin pasar del 120 %: en una tableta no se hacen enormes.
  const k = Math.min(ancho / ANCHO_MAQUETA, 1.2)
  return (
    <View style={{ height: ALTO_MAQUETA * k, width: ANCHO_MAQUETA * k, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {T.bienvenida.polaroids.map((p, i) => (
        <View
          key={p.formato}
          style={[
            estilos.polaroid,
            { left: SITIO[i].x * k, top: SITIO[i].y * k, width: (FOTO + 16) * k, padding: 8 * k, paddingBottom: 0, transform: [{ rotate: SITIO[i].giro }] },
          ]}
        >
          <Image source={FOTOS[p.formato]} style={{ width: FOTO * k, height: FOTO * k }} resizeMode="cover" />
          <Texto style={{ fontFamily: fuente.titular, fontSize: 15 * k, lineHeight: Math.ceil(15 * k * 1.42), color: color.verdeProfundo, paddingTop: 8 * k, paddingBottom: 10 * k, paddingHorizontal: 2 }}>
            {p.nombre}
          </Texto>
        </View>
      ))}
    </View>
  )
}

export function Bienvenida({ onEmpezar, onEntrar }: { onEmpezar: () => void; onEntrar: () => void }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const ancho = Math.min(width, 560) - 44
  const t = T.titular
  const b = T.bienvenida
  return (
    <View style={{ flex: 1, backgroundColor: color.verdeProfundo }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}
        bounces={false}
      >
        <Polaroids ancho={ancho} />
        <View style={estilos.abajo}>
          <Texto variante="portada" tono="crema" accessibilityRole="header">
            {t.linea} <Enfasis sobreVerde>{t.enfasis}</Enfasis>
          </Texto>
          <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 16 }}>
            {b.bajada}{' '}
            <Texto variante="cuerpoGrande" tono="crema" style={{ fontFamily: fuente.textoSemi }}>
              {b.bajadaEnfasis}
            </Texto>
          </Texto>
          <View style={{ marginTop: 26, gap: 6 }}>
            <Boton tipo="sobreVerde" texto={b.empezar} ancho onPress={onEmpezar} />
            <Pressable onPress={onEntrar} accessibilityRole="link" accessibilityLabel={`${b.yaTengo}${b.entrar}`} style={estilos.entrar}>
              <Texto variante="cuerpo" tono="cuerpoSobreVerde" style={{ fontFamily: fuente.textoMedia }}>
                {b.yaTengo}
                <Texto variante="cuerpo" tono="crema" style={{ fontFamily: fuente.textoSemi }}>
                  {b.entrar}
                </Texto>
              </Texto>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { flexGrow: 1, paddingHorizontal: 22, maxWidth: 560, width: '100%', alignSelf: 'center' },
  abajo: { flexGrow: 1, justifyContent: 'flex-end', marginTop: 24 },
  polaroid: {
    position: 'absolute',
    backgroundColor: color.cremaElevada,
    borderRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  entrar: { minHeight: medida.toqueMinimo, alignItems: 'center', justifyContent: 'center' },
})
