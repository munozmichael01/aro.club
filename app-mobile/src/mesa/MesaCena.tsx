import { useFocusEffect } from 'expo-router'
import { useCallback, useState, type ReactNode } from 'react'
import { Image, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native'

import { IconoCandado, Texto, fuente } from '../diseno'
import * as G from '../juego/guardado'
import * as J from '../juego/maquina'
import { reglas } from '../reglas'
import * as F from '../texto/fechas'
import * as TJ from '../texto/juego'
import * as T from '../texto/mesa'
import * as Gu from './guion'
import * as M from './maquina'

/**
 * Mi mesa de una cena, ya revelada: la entrega 20 de Design (15-10-2026),
 * calcada. De arriba abajo: la tarjeta de la mesa con la foto de la entrada,
 * Con quién cenas, Paso a paso, El juego de la mesa y Cancelar.
 *
 * Las tres tarjetas se despliegan. Al entrar: antes de la cena, abierta Con
 * quién; en curso y terminada, Paso a paso. Nunca las tres abiertas de
 * entrada, y lo que la persona abra o cierre se respeta mientras siga aquí.
 *
 * El espejo en la web es `Aro Club - Mi mesa.dc.html` (lo monta el agente):
 * mismo orden, mismo copy, mismas reglas.
 */
type Clave = 'gente' | 'paso' | 'juego'

export function MesaCena(p: {
  d: M.DeServidor
  ahora: number
  ir: (destino: string) => void
  /** «Voy tarde»: abre o cierra el panel, que va justo debajo de la tarjeta. */
  alTarde: () => void
  tarde: ReactNode
  /** «Hubo ajustes de última hora», arriba del todo (16-10). */
  ajustes?: ReactNode
  /** Lo que contestó de la grabación y «Cambiarlo», fuera del desplegable: se cambia sin buscarlo. */
  grabacion?: ReactNode
}) {
  const { d, ahora, ir } = p
  const zona = d.zonaHoraria ?? null
  // La reserva dura siempre dos horas desde el inicio (Michael, 15-10): no se lee ningún cierre del servidor.
  const pasos = Gu.pasos(d.empiezaEn, zona, d.formato)
  const momento = Gu.momentoDeCena(pasos, ahora)
  const [abiertas, setAbiertas] = useState<Record<Clave, boolean>>(() =>
    momento === 'antes' ? { gente: true, paso: false, juego: false } : { gente: false, paso: true, juego: false },
  )
  const poner = (k: Clave, v: boolean) => setAbiertas((a) => ({ ...a, [k]: v }))

  // El avance del juego vive en el teléfono: se relee al volver del juego.
  const [guardado, setGuardado] = useState<J.Guardado>(J.guardadoVacio())
  useFocusEffect(
    useCallback(() => {
      if (d.mesaId) G.cargar(d.mesaId).then(setGuardado)
      // «Volver al paso a paso» (fin de la ronda 1).
      if (G.tomarPedidoPaso()) setAbiertas({ gente: false, paso: true, juego: false })
    }, [d.mesaId]),
  )

  const jugar = (como: string) => d.mesaId && ir(`/juego?mesa=${d.mesaId}&ir=${como}`)
  const otros = M.otros(d)
  const mapa = M.mapa(d, Platform.OS)
  const sitios = (d.paraSeguir ?? []).filter((x) => x.nombre).slice(0, 3)

  const actual = Gu.enCurso(pasos, ahora)
  const enCursoPaso = momento === 'antes' ? null : actual
  const ahoraPaso = enCursoPaso ? pasos.filter((x) => x.en === enCursoPaso) : []
  const ultimoAhora = ahoraPaso[ahoraPaso.length - 1]
  const resumenPaso = !pasos.length
    ? ''
    : momento === 'antes'
      ? T.cena.paso.resumenAntes(pasos.length, Gu.sinSufijo(F.horaEn(pasos[0].en, zona)), F.horaEn(pasos[pasos.length - 1].en, zona))
      : ultimoAhora?.momento === 'despedida' && sitios.length
        ? T.cena.paso.resumenSitios(ultimoAhora.nombre, sitios.length)
        : T.cena.paso.resumenAhora(ultimoAhora?.nombre ?? pasos[0].nombre)

  const cerradoHasta = J.ventana(d.empiezaEn, ahora) === 'antes' ? F.horaEn(d.empiezaEn, zona) : null
  const reiniciar = async () => {
    if (!d.mesaId) return
    await G.borrar(d.mesaId)
    setGuardado(J.guardadoVacio())
  }

  return (
    <View style={{ gap: 12 }}>
      {p.ajustes}
      <TarjetaMesa d={d} momento={momento} mapa={mapa} ir={ir} alTarde={p.alTarde} />
      {p.tarde}

      <Desplegable
        titulo={T.cena.conQuien.titulo(M.voz(d))}
        resumen={T.cena.conQuien.resumen(otros.length)}
        nota={d.mesaCorta}
        abierta={abiertas.gente}
        alTocar={() => poner('gente', !abiertas.gente)}
      >
        <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
          {otros.map((c) => (
            <View key={c.id} style={e.persona}>
              <View style={e.inicial}>
                <Texto style={serif(16, 1)}>{c.inicial}</Texto>
              </View>
              <Texto style={[serif(18, 1.15), { flex: 1 }]} numberOfLines={1}>
                {c.nombre}
              </Texto>
              {/* Como la web: «Salud · se sumó después». */}
              <Texto style={[texto(13, 1), { color: C.cuerpo }]}>{c.seUnio ? `${c.sector} · ${T.abierta.seUnio}` : c.sector}</Texto>
            </View>
          ))}
          {/* De qué está hecha la mesa (29-10): solo el conjunto, sin decir quién es qué. */}
          {M.arraigos(d).length ? (
            <View style={e.arraigos}>
              <Texto style={[texto(11, 1.2), { color: C.cuerpo, letterSpacing: 1.2, fontFamily: fuente.textoSemi }]}>{T.abierta.arraigos(true)}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {M.arraigos(d).map((a) => (
                  <View key={a} style={e.ficha}>
                    <Texto style={texto(13, 1.2)}>{a}</Texto>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {/* La nota de antes de la entrega 20: Michael la quiso de vuelta (15-10). */}
          <Texto style={[texto(13, 1.4), e.nota]}>{T.abierta.notaCompaneros(true)}</Texto>
        </View>
      </Desplegable>

      {p.grabacion}

      {pasos.length ? (
        <Desplegable titulo={T.cena.paso.titulo} resumen={resumenPaso} abierta={abiertas.paso} alTocar={() => poner('paso', !abiertas.paso)}>
          <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
            <Texto style={[texto(14, 1.45), { color: C.cuerpo, paddingBottom: 6 }]}>{T.guion.bajada}</Texto>
            {pasos.map((x) => {
              const ahoraEs = enCursoPaso !== null && x.en === enCursoPaso
              const pasado = enCursoPaso !== null && Date.parse(x.en) < Date.parse(enCursoPaso)
              const enlace = x.botonJuego || null
              return (
                <View key={x.momento} style={[e.fila, ahoraEs ? e.filaAhora : null]}>
                  <Texto style={[e.hora, { color: ahoraEs ? C.terracota : pasado ? C.pasado : C.cuerpo }]}>{Gu.sinSufijo(x.hora)}</Texto>
                  <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    {ahoraEs ? (
                      <View style={e.ahora}>
                        <Texto style={e.ahoraTexto}>{T.guion.ahora}</Texto>
                      </View>
                    ) : null}
                    <Texto style={[serif(ahoraEs ? 22 : 19, 1.15, -0.015), { color: pasado ? C.pasado : C.tinta }]}>{x.nombre}</Texto>
                    <Texto style={[texto(15, 1.45), { color: pasado ? C.pasado : C.cuerpo }]}>{x.texto}</Texto>
                    {enlace && d.mesaId ? (
                      <Pressable
                        onPress={() => poner('juego', true)}
                        accessibilityRole="button"
                        style={[
                          e.enlaceJuego,
                          ahoraEs ? { backgroundColor: C.tinta } : { borderWidth: 1.5, borderColor: pasado ? 'rgba(20,52,42,.25)' : C.verde },
                        ]}
                      >
                        <Texto style={[semi(14), { color: ahoraEs ? C.crema : pasado ? C.pasado : C.verde }]}>{enlace}</Texto>
                      </Pressable>
                    ) : null}
                    {x.momento === 'despedida' && sitios.length ? (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        <Texto style={[e.etiqueta, { color: C.terracota }]}>{T.guion.seguir.titulo.toUpperCase()}</Texto>
                        {sitios.map((s) => {
                          const m2 = M.mapa(s, Platform.OS)
                          return (
                            <View key={s.nombre} style={e.sitio}>
                              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                                <Texto style={serif(17, 1.15)}>{s.nombre}</Texto>
                                {M.detalleSitio(s, T.guion.seguir.aPie) ? <Texto style={[media(13), { color: C.cuerpo }]}>{M.detalleSitio(s, T.guion.seguir.aPie)}</Texto> : null}
                              </View>
                              {m2 ? (
                                <Pressable onPress={() => ir('externo:' + m2)} accessibilityRole="link" style={e.botonSitio}>
                                  <Texto style={[semi(13), { color: C.verde }]}>{T.guion.seguir.comoLlegar}</Texto>
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
        </Desplegable>
      ) : null}

      {d.mesaId ? (
        cerradoHasta != null ? (
          // 1a (entrega 21): a la hora de la cena, ni un minuto antes.
          <JuegoCerrado hora={cerradoHasta} delPlan={M.voz(d).delPlan} />
        ) : J.terminado(guardado) ? (
          // 1b y 1c: jugado entero, o terminado con «Terminar aquí».
          <JuegoJugado
            jugadas={J.jugadas(guardado)}
            volver={async () => {
              await reiniciar()
              poner('juego', true)
            }}
          />
        ) : (
          <Desplegable oscura titulo={TJ.tarjeta.titulo} resumen={TJ.tarjeta.resumen} abierta={abiertas.juego} alTocar={() => poner('juego', !abiertas.juego)}>
            <TarjetaJuego
              guardado={guardado}
              mesaId={d.mesaId}
              horaHielo={F.horaEn(pasos.find((x) => x.momento === 'hielo')?.en, zona)}
              jugar={jugar}
              reiniciar={reiniciar}
            />
          </Desplegable>
        )
      ) : null}

      <Pressable onPress={() => ir('/cancelar')} accessibilityRole="link" style={e.cancelar}>
        <Texto style={[semi(15), { color: C.terracota, textDecorationLine: 'underline' }]}>{T.cancelar}</Texto>
      </Pressable>
    </View>
  )
}

// --- La tarjeta de la mesa ----------------------------------------------------

function TarjetaMesa(p: { d: M.DeServidor; momento: Gu.MomentoCena; mapa: string | null; ir: (d: string) => void; alTarde: () => void }) {
  const { d } = p
  const zona = d.zonaHoraria ?? null
  const num = M.conNumero(d) ? M.numero(d) : ''
  const cuando = [F.diaYNumero(d.empiezaEn, zona), F.horaEn(d.empiezaEn, zona)].filter(Boolean).join(' · ')
  return (
    <View style={e.mesa}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <View style={e.sello}>
          <Texto style={e.selloTexto}>{T.cena.sello[p.momento]}</Texto>
        </View>
        <Texto style={[media(13), { color: C.cuerpoVerde }]}>{cuando}</Texto>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 14 }}>
        {num ? (
          <View>
            <Texto style={[media(10), { letterSpacing: 1.6, color: C.secundarioVerde }]}>{T.cena.mesa}</Texto>
            <Texto style={e.numero}>{num}</Texto>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 3 }}>
          <Texto style={[serif(24, 1.05, -0.02), { color: C.crema }]}>{d.restaurante || '—'}</Texto>
          {d.direccion ? <Texto style={[texto(14, 1.4), { color: C.cuerpoVerde, marginTop: 4 }]}>{d.direccion}</Texto> : null}
        </View>
      </View>
      <View style={e.llegada}>
        {d.fotoEntrada ? (
          <Image
            source={{ uri: d.fotoEntrada }}
            // La foto llega ya encuadrada a 16:9 desde el panel (1600 × 900): se enseña entera, como en la web y los correos.
            style={{ width: '100%', aspectRatio: 16 / 9 }}
            resizeMode="cover"
            accessibilityLabel={T.cena.fotoEntrada(d.restaurante || '')}
          />
        ) : null}
        <View style={{ paddingVertical: 11, paddingHorizontal: 13, gap: 4 }}>
          <Texto style={[e.etiqueta, { fontSize: 10, color: C.acento }]}>{d.fotoEntrada ? T.cena.alLlegarFoto : T.cena.alLlegar}</Texto>
          <Texto style={[texto(14, 1.4), { color: C.crema }]}>{T.cena.diLaMesa(num)}</Texto>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {p.mapa ? (
          <Pressable onPress={() => p.ir('externo:' + p.mapa)} accessibilityRole="button" style={({ pressed }) => [e.botonMesa, { backgroundColor: pressed ? C.acento : C.crema }]}>
            <Texto style={[semi(14), { color: C.tinta }]}>{T.abierta.comoLlegar}</Texto>
          </Pressable>
        ) : null}
        <Pressable onPress={p.alTarde} accessibilityRole="button" style={({ pressed }) => [e.botonMesa, e.botonTarde, pressed && { backgroundColor: 'rgba(250,243,228,.12)' }]}>
          <Texto style={[semi(14), { color: C.crema }]}>{T.abierta.vozTarde}</Texto>
        </Pressable>
      </View>
      {/* Cuánto dura la mesa (Michael, 22-10): en gris y dentro de la tarjeta, como «Al llegar». No es una alarma. */}
      {d.avisoDosHoras ? <Texto style={[texto(13, 1.5), { color: C.secundarioVerde, marginTop: 14 }]}>{d.avisoDosHoras}</Texto> : null}
    </View>
  )
}

// --- La tarjeta que se despliega ---------------------------------------------------

function Desplegable(p: { titulo: string; resumen: string; nota?: string | null; abierta: boolean; alTocar: () => void; oscura?: boolean; children: ReactNode }) {
  const o = !!p.oscura
  return (
    <View style={[e.tarjeta, o ? { backgroundColor: C.tinta, borderWidth: 0 } : null]}>
      <Pressable
        onPress={p.alTocar}
        accessibilityRole="button"
        accessibilityState={{ expanded: p.abierta }}
        accessibilityLabel={p.abierta ? T.cena.cerrar(p.titulo) : T.cena.abrir(p.titulo)}
        style={e.cabeza}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto style={[serif(21, 1.1, -0.015), { color: o ? C.crema : C.tinta }]}>{p.titulo}</Texto>
          {p.resumen ? <Texto style={[texto(13, 1.35), { color: o ? C.cuerpoVerde : C.cuerpo, marginTop: 3 }]}>{p.resumen}</Texto> : null}
        </View>
        <View style={[e.chevron, { backgroundColor: o ? 'rgba(250,243,228,.12)' : '#F2E9D5' }]}>
          <Texto style={[semi(18), { color: o ? C.acento : C.tinta }]}>{p.abierta ? '−' : '+'}</Texto>
        </View>
      </Pressable>
      {/* La mesa corta (Michael, 22-10): «informativo y ya». Debajo del resumen, con el tamaño de una nota, abierta o cerrada. */}
      {p.nota ? <Texto style={[texto(13, 1.5), { color: o ? C.secundarioVerde : C.pasado, paddingHorizontal: 18, paddingBottom: 15, marginTop: -6 }]}>{p.nota}</Texto> : null}
      {p.abierta ? p.children : null}
    </View>
  )
}

// --- El juego en Mi mesa --------------------------------------------------------

function TarjetaJuego(p: {
  guardado: J.Guardado
  mesaId: string
  horaHielo: string
  jugar: (como: string) => void
  reiniciar: () => void
}) {
  const g = p.guardado
  const punt = J.puntero(g)
  const hayAvance = g.empezado
  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
      <Texto style={[texto(14, 1.45), { color: C.cuerpoVerde, paddingBottom: 6 }]}>{TJ.tarjeta.intro}</Texto>
      {reglas.JUEGO.rondas.map((r, i) => {
        const est = J.estadoRonda(g, i, p.mesaId)
        const texto2 = est.tipo === 'hecha' ? TJ.tarjeta.hecha : est.tipo === 'ahora' ? TJ.tarjeta.deTotal(est.n!, est.de!) : TJ.tarjeta.ir
        return (
          <View key={r.clave} style={e.ronda}>
            <Texto style={[serif(20, 1.1), { color: C.acento, width: 30 }]}>{i + 1}</Texto>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Texto style={[serif(18, 1.15), { color: C.crema }]}>{r.titulo}</Texto>
              <Texto style={[e.etiqueta, { fontSize: 10, color: C.acento }]}>{TJ.tarjeta.cuando(i, p.horaHielo).toUpperCase()}</Texto>
              <Texto style={[texto(13, 1.4), { color: C.cuerpoVerde }]}>{TJ.tarjeta.bajada(i)}</Texto>
            </View>
            <Pressable
              onPress={() => p.jugar(`ronda-${i}`)}
              accessibilityRole="button"
              accessibilityLabel={`${TJ.tarjeta.irA(i + 1)} · ${texto2}`}
              style={[
                e.estado,
                est.tipo === 'ahora'
                  ? { backgroundColor: C.acento }
                  : est.tipo === 'hecha'
                    ? { borderWidth: 1, borderColor: 'rgba(156,187,166,.5)' }
                    : { borderWidth: 1, borderColor: 'rgba(250,243,228,.35)' },
              ]}
            >
              <Texto style={[semi(11), { color: est.tipo === 'ahora' ? C.tinta : est.tipo === 'hecha' ? C.secundarioVerde : C.crema }]}>{texto2}</Texto>
            </Pressable>
          </View>
        )
      })}
      {(
        <>
          <Pressable onPress={() => p.jugar(hayAvance ? 'seguir' : 'empezar')} accessibilityRole="button" style={({ pressed }) => [e.cta, pressed && { opacity: 0.85 }]}>
            <Texto style={[semi(15), { color: C.tinta }]}>{hayAvance && punt ? TJ.tarjeta.seguir(punt.ronda + 1, punt.indice + 1) : TJ.tarjeta.empezar}</Texto>
          </Pressable>
          {hayAvance ? (
            <Pressable onPress={p.reiniciar} accessibilityRole="button" style={e.reiniciar}>
              <Texto style={[semi(14), { color: C.cuerpoVerde, textDecorationLine: 'underline' }]}>{TJ.tarjeta.reiniciar}</Texto>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  )
}

/** 1a · Antes de la hora de la cena: se ve qué hay, pero nada se puede abrir. */
function JuegoCerrado({ hora, delPlan }: { hora: string; delPlan: string }) {
  return (
    <View style={[e.tarjeta, { backgroundColor: C.tinta, borderWidth: 0 }]}>
      <View style={e.cabeza}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto style={[serif(21, 1.1, -0.015), { color: C.crema }]}>{TJ.tarjeta.titulo}</Texto>
          <Texto style={[texto(13, 1.35), { color: C.cuerpoVerde, marginTop: 3 }]}>{TJ.tarjeta.resumenCerrado(delPlan)}</Texto>
        </View>
      </View>
      <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
        <View style={{ opacity: 0.45 }}>
          {reglas.JUEGO.rondas.map((r, i) => (
            <View key={r.clave} style={e.ronda}>
              <Texto style={[serif(20, 1.1), { color: C.acento, width: 30 }]}>{i + 1}</Texto>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Texto style={[serif(18, 1.15), { color: C.crema }]}>{r.titulo}</Texto>
                <Texto style={[texto(13, 1.4), { color: C.cuerpoVerde }]}>{TJ.tarjeta.bajada(i)}</Texto>
              </View>
            </View>
          ))}
        </View>
        <View style={e.candado} accessibilityRole="text">
          <IconoCandado tam={20} color={C.acento} />
          <Texto style={[texto(14, 1.3), { fontFamily: fuente.textoMedia, color: C.crema, flex: 1 }]}>{TJ.tarjeta.seAbre(hora, delPlan)}</Texto>
        </View>
      </View>
    </View>
  )
}

/** 1b y 1c · Jugado: la tarjeta repite la última frase del juego. Sin botón principal. */
function JuegoJugado({ jugadas, volver }: { jugadas: number; volver: () => void }) {
  return (
    <View style={[e.tarjeta, { backgroundColor: C.tinta, borderWidth: 0 }]}>
      <View style={e.cabeza}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto style={[serif(21, 1.1, -0.015), { color: C.crema }]}>{TJ.tarjeta.titulo}</Texto>
          <Texto style={[texto(13, 1.35), { color: C.cuerpoVerde, marginTop: 3 }]}>{TJ.tarjeta.jugado(jugadas, J.RONDAS())}</Texto>
        </View>
        <View style={e.hecho}>
          <Texto style={[semi(11), { color: C.secundarioVerde }]}>{TJ.tarjeta.hecho}</Texto>
        </View>
      </View>
      <View style={e.jugado}>
        <Texto style={[serif(26, 1.1, -0.02), { color: C.crema, paddingTop: 12 }]}>
          {TJ.juego.final.titulo} <Texto style={[serif(26, 1.1, -0.02), { color: C.acento }]}>{TJ.juego.final.resto}</Texto>
        </Texto>
        <Pressable onPress={volver} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Texto style={[semi(14), { color: C.cuerpoVerde, textDecorationLine: 'underline' }]}>{TJ.tarjeta.volverAJugar}</Texto>
        </Pressable>
      </View>
    </View>
  )
}

// --- Estilos: los valores de la maqueta, tal cual ---------------------------------

const C = {
  tinta: '#14342A',
  verde: '#1B5138',
  crema: '#FAF3E4',
  papel: '#FFF8EA',
  cuerpo: '#33513F',
  pasado: '#566A5D',
  terracota: '#8F4515',
  acento: '#E39C63',
  cuerpoVerde: '#C5D8CA',
  secundarioVerde: '#9CBBA6',
}

/** Interlineado: el de la maqueta, salvo por debajo del suelo de cada fuente (Young Serif 1,42; Inter Tight 1,21), que recorta tildes. */
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const serif = (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: C.tinta })
const texto = (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })
const media = (tam: number): TextStyle => ({ fontFamily: fuente.textoMedia, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })
const semi = (tam: number): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })

const e = StyleSheet.create({
  mesa: { borderRadius: 24, backgroundColor: C.tinta, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  sello: { minHeight: 26, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.acento, justifyContent: 'center' },
  selloTexto: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, color: C.tinta },
  numero: { fontFamily: fuente.textoNegrita, fontSize: 48, lineHeight: 58, letterSpacing: -2.4, color: C.crema, marginTop: 4, fontVariant: ['tabular-nums'] },
  llegada: { marginTop: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: C.verde },
  etiqueta: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.54 },
  botonMesa: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  botonTarde: { borderWidth: 1.5, borderColor: 'rgba(250,243,228,.5)' },
  tarjeta: { borderRadius: 22, backgroundColor: C.papel, borderWidth: 1, borderColor: 'rgba(20,52,42,.12)', overflow: 'hidden' },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 18, minHeight: 44 },
  chevron: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.1)' },
  inicial: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C5D8CA', alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', gap: 8, paddingVertical: 14, paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 16, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.1)' },
  filaAhora: { borderTopWidth: 0, backgroundColor: '#F2E9D5' },
  hora: { width: 54, fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  ahora: { alignSelf: 'flex-start', minHeight: 22, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.acento, justifyContent: 'center' },
  ahoraTexto: { fontFamily: fuente.textoNegrita, fontSize: 10, lineHeight: 13, letterSpacing: 1.4, color: C.tinta },
  enlaceJuego: { alignSelf: 'flex-start', marginTop: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center' },
  sitio: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.crema, borderWidth: 1, borderColor: 'rgba(20,52,42,.12)', borderRadius: 14, paddingVertical: 10, paddingRight: 10, paddingLeft: 12 },
  botonSitio: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: C.verde, justifyContent: 'center' },
  ronda: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(250,243,228,.15)' },
  estado: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: 8, minHeight: 48, borderRadius: 999, backgroundColor: C.acento, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  reiniciar: { minHeight: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  arraigos: { gap: 10, paddingTop: 12, paddingBottom: 14 },
  ficha: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,52,42,.18)', paddingHorizontal: 12, paddingVertical: 7 },
  nota: { color: C.cuerpo, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.1)' },
  candado: { marginTop: 8, minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(250,243,228,.25)', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hecho: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(156,187,166,.5)', justifyContent: 'center' },
  jugado: { paddingTop: 6, paddingHorizontal: 18, paddingBottom: 18, gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(250,243,228,.15)' },
  cancelar: { marginTop: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
})
