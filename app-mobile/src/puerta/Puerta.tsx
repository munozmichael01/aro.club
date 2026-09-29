import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AroCarga, Boton, Campo, CampoClave, Fecha, Texto, Velo, color, cremaAlfa, fuente, medida } from '../diseno'
import { LogoApple, LogoGoogle, Proveedor } from '../entrar/Entrar'
import { Cabecera, FaseQuiz, FaseSinPreguntas, Progreso } from '../entrada/Fases'
import { inicial, reducir, type Estado } from '../entrada/maquina'
import type { Pregunta } from '../entrada/preguntas'
import { reglas } from '../reglas'
import { cuenta as TC } from '../texto/datos'
import { inicio as TE } from '../texto/entrar'
import { MESES_CORTOS } from '../texto/fechas'
import * as T from '../texto/puerta'
import { useUltimo } from '../util/useUltimo'
import * as M from './maquina'
import type { crearServicioPuerta } from './servicio'

type Servicio = ReturnType<typeof crearServicioPuerta>
/** El `error` literal del 409 de `/api/cuenta` cuando el correo ya tiene cuenta (contrato del 29-09). */
const YA_TIENE_CUENTA = 'Ese correo ya tiene cuenta. Entra con tu contraseña.'

type Fase = 'quiz' | 'nacimiento' | 'cuenta' | 'guardando' | 'fallo'

/**
 * El alta de la app (`/puerta`), acordada el 29-09: las cuatro preguntas de
 * la puerta → la fecha de nacimiento (la puerta de los 18, ANTES de crear
 * nada) → «crea tu cuenta» con Apple, Google o correo y contraseña → las
 * respuestas a `/api/cuestionario` con la sesión → a donde diga el embudo.
 *
 * Quien ya tiene sesión (entró con Google desde Entrar y le faltan las
 * cuatro) se salta la cuenta: responde y se guarda.
 *
 * Todo lo respondido queda en un borrador del celular hasta que se guarda:
 * cerrar la app a mitad no lo pierde.
 */
