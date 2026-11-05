import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Aviso, Boton, Entra, Esqueleto, Hueso, HuesoForma, IconoAtras, IconoCheck, SinRespuesta, Tarda, Texto, color, fuente, medida, useTarda, useUmbral, verdeAlfa } from '../diseno'
import { CampoReporte } from '../pago/Pago'
import * as P from '../pago/maquina'
import { reglas } from '../reglas'
import * as T from '../texto/reembolso'
import * as M from './maquina'
import type { crearServicioReembolso } from './servicio'

type Servicio = ReturnType<typeof crearServicioReembolso>

/**
 * Pedir el reembolso de un crédito por lista de espera (21-10). El monto se
 * fija al pedirlo, a la tasa de ese día, y se le enseña antes de enviar.
 * Si la tasa cambia entre que se pinta y se pulsa, el servidor lo dice
 * (`tasa-cambio`) y se enseña el monto nuevo para que confirme otra vez.
 */
export function Reembolso(p: { servicio: Servicio; alVolver: () => void; alEntrar: () => void }) {
  const insets = useSafeAreaInsets()
  const [r, setR] = useState<M.Reembolso | null>(null)
  /** No llegó: por la red, o el servidor contestó con error («es cosa nuestra»). */
  const [caida, setCaida] = useState<{ servidor: boolean } | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const [rep, setRep] = useState<Record<string, string>>(P.repInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [telefono, setTelefono] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const x = await p.servicio.leer()
    if (x.ok) {
      setR(x.datos.reembolso ?? { puede: false, estado: null })
      setCaida(null)
    } else if (x.status === 401) p.alEntrar()
    else setCaida({ servidor: x.status !== undefined })
  }, [p])
  useEffect(() => {
    cargar()
  }, [cargar])

  const pedir = async () => {
    if (!r || enviando || !M.listo(rep)) return
    setEnviando(true)
    setError('')
    const cuerpo = M.cuerpo(rep, r.tasa)
    const x = await p.servicio.pedir(cuerpo)
    setEnviando(false)
    if (x.ok) {
      setTelefono(cuerpo.telefono)
      return setR({ ...r, estado: 'pendiente', montoBs: x.datos.montoBs, tasa: x.datos.tasa })
    }
    // La tasa cambió: se enseña el monto nuevo y se pide confirmar otra vez, nunca se reintenta solo.
    if (x.motivo === 'tasa-cambio') setR({ ...r, tasa: x.tasa ?? r.tasa, montoBs: x.montoBs ?? r.montoBs })
    if (x.motivo === 'ya-pedido') return cargar()
    setError(x.error)
  }

  const reintentar = async () => {
    setReintentando(true)
    await cargar()
    setReintentando(false)
  }
  // Entrega carga (03-11): nada los primeros 0,4 s; luego el esqueleto, y a los 8 s «Está tardando…».
  const esperando = !r && !caida
  const esqueleto = useUmbral(esperando)
  const tarda = useTarda(esperando)

  const f = M.fase(r)
  let cuerpo
  if (!r || esqueleto) {
    cuerpo =
      caida && !esqueleto ? (
        <SinRespuesta que={T.que} servidor={caida.servidor} alReintentar={reintentar} reintentando={reintentando} />
      ) : esqueleto ? (
        <EsqueletoReembolso tarda={tarda ? <Tarda alReintentar={reintentar} /> : null} />
      ) : null
  } else if (f === 'pendiente' || f === 'hecho') {
    const pendiente = f === 'pendiente'
    cuerpo = (
      <View style={e.acuse} accessibilityLiveRegion="polite">
        <View style={e.icono}>
          <IconoCheck tam={13} color={color.crema} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="rotulo">{pendiente ? T.acuse.titulo : T.hecho.titulo}</Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 3 }}>
            {pendiente ? T.acuse.cuerpo(M.bs(r.montoBs), telefono) : T.hecho.cuerpo(M.bs(r.montoBs), r.referencia ?? null)}
          </Texto>
        </View>
      </View>
    )
  } else if (f === 'pedir') {
    const dia = r.hasta ? reglas.partesDe(r.hasta) : null
    cuerpo = (
      <Entra>
        <Texto variante="titularGrande" accessibilityRole="header">
          {T.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 12 }}>
          {T.bajada(r.precio ?? 0)}
        </Texto>
        <View style={{ gap: 16, marginTop: 24 }}>
          {M.CAMPOS.map((c) => (
            <CampoReporte key={c.campo} c={c} rep={rep} poner={(k, v) => setRep((x) => ({ ...x, [k]: v }))} />
          ))}
        </View>
        <Texto variante="cuerpo" style={{ marginTop: 22 }}>
          {T.monto.antes}
          <Texto variante="cuerpo" style={{ fontFamily: fuente.textoSemi, color: color.verdeProfundo }}>
            {M.bs(r.montoBs)} Bs
          </Texto>
          {T.monto.despues(r.precio ?? 0, M.bs(r.tasa))}
        </Texto>
        <Texto variante="cuerpoChico" tono="terracota" style={{ marginTop: 12 }}>
          {T.aviso}
        </Texto>
        {error ? (
          <View style={{ marginTop: 14 }}>
            <Aviso tono="ojo">{error}</Aviso>
          </View>
        ) : null}
        <View style={{ marginTop: 20 }}>
          <Boton ancho texto={T.boton} onPress={pedir} trabajando={enviando && reglas.CARGA.texto.trabajando.reembolso} apagado={!M.listo(rep)} />
        </View>
        {dia ? (
          <Texto variante="nota" style={{ marginTop: 12 }}>
            {T.hasta(`${dia.dia} ${dia.numero}`)}
          </Texto>
        ) : null}
      </Entra>
    )
  } else {
    cuerpo = <Aviso tono="ojo">{T.noPudimos}</Aviso>
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.crema }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[e.pagina, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
        <Pressable onPress={p.alVolver} accessibilityRole="button" accessibilityLabel={T.volver} hitSlop={8} style={e.atras}>
          <IconoAtras tam={20} color={color.verdeProfundo} />
        </Pressable>
        {cuerpo}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/**
 * El esqueleto del reembolso (entrega carga, 03-11), con los contenedores de
 * «pedir», que es lo que se abre casi siempre. Real: el titular, el aviso y
 * el botón, apagado. Hueso: la bajada con el precio, los tres campos y el
 * monto a la tasa del día.
 */
function EsqueletoReembolso({ tarda }: { tarda?: ReactNode }) {
  return (
    <Esqueleto etiqueta={T.cargando}>
      {tarda}
      <Texto variante="titularGrande" accessibilityRole="header">
        {T.titulo}
      </Texto>
      <Hueso variante="cuerpoGrande" lineas={2} ultima="45%" estilo={{ marginTop: 12 }} />
      <View style={{ gap: 16, marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ gap: 8 }}>
            <Hueso variante="etiqueta" ancho={80} />
            <HuesoForma alto={medida.opcion} curva={16} />
          </View>
        ))}
      </View>
      <Hueso variante="cuerpo" lineas={2} ultima="55%" estilo={{ marginTop: 22 }} />
      <Texto variante="cuerpoChico" tono="terracota" style={{ marginTop: 12 }}>
        {T.aviso}
      </Texto>
      <View style={{ marginTop: 20 }}>
        <Boton ancho texto={T.boton} apagado disabled />
      </View>
    </Esqueleto>
  )
}

const e = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  atras: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginBottom: 16 },
  acuse: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 26, backgroundColor: verdeAlfa(0.1), padding: 18 },
  icono: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.verde, marginTop: 1 },
})
