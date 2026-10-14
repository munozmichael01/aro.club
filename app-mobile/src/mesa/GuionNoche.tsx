import { Platform, Pressable, StyleSheet, View } from 'react-native'

import { Texto, color, fuente, tinta, verdeAlfa } from '../diseno'
import * as F from '../texto/fechas'
import * as T from '../texto/mesa'
import * as G from './guion'
import * as M from './maquina'

/**
 * El guion de la mesa, en Mi mesa abierta (14-10-2026). Hecho con los
 * componentes del sistema mientras Design entrega
 * (`Design/BRIEF-anfitrion.md`). Lo ve toda la mesa: la «voz de Aro» la elige
 * la propia mesa, no el servidor.
 */
export function GuionNoche(p: {
  empiezaEn: string | null | undefined
  cierraMesaEn?: string | null
  zonaHoraria?: string | null
  conJuego: boolean
  paraSeguir?: M.SitioParaSeguir[] | null
  ahora: number
  ir: (destino: string) => void
}) {
  const zona = p.zonaHoraria ?? null
  const pasos = G.pasos(p.empiezaEn, p.cierraMesaEn).filter((x) => p.conJuego || !G.DEL_JUEGO.includes(x.momento))
  if (!pasos.length) return null
  const actual = G.enCurso(pasos, p.ahora)
  const limite = F.horaEn(pasos.find((x) => x.momento === 'pedir')!.en, zona)
  const sitios = (p.paraSeguir ?? []).filter((s) => s.nombre).slice(0, 3)
  return (
    <View style={{ marginTop: 30 }}>
      <Texto variante="subtitulo">{T.guion.titulo}</Texto>
      <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 4, marginBottom: 14 }}>{T.guion.bajada}</Texto>
      {pasos.map((x) => {
        const m = T.guion.momentos[x.momento]
        const ahora = actual !== null && x.en === actual
        const paso = actual !== null && Date.parse(x.en) < Date.parse(actual)
        return (
          <View key={x.momento} style={[estilos.paso, ahora && estilos.pasoAhora, paso && { opacity: 0.55 }]}>
            <Texto variante="cuerpoChico" style={estilos.hora}>{F.horaEn(x.en, zona)}</Texto>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" style={{ fontSize: 16 }}>
                {m.nombre}
                {ahora ? <Texto variante="etiquetaChica" style={{ color: color.terracota }}>{'  ' + T.guion.ahora}</Texto> : null}
              </Texto>
              <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 2 }}>{m.texto(limite)}</Texto>
              {x.momento === 'despedida' && sitios.length ? (
                <View style={{ marginTop: 10 }}>
                  <Texto variante="etiquetaChica" tono="secundario">{T.guion.seguir.titulo.toUpperCase()}</Texto>
                  {sitios.map((s) => {
                    const mapa = M.mapa(s, Platform.OS)
                    return (
                      <View key={s.nombre} style={estilos.sitio}>
                        <View style={{ flex: 1 }}>
                          <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoSemi }}>{s.nombre}</Texto>
                          {s.minutosAPie ? <Texto variante="cuerpoChico" tono="secundario">{T.guion.seguir.aPie(s.minutosAPie)}</Texto> : null}
                        </View>
                        {mapa ? (
                          <Pressable accessibilityRole="link" onPress={() => p.ir('externo:' + mapa)} hitSlop={8}>
                            <Texto variante="cuerpoChico" style={{ color: color.verde, fontFamily: fuente.textoSemi }}>{T.guion.seguir.comoLlegar}</Texto>
                          </Pressable>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const estilos = StyleSheet.create({
  paso: { flexDirection: 'row', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tinta(0.1) },
  pasoAhora: { backgroundColor: verdeAlfa(0.08), borderRadius: 14, paddingHorizontal: 10, borderTopColor: 'transparent' },
  hora: { width: 72, fontFamily: fuente.textoSemi, fontVariant: ['tabular-nums'], color: color.verde },
  sitio: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: tinta(0.08) },
})
