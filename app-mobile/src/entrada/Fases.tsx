import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { AroCarga, Boton, Campo, Enfasis, Marca, Opcion, Puntos, Texto, color, cremaAlfa, radio } from '../diseno'
import * as T from '../texto/entrada'
import { completa, enTope, marcadas, type Estado } from './maquina'
import type { Pregunta } from './preguntas'

/**
 * Las fases de la entrada, fieles al bloque «Registro» de la portada web:
 * fondo verde profundo, titulares en Young Serif crema, las bajadas en verde
 * claro. Cada fase recibe lo que pinta; ninguna lleva datos de ejemplo
 * (PEDIDO §6 bis, regla 4).
 */

export function Cabecera({ onEntrar }: { onEntrar?: () => void }) {
  return (
    <View style={estilos.cabecera}>
      <View style={estilos.marca}>
        <Marca sobreVerde />
        <Texto variante="marca" tono="crema">
          Aro Club
        </Texto>
      </View>
      {onEntrar ? <Boton tipo="fantasmaSobreVerde" texto="Entrar" onPress={onEntrar} /> : null}
    </View>
  )
}

/** La cabecera de la portada: el chip de la fecha y el titular. */
export function Portada({ chip }: { chip: string | null }) {
  const t = T.titular
  return (
    <View style={{ gap: 18, marginBottom: 36 }}>
      {chip ? (
        <View style={estilos.chip}>
          <View style={estilos.puntoChip} />
          <Texto variante="nota" tono="crema" style={{ flexShrink: 1 }}>
            {chip}
          </Texto>
        </View>
      ) : null}
      <Texto variante="portada" tono="crema">
        {t.linea}
        {'\n'}
        <Enfasis sobreVerde>{t.enfasis}</Enfasis>
      </Texto>
    </View>
  )
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <Texto variante="titularGrande" tono="crema" style={{ marginBottom: 18 }}>
      {children}
    </Texto>
  )
}

function Bajada({ children }: { children: ReactNode }) {
  return (
    <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" style={{ marginBottom: 26 }}>
      {children}
    </Texto>
  )
}

function Sello({ texto, relleno }: { texto: string; relleno?: boolean }) {
  return (
    <View style={[estilos.sello, relleno ? { backgroundColor: color.crema } : { borderWidth: 1, borderColor: cremaAlfa(0.34) }]}>
      <Texto variante="etiqueta" tono={relleno ? 'tinta' : 'crema'}>
        {texto}
      </Texto>
    </View>
  )
}

export function FaseCorreo(p: {
  correo: string
  error: string
  yaTienePuesto: boolean
  onCambio: (v: string) => void
  onEnviar: () => void
}) {
  return (
    <View>
      <Titulo>{T.correo.titulo}</Titulo>
      <Bajada>{T.correo.bajada(p.yaTienePuesto)}</Bajada>
      <View style={{ gap: 11 }}>
        <Campo
          fondo="verde"
          value={p.correo}
          onChangeText={p.onCambio}
          onSubmitEditing={p.onEnviar}
          placeholder={T.correo.ejemplo}
          accessibilityLabel={T.correo.etiqueta}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
        />
        <Boton tipo="sobreVerde" texto={T.correo.boton} ancho onPress={p.onEnviar} />
      </View>
      {p.error ? (
        <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 13 }}>
          {p.error}
        </Texto>
      ) : null}
      <View style={estilos.garantias}>
        {T.correo.garantias.map((g) => (
          <Texto key={g} variante="nota" tono="sobreVerdeSecundario">
            {g}
          </Texto>
        ))}
      </View>
    </View>
  )
}

/**
 * Mientras se guarda el correo. La web usa aquí un spinner genérico; en la
 * app va el aro, que es el indicador de carga del sistema. Anotado.
 */
export function FaseEnviando({ correo }: { correo: string }) {
  return (
    <View>
      <Titulo>{T.enviando.titulo}</Titulo>
      <View style={estilos.enviando}>
        <AroCarga tam={20} sobreVerde />
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde" numberOfLines={1} style={{ flexShrink: 1 }}>
          {correo}
        </Texto>
      </View>
    </View>
  )
}

