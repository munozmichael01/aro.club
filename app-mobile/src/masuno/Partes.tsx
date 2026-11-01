import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { Boton, IconoCedula, IconoCheck, IconoCompartir, IconoDevolver, IconoDuo, IconoFlecha, IconoReloj, Texto, color, fuente, tinta } from '../diseno'
import { reglas } from '../reglas'
import { duos, enlaceCorto, type MasUno } from './maquina'

/**
 * Las piezas del +1 acompañante (entrega mas-uno de Design, 01-11). Las
 * pantallas de siempre (agenda, Pago, Estás dentro, Mi mesa) las componen; el
 * copy sale de `AroReglas.MAS_UNO`.
 */

const M = () => reglas.MAS_UNO
const TERRACOTA = '#8F4515'
const NARANJA = '#E39C63'
const MELOCOTON = '#F6D9B4'
const SALVIA = '#9CBBA6'
const ARENA = '#F2E9D5'
const PAPEL = '#FFFBF0'
const PAPEL_AVISO = '#FFF8EA'

/** «texto **negrita**»: los trozos de dos de MAS_UNO, el segundo en negrita. */
function Trozos({ t, estilo, negrita = color.verdeProfundo }: { t: string[]; estilo?: object; negrita?: string }) {
  return (
    <Texto style={estilo}>
      {t.map((x, i) => (i % 2 === 1 ? <Texto key={i} style={[estilo, { fontFamily: fuente.textoSemi, color: negrita }]}>{x}</Texto> : x))}
    </Texto>
  )
}

/** 1A · La cápsula de contorno junto al tipo, como «+45». La de idioma sigue maciza. */
export function Capsula() {
  return (
    <View style={e.capsula}>
      <IconoDuo tam={18} color={color.verdeProfundo} lleno={TERRACOTA} />
      <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.95, color: color.verdeProfundo }}>{M().marca}</Texto>
    </View>
  )
}

/** El aro de la marca con los puntos que se pidan en naranja (el +1: dos juntos). */
function AroDuo({ tam, anillo, resto, naranjas, punteado }: { tam: number; anillo: string; resto: string; naranjas: string; punteado?: { relleno: string } }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={86} fill="none" stroke={anillo} strokeWidth={18} />
      <Circle cx={206} cy={120} r={25} fill={naranjas} />
      {punteado ? (
        <Circle cx={163} cy={194.5} r={23} fill={punteado.relleno} stroke={naranjas} strokeWidth={8} strokeDasharray={[12, 9]} />
      ) : (
        <Circle cx={163} cy={194.5} r={25} fill={naranjas} />
      )}
      {[[77, 194.5], [34, 120], [77, 45.5], [163, 45.5]].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={25} fill={resto} />
      ))}
    </Svg>
  )
}
export { AroDuo }

/** 1B · «Vienes con alguien.»: el bloque verde de la hoja, en lugar de «Te apuntas a una fecha». */
export function BloqueHoja() {
  const h = M().hoja
  return (
    <View style={e.bloque}>
      <AroDuo tam={40} anillo={color.crema} resto={color.crema} naranjas={NARANJA} />
      <View style={{ flex: 1, gap: 6 }}>
        <Texto style={{ fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: color.crema }}>{h.titulo}</Texto>
        <Texto style={{ fontSize: 13.5, lineHeight: 19.5, color: '#C5D8CA' }}>{h.bajada}</Texto>
      </View>
    </View>
  )
}

