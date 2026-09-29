import Constants from 'expo-constants'
import { openBrowserAsync } from 'expo-web-browser'
import { useState, type ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { AroCarga, Boton, Campo, CampoClave, EnlacePie, Marca, Opcion, Texto, color, cremaAlfa, fuente, medida, radio } from '../diseno'
import { reglas } from '../reglas'
import * as T from '../texto/entrar'

type Fase = 'inicio' | 'correo' | 'recuperar' | 'entrando' | 'otroCorreo' | 'relay'

/** Lo que devuelve entrar con un proveedor, ya resuelto por quien monta la pantalla. */
export type TrasProveedor =
  | { tipo: 'dentro' }
  | { tipo: 'cancelado' }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'otroCorreo'; registro: string; entrada: string }
  | { tipo: 'relay' }
const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

/**
 * Entrar, calcado de `Entrar.dc.html`: sobre verde profundo, las fases
 * inicio → correo → recuperar / entrando, la foto (debajo, como la web en
 * celular) y el pie con sus tres enlaces. Con Apple o Google, además, las
 * dos fases que dependen de `/api/auth/nativo`: «entraste con otra cuenta»
 * (elegir a qué correo escribimos) y el relay de Apple (pedir uno real).
 * Apple solo se ofrece en iOS: en Android no hay inicio nativo.
 *
 * La sesión la abre el SDK; recuperar va por /api/entrar, que pone el tope
 * de tres correos por hora y no dice si la cuenta existe.
 */

function LogoGoogle() {
  return (
    <Svg width={19} height={19} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.3-.2-1.8H9v3.5h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <Path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.9 5.5 18 9 18z" />
      <Path fill="#FBBC05" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.5 0 9s.3 2.8.9 4l3-2.3z" />
      <Path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2.1.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </Svg>
  )
}

function LogoApple() {
  return (
    <Svg width={17} height={20} viewBox="0 0 17 20">
      <Path
        fill={color.verdeProfundo}
        d="M14.1 10.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.7 0-1.9-.9-3.2-.8-1.6 0-3.1 1-3.9 2.4C.2 10.4 1.4 14.7 3 17c.8 1.1 1.7 2.4 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-1-2.4-3.8zM11.7 3.3c.7-.8 1.1-1.9 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
      />
    </Svg>
  )
}

/** El sello melocotón de las fases de aviso («CORREO DISTINTO», «FALTA UN CORREO»). */
function SelloAviso({ texto }: { texto: string }) {
  return (
    <View style={estilos.selloAviso}>
      <Texto variante="etiquetaChica" tono="tinta" style={{ fontFamily: fuente.textoSemi, letterSpacing: 1.4 }}>
        {texto}
      </Texto>
    </View>
  )
}

/** El botón de proveedor: crema, con su logo (los colores de Google son los de su marca). */
function Proveedor({ texto, logo, onPress }: { texto: string; logo: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.proveedor, { backgroundColor: pressed ? color.terracotaSobreVerde : color.crema }]}
    >
      {logo}
      <Texto variante="rotulo" tono="tinta">
        {texto}
      </Texto>
    </Pressable>
  )
}

