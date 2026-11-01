import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { AroCarga, Aviso, Boton, IconoCheck, Texto, color, fuente, tinta } from '../diseno'
import { reglas } from '../reglas'
import { SinSesion, type crearApi } from '../sesion/api'
import { guardar } from '../sesion/traido'
import { AroDuo } from './Partes'

type Api = ReturnType<typeof crearApi>

/** `GET /api/mas-uno?token=` (contrato del agente, 7c5ac12). */
export type DeInvitacion = {
  estado: 'valida' | 'propia' | 'usada' | 'anulada' | 'cerrada' | 'aceptada' | 'tuya'
  invita: string | null
  fecha: { id: string; empiezaEn: string; cierraEn: string | null; formato: string | null; zonas: string[] } | null
  plazo: string | null
  zonaHoraria: string | null
}

/** Quien mira, si tiene sesión: su nombre y si ya está verificada (5B). */
type Yo = { nombre: string | null; verificada: boolean } | null

export function crearServicioInvitacion(api: Api) {
  return {
    async ver(token: string): Promise<{ inv: DeInvitacion | null; yo: Yo }> {
      const r = await api.pedir('/mas-uno?token=' + encodeURIComponent(token)).catch(() => null)
      const inv = r?.ok ? ((await r.json().catch(() => null)) as DeInvitacion | null) : null
      let yo: Yo = null
      try {
        const c = await api.pedir('/mi-cuenta')
        if (c.ok) {
          const j = await c.json()
          yo = { nombre: j?.nombre ?? null, verificada: j?.verif === 'ok' }
        }
      } catch (e) {
        if (!(e instanceof SinSesion)) yo = null
      }
      return { inv, yo }
    },
    async aceptar(token: string): Promise<{ estado: string | null; error: string | null }> {
      try {
        const r = await api.pedir('/mas-uno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'aceptar', token }) })
        const j = await r.json().catch(() => null)
        return { estado: j?.estado ?? null, error: r.ok ? null : (j?.error ?? null) }
      } catch {
        return { estado: null, error: null }
      }
    },
  }
}

type Servicio = ReturnType<typeof crearServicioInvitacion>

const NARANJA_OSCURO = '#C0662F'

/**
 * 5A, 5B y 5C de la entrega mas-uno: lo que ve quien abre el enlace de un +1
 * en la app. Sin cuenta, al alta de siempre (el token se guarda y viaja en el
 * alta); con cuenta, «Aceptar la invitación». El token solo se guarda al
 * elegir: aceptar es una decisión de la persona, no algo que pase al abrir.
 */
export function Invitacion(p: { token: string; servicio: Servicio; ir: (d: string) => void }) {
  const insets = useSafeAreaInsets()
  const I = reglas.MAS_UNO.invitado
  const [d, setD] = useState<{ inv: DeInvitacion | null; yo: Yo } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aceptada, setAceptada] = useState(false)
  const [fallo, setFallo] = useState('')

  useEffect(() => {
    p.servicio.ver(p.token).then(setD)
  }, [p.servicio, p.token])

  // Ya es suya (o ya la aceptó): a su Mi mesa, que lo cuenta.
  useEffect(() => {
    if (d?.inv?.estado === 'tuya' || d?.inv?.estado === 'aceptada') p.ir('/mesa')
  }, [d, p])

  if (!d) {
    return (
      <View style={{ flex: 1, backgroundColor: color.crema, justifyContent: 'center' }}>
        <AroCarga tam={36} />
      </View>
    )
  }

  const inv = d.inv
  const pagina = { paddingTop: insets.top + 44, paddingBottom: insets.bottom + 28 }

  // 5C · Usada, cambiada, cerrada, propia o que no existe: sin culpas, con la agenda.
  if (!inv || inv.estado === 'usada' || inv.estado === 'anulada' || inv.estado === 'cerrada' || inv.estado === 'propia') {
    const t =
      !inv || inv.estado === 'usada'
        ? I.usada
        : inv.estado === 'anulada'
          ? { titulo: I.anulada.titulo, linea: I.anulada.linea(inv.invita) }
          : inv.estado === 'cerrada'
            ? I.cerrada
            : I.propia
    return (
      <ScrollView style={{ backgroundColor: color.crema }} contentContainerStyle={[e.pagina, pagina, { flexGrow: 1, justifyContent: 'center', gap: 18 }]}>
        <Svg width={80} height={80} viewBox="0 0 240 240">
          <Circle cx={120} cy={120} r={86} fill="none" stroke={color.verde} strokeWidth={22} />
          <Circle cx={206} cy={120} r={25} fill={NARANJA_OSCURO} />
          {[[163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={25} fill={color.verde} />
          ))}
        </Svg>
        <Texto accessibilityRole="header" style={{ fontFamily: fuente.titular, fontSize: 34, lineHeight: 48, letterSpacing: -0.68, color: color.verdeProfundo }}>
          {t.titulo}
        </Texto>
        <Texto style={e.parrafo}>{t.linea}</Texto>
        {inv?.estado === 'propia' ? null : <Texto style={e.parrafo}>{I.socio}</Texto>}
        <View style={{ marginTop: 6 }}>
          <Boton texto={inv?.estado === 'propia' ? reglas.MAS_UNO.tarjeta.compartir : I.agenda} ancho onPress={() => p.ir(inv?.estado === 'propia' ? '/mesa' : '/cuenta#agenda')} />
        </View>
      </ScrollView>
    )
  }

  // 5A (sin cuenta) y 5B (con cuenta).
  const conCuenta = !!d.yo
  const z = inv.zonaHoraria
  const f = inv.fecha
  const dia = f ? reglas.partesDe(f.empiezaEn, z) : null
  const fechaTexto = f && dia ? `${dia.dia.charAt(0).toUpperCase()}${dia.dia.slice(1)} ${dia.numero} · ${reglas.horaDe(f.empiezaEn, z) ?? ''}` : ''
  const zonas = f ? (f.zonas.length <= 1 ? (f.zonas[0] ?? '') : `${f.zonas.slice(0, -1).join(', ')} o ${f.zonas[f.zonas.length - 1]}`) : ''
  const pasos: { t: string; d: string; hecho: boolean; n: string }[] = conCuenta
    ? [
        { t: I.tienesCuenta[0], d: I.tienesCuenta[1](d.yo?.nombre ?? null), hecho: true, n: '' },
        d.yo?.verificada ? { t: I.verificada[0], d: I.verificada[1], hecho: true, n: '' } : { t: I.porVerificar[0], d: I.porVerificar[1], hecho: false, n: '2' },
      ]
    : I.pasosSinCuenta.map(([t, x], i) => ({ t, d: x, hecho: false, n: String(i + 1) }))

  const aceptar = async () => {
    if (enviando) return
    setEnviando(true)
    setFallo('')
    const r = await p.servicio.aceptar(p.token)
    setEnviando(false)
    if (r.estado === 'confirmada') return p.ir('/mesa')
    if (r.estado === 'aceptada') return setAceptada(true)
    // La respuesta definitiva la vuelve a pedir: usada, anulada, cerrada…
    if (r.estado) return p.servicio.ver(p.token).then(setD)
    setFallo(r.error ?? reglas.MAS_UNO.invitado.usada.linea)
  }

  return (
    <ScrollView style={{ backgroundColor: color.crema }} contentContainerStyle={[e.pagina, pagina, { flexGrow: 1, gap: 16 }]}>
      <AroDuo tam={64} anillo={color.verdeProfundo} resto={color.verdeProfundo} naranjas={NARANJA_OSCURO} punteado={{ relleno: color.crema }} />
      <View style={e.pildora}>
        <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, color: color.verdeProfundo }}>{I.sello}</Texto>
      </View>
      <Texto accessibilityRole="header" style={{ fontFamily: fuente.titular, fontSize: 42, lineHeight: 60, letterSpacing: -1.26, color: color.verdeProfundo }}>
        {I.titulo(inv.invita)}
      </Texto>
      <View style={e.fecha}>
        <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, color: '#8F4515' }}>{I.fechaSello}</Texto>
        <Texto style={{ fontFamily: fuente.titular, fontSize: 21, lineHeight: 30, color: color.verdeProfundo }}>{fechaTexto}</Texto>
        <Texto style={{ fontSize: 14, lineHeight: 19, color: color.cuerpo }}>{I.donde(zonas, null)}</Texto>
      </View>
      <Texto style={e.parrafo}>
        {I.cuerpo(inv.invita)[0]}
        <Texto style={[e.parrafo, { fontFamily: fuente.textoSemi, color: color.verdeProfundo }]}>{I.cuerpo(inv.invita)[1]}</Texto>
      </Texto>
      <View style={{ borderTopWidth: 1, borderTopColor: tinta(0.12), paddingTop: 10 }}>
        <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, color: color.secundario, paddingTop: 4, paddingBottom: 6 }}>
          {conCuenta ? I.faltaTitulo('') : I.faltaTitulo(inv.plazo ?? '')}
        </Texto>
        {pasos.map((x) => (
          <View key={x.t} style={{ flexDirection: 'row', gap: 8, paddingVertical: 7 }}>
            <View style={[e.puntoPaso, x.hecho ? { backgroundColor: color.verdeProfundo } : { borderWidth: 1.5, borderColor: tinta(0.35) }]}>
              {x.hecho ? <IconoCheck tam={11} color={color.crema} /> : <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 13, color: color.verdeProfundo }}>{x.n}</Texto>}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14.5, lineHeight: 20, color: color.verdeProfundo }}>{x.t}</Texto>
              <Texto style={{ fontSize: 13, lineHeight: 18, color: color.cuerpo }}>{x.d}</Texto>
            </View>
          </View>
        ))}
      </View>
      {aceptada ? <Aviso tono="exito">{I.aceptada}</Aviso> : null}
      {fallo ? <Aviso tono="ojo">{fallo}</Aviso> : null}
      <View style={{ gap: 8, marginTop: 'auto' }}>
        {conCuenta ? (
          aceptada ? (
            <Boton texto={d.yo?.verificada ? reglas.MAS_UNO.invitado.agenda : reglas.MAS_UNO.acompanante.verificate('')[0]} ancho onPress={() => p.ir(d.yo?.verificada ? '/mesa' : '/verificacion')} />
          ) : (
            <>
              <Boton texto={I.aceptar} ancho onPress={aceptar} disabled={enviando} />
              <Boton tipo="fantasma" texto={I.noPuedo} ancho onPress={() => p.ir('/cuenta')} />
            </>
          )
        ) : (
          <>
            {/* Sin cuenta: el token se guarda y viaja en el alta (y se acepta al entrar). */}
            <Boton texto={I.alta} ancho onPress={() => guardar({ token: p.token }).finally(() => p.ir('/puerta'))} />
            <Boton tipo="fantasma" texto={I.entrar} ancho onPress={() => guardar({ token: p.token }).finally(() => p.ir('/entrar'))} />
          </>
        )}
      </View>
    </ScrollView>
  )
}

const e = StyleSheet.create({
  pagina: { paddingHorizontal: 22, maxWidth: 480, width: '100%', alignSelf: 'center' },
  pildora: { alignSelf: 'flex-start', minHeight: 26, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 999, backgroundColor: '#F6D9B4' },
  fecha: { borderRadius: 20, backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: tinta(0.12), paddingVertical: 16, paddingHorizontal: 18, gap: 5 },
  parrafo: { fontSize: 15, lineHeight: 22.5, color: color.cuerpo },
  puntoPaso: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
})
