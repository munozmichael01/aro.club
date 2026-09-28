import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AroCarga, Aviso, Boton, Campo, CampoClave, Marca, Texto, color, medida } from '../diseno'
import { reglas } from '../reglas'
import * as T from '../texto/entrar'

type Fase = 'correo' | 'recuperar' | 'entrando'

/**
 * Entrar, fiel a `Entrar.dc.html` en lo que hoy existe en la app: correo y
 * contraseña, recuperarla y «Entrando». La sesión la abre el SDK (ver
 * src/sesion); recuperar va por /api/entrar, que pone el tope de tres correos
 * por hora y no dice si la cuenta existe.
 */
export function Entrar(p: {
  entrar: (correo: string, clave: string) => Promise<'ok' | 'no-coinciden' | 'sin-red'>
  recuperar: (correo: string) => Promise<boolean>
  alDentro: () => void
  alEmpezar: () => void
}) {
  const insets = useSafeAreaInsets()
  const [fase, setFase] = useState<Fase>('correo')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')

  const listo = reglas.valido('correo', correo.trim()) && clave.length > 0

  const entrar = async () => {
    if (!listo) return
    setFase('entrando')
    setError('')
    const r = await p.entrar(correo.trim(), clave)
    if (r === 'ok') return p.alDentro()
    setFase('correo')
    setError(r === 'no-coinciden' ? T.noCoinciden : T.sinRed)
  }

  const olvide = async () => {
    const c = correo.trim()
    if (!reglas.valido('correo', c)) return setError(T.recuperar.primeroCorreo)
    setFase('recuperar')
    setError('')
    // Mismo resultado exista o no la cuenta: la pantalla no puede ser un
    // comprobador de quién está registrado (el servidor lo hace igual).
    await p.recuperar(c)
  }

  const cabecera = (
    <View style={estilos.marca}>
      <Marca />
      <Texto variante="marca">Aro Club</Texto>
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.crema }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}
      >
        {cabecera}
        {fase === 'entrando' ? (
          <View style={{ gap: 18 }}>
            <Texto variante="display">{T.entrando.titulo}</Texto>
            <View style={estilos.entrando}>
              <AroCarga tam={20} />
              <Texto variante="cuerpoGrande" numberOfLines={1} style={{ flexShrink: 1 }}>
                {correo.trim() || T.tuCorreo}
              </Texto>
            </View>
          </View>
        ) : fase === 'recuperar' ? (
          <View>
            <Texto variante="display">{T.recuperar.titulo}</Texto>
            <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
              {T.recuperar.bajada(correo.trim() || T.tuCorreo)}
            </Texto>
            <View style={estilos.acciones}>
              <Boton tipo="secundario" texto={T.recuperar.volver} onPress={() => setFase('correo')} />
              <Boton tipo="fantasma" texto={T.recuperar.noLlega} onPress={() => Linking.openURL('mailto:hola@aro.club')} />
            </View>
          </View>
        ) : (
          <View>
            <Texto variante="display">{T.correo.titulo}</Texto>
            <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
              {T.correo.bajada}
            </Texto>
            <View style={{ gap: 11, marginTop: 26 }}>
              <Campo
                value={correo}
                onChangeText={(v) => {
                  setCorreo(v)
                  setError('')
                }}
                placeholder={T.correo.ejemplo}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                accessibilityLabel={T.correo.etiquetaCorreo}
              />
              <CampoClave
                value={clave}
                onChangeText={(v) => {
                  setClave(v)
                  setError('')
                }}
                placeholder={T.correo.clave}
                accessibilityLabel={T.correo.clave}
                textContentType="password"
                autoComplete="current-password"
                onSubmitEditing={entrar}
                visible={ver}
                onAlternar={() => setVer((x) => !x)}
                textos={T.correo}
              />
              <Boton texto={listo ? T.correo.entrar : T.correo.falta} ancho onPress={entrar} apagado={!listo} />
            </View>
            {error ? (
              <View style={{ marginTop: 14 }}>
                <Aviso>{error}</Aviso>
              </View>
            ) : null}
            <View style={estilos.acciones}>
              <Boton tipo="fantasma" texto={T.correo.olvide} onPress={olvide} />
            </View>
            <Texto variante="cuerpoChico" style={{ marginTop: 26 }}>
              {T.correo.empezarAntes}
              <Texto variante="cuerpoChico" tono="verde" style={{ textDecorationLine: 'underline' }} onPress={p.alEmpezar}>
                {T.correo.empezar}
              </Texto>
              .
            </Texto>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: medida.toqueMinimo, marginBottom: 30 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 20 },
  entrando: { flexDirection: 'row', alignItems: 'center', gap: 14 },
})
