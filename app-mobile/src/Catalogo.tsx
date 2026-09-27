import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import {
  AroCarga,
  Boton,
  Enfasis,
  Marca,
  Tarjeta,
  Texto,
  Velo,
  color,
  tinta,
  tipo,
  useVelo,
  type Variante,
} from './diseno'

/**
 * El catálogo del sistema, dentro de la app: lo mismo que
 * `Sistema v3.dc.html` en la web, pintado con los componentes de verdad.
 * Sirve para mirar el sistema en un teléfono (y, hasta que haya Xcode, en
 * el navegador) sin recorrer el producto. No se publica: es de desarrollo.
 */

const COLORES: Array<[string, string, string]> = [
  ['Crema', color.crema, 'Fondo por defecto'],
  ['Crema elevada', color.cremaElevada, 'Tarjetas y campos'],
  ['Crema fría', color.cremaFria, 'Segundo fondo'],
  ['Verde profundo', color.verdeProfundo, 'Texto principal'],
  ['Verde', color.verde, 'Primario, enlaces'],
  ['Cuerpo (hoja)', color.cuerpo, 'Cuerpo según Sistema v3'],
  ['Cuerpo (entregas)', color.cuerpoEntregas, 'Cuerpo en Pago, Mesa, Datos'],
  ['Secundario', color.secundario, 'Etiquetas'],
  ['Terracota clara', color.terracotaClara, 'Solo trazos y 24 px+'],
  ['Terracota oscura', color.terracota, 'La que lleva texto'],
]

const ESCALA: Array<[Variante, string]> = [
  ['display', 'Ya sabemos con quién cenas'],
  ['titulo', 'Cinco maneras de llegar'],
  ['subtitulo', 'El resto del perfil'],
  ['cuerpoGrande', 'Seis desconocidos, una mesa.'],
  ['cuerpo', 'Nosotros elegimos el sitio y reservamos.'],
  ['etiqueta', 'PANTALLA 3 DE 5'],
  ['cifra', '04'],
]

function Seccion({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Texto variante="etiqueta" tono="terracota">
        {n}
      </Texto>
      <Texto variante="titulo">{titulo}</Texto>
      <View style={{ gap: 12, marginTop: 8 }}>{children}</View>
    </View>
  )
}

/** Simula una carga de la duración que se le diga, con el velo real. */
function DemoVelo({ ms }: { ms: number }) {
  const { tapado, levantar } = useVelo()
  const [dato, setDato] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      setDato(`La respuesta llegó a los ${ms} ms`)
      levantar()
    }, ms)
    return () => clearTimeout(t)
  }, [ms, levantar])
  return (
    <Tarjeta style={{ minHeight: 180 }}>
      {tapado ? <Velo /> : <Texto variante="cuerpo">{dato}. El velo esperó hasta el medio segundo.</Texto>}
    </Tarjeta>
  )
}

export function Catalogo() {
  const [clave, setClave] = useState(0)
  return (
    <ScrollView style={{ backgroundColor: color.crema }} contentContainerStyle={estilos.pagina}>
      <View style={estilos.cabecera}>
        <Marca />
        <Texto variante="subtitulo" style={{ fontSize: 19, lineHeight: 19 }}>
          Aro Club
        </Texto>
      </View>

      <Texto variante="display">
        Un sistema para una mesa <Enfasis>de seis.</Enfasis>
      </Texto>

      <Seccion n="01 · COLOR" titulo="Tres familias, ninguno decorativo.">
        <View style={estilos.rejilla}>
          {COLORES.map(([nombre, hex, uso]) => (
            <View key={nombre} style={estilos.muestra}>
              <View style={{ height: 52, backgroundColor: hex }} />
              <View style={{ padding: 10, backgroundColor: color.cremaElevada }}>
                <Texto variante="cuerpo" tono="tinta" style={{ fontSize: 13, lineHeight: 17 }}>
                  {nombre}
                </Texto>
                <Texto variante="etiqueta" style={{ letterSpacing: 0 }}>
                  {hex}
                </Texto>
                <Texto variante="cuerpo" style={{ fontSize: 12, lineHeight: 16 }}>
                  {uso}
                </Texto>
              </View>
            </View>
          ))}
        </View>
      </Seccion>

      <Seccion n="02 · TIPOGRAFÍA" titulo="Young Serif e Inter Tight.">
        <Tarjeta style={{ gap: 14 }}>
          {ESCALA.map(([v, t]) => (
            <View key={v}>
              <Texto variante={v}>{t}</Texto>
              <Texto variante="etiqueta" style={{ letterSpacing: 0, marginTop: 4 }}>
                {v} · {tipo[v].fontSize}/{tipo[v].lineHeight}
              </Texto>
            </View>
          ))}
        </Tarjeta>
      </Seccion>

      <Seccion n="04 · BOTONES" titulo="Tres, y ninguno por debajo de 44.">
        <Tarjeta style={{ gap: 10 }}>
          <Boton texto="Encuentra tu mesa" ancho onPress={() => {}} />
          <Boton texto="Encuentra tu mesa" ancho disabled />
          <Boton tipo="secundario" texto="Cambiar mi respuesta" onPress={() => {}} />
          <Boton tipo="secundario" texto="Cambiar mi respuesta" disabled />
          <Boton tipo="fantasma" texto="Ahora no" onPress={() => {}} />
        </Tarjeta>
        <View style={[estilos.bloqueVerde, { gap: 10 }]}>
          <Boton tipo="sobreVerde" texto="Completar mi perfil" ancho onPress={() => {}} />
          <Boton tipo="sobreVerde" texto="Completar mi perfil" ancho disabled />
        </View>
      </Seccion>

      <Seccion n="LA MARCA" titulo="El sexto punto eres tú.">
        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
          <Marca tam={54} />
          <AroCarga />
        </Tarjeta>
      </Seccion>

      <Seccion n="EL VELO" titulo="Medio segundo de suelo.">
        <Texto variante="cuerpo">
          Una respuesta a los 120 ms no parpadea: el velo se queda hasta los 500. Una a los 1.500 ms no espera de más.
        </Texto>
        <View key={clave} style={{ gap: 10 }}>
          <DemoVelo ms={120} />
          <DemoVelo ms={1500} />
        </View>
        <Boton tipo="secundario" texto="Repetir" onPress={() => setClave((k) => k + 1)} />
      </Seccion>
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  pagina: { padding: 16, paddingTop: 56, paddingBottom: 64, gap: 12, maxWidth: 620, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  seccion: { marginTop: 40, gap: 6 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  muestra: { width: '47%', flexGrow: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: tinta(0.13) },
  bloqueVerde: { backgroundColor: color.verdeProfundo, borderRadius: 22, padding: 18 },
})