/** El cargo en dos: tu puesto, el de tu +1 y el total (1B en encuentros; 2B en ref). */
export function CargoDos({ uno, total, etiquetaTotal = M().hoja.total, grande = 19 }: { uno: string; total: string; etiquetaTotal?: string; grande?: number }) {
  const h = M().hoja
  return (
    <View style={e.cargo}>
      <View style={e.fila}>
        <Texto style={[e.cargoTexto, { flex: 1 }]}>{h.tuPuesto}</Texto>
        <Texto style={[e.cargoTexto, { fontFamily: fuente.textoSemi, color: color.verde }]}>{uno}</Texto>
      </View>
      <View style={e.fila}>
        <Texto style={[e.cargoTexto, { flex: 1 }]}>{h.suPuesto}</Texto>
        <Texto style={[e.cargoTexto, { fontFamily: fuente.textoSemi, color: color.verde }]}>{uno}</Texto>
      </View>
      <View style={[e.fila, e.total]}>
        <Texto style={{ flex: 1, fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19.5, color: color.verdeProfundo }}>{etiquetaTotal}</Texto>
        <Texto style={{ fontFamily: fuente.titular, fontSize: grande, lineHeight: Math.ceil(grande * 1.42), color: color.verde }}>{total}</Texto>
      </View>
    </View>
  )
}

/** 2 · El aviso con casilla. Borde terracota: lo único de la pantalla con ese borde. */
export function AvisoCasilla({ plazo, marcado, alMarcar }: { plazo: string; marcado: boolean; alMarcar: () => void }) {
  const a = M().aviso
  const linea = { fontSize: 14.5, lineHeight: 21, color: color.verdeProfundo }
  return (
    <View style={e.aviso}>
      <View style={{ paddingTop: 18, paddingHorizontal: 18, paddingBottom: 14, gap: 12 }}>
        <Texto style={e.sello}>{a.sello}</Texto>
        <Texto style={{ fontFamily: fuente.titular, fontSize: 24, lineHeight: 34, letterSpacing: -0.36, color: color.verdeProfundo }}>{a.titulo}</Texto>
        <View style={e.lineaAviso}>
          <IconoReloj tam={20} color={TERRACOTA} />
          <Trozos t={a.plazo(plazo)} estilo={[linea, { flex: 1 }]} />
        </View>
        <View style={e.lineaAviso}>
          <IconoDevolver tam={20} color={TERRACOTA} />
          <Trozos t={a.cancela} estilo={[linea, { flex: 1 }]} />
        </View>
      </View>
      <Pressable onPress={alMarcar} accessibilityRole="checkbox" aria-checked={marcado} style={e.casilla}>
        <View style={[e.caja, marcado ? { backgroundColor: '#A0511F', borderColor: '#A0511F' } : null]}>{marcado ? <IconoCheck tam={14} color={PAPEL_AVISO} /> : null}</View>
        <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15.5, lineHeight: 19, color: color.verdeProfundo }}>{a.casilla}</Texto>
      </Pressable>
    </View>
  )
}

/** El botón que se enciende con la casilla: apagado dice «Marca «Entendido» para seguir». */
export function BotonConCasilla({ texto, marcado, onPress }: { texto: string; marcado: boolean; onPress: () => void }) {
  return <Boton texto={marcado ? texto : M().aviso.falta} apagado={!marcado} ancho onPress={marcado ? onPress : undefined} />
}

/** La hoja del sistema con el mensaje y el enlace (3B). */
export function compartirEnlace(m: MasUno) {
  if (!m.enlace) return
  Share.share({ message: m.mensaje ?? m.enlace, url: m.enlace }).catch(() => undefined)
}

/** 3A · La tarjeta crema de «Estás dentro»: la invitación, con el único botón naranja. */
export function InvitarTarjeta({ m }: { m: MasUno }) {
  const d = M().dentro
  return (
    <View style={{ borderRadius: 24, backgroundColor: color.crema, padding: 18, gap: 10 }}>
      <Texto style={e.sello}>{d.sello}</Texto>
      <Texto style={{ fontFamily: fuente.titular, fontSize: 24, lineHeight: 34, letterSpacing: -0.36, color: color.verdeProfundo }}>{d.titulo}</Texto>
      <Trozos t={d.bajada(m.plazo ?? '')} estilo={{ fontSize: 14, lineHeight: 20, color: color.cuerpo }} />
      <Pressable onPress={() => compartirEnlace(m)} accessibilityRole="button" style={({ pressed }) => [e.naranja, pressed ? { opacity: 0.85 } : null]}>
        <IconoDuo tam={20} color={color.verdeProfundo} punteado />
        <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15.5, lineHeight: 19, color: color.verdeProfundo }}>{d.invitar}</Texto>
      </Pressable>
    </View>
  )
}

