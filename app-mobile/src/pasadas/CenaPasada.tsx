import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import * as CM from '../contacto/maquina'
import { Inicial, PanelContacto } from '../contacto/Panel'
import { Aviso, Boton, Entra, Esqueleto, HuesoForma, IconoAbrir, IconoAtras, IconoCheck, Opcion, SinRespuesta, Tarda, Texto, color, fuente, medida, tinta, useTarda, useUmbral } from '../diseno'
import * as TM from '../texto/mesa'
import * as MM from '../mesa/maquina'
import { Pasada } from '../mesa/MiMesa'
import type { crearServicioMesa } from '../mesa/servicio'
import * as F from '../texto/fechas'
import { reglas } from '../reglas'
import * as M from './maquina'
import type { crearServicioPasadas } from './servicio'

const T = reglas.CONTACTO.cena

type ServicioPasadas = ReturnType<typeof crearServicioPasadas>
type ServicioMesa = ReturnType<typeof crearServicioMesa>

const FONDOS = ['#DCE6DD', '#F6D9B4', '#C5D8CA', '#ECE3CF', '#F2D5C4']

/**
 * Una cena pasada (entrega mi-mesa-pasadas, 3): la cabecera, «Seguir en
 * contacto» si hubo coincidencia, con quién cenaste, y la encuesta o «ya
 * contaste». Se abre desde Pasadas, desde la línea de Próxima o desde Mis
 * cenas; y Próxima la usa sin reserva activa, con la cena pendiente (P3).
 *
 * Lo de la mesa viene de /api/mi-mesa (con `?mesa=` si no es la de Próxima),
 * para reusar la encuesta, bloquear y reportar tal cual. Al abrirla se manda
 * `visto`: el punto de esa cena se apaga.
 */
