import Constants from 'expo-constants'
import { openBrowserAsync } from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import {
  Aviso,
  Barras,
  Boton,
  Campo,
  CampoClave,
  Chip,
  Fecha,
  Marca,
  Opcion,
  Selector,
  Tarjeta,
  Texto,
  Velo,
  color,
  medida,
  radio,
  tinta,
  useVelo,
} from '../diseno'
import { tiempo } from '../diseno/tokens'
import { esperaParaLevantar } from '../diseno/velo-tiempo'
import { reglas } from '../reglas'
import { borrarLead, guardarLead, leerLead, type Lead } from '../sesion/lead'
import * as T from '../texto/datos'
import { repetido as R } from '../texto/entrada'
import { MESES_CORTOS, cuandoSeRevela } from '../texto/fechas'
import {
  PASO_CORREO,
  PASO_FIN,
  avisoEdad,
  cuerpoGuardar,
  desdeServidor,
  edad,
  errorTelefono,
  estadoClave,
  inicial,
  resumen,
  tratoSugerido,
  validar,
  type Estado,
} from './maquina'
import type { crearServicioDatos } from './servicio'

type Servicio = ReturnType<typeof crearServicioDatos>
const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

const conSuelo = async <X,>(p: Promise<X>): Promise<X> => {
  const empezo = Date.now()
  const r = await p
  const falta = esperaParaLevantar(empezo, Date.now(), tiempo.veloMinimo)
  if (falta) await new Promise((ok) => setTimeout(ok, falta))
  return r
}

function Flecha() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path d="M11 3.5 5.5 9l5.5 5.5" stroke={color.cuerpo} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Etiqueta({ children, suelta }: { children: ReactNode; suelta?: boolean }) {
  return (
    <Texto variante="etiqueta" tono="cuerpo" style={{ marginTop: suelta ? 26 : 0, marginBottom: 11 }}>
      {children}
    </Texto>
  )
}

function Pista({ children }: { children: ReactNode }) {
  return (
    <Texto variante="cuerpoChico" style={{ marginTop: 11 }}>
      {children}
    </Texto>
  )
}