/** Una inicial en su círculo (4B, 4C, 5E). */
function Inicial({ n, fondo, tam = 40, punteada, borde }: { n: string; fondo: string; tam?: number; punteada?: boolean; borde?: string }) {
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: tam / 2,
        backgroundColor: fondo,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: punteada ? 2 : borde ? 2.5 : 0,
        borderStyle: punteada ? 'dashed' : 'solid',
        borderColor: punteada ? TERRACOTA : borde,
      }}
    >
      <Texto style={{ fontFamily: fuente.titular, fontSize: tam * 0.48, lineHeight: Math.ceil(tam * 0.48 * 1.42), color: color.verdeProfundo }}>{(n || '·').charAt(0).toUpperCase()}</Texto>
    </View>
  )
}
export { Inicial }

/**
 * 4 · «Tu +1 acompañante» en Mi mesa, debajo de la tarjeta de la reserva:
 * sin usar (4A), se registró (4B) o confirmado (4C), con «Cambiar de
 * acompañante» al pie (4D). La cancelada (4E) va aparte: sustituye a la reserva.
 */
export function TarjetaAcompanante({ m, yo, revela, alCambiar }: { m: MasUno; yo: string; revela: string | null; alCambiar: () => void }) {
  const t = M().tarjeta
  const [copiado, setCopiado] = useState(false)
  if (m.estado === 'cancelada') return null
  const plazo = m.plazo ?? ''
  const sello = t.sellos[m.estado]
  return (
    <View style={e.tarjeta}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Texto style={e.sello}>{t.cabecera}</Texto>
        <View style={[e.pildora, { backgroundColor: m.estado === 'confirmado' ? SALVIA : MELOCOTON }]}>
          {m.estado === 'confirmado' ? <IconoCheck tam={11} color={color.verdeProfundo} /> : null}
          <Texto style={e.pildoraTexto}>{sello}</Texto>
        </View>
      </View>

      {m.estado === 'sin-usar' ? (
        <>
          <Texto style={{ fontFamily: fuente.titular, fontSize: 22, lineHeight: 31, letterSpacing: -0.22, color: color.verdeProfundo }}>{t.sinUsar.titulo}</Texto>
          <Trozos t={t.sinUsar.bajada(plazo)} estilo={{ fontSize: 14, lineHeight: 20, color: color.cuerpo }} />
          {m.enlace ? (
            <View style={e.enlace}>
              <Texto style={{ flex: 1, fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, letterSpacing: 0.15, color: color.verdeProfundo }} numberOfLines={1}>
                {enlaceCorto(m.enlace)}
              </Texto>
              <Pressable
                onPress={() => Clipboard.setStringAsync(m.enlace!).then(() => setCopiado(true)).catch(() => undefined)}
                accessibilityRole="button"
                style={e.copiar}
              >
                <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 13.5, lineHeight: 17, color: color.verdeProfundo }}>{copiado ? t.copiado : t.copiar}</Texto>
              </Pressable>
            </View>
          ) : null}
          <Pressable onPress={() => compartirEnlace(m)} accessibilityRole="button" style={({ pressed }) => [e.verde, pressed ? { opacity: 0.88 } : null]}>
            <IconoCompartir tam={18} color={color.crema} />
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, color: color.crema }}>{t.compartir}</Texto>
          </Pressable>
        </>
      ) : m.estado === 'registrado' ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Inicial n={m.nombre ?? ''} fondo="#F2D2C0" punteada />
            <Texto style={{ flex: 1, fontFamily: fuente.titular, fontSize: 21, lineHeight: 30, letterSpacing: -0.21, color: color.verdeProfundo }}>{t.registrado.titulo(m.nombre)}</Texto>
          </View>
          <View style={{ gap: 2 }}>
            <View style={e.paso}>
              <View style={[e.puntoPaso, { backgroundColor: color.verdeProfundo }]}>
                <IconoCheck tam={12} color={color.crema} />
              </View>
              <Texto style={e.pasoTitulo}>{t.registrado.creo}</Texto>
            </View>
            <View style={e.paso}>
              <View style={[e.puntoPaso, { backgroundColor: NARANJA }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texto style={e.pasoTitulo}>{t.registrado.falta}</Texto>
                <Texto style={{ fontSize: 13, lineHeight: 18, color: color.cuerpo }}>{t.registrado.faltaDetalle(plazo)}</Texto>
              </View>
            </View>
          </View>
          <Texto style={{ fontSize: 12.5, lineHeight: 18, color: color.secundario }}>{t.registrado.nota}</Texto>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flexDirection: 'row' }}>
              {yo ? (
                <View style={{ marginRight: -10 }}>
                  <Inicial n={yo} fondo="#DCE6DD" tam={42} borde={PAPEL} />
                </View>
              ) : null}
              <Inicial n={m.nombre ?? ''} fondo="#F2D2C0" tam={42} borde={PAPEL} />
            </View>
            <Texto style={{ flex: 1, fontFamily: fuente.titular, fontSize: 24, lineHeight: 34, letterSpacing: -0.36, color: color.verdeProfundo }}>{t.confirmado.titulo(m.nombre)}</Texto>
          </View>
          <Texto style={{ fontSize: 14, lineHeight: 20, color: color.cuerpo }}>{t.confirmado.bajada(revela)}</Texto>
        </>
      )}

      <Pressable onPress={alCambiar} accessibilityRole="button" style={e.cambiar}>
        <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, lineHeight: 18, color: color.verde }}>{t.cambiar}</Texto>
      </Pressable>
    </View>
  )
}