export function CenaPasada(p: {
  mesaId: string
  /** Ya cargada (Próxima, fase pasada): no se vuelve a pedir. */
  mesa?: MM.DeServidor | null
  /** Próxima sin reserva (P3): sin «‹ Pasadas», la encuesta con su día, y «Ver la agenda» al final. */
  enProxima?: boolean
  pasadas: ServicioPasadas
  servicioMesa: ServicioMesa
  ir: (destino: string) => void
  alVolver?: () => void
  /** Contó la encuesta antes de que existiera «¿seguir en contacto?» (31-10): se le pregunta aquí. */
  preguntarContacto?: boolean
  /** Cuándo contestó la encuesta (de /api/pasadas), para «El viernes 30. Gracias.». */
  contadaEn?: string | null
  /** Algo cambió (se confirmó, se marcó visto): quien la abrió relee la lista y el punto. */
  alCambiar?: () => void
}) {
  const [mesa, setMesa] = useState<MM.DeServidor | null>(p.mesa ?? null)
  const [contacto, setContacto] = useState<CM.DeContacto | null>(null)
  /** No llegó la cena: por la red, o porque el servidor contestó con error. */
  const [caida, setCaida] = useState<{ servidor: boolean } | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const [encuestaAbierta, setEncuestaAbierta] = useState(false)
  const { pasadas, mesaId } = p
  const alCambiar = p.alCambiar

  const cargar = useCallback(async () => {
    const [m, c] = await Promise.all([p.mesa ? Promise.resolve(null) : pasadas.cena(mesaId), pasadas.contacto(mesaId)])
    if (m) {
      if (!m.ok) return setCaida({ servidor: m.status !== undefined })
      setCaida(null)
      setMesa(m.datos)
    }
    // Sin contacto (404 o fallo) no se pinta nada de contacto: no es un error de la cena.
    if (c.ok) {
      setContacto(c.datos)
      if (c.datos.personas.some((x) => x.nuevo)) {
        pasadas.accion(mesaId, { accion: 'visto' }).then(() => alCambiar?.()).catch(() => undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasadas, mesaId, p.mesa, alCambiar])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (p.mesa) setMesa(p.mesa)
  }, [p.mesa])

  // Entrega carga (03-11): nada los primeros 0,4 s, luego el esqueleto de la cena, y a los 8 s «Está tardando…».
  const esperando = !mesa && !caida
  const esqueleto = useUmbral(esperando)
  const tarda = useTarda(esperando)
  const reintentar = async () => {
    setReintentando(true)
    await cargar()
    setReintentando(false)
  }

  if (!mesa || esqueleto) {
    if (caida && !esqueleto)
      return (
        <View style={{ paddingTop: 12 }}>
          <SinRespuesta que={TM.sinRespuesta.pasadas.que} servidor={caida.servidor} alReintentar={reintentar} reintentando={reintentando} boton={reglas.CARGA.texto.volverAIntentar} />
        </View>
      )
    if (!esqueleto) return null
    // Real: «‹ Pasadas» y el marco de la cabecera. Hueso: lo que dice la cabecera y el bloque de debajo.
    return (
      <Esqueleto etiqueta={TM.sinRespuesta.pasadas.cargando} estilo={{ gap: 14 }}>
        {tarda ? <Tarda alReintentar={reintentar} /> : null}
        {p.alVolver ? (
          <Pressable onPress={p.alVolver} accessibilityRole="link" style={e.volver}>
            <IconoAtras tam={18} color={color.verdeProfundo} />
            <Texto style={[e.semi, { fontSize: 15 }]}>{T.pestanas.pasadas}</Texto>
          </Pressable>
        ) : null}
        <View style={p.enProxima ? e.cabeceraClara : e.cabecera}>
          <HuesoForma alto={8} ancho={96} sobreVerde={!p.enProxima} estilo={{ marginVertical: 3 }} />
          <HuesoForma alto={22} ancho="70%" sobreVerde={!p.enProxima} estilo={{ marginVertical: 9 }} />
          <HuesoForma alto={10} ancho="50%" sobreVerde={!p.enProxima} estilo={{ marginVertical: 4 }} />
        </View>
        <View style={e.panel}>
          <HuesoForma alto={17} ancho="56%" estilo={{ marginVertical: 6 }} />
          <HuesoForma alto={11} ancho="100%" estilo={{ marginVertical: 6.5 }} />
          <HuesoForma alto={11} ancho="64%" estilo={{ marginVertical: 6.5 }} />
        </View>
      </Esqueleto>
    )
  }

  const cab = M.cabeceraDe({
    empiezaEn: mesa.empiezaEn ?? null,
    zonaHoraria: mesa.zonaHoraria ?? null,
    formato: mesa.formato ?? null,
    sitio: mesa.restaurante ?? null,
    zona: mesa.zonas?.[0] ?? null,
    numeroMesa: MM.conNumero(mesa) ? (mesa.numeroMesa ?? null) : null,
  })
  const contado = MM.yaHecho(mesa).contado
  const otros = MM.otros(mesa)
  const dia = F.diaMinusculaYNumero(mesa.empiezaEn, mesa.zonaHoraria)
  const conCoincidencia = !!contacto?.personas.length

  return (
    <Entra sinFundido={!!p.mesa} estilo={{ gap: 14 }}>
      {p.alVolver ? (
        <Pressable onPress={p.alVolver} accessibilityRole="link" style={e.volver}>
          <IconoAtras tam={18} color={color.verdeProfundo} />
          <Texto style={[e.semi, { fontSize: 15 }]}>{T.pestanas.pasadas}</Texto>
        </Pressable>
      ) : null}

      <View style={p.enProxima ? e.cabeceraClara : e.cabecera}>
        <Texto style={[e.etiqueta, { color: p.enProxima ? color.terracota : color.terracotaSobreVerde }]}>{cab.sello}</Texto>
        <Texto style={{ fontFamily: fuente.titular, fontSize: 28, lineHeight: 40, color: p.enProxima ? color.verdeProfundo : color.crema }}>{cab.sitio}</Texto>
        <Texto style={{ fontSize: 13.5, lineHeight: 18, color: p.enProxima ? color.cuerpo : color.cuerpoSobreVerde }}>{cab.sub}</Texto>
      </View>

      {conCoincidencia && contacto ? (
        <View style={{ gap: 8 }}>
          <Texto style={[e.etiqueta, { color: color.secundario, paddingHorizontal: 4 }]}>{T.seguir}</Texto>
          <View style={e.panel}>
            <PanelContacto
              d={contacto}
              ahora={Date.now()}
              ir={p.ir}
              alAccion={async (a) => {
                const r = await pasadas.accion(mesaId, a)
                if (!r.ok) return { ok: false, error: r.error, campo: r.campo }
                setContacto(r.datos)
                alCambiar?.()
                return { ok: true }
              }}
            />
          </View>
        </View>
      ) : null}

      {p.preguntarContacto && !conCoincidencia && otros.length ? (
        <PreguntaContacto
          titulo={T.preguntaAnterior.titulo(MM.esMesa(mesa))}
          otros={otros}
          alGuardar={async (ids) => {
            const r = await p.servicioMesa.contacto(mesaId, ids)
            if (r.ok) alCambiar?.()
            return r.ok ? null : r.error
          }}
        />
      ) : null}

      {/* P3: en Próxima sin reserva, la encuesta va antes de con quién (como hoy). */}
      {p.enProxima && !contado ? <Encuesta titulo={dia ? T.encuestaProxima.titulo(dia.dia) : T.encuesta.titulo} bajada={T.encuestaProxima.bajada} abierta={encuestaAbierta} alAbrir={() => setEncuestaAbierta(true)} /> : null}

      {otros.length ? (
        <View style={{ gap: 8 }}>
          <Texto style={[e.etiqueta, { color: color.secundario, paddingHorizontal: 4 }]}>{T.conQuien}</Texto>
          <View style={e.lista}>
            {otros.map((o, i) => (
              <View key={o.id} style={[e.fila, i ? { borderTopWidth: 1, borderTopColor: tinta(0.08) } : null]}>
                <Inicial letra={o.inicial} fondo={FONDOS[i % FONDOS.length]} tam={30} />
                <Texto style={{ flex: 1, fontFamily: fuente.textoMedia, fontSize: 16, lineHeight: 20, color: color.verdeProfundo }}>{o.nombre}</Texto>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!p.enProxima && !contado ? <Encuesta titulo={T.encuesta.titulo} bajada={T.encuesta.bajada} abierta={encuestaAbierta} alAbrir={() => setEncuestaAbierta(true)} /> : null}

      {contado && !encuestaAbierta ? (
        <Pressable onPress={() => setEncuestaAbierta(true)} accessibilityRole="button" style={e.yaConto}>
          <IconoCheck tam={18} color={color.verdeProfundo} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto style={[e.semi, { fontSize: 14.5, lineHeight: 19 }]}>{T.contada.titulo}</Texto>
            <Texto style={{ fontSize: 13, lineHeight: 17, color: color.cuerpo }}>{T.contada.cuando(p.contadaEn, mesa.zonaHoraria)}</Texto>
          </View>
          <Texto style={[e.semi, { fontSize: 14.5 }]}>{T.contada.ver}</Texto>
        </Pressable>
      ) : null}

      {/* La encuesta de siempre, con bloquear y reportar: se abre al tocar «Contar cómo estuvo» o «Ver». */}
      {encuestaAbierta ? (
        <View style={{ marginTop: 4 }}>
          <Pasada d={mesa} servicio={p.servicioMesa} ir={p.ir} sinCabecera />
        </View>
      ) : null}

      {p.enProxima ? (
        <Pressable onPress={() => p.ir('/cuenta#agenda')} accessibilityRole="link" style={e.agenda}>
          <Texto style={[e.semi, { fontSize: 15, color: color.verde }]}>{T.verAgenda}</Texto>
          <IconoAbrir tam={14} color={color.verde} />
        </Pressable>
      ) : null}
    </Entra>
  )
}

/** «¿Con quién de esta mesa te gustaría seguir en contacto?»: las cenas cuya encuesta no la traía. Se va al guardar. */
function PreguntaContacto(p: { titulo: string; otros: { id: string; nombre: string }[]; alGuardar: (ids: string[]) => Promise<string | null> }) {
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState('')
  const [hecho, setHecho] = useState(false)
  if (hecho) return null
  const P = T.preguntaAnterior
  return (
    <View style={e.panel}>
      <Texto style={{ fontFamily: fuente.titular, fontSize: 20, lineHeight: 29, color: color.verdeProfundo }}>{p.titulo}</Texto>
      <Texto variante="nota" style={{ marginTop: 6, marginBottom: 12 }}>
        {P.nota}
      </Texto>
      <View style={{ gap: 8 }}>
        {p.otros.map((o) => (
          <Opcion key={o.id} texto={o.nombre} marcada={marcadas.includes(o.id)} onPress={() => setMarcadas((m) => (m.includes(o.id) ? m.filter((x) => x !== o.id) : [...m, o.id]))} />
        ))}
      </View>
      {fallo ? (
        <View style={{ marginTop: 12 }}>
          <Aviso tono="ojo">{fallo}</Aviso>
        </View>
      ) : null}
      <View style={{ marginTop: 14 }}>
        <Boton
          texto={marcadas.length ? P.guardar : P.nadie}
          tipo={marcadas.length ? 'primario' : 'secundario'}
          trabajando={enviando}
          onPress={async () => {
            if (enviando) return
            setEnviando(true)
            setFallo('')
            const error = await p.alGuardar(marcadas)
            setEnviando(false)
            if (error) setFallo(error)
            else setHecho(true)
          }}
        />
      </View>
    </View>
  )
}

function Encuesta(p: { titulo: string; bajada: string; abierta: boolean; alAbrir: () => void }) {
  if (p.abierta) return null
  return (
    <View style={e.encuesta}>
      <Texto style={{ fontFamily: fuente.titular, fontSize: 24, lineHeight: 35, color: color.crema }}>{p.titulo}</Texto>
      <Texto style={{ fontSize: 14, lineHeight: 20, color: '#F6D9B4' }}>{p.bajada}</Texto>
      <Pressable onPress={p.alAbrir} accessibilityRole="button" style={e.botonClaro}>
        <Texto style={[e.semi, { fontSize: 16 }]}>{T.contar}</Texto>
      </Pressable>
    </View>
  )
}

const e = StyleSheet.create({
  semi: { fontFamily: fuente.textoSemi, color: color.verdeProfundo },
  etiqueta: { fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 14, letterSpacing: 1.54 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: medida.toqueMinimo, alignSelf: 'flex-start' },
  cabecera: { borderRadius: 22, backgroundColor: color.verdeProfundo, paddingVertical: 20, paddingHorizontal: 20, gap: 4 },
  cabeceraClara: { borderRadius: 22, backgroundColor: '#FFF8EA', borderWidth: 1, borderColor: tinta(0.1), paddingVertical: 18, paddingHorizontal: 18, gap: 4 },
  panel: { borderRadius: 22, backgroundColor: '#FFF8EA', borderWidth: 1, borderColor: tinta(0.1), padding: 16 },
  lista: { borderRadius: 22, backgroundColor: '#FFF8EA', borderWidth: 1, borderColor: tinta(0.1), paddingHorizontal: 16, paddingVertical: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 49 },
  encuesta: { borderRadius: 22, backgroundColor: color.terracota, padding: 20, gap: 10 },
  botonClaro: { minHeight: 50, borderRadius: 999, backgroundColor: color.crema, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  yaConto: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: '#E4ECE4', paddingVertical: 14, paddingHorizontal: 18, minHeight: 64 },
  agenda: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: medida.toqueMinimo },
})