export function FaseQuiz(p: {
  estado: Estado
  pregunta: Pregunta
  total: number
  guardando: boolean
  onMarcar: (valor: string) => void
  onSiguiente: () => void
  onAtras: () => void
}) {
  const { estado: e, pregunta: q } = p
  const lista = completa(e, q)
  const ultimo = e.paso >= p.total - 1
  const sel = marcadas(e, q.clave)
  return (
    <View>
      <View style={estilos.progreso}>
        <Puntos total={p.total} actual={e.paso} />
        <Texto variante="etiqueta" tono="sobreVerdeSecundario">
          {T.quiz.progreso(e.paso, p.total)}
        </Texto>
      </View>
      <Texto variante="etiqueta" tono="terracotaSobreVerde" style={{ marginBottom: 16 }}>
        {q.etiqueta}
      </Texto>
      <Texto variante="display" tono="crema" style={{ marginBottom: 12 }}>
        {q.enunciado}
      </Texto>
      {q.ayuda ? (
        <Texto variante="cuerpo" tono="sobreVerdeSecundario" style={{ marginBottom: 24 }}>
          {q.ayuda}
        </Texto>
      ) : (
        <View style={{ height: 18 }} />
      )}
      <View style={q.unica ? estilos.columna : estilos.envolver}>
        {q.opciones.map((o) => (
          <Opcion
            key={o.valor}
            fondo="verde"
            unica={q.unica}
            texto={o.label}
            marcada={sel.includes(o.valor)}
            enTope={enTope(e, q, o.valor)}
            onPress={() => p.onMarcar(o.valor)}
          />
        ))}
      </View>
      {e.error ? (
        <Texto variante="cuerpoChico" tono="avisoSobreVerde" accessibilityLiveRegion="polite" style={{ marginTop: 18 }}>
          {e.error}
        </Texto>
      ) : null}
      <View style={estilos.acciones}>
        {p.guardando ? (
          <View style={estilos.enviando}>
            <AroCarga tam={20} sobreVerde />
          </View>
        ) : (
          <Boton
            tipo="sobreVerde"
            texto={lista ? (ultimo ? T.quiz.terminar : T.quiz.siguiente) : T.quiz.elige}
            disabled={!lista}
            onPress={p.onSiguiente}
          />
        )}
        {e.paso > 0 && !p.guardando ? <Boton tipo="fantasmaSobreVerde" texto={T.quiz.atras} onPress={p.onAtras} /> : null}
      </View>
    </View>
  )
}

/** El catálogo no llegó: se dice y se ofrece reintentar. Tu puesto ya está guardado. */
export function FaseSinPreguntas({ onReintentar }: { onReintentar: () => void }) {
  return (
    <View>
      <Texto variante="cuerpoGrande" tono="avisoSobreVerde" accessibilityLiveRegion="polite">
        {T.sinRespuesta.preguntas}
      </Texto>
      <View style={estilos.acciones}>
        <Boton tipo="sobreVerde" texto={T.sinRespuesta.reintentar} onPress={onReintentar} />
      </View>
    </View>
  )
}

export function FaseFinal(p: { correo: string; hayFecha: boolean; zonas: string[]; onCompletar: () => void; onDespues: () => void }) {
  return (
    <View>
      <Sello texto={T.final.sello} relleno />
      <Titulo>{T.final.titulo}</Titulo>
      <Bajada>{T.final.resumen(p.correo, p.hayFecha, T.enumerar(p.zonas, T.final.zonasVacio))}</Bajada>
      <View style={estilos.pendientes}>
        <Texto variante="etiquetaChica" tono="sobreVerdeSecundario" style={{ marginBottom: 16 }}>
          {T.final.pendientesTitulo}
        </Texto>
        <View style={{ gap: 12 }}>
          {T.final.pendientes.map((x) => (
            <View key={x.n} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={estilos.numero}>
                <Texto variante="etiquetaChica" tono="terracotaSobreVerde" style={{ letterSpacing: 0 }}>
                  {x.n}
                </Texto>
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="rotulo" tono="crema">
                  {x.titulo}
                </Texto>
                <Texto variante="cuerpoChico" tono="sobreVerdeSecundario" style={{ marginTop: 3 }}>
                  {x.cuerpo}
                </Texto>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={estilos.acciones}>
        <Boton tipo="sobreVerde" texto={T.final.completar} onPress={p.onCompletar} />
        <Boton tipo="fantasmaSobreVerde" texto={T.final.despues} onPress={p.onDespues} />
      </View>
    </View>
  )
}

export function FaseRepetido(p: { correo: string; onEntrar: () => void; onOtro: () => void }) {
  return (
    <View>
      <Sello texto={T.repetido.sello} />
      <Titulo>{T.repetido.titulo}</Titulo>
      <Bajada>{T.repetido.cuerpo(p.correo)}</Bajada>
      <View style={estilos.acciones}>
        <Boton tipo="secundarioSobreVerde" texto={T.repetido.entrar} onPress={p.onEntrar} />
        <Boton tipo="fantasmaSobreVerde" texto={T.repetido.otro} onPress={p.onOtro} />
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, minHeight: 44 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderColor: cremaAlfa(0.24),
    borderRadius: radio.capsula,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  puntoChip: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.terracotaSobreVerde },
  garantias: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 22 },
  enviando: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 15,
    borderWidth: 1,
    borderColor: cremaAlfa(0.3),
    borderRadius: radio.capsula,
    minHeight: 58,
    paddingHorizontal: 25,
    maxWidth: '100%',
    marginTop: 14,
  },
  progreso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 },
  columna: { gap: 9 },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 13, marginTop: 30 },
  sello: { alignSelf: 'flex-start', borderRadius: radio.capsula, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 24 },
  pendientes: { borderWidth: 1, borderColor: cremaAlfa(0.2), borderRadius: 26, padding: 20, marginBottom: 4 },
  numero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: cremaAlfa(0.32),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
})