export function Puerta(p: {
  servicio: Servicio
  preguntas: () => Promise<Pregunta[] | null>
  haySesion: () => Promise<boolean>
  hayProveedor: (x: 'apple' | 'google') => boolean
  /** Entra con el proveedor y termina la entrada (`/api/auth/nativo`). `null` si entró; si no, el aviso que se enseña. */
  conProveedor: (x: 'apple' | 'google') => Promise<string | null | 'cancelado'>
  entrarConClave: (correo: string, clave: string) => Promise<boolean>
  alTerminar: (destino: string) => void
  alEntrar: (correo?: string) => void
}) {
  const insets = useSafeAreaInsets()
  const { servicio } = p
  const alTerminar = useUltimo(p.alTerminar)
  const [preguntas, setPreguntas] = useState<Pregunta[] | null | undefined>(undefined)
  const [conSesion, setConSesion] = useState<boolean | null>(null)
  const [fase, setFase] = useState<Fase>('quiz')
  const [e, despachar] = useReducer(reducir, undefined, () => ({ ...inicial(), fase: 'quiz' }) as Estado)
  const [nac, setNac] = useState(M.vacio().nacimiento)
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [ver, setVer] = useState(false)
  const [aviso, setAviso] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const recuperado = useRef(false)
  const hoy = useRef(new Date()).current

  const cargar = useCallback(async () => {
    setPreguntas(undefined)
    const [q, s, b] = await Promise.all([p.preguntas(), p.haySesion(), AsyncStorage.getItem(M.CLAVE_BORRADOR).catch(() => null)])
    setConSesion(s)
    // El borrador, una sola vez: lo que se respondió antes de cerrar la app.
    if (b && !recuperado.current) {
      recuperado.current = true
      try {
        const x = JSON.parse(b) as M.Borrador
        for (const [clave, valores] of Object.entries(x.respuestas ?? {})) {
          const pq = q?.find((y) => y.clave === clave)
          if (pq) for (const v of valores) despachar({ tipo: 'marcar', pregunta: pq, valor: v })
        }
        if (x.nacimiento) setNac(x.nacimiento)
      } catch {
        /* borrador ilegible: se empieza de cero */
      }
    }
    setPreguntas(q)
  }, [p])

  useEffect(() => {
    cargar()
    // Solo al montar: `cargar` cambia con las props, y el borrador se lee una vez.
  }, [])

  const borrador: M.Borrador = { respuestas: e.respuestas, nacimiento: nac }
  // Se guarda con cada cambio: es barato y es lo que hace que cerrar la app no cueste nada.
  useEffect(() => {
    if (!recuperado.current && !Object.keys(e.respuestas).length && !nac.anio) return
    AsyncStorage.setItem(M.CLAVE_BORRADOR, JSON.stringify({ respuestas: e.respuestas, nacimiento: nac })).catch(() => {})
  }, [e.respuestas, nac])

  /** Con la sesión abierta: las respuestas al servidor y, después, a donde diga el embudo. */
  const guardarYSeguir = async () => {
    setFase('guardando')
    setAviso('')
    const r = await servicio.guardar(M.envios(borrador, hoy), T.guardando.fallo)
    if (!r.ok) {
      setAviso(r.error)
      return setFase('fallo')
    }
    await AsyncStorage.removeItem(M.CLAVE_BORRADOR).catch(() => {})
    const est = await servicio.estado()
    alTerminar.current(M.destinoDeEstado(est.ok ? est.datos.estado : null))
  }

  const trasNacimiento = () => (conSesion ? guardarYSeguir() : setFase('cuenta'))

  const conProveedor = async (x: 'apple' | 'google') => {
    if (trabajando) return
    setTrabajando(true)
    setAviso('')
    const r = await p.conProveedor(x)
    setTrabajando(false)
    if (r === 'cancelado') return
    if (r) return setAviso(r)
    guardarYSeguir()
  }

  const conClave = async () => {
    const c = correo.trim()
    if (trabajando || !reglas.valido('correo', c) || clave.length < 8 || clave !== clave2) return
    setTrabajando(true)
    setAviso('')
    const r = await servicio.crearCuenta(c, clave, T.cuenta.noCreada)
    // «Ya tiene cuenta» llega de dos formas: un 409 con ese texto literal, o
    // un 200 con `ya_existe` (quien ya convirtió su lead). Las dos, a Entrar
    // con el correo puesto: las respuestas siguen en el borrador y se mandan
    // al entrar. No vale mirar solo el 409: también sale si el teléfono ya
    // está en otra cuenta, y ese se enseña tal cual.
    const yaTiene = (!r.ok && r.status === 409 && r.error === YA_TIENE_CUENTA) || (r.ok && r.datos.estado === 'ya_existe')
    setTrabajando(false)
    if (yaTiene) return p.alEntrar(c)
    if (!r.ok) return setAviso(r.error)
    setTrabajando(true)
    const dentro = await p.entrarConClave(c, clave)
    setTrabajando(false)
    if (!dentro) return setAviso(T.cuenta.noCreada)
    guardarYSeguir()
  }

  if (preguntas === undefined || conSesion === null) return <Velo sobreVerde />

  let cuerpo
  if (fase === 'quiz') {
    cuerpo = preguntas ? (
      <FaseQuiz
        estado={e}
        pregunta={preguntas[e.paso]}
        total={preguntas.length}
        guardando={false}
        pasosDespues={1}
        onMarcar={(valor) => despachar({ tipo: 'marcar', pregunta: preguntas[e.paso], valor })}
        onSiguiente={() => (e.paso >= preguntas.length - 1 ? setFase('nacimiento') : despachar({ tipo: 'siguiente', total: preguntas.length }))}
        onAtras={() => despachar({ tipo: 'atras' })}
      />
    ) : (
      <FaseSinPreguntas onReintentar={cargar} />
    )
  } else if (fase === 'nacimiento') {
    const est = M.estadoFecha(borrador, hoy)
    const nota = est === 'menor' ? T.nacimiento.menor : est === 'rara' ? T.nacimiento.rara : null
    cuerpo = (
      <View>
        {preguntas ? <Progreso paso={preguntas.length} total={preguntas.length + 1} /> : null}
        <Texto variante="display" tono="crema" accessibilityRole="header" style={{ marginBottom: 12 }}>
          {T.titulos.nacimiento}
        </Texto>
        <Texto variante="cuerpo" tono="sobreVerdeSecundario" style={{ marginBottom: 24 }}>
          {T.nacimiento.pista}
        </Texto>
        <Fecha
          fondo="verde"
          dia={nac.dia}
          mes={nac.mes}
          anio={nac.anio}
          meses={MESES_CORTOS}
          textos={T.nacimiento}
          onDia={(v) => setNac((x) => ({ ...x, dia: reglas.filtrar('dia', v) }))}
          onMes={(m) => setNac((x) => ({ ...x, mes: m }))}
          onAnio={(v) => setNac((x) => ({ ...x, anio: v.replace(/\D/g, '').slice(0, 4) }))}
        />
        {nota ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 18 }}>
            {nota}
          </Texto>
        ) : null}
        <View style={estilos.acciones}>
          <Boton
            tipo="sobreVerde"
            texto={est === 'ok' ? T.quiz.siguiente : est === 'menor' ? T.nacimiento.menorCorto : est === 'rara' ? T.nacimiento.revisar : T.nacimiento.incompleta}
            disabled={est !== 'ok'}
            onPress={trasNacimiento}
          />
          <Boton tipo="fantasmaSobreVerde" texto={T.quiz.atras} onPress={() => setFase('quiz')} />
        </View>
      </View>
    )
  } else if (fase === 'cuenta') {
    const c = correo.trim()
    const listoClave = reglas.valido('correo', c) && clave.length >= 8 && clave === clave2
    const textoClave = !reglas.valido('correo', c)
      ? T.cuenta.faltaCorreo
      : clave.length < 8
        ? TC.boton.corta
        : !clave2
          ? TC.boton.repetir
          : clave !== clave2
            ? TC.boton.dispares
            : TC.boton.crear
    cuerpo = (
      <View>
        <Texto variante="display" tono="crema" accessibilityRole="header">
          {T.titulos.cuenta}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginTop: 12 }}>
          {T.cuenta.bajada}
        </Texto>
        {/* Apple y Google como iguales, y la contraseña debajo (nota de Design). */}
        <View style={{ gap: 10, marginTop: 26 }}>
          {p.hayProveedor('apple') ? <Proveedor texto={TE.apple} logo={<LogoApple />} onPress={() => conProveedor('apple')} /> : null}
          {p.hayProveedor('google') ? <Proveedor texto={TE.google} logo={<LogoGoogle />} onPress={() => conProveedor('google')} /> : null}
        </View>
        <View style={estilos.separador}>
          <View style={estilos.linea} />
          <Texto variante="etiqueta" tono="sobreVerdeSecundario">
            {T.cuenta.conCorreo}
          </Texto>
          <View style={estilos.linea} />
        </View>
        <View style={{ gap: 11 }}>
          <Campo
            fondo="verde"
            value={correo}
            onChangeText={(v) => (setCorreo(v), setAviso(''))}
            placeholder={T.cuenta.ejemplo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            accessibilityLabel={T.cuenta.correo}
          />
          <CampoClave
            fondo="verde"
            value={clave}
            onChangeText={setClave}
            placeholder={TC.clave}
            accessibilityLabel={TC.clave}
            textContentType="newPassword"
            autoComplete="new-password"
            visible={ver}
            onAlternar={() => setVer((x) => !x)}
            textos={TC}
          />
          <CampoClave
            fondo="verde"
            value={clave2}
            onChangeText={setClave2}
            placeholder={TC.repetir}
            accessibilityLabel={TC.repetirEtiqueta}
            textContentType="newPassword"
            autoComplete="new-password"
            visible={ver}
            onAlternar={() => setVer((x) => !x)}
            textos={TC}
            dispar={!!clave2 && clave !== clave2}
          />
          <Boton tipo="sobreVerde" ancho texto={textoClave} apagado={!listoClave || trabajando} onPress={conClave} />
        </View>
        {trabajando ? (
          <View style={{ marginTop: 16 }}>
            <AroCarga tam={22} sobreVerde />
          </View>
        ) : null}
        {aviso ? (
          <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 14 }}>
            {aviso}
          </Texto>
        ) : null}
        <Pressable onPress={() => p.alEntrar(c || undefined)} accessibilityRole="link" style={estilos.entrar}>
          <Texto variante="cuerpo" tono="sobreVerdeSecundario" style={{ fontFamily: fuente.textoMedia }}>
            {T.cuenta.yaTengo}
            <Texto variante="cuerpo" tono="crema" style={{ fontFamily: fuente.textoSemi }}>
              {T.cuenta.entrar}
            </Texto>
          </Texto>
        </Pressable>
        <Boton tipo="fantasmaSobreVerde" texto={T.quiz.atras} onPress={() => setFase('nacimiento')} />
      </View>
    )
  } else if (fase === 'guardando') {
    cuerpo = (
      <View style={{ gap: 20 }}>
        <Texto variante="display" tono="crema">
          {T.guardando.titulo}
        </Texto>
        <AroCarga tam={28} sobreVerde />
      </View>
    )
  } else {
    cuerpo = (
      <View style={{ gap: 18 }}>
        <Texto variante="cuerpoGrande" tono="avisoSobreVerde" accessibilityRole="alert">
          {aviso || T.guardando.fallo}
        </Texto>
        <Boton tipo="sobreVerde" texto={T.guardando.reintentar} onPress={guardarYSeguir} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.verdeProfundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        <Cabecera onEntrar={fase === 'quiz' && e.paso === 0 && !conSesion ? () => p.alEntrar() : undefined} />
        {cuerpo}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 28 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  linea: { flex: 1, height: 1, backgroundColor: cremaAlfa(0.22) },
  entrar: { minHeight: medida.toqueMinimo, justifyContent: 'center', marginTop: 16 },
})