/** 4D · «¿Cambiar de acompañante?», en hoja desde abajo. */
export function HojaCambio({ m, alSi, alNo, ocupado }: { m: MasUno; alSi: () => void; alNo: () => void; ocupado: boolean }) {
  const c = M().tarjeta.cambio
  const insets = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={alNo} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,26,21,0.55)' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={alNo} accessibilityLabel={c.no} />
        <View style={[e.hoja, { paddingBottom: insets.bottom + 26 }]} accessibilityViewIsModal>
          <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: tinta(0.2) }} />
          <Texto accessibilityRole="header" style={{ fontFamily: fuente.titular, fontSize: 26, lineHeight: 37, letterSpacing: -0.52, color: color.verdeProfundo }}>
            {c.titulo}
          </Texto>
          <Texto style={{ fontSize: 14.5, lineHeight: 22, color: color.cuerpo }}>{c.cuerpo(m.estado === 'sin-usar' ? null : m.nombre)}</Texto>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 16, backgroundColor: ARENA, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={{ marginTop: 1 }}>
              <IconoReloj tam={18} color={TERRACOTA} />
            </View>
            <Texto style={{ flex: 1, fontSize: 13.5, lineHeight: 19.5, color: color.verdeProfundo }}>{c.plazo(m.plazo ?? '')}</Texto>
          </View>
          <Boton tipo="grave" texto={c.si} ancho onPress={alSi} disabled={ocupado} />
          <Boton tipo="fantasma" texto={c.no} ancho onPress={alNo} />
        </View>
      </View>
    </Modal>
  )
}

/** 4E · La reserva cancelada porque su +1 no se verificó: sustituye a la reserva en Próxima. */
export function Cancelada({ dia, cierre, alAgenda }: { dia: string; cierre: string | null; alAgenda: () => void }) {
  const c = M().tarjeta.cancelada
  return (
    <View style={[e.tarjeta, { borderWidth: 1.5, borderColor: TERRACOTA, padding: 20 }]}>
      <View style={[e.pildora, { alignSelf: 'flex-start', backgroundColor: MELOCOTON, paddingVertical: 7, paddingHorizontal: 11 }]}>
        <Texto style={[e.pildoraTexto, { letterSpacing: 1.05 }]}>{c.sello(dia)}</Texto>
      </View>
      <Texto accessibilityRole="header" style={{ fontFamily: fuente.titular, fontSize: 26, lineHeight: 37, letterSpacing: -0.52, color: color.verdeProfundo }}>
        {c.titulo}
      </Texto>
      <Texto style={{ fontSize: 14.5, lineHeight: 21, color: color.cuerpo }}>{c.bajada(cierre)}</Texto>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: ARENA, paddingVertical: 12, paddingHorizontal: 14 }}>
        <Texto style={{ fontFamily: fuente.titular, fontSize: 26, lineHeight: 37, color: color.verde }}>{c.creditos}</Texto>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14.5, lineHeight: 18, color: color.verdeProfundo }}>{c.creditosTexto}</Texto>
          <Texto style={{ fontSize: 12.5, lineHeight: 16, color: color.secundario }}>{c.creditosNota}</Texto>
        </View>
      </View>
      <Boton texto={c.boton} ancho onPress={alAgenda} />
    </View>
  )
}