export function Entrar(p: {
  entrar: (correo: string, clave: string) => Promise<'ok' | 'no-coinciden' | 'sin-red'>
  recuperar: (correo: string) => Promise<boolean>
  alDentro: () => void
  alEmpezar: () => void
  /** Entrar con Apple o Google y terminar la entrada en el servidor. */
  conProveedor: (p: 'apple' | 'google') => Promise<TrasProveedor>
  /** ¿Se enseña el botón de este proveedor? */
  hayProveedor: (p: 'apple' | 'google') => boolean
  /** Guardar el correo al que escribimos (`contacto`). */
  guardarContacto: (correo: string) => Promise<boolean>
}) {
  const insets = useSafeAreaInsets()
  const [fase, setFase] = useState<Fase>('inicio')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [dos, setDos] = useState<{ registro: string; entrada: string } | null>(null)
  const [elegido, setElegido] = useState(0)
  const [contacto, setContacto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const conProveedor = async (prov: 'apple' | 'google') => {
    setAviso('')
    setFase('entrando')
    const r = await p.conProveedor(prov)
    if (r.tipo === 'dentro') return p.alDentro()
    if (r.tipo === 'otroCorreo') {
      setDos({ registro: r.registro, entrada: r.entrada })
      setElegido(0)
      return setFase('otroCorreo')
    }
    if (r.tipo === 'relay') return setFase('relay')
    setFase('inicio')
    if (r.tipo === 'aviso') setAviso(r.texto)
  }

  const guardarYSeguir = async (c: string) => {
    if (guardando) return
    setGuardando(true)
    setError('')
    const ok = await p.guardarContacto(c)
    setGuardando(false)
    if (!ok) return setError(T.sinTerminar.noGuardado)
    p.alDentro()
  }

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
    // Mismo resultado exista o no la cuenta: la pantalla no es un comprobador de quién está registrado.
    await p.recuperar(c)
  }

  let cuerpo: ReactNode
  if (fase === 'otroCorreo' && dos) {
    const opciones = [dos.entrada, dos.registro]
    cuerpo = (
      <View>
        <SelloAviso texto={T.otroCorreo.sello} />
        <Texto variante="titularGrande" tono="crema">
          {T.otroCorreo.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 14 }}>
          {T.otroCorreo.bajadaAntes}
          <Texto variante="cuerpoGrande" tono="crema" style={{ fontFamily: fuente.textoSemi }}>
            {dos.registro}
          </Texto>
          {T.otroCorreo.bajadaMedio}
          <Texto variante="cuerpoGrande" tono="crema" style={{ fontFamily: fuente.textoSemi }}>
            {dos.entrada}
          </Texto>
          {T.otroCorreo.bajadaFin}
        </Texto>
        <View style={estilos.recuadro}>
          <Texto variante="etiquetaChica" tono="sobreVerdeSecundario" style={{ marginBottom: 13 }}>
            {T.otroCorreo.teEscribiremos}
          </Texto>
          <View style={{ gap: 9 }}>
            {opciones.map((c, i) => (
              <Opcion key={c} unica fondo="verde" texto={c} marcada={elegido === i} onPress={() => setElegido(i)} />
            ))}
          </View>
          <Texto variante="nota" tono="sobreVerdeSecundario" style={{ marginTop: 13 }}>
            {T.otroCorreo.nota}
          </Texto>
        </View>
        {error ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" style={{ marginTop: 13 }}>
            {error}
          </Texto>
        ) : null}
        <View style={{ marginTop: 22 }}>
          <Boton tipo="sobreVerde" texto={guardando ? T.relay.guardar(true, true) : T.otroCorreo.continuar} onPress={() => guardarYSeguir(opciones[elegido])} />
        </View>
      </View>
    )
  } else if (fase === 'relay') {
    const ok = reglas.valido('correo', contacto.trim())
    cuerpo = (
      <View>
        <SelloAviso texto={T.relay.sello} />
        <Texto variante="titularGrande" tono="crema">
          {T.relay.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 14 }}>
          {T.relay.bajada}
        </Texto>
        <View style={{ gap: 11, marginTop: 26 }}>
          <Campo
            fondo="verde"
            value={contacto}
            onChangeText={(v) => (setContacto(v), setError(''))}
            placeholder={T.relay.ejemplo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            accessibilityLabel={T.relay.etiqueta}
          />
          <Boton tipo="sobreVerde" ancho texto={T.relay.guardar(guardando, ok)} apagado={!ok || guardando} onPress={() => ok && guardarYSeguir(contacto.trim())} />
        </View>
        {error ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" style={{ marginTop: 13 }}>
            {error}
          </Texto>
        ) : null}
        <Texto variante="cuerpoChico" tono="sobreVerdeSecundario" style={{ marginTop: 16 }}>
          {T.relay.nota}
        </Texto>
      </View>
    )
  } else if (fase === 'entrando') {
    cuerpo = (
      <View>
        <Texto variante="titularGrande" tono="crema">
          {T.entrando.titulo}
        </Texto>
        <View style={estilos.capsula}>
          <AroCarga tam={20} sobreVerde />
          <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" numberOfLines={1} style={{ flexShrink: 1 }}>
            {correo.trim() || T.tuCorreo}
          </Texto>
        </View>
      </View>
    )
  } else if (fase === 'recuperar') {
    cuerpo = (
      <View>
        <Texto variante="titularGrande" tono="crema">
          {T.recuperar.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 14 }}>
          {T.recuperar.bajada(correo.trim() || T.tuCorreo)}
        </Texto>
        <View style={estilos.acciones}>
          <Boton tipo="sobreVerde" texto={T.recuperar.volver} onPress={() => setFase('correo')} />
          <Boton tipo="fantasmaSobreVerde" texto={T.recuperar.noLlega} onPress={() => Linking.openURL('mailto:hola@aro.club')} />
        </View>
      </View>
    )
  } else if (fase === 'correo') {
    cuerpo = (
      <View>
        <Texto variante="titularGrande" tono="crema">
          {T.correo.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 14 }}>
          {T.correo.bajada}
        </Texto>
        <View style={{ gap: 11, marginTop: 28 }}>
          <Campo
            fondo="verde"
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
            fondo="verde"
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
          <Boton tipo="sobreVerde" texto={listo ? T.correo.entrar : T.correo.falta} ancho onPress={entrar} apagado={!listo} />
        </View>
        {error ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 13 }}>
            {error}
          </Texto>
        ) : null}
        <View style={estilos.acciones}>
          <Boton tipo="fantasmaSobreVerde" texto={T.correo.olvide} onPress={olvide} />
          <Boton
            tipo="fantasmaSobreVerde"
            texto={T.correo.otraForma}
            onPress={() => {
              setFase('inicio')
              setClave('')
              setError('')
            }}
          />
        </View>
      </View>
    )
  } else {
    cuerpo = (
      <View>
        <Texto variante="titularGrande" tono="crema">
          {T.inicio.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 14 }}>
          {T.inicio.bajada}
        </Texto>
        <View style={{ marginTop: 28 }}>
          <Boton tipo="secundarioSobreVerde" texto={T.inicio.conCorreo} ancho onPress={() => setFase('correo')} />
        </View>
        <View style={estilos.separador}>
          <View style={estilos.linea} />
          <Texto variante="etiqueta" tono="sobreVerdeSecundario">
            {T.inicio.o}
          </Texto>
          <View style={estilos.linea} />
        </View>
        <View style={{ gap: 10 }}>
          {p.hayProveedor('apple') ? <Proveedor texto={T.inicio.apple} logo={<LogoApple />} onPress={() => conProveedor('apple')} /> : null}
          {p.hayProveedor('google') ? <Proveedor texto={T.inicio.google} logo={<LogoGoogle />} onPress={() => conProveedor('google')} /> : null}
        </View>
        {aviso ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 13 }}>
            {aviso}
          </Texto>
        ) : null}
        <View style={estilos.empezar}>
          <Texto variante="cuerpo" tono="sobreVerdeSecundario">
            {T.inicio.empezarAntes}
            <Texto variante="cuerpo" tono="sobreVerdeSecundario" style={estilos.enlace} onPress={p.alEmpezar}>
              {T.inicio.empezar}
            </Texto>
            .
          </Texto>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.verdeProfundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={estilos.cabecera}>
          <Marca tam={24} crema />
          <Texto variante="marca" tono="crema">
            Aro Club
          </Texto>
        </View>
        {cuerpo}
        <Image source={require('../../assets/fotos/entrar.jpg')} style={estilos.foto} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={estilos.pie}>
          {T.pie.map((l) => (
            <EnlacePie key={l.ruta} texto={l.texto} onPress={() => openBrowserAsync(`${SITIO}${l.ruta}`)} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: medida.toqueMinimo, marginBottom: 32 },
  capsula: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 15,
    maxWidth: '100%',
    minHeight: 58,
    paddingHorizontal: 25,
    marginTop: 22,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: cremaAlfa(0.3),
  },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 13, marginTop: 20 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 24 },
  linea: { flex: 1, height: 1, backgroundColor: cremaAlfa(0.22) },
  proveedor: {
    minHeight: medida.boton,
    borderRadius: radio.capsula,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  selloAviso: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, backgroundColor: color.terracotaSobreVerde, marginBottom: 16 },
  recuadro: { borderRadius: 26, borderWidth: 1, borderColor: cremaAlfa(0.22), padding: 18, marginTop: 24 },
  empezar: { marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderColor: cremaAlfa(0.18) },
  enlace: { fontFamily: fuente.textoSemi, textDecorationLine: 'underline' },
  foto: { width: '100%', aspectRatio: 4 / 5, maxHeight: 470, borderRadius: 28, marginTop: 36, backgroundColor: color.verdeProfundo },
  pie: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
})
