import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AroCarga, Boton, Campo, CampoClave, Fecha, Texto, Velo, color, cremaAlfa, fuente, medida } from '../diseno'
import { AvisoAcceso, Etiqueta, LogoApple, LogoGoogle, Proveedor } from '../entrar/Entrar'
import { SelectorAcceso } from '../entrar/SelectorAcceso'
import { etiquetas as TA } from '../texto/entrar'
import { Acepto } from '../normas/Acepto'
import { acepto as A } from '../texto/normas'
import { Cabecera, FaseQuiz, FaseSinPreguntas, Progreso } from '../entrada/Fases'
import { inicial, reducir, type Estado } from '../entrada/maquina'
import { zonaParaPregunta } from '../avisos/maquina'
import { usePreguntaAvisos } from '../avisos/PreguntaAvisos'
import { preguntaCiudad, type Pregunta } from '../entrada/preguntas'
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

type Fase = 'quiz' | 'nacimiento' | 'cuenta' | 'guardando' | 'fallo' | 'fuera'

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
  /** Solo el catálogo: empezar en otra fase para verla sin contestar el quiz. */
  faseInicial?: Fase
}) {
  const insets = useSafeAreaInsets()
  const { servicio } = p
  const alTerminar = useUltimo(p.alTerminar)
  const [preguntas, setPreguntas] = useState<Pregunta[] | null | undefined>(undefined)
  const [conSesion, setConSesion] = useState<boolean | null>(null)
  const [fase, setFase] = useState<Fase>(p.faseInicial ?? 'quiz')
  const [e, despachar] = useReducer(reducir, undefined, () => ({ ...inicial(), fase: 'quiz' }) as Estado)
  const [nac, setNac] = useState(M.vacio().nacimiento)
  // La lista de `/api/ciudades`. La ciudad elegida es la respuesta de la primera pregunta (`e.respuestas.ciudad`).
  const [ciudades, setCiudades] = useState<M.Ciudad[]>([])
  const [destinoFuera, setDestinoFuera] = useState('/cuenta')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  // La casilla de las normas, en el alta con correo (Apple 1.2; Michael, 18-10).
  // Con Apple o Google las pide la puerta de después de entrar (PuertaNormas).
  const [acepto, setAcepto] = useState(false)
  const [ver, setVer] = useState(false)
  const [aviso, setAviso] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const recuperado = useRef(false)
  const hoy = useRef(new Date()).current

  const cargar = useCallback(async () => {
    setPreguntas(undefined)
    const [q, s, b, cs] = await Promise.all([p.preguntas(), p.haySesion(), AsyncStorage.getItem(M.CLAVE_BORRADOR).catch(() => null), servicio.ciudades()])
    setConSesion(s)
    // La ciudad va primero (`reglas.pasosDePuerta`). Sin la lista (sin red) no
    // sale: mejor que una lista vieja, y quien no la contesta cuenta en Caracas.
    const lista = cs.ok ? cs.datos.ciudades ?? [] : []
    setCiudades(lista)
    const pc = preguntaCiudad(reglas.PUERTA, lista)
    const todas = q && pc ? [pc, ...q] : q
    // El borrador, una sola vez: lo que se respondió antes de cerrar la app.
    if (b && !recuperado.current) {
      recuperado.current = true
      try {
        const x = JSON.parse(b) as M.Borrador
        // Un borrador de antes del 15-10 guardaba la ciudad aparte.
        const resp = { ...(x.ciudad && !x.respuestas?.ciudad ? { ciudad: [x.ciudad] } : {}), ...(x.respuestas ?? {}) }
        for (const [clave, valores] of Object.entries(resp)) {
          const pq = todas?.find((y) => y.clave === clave)
          if (pq) for (const v of valores) despachar({ tipo: 'marcar', pregunta: pq, valor: v })
        }
        if (x.nacimiento) setNac(x.nacimiento)
      } catch {
        /* borrador ilegible: se empieza de cero */
      }
    }
    setPreguntas(todas)
  }, [p])

  useEffect(() => {
    cargar()
    // Solo al montar: `cargar` cambia con las props, y el borrador se lee una vez.
  }, [])

  // El nombre de su zona para la pregunta de los avisos, de las opciones que ya tiene la pantalla.
  const pZonas = preguntas?.find((q) => q.clave === 'zonas')
  const misZonas = (e.respuestas.zonas as string[] | undefined) ?? []
  const ciudad = (e.respuestas.ciudad as string[] | undefined)?.[0]
  const borradorFuera = M.esFuera({ respuestas: {}, nacimiento: nac, ciudad }, ciudades)
  // En una ciudad cerrada la puerta termina en la ciudad: los pasos que cuentan.
  const totalPasos = preguntas ? (borradorFuera ? 1 : preguntas.length) : 0
  const nombreCiudad = M.nombreDeCiudad(ciudades, ciudad)
  // Fuera de Caracas, la pregunta de los avisos nombra su ciudad: «¿Te avisamos cuando abramos fecha en Valencia?».
  const zona = borradorFuera
    ? ciudad === 'otra' ? null : nombreCiudad
    : zonaParaPregunta(misZonas.map((v) => pZonas?.opciones.find((o) => o.valor === v)?.label).filter((x): x is string => !!x))
  const { preguntar, hoja } = usePreguntaAvisos(zona)

  const borrador: M.Borrador = { respuestas: e.respuestas, nacimiento: nac, ciudad }
  // Se guarda con cada cambio: es barato y es lo que hace que cerrar la app no cueste nada.
  useEffect(() => {
    if (!recuperado.current && !Object.keys(e.respuestas).length && !nac.anio) return
    AsyncStorage.setItem(M.CLAVE_BORRADOR, JSON.stringify({ respuestas: e.respuestas, nacimiento: nac, ciudad })).catch(() => {})
  }, [e.respuestas, nac, ciudad])

  /** Con la sesión abierta: las respuestas al servidor y, después, a donde diga el embudo. */
  const guardarYSeguir = async () => {
    setFase('guardando')
    setAviso('')
    const r = await servicio.guardar(M.envios(borrador, hoy, ciudades), T.guardando.fallo)
    if (!r.ok) {
      setAviso(r.error)
      return setFase('fallo')
    }
    // Su ciudad, la que sea: desde el 14-10 una fecha solo se avisa a quien está en su ciudad.
    if (ciudad) {
      const c = await servicio.ponerCiudad(ciudad, T.fuera.noGuardada)
      if (!c.ok) {
        setAviso(c.error)
        return setFase('fallo')
      }
    }
    await AsyncStorage.removeItem(M.CLAVE_BORRADOR).catch(() => {})
    const est = await servicio.estado()
    // Primer momento de la pregunta previa: «abrimos fecha en tu zona» le
    // llega aunque no verifique ni reserve, así que se pregunta aquí, con el
    // nombre de su zona, antes de seguir.
    await preguntar('alta')
    const destino = M.destinoDeEstado(est.ok ? est.datos.estado : null)
    // Fuera de Caracas, antes de seguir: «Anotado. Eres de los primeros de…», como en la landing.
    if (M.esFuera(borrador, ciudades)) {
      setDestinoFuera(destino)
      return setFase('fuera')
    }
    alTerminar.current(destino)
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
    if (trabajando || !acepto || !reglas.valido('correo', c) || clave.length < 8 || clave !== clave2) return
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
        total={totalPasos}
        guardando={false}
        pasosDespues={1}
        pie={
          // Una ciudad cerrada: la frase de `reglas.js`, igual que la web, y la puerta termina aquí.
          preguntas[e.paso]?.clave === 'ciudad' && ciudad && borradorFuera ? (
            <View style={estilos.cerrada} accessibilityLiveRegion="polite">
              <Texto variante="subtitulo" tono="crema">
                {reglas.CIUDAD_CERRADA(ciudades.find((c) => c.slug === ciudad)?.nombre, ciudad).titulo}
              </Texto>
              <Texto variante="cuerpoChico" tono="sobreVerdeSecundario" style={{ marginTop: 6 }}>
                {reglas.CIUDAD_CERRADA(ciudades.find((c) => c.slug === ciudad)?.nombre, ciudad).bajada}
              </Texto>
            </View>
          ) : null
        }
        onMarcar={(valor) => despachar({ tipo: 'marcar', pregunta: preguntas[e.paso], valor })}
        onSiguiente={() => (e.paso >= totalPasos - 1 ? setFase('nacimiento') : despachar({ tipo: 'siguiente', total: preguntas.length }))}
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
        {preguntas ? <Progreso paso={totalPasos} total={totalPasos + 1} /> : null}
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
    const listoClave = reglas.valido('correo', c) && clave.length >= 8 && clave === clave2 && acepto
    const textoClave = !reglas.valido('correo', c)
      ? T.cuenta.faltaCorreo
      : clave.length < 8
        ? TC.boton.corta
        : !clave2
          ? TC.boton.repetir
          : clave !== clave2
            ? TC.boton.dispares
            : !acepto
              ? A.falta
              : TC.boton.crear
    cuerpo = (
      <View>
        {/* «Entrar · Crear cuenta» (entrega «acceso», 20-10): a Entrar con el correo que lleve escrito. */}
        <SelectorAcceso activo="crear" alEntrar={() => p.alEntrar(c || undefined)} alCrear={() => {}} />
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
          {p.hayProveedor('apple') || p.hayProveedor('google') ? (
            <Texto variante="cuerpoChico" tono="sobreVerdeSecundario" style={{ marginTop: 4, marginHorizontal: 6 }}>
              {T.cuenta.notaProveedores}
            </Texto>
          ) : null}
        </View>
        <View style={estilos.separador}>
          <View style={estilos.linea} />
          <Texto variante="etiqueta" tono="sobreVerdeSecundario">
            {T.cuenta.conCorreo}
          </Texto>
          <View style={estilos.linea} />
        </View>
        <View style={{ gap: 12 }}>
          <Etiqueta texto={TA.correo} />
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
          <Etiqueta texto={TA.clave} />
          <CampoClave
            fondo="verde"
            value={clave}
            onChangeText={setClave}
            placeholder={T.cuenta.claveEjemplo}
            accessibilityLabel={TC.clave}
            textContentType="newPassword"
            autoComplete="new-password"
            visible={ver}
            onAlternar={() => setVer((x) => !x)}
            textos={TC}
          />
          <Etiqueta texto={TA.repetir} />
          <CampoClave
            fondo="verde"
            value={clave2}
            onChangeText={setClave2}
            placeholder={T.cuenta.repetirEjemplo}
            accessibilityLabel={TC.repetirEtiqueta}
            textContentType="newPassword"
            autoComplete="new-password"
            visible={ver}
            onAlternar={() => setVer((x) => !x)}
            textos={TC}
            dispar={!!clave2 && clave !== clave2}
          />
          <Acepto fondo="verde" marcada={acepto} alCambiar={setAcepto} />
          {/* Secundario con borde: Apple y Google ya son los botones crema, y tres primarios en la misma vista no dicen cuál toca (entrega «acceso»). */}
          <Boton tipo="secundarioSobreVerde" ancho texto={textoClave} apagado={!listoClave || trabajando} onPress={conClave} />
        </View>
        {trabajando ? (
          <View style={{ marginTop: 16 }}>
            <AroCarga tam={22} sobreVerde />
          </View>
        ) : null}
        {aviso ? <AvisoAcceso texto={aviso} /> : null}
        {/* «Ya tengo cuenta · Entrar» se va: lo hace el selector de arriba. */}
        <Boton tipo="fantasmaSobreVerde" texto={T.quiz.atras} onPress={() => setFase('nacimiento')} />
      </View>
    )
  } else if (fase === 'fuera') {
    cuerpo = (
      <View style={{ gap: 18 }}>
        <Texto variante="display" tono="crema">
          {T.fuera.titulo(nombreCiudad)}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde">
          {T.fuera.cuerpo(nombreCiudad)}
        </Texto>
        <View style={{ marginTop: 10 }}>
          <Boton tipo="sobreVerde" texto={T.fuera.completar} onPress={() => alTerminar.current(destinoFuera)} />
        </View>
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
      {hoja}
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  /** La tarjeta de «Valencia todavía no.», como la de la web. */
  cerrada: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: cremaAlfa(0.24), paddingVertical: 16, paddingHorizontal: 20 },
  pagina: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 28 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  linea: { flex: 1, height: 1, backgroundColor: cremaAlfa(0.22) },
  entrar: { minHeight: medida.toqueMinimo, justifyContent: 'center', marginTop: 16 },
})