/** 5E · «Vienes con Ana» dentro de la tarjeta verde de la reserva, con su sello. */
export function VienesCon({ invita, pendiente, claro }: { invita: string | null; pendiente?: boolean; claro?: boolean }) {
  const a = M().acompanante
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: claro ? tinta(0.12) : 'rgba(250,243,228,0.15)', paddingTop: 12 }}>
      <Inicial n={invita ?? ''} fondo="#DCE6DD" tam={34} />
      <Texto style={{ flex: 1, fontFamily: fuente.textoMedia, fontSize: 15, lineHeight: 19.5, color: claro ? color.verdeProfundo : color.crema }}>{M().vienesCon(invita)}</Texto>
      <View style={[e.pildora, { backgroundColor: pendiente ? MELOCOTON : SALVIA }]}>
        <Texto style={[e.pildoraTexto, { fontSize: 10 }]}>{pendiente ? a.selloPendiente : a.selloDentro}</Texto>
      </View>
    </View>
  )
}

/**
 * 5D · El acompañante que entró por un enlace y aún no se ha verificado: la
 * línea que lleva a la verificación, la tarjeta verde con «Vienes con Ana» y
 * lo que pasa si no llega a tiempo.
 */
export function PendienteAcompanante({ p, alVerificar }: { p: import('./maquina').Pendiente; alVerificar: () => void }) {
  const a = M().acompanante
  const F = reglas
  const dia = F.partesDe(p.empiezaEn, p.zonaHoraria)
  const sello = dia ? `${dia.dia} ${dia.numero} de ${dia.mes} · ${(p.formato === 'brunch' ? 'Brunch' : 'Cena')} +1`.toUpperCase() : ''
  const hora = F.horaDe(p.empiezaEn, p.zonaHoraria) ?? ''
  const zonas = p.zonas.length <= 1 ? (p.zonas[0] ?? '') : `${p.zonas.slice(0, -1).join(', ')} o ${p.zonas[p.zonas.length - 1]}`
  return (
    <View style={{ gap: 14 }}>
      <Pressable onPress={alVerificar} accessibilityRole="link" style={e.lineaVerificar}>
        <IconoCedula tam={22} color={color.verdeProfundo} />
        {/* El primer trozo en semi, el plazo en normal (5D). */}
        <Texto style={{ flex: 1, fontFamily: fuente.textoSemi, fontSize: 14, lineHeight: 18, color: color.verdeProfundo }}>
          {a.verificate(p.plazo ?? '')[0]}
          <Texto style={{ fontFamily: fuente.texto, fontSize: 14, lineHeight: 18, color: color.verdeProfundo }}>{a.verificate(p.plazo ?? '')[1]}</Texto>
        </Texto>
        <IconoFlecha tam={16} color={color.verdeProfundo} />
      </Pressable>
      <View style={{ borderRadius: 24, backgroundColor: color.verdeProfundo, padding: 20, gap: 12 }}>
        {sello ? <Texto style={[e.sello, { color: NARANJA, lineHeight: 15 }]}>{sello}</Texto> : null}
        <Texto accessibilityRole="header" style={{ fontFamily: fuente.titular, fontSize: 26, lineHeight: 37, letterSpacing: -0.52, color: color.crema }}>
          {a.esperando}
        </Texto>
        <Texto style={{ fontSize: 14, lineHeight: 19.5, color: '#C5D8CA' }}>{[hora, zonas].filter(Boolean).join(' · ')}</Texto>
        <VienesCon invita={p.invita} pendiente />
      </View>
      <Texto style={{ fontSize: 12.5, lineHeight: 17.5, color: '#7C8A80', textAlign: 'center' }}>{a.pie(p.invita)}</Texto>
    </View>
  )
}