export function Datos(p: {
  servicio: Servicio
  entrar: (correo: string, clave: string) => Promise<boolean>
  alVolver: () => void
  alCuestionario: () => void
  alCuenta: () => void
  alVerificar: () => void
  alEntrar: () => void
}) {
  const insets = useSafeAreaInsets()
  const { tapado, levantar } = useVelo()
  const [e, setE] = useState<Estado>(inicial)
  const poner = useCallback((x: Partial<Estado>) => setE((s) => ({ ...s, ...x })), [])
  const [lead, setLead] = useState<Lead | null>(null)
  const [generos, setGeneros] = useState<{ valor: string; label: string }[]>([])
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')
  const [yaRegistrado, setYaRegistrado] = useState(false)
  const [errorCuenta, setErrorCuenta] = useState('')
  const [cuando, setCuando] = useState<string | null>(null)
  const hoy = useMemo(() => new Date(), [])

  const cargar = useCallback(
    async (l: Lead | null, pedirCorreo: boolean) => {
      const r = await p.servicio.cargar(l)
      if (r.ok) setE((s) => desdeServidor(s, r.datos))
      // Sin sesión y sin lead: se pide el correo aquí, en vez de rebotar a
      // «Entrar» sin cuenta con la que entrar (la web lo aprendió así).
      else if (pedirCorreo) poner({ paso: PASO_CORREO })
    },
    [p.servicio, poner],
  )

  useEffect(() => {
    ;(async () => {
      const l = await leerLead()
      setLead(l)
      const [, cat, prox] = await Promise.all([cargar(l, true), p.servicio.catalogo(), p.servicio.proxima()])
      // El día de las frases sale de la fecha abierta, en la zona de su ciudad.
      if (prox.ok && prox.datos.hay) setCuando(cuandoSeRevela(prox.datos))
      // El género sale del catálogo, por código, como las preguntas.
      if (cat.ok) {
        const g = cat.datos.preguntas.find((x) => x.clave === 'genero')
        if (g) setGeneros(g.opciones.filter((o): o is { valor: string; label: string } => !!o.valor))
      }
      levantar()
    })()
  }, [cargar, levantar, p.servicio])

  const v = validar(e, hoy)
  const x = edad(e, hoy)

  const siguiente = async () => {
    if (!v.listo || guardando) return
    setFallo('')
    if (e.paso === PASO_CORREO) {
      setGuardando(true)
      const r = await conSuelo(p.servicio.dejarCorreo(e.correo))
      setGuardando(false)
      if (!r.ok) return setFallo(r.error)
      // Un correo que ya existe vuelve sin token, a propósito: se entra con
      // la cuenta, no se sobrescriben los datos de nadie.
      if (!r.datos.token) return setYaRegistrado(true)
      const l = { correo: e.correo.trim(), token: r.datos.token }
      await guardarLead(l)
      setLead(l)
      poner({ paso: 0 })
      return cargar(l, false)
    }
    if (e.paso === 3) {
      // Del último paso al resumen se pasa GUARDANDO: nada de «listo» sin haber guardado.
      setGuardando(true)
      const r = await conSuelo(p.servicio.guardar(lead, cuerpoGuardar(e)))
      setGuardando(false)
      if (!r.ok) return setFallo(r.error)
      await cargar(lead, false)
      return poner({ paso: PASO_FIN })
    }
    poner({ paso: Math.min(PASO_FIN, e.paso + 1) })
  }

  const clave = estadoClave(e)
  const crearCuenta = async () => {
    if (!clave.lista || !lead || guardando) return
    setGuardando(true)
    setErrorCuenta('')
    const r = await conSuelo(p.servicio.crearCuenta(lead, e.clave))
    if (!r.ok) {
      setGuardando(false)
      return setErrorCuenta(r.error)
    }
    if (r.datos.estado === 'ya_existe') {
      setGuardando(false)
      return p.alEntrar()
    }
    // La sesión del servidor va en su cookie; la del celular la abre el SDK.
    const dentro = await p.entrar(lead.correo, e.clave)
    await borrarLead()
    setGuardando(false)
    return dentro ? p.alVerificar() : p.alEntrar()
  }

  if (tapado) return <Velo />

  const conLead = !!lead
  const faltaCuenta = conLead && e.paso === PASO_FIN && e.puedeCuenta
  const paso = e.paso === PASO_CORREO ? null : e.paso < PASO_FIN ? T.pasos[e.paso] : null
  const eyebrow = e.paso === PASO_CORREO ? T.correo.eyebrow : paso ? paso.eyebrow : T.fin.eyebrow
  const titulo = e.paso === PASO_CORREO ? T.correo.titulo : paso ? paso.titulo : T.fin.titulo(conLead, e.puedeCuenta)
  const bajada = e.paso === PASO_CORREO ? T.correo.bajada : paso ? paso.bajada(conLead) : T.fin.bajada(conLead, e.puedeCuenta, cuando)
  const etiquetaPaso =
    e.paso === PASO_CORREO ? T.nav.etiquetaCorreo : e.paso < PASO_FIN ? T.nav.etiquetaPaso(e.paso + 1) : T.nav.etiquetaCompleto
  const textoBoton = guardando
    ? e.paso === PASO_CORREO
      ? T.nav.unMomento
      : T.nav.guardando
    : v.listo
      ? e.paso === 3
        ? T.nav.terminar
        : T.nav.continuar
      : v.falta || T.nav.faltaDato
  const generoTexto = generos.find((g) => g.valor === e.genero)?.label ?? null
  const aviso = e.paso === 1 ? avisoEdad(e, hoy) : null
  const errTel = e.paso === 3 ? errorTelefono(e) : null
  const prefijos = [...reglas.PREFIJOS, { codigo: '', pais: T.telefono.otroPais }]

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.crema }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}
      >
        <Pressable onPress={p.alVolver} accessibilityRole="button" accessibilityLabel={T.nav.volver} style={estilos.cabecera}>
          <Flecha />
          <Marca />
          <Texto variante="marca">Aro Club</Texto>
        </Pressable>

        <View style={estilos.progreso}>
          <Barras total={4} actual={e.paso === PASO_CORREO ? -1 : e.paso} />
          <Texto variante="etiqueta" tono="cuerpo">
            {etiquetaPaso}
          </Texto>
        </View>

        <Texto variante="etiqueta" tono="terracota" style={{ marginBottom: 13 }}>
          {eyebrow}
        </Texto>
        <Texto variante="display">{titulo}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {bajada}
        </Texto>

        {faltaCuenta ? (
          <Tarjeta style={{ marginTop: 30, gap: 11 }}>
            <Texto variante="etiquetaChica">{T.cuenta.titulo}</Texto>
            <Texto variante="cuerpoChico" style={{ marginBottom: 7 }}>
              {T.cuenta.cuerpo(cuando)}
            </Texto>
            <CampoClave
              value={e.clave}
              onChangeText={(clave) => poner({ clave })}
              placeholder={T.cuenta.clave}
              accessibilityLabel={T.cuenta.clave}
              textContentType="newPassword"
              autoComplete="new-password"
              visible={e.verClave}
              onAlternar={() => poner({ verClave: !e.verClave })}
              textos={T.cuenta}
            />
            <CampoClave
              value={e.clave2}
              onChangeText={(clave2) => poner({ clave2 })}
              placeholder={T.cuenta.repetir}
              accessibilityLabel={T.cuenta.repetirEtiqueta}
              textContentType="newPassword"
              autoComplete="new-password"
              visible={e.verClave}
              dispar={clave.dispares}
            />
            {clave.dispares ? (
              <Texto variante="cuerpoChico" tono="terracota" accessibilityRole="alert">
                {T.cuenta.dispares}
              </Texto>
            ) : null}
            <Boton texto={guardando ? T.cuenta.creando : clave.boton} ancho disabled={!clave.lista || guardando} onPress={crearCuenta} />
            <Texto variante="nota">{clave.pista}</Texto>
            {errorCuenta ? <Aviso>{errorCuenta}</Aviso> : null}
            {/* Google y Apple: cuando exista /api/auth/nativo (PROPUESTA §g). */}
            <Texto variante="nota" style={{ marginTop: 9 }}>
              {T.cuenta.legal.antes}
              <Texto variante="nota" tono="verde" style={estilos.enlace} onPress={() => openBrowserAsync(`${SITIO}/terminos`)}>
                {T.cuenta.legal.terminos}
              </Texto>
              {T.cuenta.legal.medio}
              <Texto variante="nota" tono="verde" style={estilos.enlace} onPress={() => openBrowserAsync(`${SITIO}/privacidad`)}>
                {T.cuenta.legal.privacidad}
              </Texto>
              {T.cuenta.legal.despues}
            </Texto>
          </Tarjeta>
        ) : null}

        <View style={{ marginTop: 30 }}>
          {e.paso === PASO_CORREO ? (
            <View>
              <Etiqueta>{T.correo.etiqueta}</Etiqueta>
              <Campo
                value={e.correo}
                onChangeText={(correo) => {
                  poner({ correo })
                  setYaRegistrado(false)
                }}
                placeholder={T.correo.ejemplo}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel={T.correo.etiqueta}
              />
              <Pista>{T.correo.pista(cuando)}</Pista>
              {yaRegistrado ? (
                <View style={{ marginTop: 16, gap: 12 }}>
                  <Aviso tono="neutro" titulo={R.titulo} />
                  <Boton tipo="secundario" texto={R.entrar} onPress={p.alEntrar} />
                </View>
              ) : null}
            </View>
          ) : null}

          {e.paso === 0 ? (
            <View>
              <Etiqueta>{T.nombre.etiqueta}</Etiqueta>
              <Campo value={e.nombre} onChangeText={(nombre) => poner({ nombre })} placeholder={T.nombre.ejemplo} autoComplete="name" textContentType="name" accessibilityLabel={T.nombre.etiqueta} />
              <Pista>{T.nombre.pista}</Pista>
              <Etiqueta suelta>{T.nombre.tratoEtiqueta}</Etiqueta>
              <Campo value={e.trato} onChangeText={(trato) => poner({ trato })} placeholder={tratoSugerido(e)} accessibilityLabel={T.nombre.tratoEtiqueta} />
              <Pista>{T.nombre.tratoPista}</Pista>
            </View>
          ) : null}

          {e.paso === 1 ? (
            <View>
              <Fecha
                dia={e.dia}
                mes={e.mes}
                anio={e.anio}
                meses={MESES_CORTOS}
                textos={T.nacimiento}
                onDia={(t) => poner({ dia: reglas.filtrar('dia', t) })}
                onMes={(mes) => poner({ mes })}
                onAnio={(t) => poner({ anio: reglas.filtrar('anio', t) })}
              />
              {x !== null && x >= 18 && x <= 99 ? (
                <View style={{ marginTop: 12 }}>
                  <Chip destacado texto={T.nacimiento.edad(x)} />
                </View>
              ) : null}
              <Pista>{T.nacimiento.pista}</Pista>
              {aviso ? (
                <View style={{ marginTop: 14 }}>
                  <Aviso>{aviso}</Aviso>
                </View>
              ) : null}
            </View>
          ) : null}

          {e.paso === 2 ? (
            <View>
              <View style={{ gap: 8 }}>
                {generos.map((g) => (
                  <Opcion key={g.valor} unica texto={g.label} marcada={e.genero === g.valor} onPress={() => poner({ genero: g.valor })} />
                ))}
              </View>
              <Pista>{T.genero.pista}</Pista>
            </View>
          ) : null}

          {e.paso === 3 ? (
            <View>
              <Etiqueta>{T.telefono.etiqueta}</Etiqueta>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <Selector
                  etiqueta={T.telefono.prefijo}
                  valor={e.prefijo}
                  opciones={prefijos.map((q) => ({ valor: q.codigo, texto: q.codigo ? `${q.codigo}  ${q.pais}` : q.pais }))}
                  corto={(c) => c || T.telefono.otroPais}
                  onCambio={(prefijo) => poner({ prefijo })}
                  ancho={112}
                />
                <View style={{ flex: 1 }}>
                  <Campo
                    value={e.telefono}
                    onChangeText={(t) => poner({ telefono: reglas.filtrar('telefonoPerfil', t) })}
                    placeholder={T.telefono.ejemplo(e.prefijo)}
                    keyboardType="phone-pad"
                    autoComplete="tel-national"
                    textContentType="telephoneNumber"
                    accessibilityLabel={T.telefono.etiqueta}
                  />
                </View>
              </View>
              {errTel ? (
                <Texto variante="cuerpoChico" tono="terracota" style={{ marginTop: 11 }}>
                  {errTel}
                </Texto>
              ) : null}
              <Pista>{T.telefono.pista}</Pista>
            </View>
          ) : null}

          {e.paso === PASO_FIN ? (
            <View>
              <Tarjeta>
                <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 12 }}>
                  {T.fin.guardamos}
                </Texto>
                {resumen(e, lead?.correo ?? e.correo, generoTexto, hoy).map((f) => (
                  <View key={f.campo} style={estilos.fila}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Texto variante="cuerpoChico">{f.campo}</Texto>
                      <Texto variante="rotulo">{f.valor}</Texto>
                      <Chip texto={f.visible} destacado={f.loVen} />
                    </View>
                    {f.editar !== null ? (
                      <Pressable
                        onPress={() => poner({ paso: f.editar! })}
                        accessibilityRole="button"
                        accessibilityLabel={T.fin.editarEtiqueta(f.campo)}
                        style={estilos.editar}
                      >
                        <Texto variante="cuerpoChico" tono="verde" style={estilos.enlace}>
                          {T.fin.editar}
                        </Texto>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Tarjeta>
              {!faltaCuenta ? (
                <View style={{ marginTop: 20 }}>
                  <Boton
                    texto={conLead ? T.fin.seguirPreguntas : T.fin.volverCuenta}
                    onPress={conLead ? p.alCuestionario : p.alCuenta}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {fallo ? (
            <View style={{ marginTop: 16 }}>
              <Aviso>{fallo}</Aviso>
            </View>
          ) : null}

          {e.paso < PASO_FIN ? (
            <View style={estilos.acciones}>
              <Boton texto={textoBoton} disabled={!v.listo || guardando} onPress={siguiente} />
              {e.paso > 0 ? <Boton tipo="fantasma" texto={T.nav.atras} onPress={() => poner({ paso: e.paso - 1 })} /> : null}
            </View>
          ) : null}

          {faltaCuenta ? (
            <View style={estilos.despues}>
              <Texto variante="etiquetaChica" style={{ marginBottom: 16 }}>
                {T.despues.titulo}
              </Texto>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={estilos.numero}>
                  <Texto variante="rotulo" tono="crema">
                    1
                  </Texto>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Texto variante="subtitulo">{T.despues.paso}</Texto>
                  <Texto variante="cuerpoChico">{T.despues.cuerpo}</Texto>
                  <View style={{ marginTop: 6 }}>
                    <Chip destacado texto={T.despues.plazo} />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 620, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: medida.toqueMinimo, alignSelf: 'flex-start', marginBottom: 22 },
  progreso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 26 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 13, marginTop: 30 },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderColor: tinta(0.12) },
  editar: { minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 10, marginTop: -10, marginRight: -10 },
  enlace: { textDecorationLine: 'underline' },
  despues: { borderWidth: 1, borderColor: tinta(0.16), borderRadius: 26, padding: 20, marginTop: 14 },
  numero: { width: 34, height: 34, borderRadius: radio.capsula, backgroundColor: color.verde, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
})

