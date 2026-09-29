import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import {
  Aviso,
  Barras,
  Boton,
  Campo,
  Chip,
  Fecha,
  Marca,
  Opcion,
  Texto,
  Velo,
  color,
  medida,
  radio,
  terracotaAlfa,
  tinta,
  useVelo,
} from '../diseno'
import { reglas } from '../reglas'
import { leerLead, type Lead } from '../sesion/lead'
import * as T from '../texto/cuestionario'
import { nacimiento as TN } from '../texto/datos'
import { MESES_CORTOS } from '../texto/fechas'
import {
  TOTAL_PANTALLAS,
  aReenviar,
  alternar,
  armar,
  contestada,
  desdeServidor,
  elegir,
  enTope,
  faltantes,
  inicial,
  nombresDe,
  obligatorias,
  ponerFecha,
  textoContinuar,
  textoEdad,
  todasMarcadas,
  valorDe,
  vecina,
  visibles,
  type Estado,
  type Pregunta,
} from './maquina'
import type { crearServicioCuestionario } from './servicio'

type Servicio = ReturnType<typeof crearServicioCuestionario>

function Flecha({ c = color.cuerpo }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path d="M11 3.5 5.5 9l5.5 5.5" stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Visto() {
  return (
    <Svg width={27} height={27} viewBox="0 0 40 40" fill="none">
      <Path d="M12 20.5l5 5L28 14.8" stroke={color.terracota} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Cuestionario(p: {
  servicio: Servicio
  tieneCuenta: boolean
  alVolver: () => void
  alDatos: () => void
  alEntrar: () => void
  alCuenta: () => void
}) {
  const insets = useSafeAreaInsets()
  const { tapado, levantar } = useVelo()
  const [e, setEstado] = useState<Estado>(inicial)
  /**
   * El estado MÁS RECIENTE, no el del último pintado. Cada respuesta se
   * calcula sobre él: calcularla sobre el del pintado hacía que dos toques
   * seguidos, antes de repintar, se pisaran —la segunda borraba la primera—.
   * Lo cazó la prueba en el navegador.
   */
  const actual = useRef<Estado>(inicial())
  const setE = useCallback((f: Estado | ((s: Estado) => Estado)) => {
    actual.current = typeof f === 'function' ? f(actual.current) : f
    setEstado(actual.current)
  }, [])
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [fallo, setFallo] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cerrada, setCerrada] = useState(false)
  const scroll = useRef<ScrollView>(null)
  const posiciones = useRef<Record<string, number>>({})
  const tEmpleador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = useCallback(async () => {
    setErrorCarga('')
    const l = await leerLead()
    setLead(l)
    const [cat, zonas, guardado] = await Promise.all([p.servicio.catalogo(), p.servicio.zonas(), p.servicio.cargar(l)])
    const P = cat.ok ? armar(cat.datos.preguntas, zonas.ok ? zonas.datos.zonas : null) : null
    setPreguntas(P)
    if (!P) setErrorCarga(cat.ok ? T.sinRespuesta.cargar : cat.error)
    else if (guardado.ok) setE((s) => desdeServidor(s, guardado.datos, P))
    // 401 y 403 son «no sabemos quién eres», y solo eso. Cualquier otro fallo
    // —un 500, la red— NO: mandaría a identificarse a quien ya lo está.
    else if (guardado.status === 401 || guardado.status === 403) setE((s) => ({ ...s, sinSesion: true }))
    else setErrorCarga(guardado.error)
    levantar()
  }, [levantar, p.servicio])

  useEffect(() => {
    cargar()
    return () => {
      if (tEmpleador.current) clearTimeout(tEmpleador.current)
    }
  }, [cargar])

  /** Guarda UNA respuesta, y mira si se guardó: 403 es la sesión muerta y tiene su pantalla. */
  const enviar = useCallback(
    async (clave: string, valor: unknown, pantalla: number) => {
      setGuardando(true)
      setFallo('')
      const r = await p.servicio.enviar(lead, clave, valor, pantalla)
      setGuardando(false)
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) setE((s) => ({ ...s, sinSesion: true }))
        else setFallo(r.error)
        return null
      }
      setE((s) => ({ ...s, algoGuardado: true, faltan: r.datos.faltan ?? s.faltan }))
      return r.datos
    },
    [lead, p.servicio],
  )

  if (tapado) return <Velo />

  if (!preguntas) {
    return (
      <View style={[estilos.centro, { paddingTop: insets.top }]}>
        <Aviso>{errorCarga || T.sinRespuesta.cargar}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={cargar} />
      </View>
    )
  }

  const hoy = new Date()
  const pantalla = T.pantallas[e.pantalla]
  const lista = visibles(e, preguntas)
  const ocultas = preguntas.filter((q) => q.pantalla === e.pantalla).length - lista.length
  const f = faltantes(e, preguntas, hoy)
  const completa = f.length === 0
  // La última con algo que preguntar: las que vinieron contestadas enteras no cuentan.
  const ultima = vecina(e, preguntas, 1) === null

  const marcar = (q: Pregunta, valor: string | null) => {
    const antes = actual.current
    const unica = q.tipo === 'unica' || q.tipo === 'ficha'
    const nuevo = unica ? elegir(antes, q, valor!) : alternar(antes, q, valor)
    if (nuevo === antes) return
    setE(nuevo)
    enviar(q.clave, valorDe(nuevo, q), nuevo.pantalla)
  }

  const fecha = (parte: Partial<Pick<Estado, 'dia' | 'mes' | 'anio'>>) => {
    const r = ponerFecha(actual.current, parte, hoy)
    setE(r.e)
    if (r.guardar) enviar('nacimiento', r.guardar, r.e.pantalla)
  }

  const escribirEmpleador = (v: string) => {
    setE((s) => ({ ...s, empleador: v }))
    // Texto libre: se espera a que deje de teclear.
    if (tEmpleador.current) clearTimeout(tEmpleador.current)
    tEmpleador.current = setTimeout(() => enviar('empleador', v, actual.current.pantalla), 600)
  }

  const continuar = async () => {
    if (!completa) {
      // Si falta algo, se MARCA y se lleva hasta ello. Un botón que no hace
      // nada en una pantalla que parece terminada se lee como que está roto.
      setE((s) => ({ ...s, senalar: true }))
      const y = posiciones.current[f[0].clave]
      if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 90), animated: false })
      return
    }
    // Se reenvía lo que hay en la pantalla, no solo lo tocado (idiomas premarcado).
    const ahora = actual.current
    for (const q of aReenviar(ahora, preguntas)) await enviar(q.clave, valorDe(ahora, q), ahora.pantalla)
    scroll.current?.scrollTo({ y: 0, animated: false })
    if (!ultima) return setE((s) => ({ ...s, pantalla: vecina(s, preguntas, 1) ?? s.pantalla, retomada: false, senalar: false }))
    // En la última NO se declara el fin por pulsar: se cree lo que diga el
    // servidor sobre lo que falta.
    if (tEmpleador.current) clearTimeout(tEmpleador.current)
    const r = await enviar('empleador', actual.current.empleador, actual.current.pantalla)
    if (!r) return
    if (r.faltan?.length) return setFallo(T.sinRespuesta.faltanTodavia(nombresDe(r.faltan)))
    setE((s) => ({ ...s, fin: true }))
  }

  const cabecera = (
    <View style={estilos.cabecera}>
      <Pressable onPress={p.alVolver} accessibilityRole="button" accessibilityLabel="Volver" style={estilos.logo}>
        <Marca />
        <Texto variante="marca">Aro Club</Texto>
      </Pressable>
      {!e.sinSesion ? (
        <View style={estilos.progreso}>
          <Barras total={TOTAL_PANTALLAS} actual={e.fin ? TOTAL_PANTALLAS : e.pantalla} />
          <Texto variante="etiqueta" tono="cuerpo">
            {e.fin ? T.completo : T.progreso(e.pantalla, TOTAL_PANTALLAS)}
          </Texto>
        </View>
      ) : null}
    </View>
  )

  // --- Sin identidad: no se deja empezar para tirar lo contestado. ---
  if (e.sinSesion) {
    return (
      <ScrollView style={{ backgroundColor: color.crema }} contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8 }]}>
        {cabecera}
        <Texto variante="display">{T.sinSesion.titulo(e.algoGuardado)}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.sinSesion.cuerpo(e.algoGuardado)}
        </Texto>
        <View style={estilos.acciones}>
          <Boton texto={T.sinSesion.entrar} onPress={p.alEntrar} />
          {!e.algoGuardado ? <Boton tipo="secundario" texto={T.sinSesion.nueva} onPress={p.alDatos} /> : null}
        </View>
      </ScrollView>
    )
  }

  // --- El cierre: cuando el servidor dice que está completo. ---
  if (e.fin) {
    return (
      <ScrollView style={{ backgroundColor: color.crema }} contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8 }]}>
        {cabecera}
        <View style={estilos.visto}>
          <Visto />
        </View>
        <Texto variante="display">{T.cierre.titulo}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.cierre.cuerpo(obligatorias(preguntas))}
        </Texto>
        <View style={estilos.tarjetaFalta}>
          <Texto variante="etiquetaChica" style={{ marginBottom: 6 }}>
            {T.cierre.falta}
          </Texto>
          <Texto variante="cuerpo" tono="tinta" style={{ marginBottom: 16 }}>
            {T.cierre.textoFalta(e.donde)}
          </Texto>
          <Boton texto={T.cierre.continuar} onPress={p.alDatos} />
        </View>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.crema }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: 24 }]}
      >
        {cabecera}

        {e.retomada && e.pantalla > 0 && !cerrada ? (
          <View style={estilos.retomada}>
            <View style={{ flex: 1 }}>
              <Aviso tono="info">{T.retomada(e.pantalla)}</Aviso>
            </View>
            <Pressable onPress={() => setCerrada(true)} accessibilityRole="button" accessibilityLabel={T.cerrar} style={estilos.cerrar}>
              <Svg width={14} height={14} viewBox="0 0 14 14">
                <Path d="M3 3l8 8M11 3l-8 8" stroke={color.cuerpo} strokeWidth={1.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        ) : null}

        <Texto variante="display">{pantalla.titulo}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 12 }}>
          {pantalla.proposito}
        </Texto>
        {ocultas > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Aviso tono="neutro">{T.heredadas(ocultas)}</Aviso>
          </View>
        ) : null}

        <View style={{ gap: 34, marginTop: 30 }}>
          {lista.map((q) => {
            const marcada = e.senalar && !contestada(e, q, hoy)
            const sel = e.r[q.clave]
            const n = Array.isArray(sel) ? sel.length : 0
            return (
              <View
                key={q.clave}
                onLayout={(ev) => (posiciones.current[q.clave] = ev.nativeEvent.layout.y)}
                style={[estilos.pregunta, marcada ? estilos.preguntaMarcada : null]}
              >
                <View style={estilos.cabeceraPregunta}>
                  <Texto variante="pregunta" style={{ flex: 1 }}>
                    {q.enunciado}
                  </Texto>
                  {marcada ? (
                    <View style={estilos.selloFalta}>
                      <Texto variante="etiquetaChica" tono="terracota">
                        {T.selloFalta}
                      </Texto>
                    </View>
                  ) : null}
                  {!q.obligatoria ? <Chip texto={T.opcional} /> : null}
                </View>
                {q.ayuda ? (
                  <Texto variante="cuerpoChico" style={{ marginTop: 8 }}>
                    {q.ayuda}
                  </Texto>
                ) : null}
                {q.tipo === 'multi' && q.max ? (
                  <View style={{ marginTop: 9 }}>
                    <Chip texto={T.contador(n, q.min, q.max)} destacado={n >= (q.min ?? 0)} />
                  </View>
                ) : null}

                <View style={{ marginTop: 16 }}>
                  {q.tipo === 'fecha' ? (
                    <View>
                      <Fecha
                        dia={e.dia}
                        mes={e.mes}
                        anio={e.anio}
                        meses={MESES_CORTOS}
                        textos={TN}
                        onDia={(t) => fecha({ dia: reglas.filtrar('dia', t) })}
                        onMes={(mes) => fecha({ mes })}
                        onAnio={(t) => fecha({ anio: reglas.filtrar('anio', t) })}
                      />
                      {textoEdad(e, hoy) ? (
                        <View style={{ marginTop: 12 }}>
                          <Chip texto={textoEdad(e, hoy)!} destacado />
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {q.tipo === 'texto' ? (
                    <View>
                      <Campo value={e.empleador} onChangeText={escribirEmpleador} placeholder={T.empleadorEjemplo} accessibilityLabel={q.enunciado} />
                      {(() => {
                        const t = e.empleador.trim().toLowerCase()
                        const sug = t.length >= 2 ? q.sugerencias.filter((s) => s.toLowerCase().includes(t)).slice(0, 4) : []
                        if (!sug.length || sug.includes(e.empleador)) return null
                        return (
                          <View style={estilos.envolver}>
                            {sug.map((s) => (
                              <Opcion key={s} texto={s} marcada={false} onPress={() => escribirEmpleador(s)} />
                            ))}
                          </View>
                        )
                      })()}
                    </View>
                  ) : null}

                  {q.tipo === 'unica' ? (
                    <View style={{ gap: 9 }}>
                      {q.opciones.map((o) => (
                        <Opcion key={o.valor} unica texto={o.label} marcada={sel === o.valor} onPress={() => marcar(q, o.valor)} />
                      ))}
                    </View>
                  ) : null}

                  {q.tipo === 'ficha' || q.tipo === 'multi' ? (
                    <View style={estilos.envolver}>
                      {q.opciones.map((o) => (
                        <Opcion
                          key={o.valor}
                          texto={o.label}
                          marcada={q.tipo === 'ficha' ? sel === o.valor : Array.isArray(sel) && sel.includes(o.valor)}
                          enTope={q.tipo === 'multi' && enTope(e, q, o.valor)}
                          onPress={() => marcar(q, o.valor)}
                        />
                      ))}
                      {q.todas ? (
                        <Opcion texto={T.todasLasZonas} marcada={todasMarcadas(e, q)} onPress={() => marcar(q, null)} />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })}
        </View>

        {fallo ? (
          <View style={{ marginTop: 20 }}>
            <Aviso>{fallo}</Aviso>
          </View>
        ) : null}
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: insets.bottom + 12 }]}>
        <View style={estilos.botones}>
          {vecina(e, preguntas, -1) !== null ? (
            <Pressable
              onPress={() => {
                scroll.current?.scrollTo({ y: 0, animated: false })
                setE((s) => ({ ...s, pantalla: vecina(s, preguntas, -1) ?? s.pantalla, retomada: false, senalar: false }))
              }}
              accessibilityRole="button"
              accessibilityLabel={T.boton.atras}
              style={estilos.atras}
            >
              <Flecha c={color.verdeProfundo} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Boton texto={textoContinuar(e, preguntas, hoy)} ancho onPress={continuar} apagado={!completa} disabled={guardando && completa} />
          </View>
        </View>
        <View style={estilos.lineaPie}>
          <Texto variante="nota" style={{ flex: 1 }}>
            {completa ? T.pie.guardado : ''}
          </Texto>
          {p.tieneCuenta ? (
            <Pressable onPress={p.alCuenta} accessibilityRole="button" style={{ minHeight: medida.toqueMinimo, justifyContent: 'center' }}>
              <Texto variante="nota" tono="verde" style={{ textDecorationLine: 'underline' }}>
                {T.pie.despues}
              </Texto>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 680, width: '100%', alignSelf: 'center' },
  centro: { flex: 1, backgroundColor: color.crema, padding: 24, justifyContent: 'center', gap: 16 },
  cabecera: { gap: 16, marginBottom: 26 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: medida.toqueMinimo, alignSelf: 'flex-start' },
  progreso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  retomada: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  cerrar: { width: medida.toqueMinimo, height: medida.toqueMinimo, alignItems: 'center', justifyContent: 'center' },
  pregunta: { borderLeftWidth: 3, borderColor: 'transparent', paddingLeft: 12, marginLeft: -15 },
  preguntaMarcada: { borderColor: color.terracotaRelleno },
  cabeceraPregunta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  selloFalta: {
    borderWidth: 1,
    borderColor: terracotaAlfa(0.45),
    borderRadius: radio.capsula,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 13, marginTop: 30 },
  visto: {
    width: 56,
    height: 56,
    borderRadius: radio.capsula,
    backgroundColor: color.cremaElevada,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  tarjetaFalta: { backgroundColor: color.cremaElevada, borderRadius: radio.tarjeta, padding: 20, marginTop: 28 },
  pie: {
    borderTopWidth: 1,
    borderColor: tinta(0.1),
    backgroundColor: color.crema,
    paddingTop: 12,
    paddingHorizontal: medida.margenLateral,
    gap: 6,
  },
  botones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  atras: {
    width: 52,
    height: 52,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: tinta(0.22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineaPie: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