const FONDOS = ['#DCE6DD', '#F2D2C0', '#F6D9B4', '#E8DEC8', '#C5D8CA', '#F6D9B4', '#DCE6DD', '#E8DEC8']

/** 6B · «Con quién cenas» en dúos: el tuyo primero, con borde terracota y «TU DÚO». */
export function DuosLista({ gente }: { gente: { id: string; nombre: string; sector: string; vieneCon: string | null }[] }) {
  const grupos = duos(gente)
  let k = 0
  return (
    <View style={{ gap: 10 }}>
      <Texto style={{ fontSize: 13.5, lineHeight: 19.5, color: color.cuerpo }}>{M().mesa.bajada(grupos.length)}</Texto>
      {grupos.map((g, i) => (
        <View key={i} style={[e.duo, g.tuyo ? { borderWidth: 1.5, borderColor: TERRACOTA } : null]}>
          {g.tuyo ? <Texto style={[e.sello, { fontSize: 10.5, letterSpacing: 1.26 }]}>{M().mesa.tuDuo}</Texto> : null}
          {g.gente.map((x) => {
            const yo = 'yo' in x
            const nombre = yo ? 'Tú' : x.nombre
            return (
              <View key={yo ? 'yo' : x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Inicial n={nombre} fondo={FONDOS[k++ % FONDOS.length]} tam={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15.5, lineHeight: 19, color: color.verdeProfundo }}>{nombre}</Texto>
                  {!yo && x.sector ? <Texto style={{ fontSize: 13, lineHeight: 16, color: color.secundario }}>{x.sector}</Texto> : null}
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const e = StyleSheet.create({
  lineaVerificar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: MELOCOTON, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, minHeight: 52 },
  duo: { borderRadius: 20, backgroundColor: PAPEL, borderWidth: 1, borderColor: tinta(0.12), paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  capsula: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingLeft: 6, paddingRight: 9, borderRadius: 999, borderWidth: 1.5, borderColor: color.verdeProfundo },
  bloque: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 20, backgroundColor: color.verdeProfundo, padding: 16 },
  cargo: { gap: 8, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tinta(0.12) },
  fila: { flexDirection: 'row', gap: 14, alignItems: 'baseline' },
  cargoTexto: { fontFamily: fuente.textoMedia, fontSize: 14.5, lineHeight: 19, color: color.verdeProfundo },
  total: { paddingTop: 8, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: tinta(0.18), alignItems: 'center' },
  aviso: { borderRadius: 20, backgroundColor: PAPEL_AVISO, borderWidth: 1.5, borderColor: TERRACOTA },
  sello: { fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, color: TERRACOTA },
  lineaAviso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  casilla: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: 'rgba(143,69,21,0.25)' },
  caja: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: tinta(0.4), alignItems: 'center', justifyContent: 'center' },
  naranja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: 999, backgroundColor: NARANJA, marginTop: 4 },
  verde: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, borderRadius: 999, backgroundColor: color.verde },
  tarjeta: { borderRadius: 24, backgroundColor: PAPEL, borderWidth: 1, borderColor: tinta(0.12), padding: 18, gap: 12 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  pildoraTexto: { fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.84, color: color.verdeProfundo },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: ARENA, paddingVertical: 6, paddingRight: 6, paddingLeft: 14 },
  copiar: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: color.verdeProfundo },
  paso: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  puntoPaso: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  pasoTitulo: { fontFamily: fuente.textoSemi, fontSize: 14.5, lineHeight: 20, color: color.verdeProfundo },
  cambiar: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: tinta(0.1), paddingTop: 4 },
  hoja: { backgroundColor: color.crema, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14, paddingHorizontal: 22, gap: 14 },
})
