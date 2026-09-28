import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Cabecera } from '../cuenta/Cabecera'
import { Aviso, Boton, Campo, EnlacePie, Fecha, IconoAbrir, IconoCruz, Interruptor, Opcion, Texto, color, fuente, medida, radio, tinta, verdeAlfa } from '../diseno'
import { reglas } from '../reglas'
import { MESES_CORTOS } from '../texto/fechas'
import * as F from '../texto/fechas'
import * as T from '../texto/perfil'
import * as M from './maquina'
import type { crearServicioPerfil, Exclusion } from './servicio'

type Servicio = ReturnType<typeof crearServicioPerfil>

/**
 * Perfil (`/perfil`), calcado de `Mi perfil.dc.html`: saludo y
 * credenciales, cada dato y cada respuesta editable en su fila, con quién
 * no coincides, las cenas, cómo te escribimos, y la baja.
 *
 * `ir`: rutas de la app («/verificacion») o páginas de la web
 * («web:/privacidad»). `alBaja`: la cuenta ya no existe; cerrar la sesión.
 */
export function Perfil(p: { servicio: Servicio; ir: (d: string) => void; alEntrar: () => void; alSalir: () => Promise<void>; alBaja: () => Promise<void> }) {
  const insets = useSafeAreaInsets()
  const { servicio, alEntrar } = p
  const [d, setD] = useState<M.DeServidor | null>(null)
  const [fallo, setFallo] = useState('')
  const [refrescando, setRefrescando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  const [abierta, setAbierta] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<M.Valor>(null)
  const [guardando, setGuardando] = useState(false)
  const [falloCampo, setFalloCampo] = useState('')

  const [excl, setExcl] = useState<Exclusion[] | null>(null)
  const [quitando, setQuitando] = useState<string | null>(null)
  const [falloExcl, setFalloExcl] = useState('')

  const [avisos, setAvisos] = useState<M.Aviso[]>([])
  const [whatsappDesde, setWhatsappDesde] = useState<string | null>(null)
  const [falloAvisos, setFalloAvisos] = useState('')

  const [baja, setBaja] = useState(false)
  const [palabra, setPalabra] = useState('')
  const [dandoDeBaja, setDandoDeBaja] = useState(false)
  const [falloBaja, setFalloBaja] = useState('')

  const leerPerfil = useCallback(async () => {
    const r = await servicio.perfil()
    if (r.ok) {
      setD(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar()
    else setFallo(r.error)
  }, [servicio, alEntrar])
  const leerExcl = useCallback(async () => {
    const r = await servicio.exclusiones()
    setExcl(r.ok ? r.datos.exclusiones : [])
    setQuitando(null)
  }, [servicio])
  const leerAvisos = useCallback(async () => {
    const r = await servicio.avisos()
    if (r.ok) {
      setAvisos(r.datos.avisos)
      setWhatsappDesde(r.datos.whatsappDesde)
    }
  }, [servicio])
  const todo = useCallback(() => Promise.all([leerPerfil(), leerExcl(), leerAvisos()]), [leerPerfil, leerExcl, leerAvisos])

  useEffect(() => {
    todo()
  }, [todo])

  const campos = d ? M.campos(d) : []
  const vals = d ? M.valores(d) : {}

  const abrir = (c: M.Campo) => {
    setFalloCampo('')
    if (abierta === c.clave) return (setAbierta(null), setBorrador(null))
    setAbierta(c.clave)
    const v = vals[c.clave] ?? null
    setBorrador(Array.isArray(v) ? [...v] : c.clave === 'telefono' && typeof v === 'string' ? v.replace(/^\+58/, '') : v)
  }

  const guardar = async (c: M.Campo) => {
    if (M.falta(c, borrador) || guardando) return
    setGuardando(true)
    setFalloCampo('')
    const r = await servicio.guardar(c.clave, M.paraGuardar(c, borrador))
    setGuardando(false)
    // La web se tragaba este error (lo guardaba y no lo pintaba): aquí se dice.
    if (!r.ok) return setFalloCampo(r.error)
    setAbierta(null)
    setBorrador(null)
    leerPerfil()
  }

  const alternar = async (a: M.Aviso) => {
    if (a.fijo) return
    const antes = avisos
    setAvisos(M.alternarAviso(avisos, a.clave, !a.encendido))
    setFalloAvisos('')
    const r = await servicio.aviso(a.clave, !a.encendido)
    // Se relee: la fecha del permiso de WhatsApp la pone el servidor.
    if (r.ok) leerAvisos()
    else {
      setAvisos(antes)
      setFalloAvisos(T.avisos.noGuardado)
    }
  }

  const quitar = async (id: string) => {
    if (quitando) return
    setQuitando(id)
    setFalloExcl('')
    const r = await servicio.quitarExclusion(id)
    if (!r.ok) {
      setQuitando(null)
      return setFalloExcl(r.error)
    }
    leerExcl()
  }

  const darDeBaja = async () => {
    if (!M.puedeBaja(palabra) || dandoDeBaja) return
    setDandoDeBaja(true)
    setFalloBaja('')
    const r = await servicio.baja()
    if (!r.ok) {
      setDandoDeBaja(false)
      return setFalloBaja(r.error)
    }
    await p.alBaja()
  }

  let cuerpo
  if (!d) {
    cuerpo = fallo ? (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), todo())} />
      </View>
    ) : null
  } else {
    const hist = M.historial(d)
    cuerpo = (
      <>
        <Texto variante="titularGrande" accessibilityRole="header">
          {T.cabecera.saludo(d.base.trato)}
        </Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 }}>
          {M.credenciales(d).map((c) => (
            <View key={c.texto} style={[estilos.credencial, c.destacada ? { backgroundColor: verdeAlfa(0.11), borderColor: 'transparent' } : null]}>
              <Texto variante="etiqueta" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0.5, color: c.destacada ? color.verde : color.secundario }}>
                {c.texto}
              </Texto>
            </View>
          ))}
        </View>
        <Texto variante="cuerpo" tono="secundario" style={{ marginTop: 18 }}>
          {T.cabecera.soloVen}
        </Texto>
        <Texto variante="cuerpo" tono="secundario" style={{ marginTop: 14 }}>
          {T.cabecera.entrasCon}
          <Texto variante="cuerpo" tono="tinta" style={{ fontFamily: fuente.textoSemi }}>
            {d.correo}
          </Texto>
          .
          {d.contacto && d.contacto !== d.correo ? (
            <>
              {' '}
              {T.cabecera.teEscribimos}
              <Texto variante="cuerpo" tono="tinta" style={{ fontFamily: fuente.textoSemi }}>
                {d.contacto}
              </Texto>
              .
            </>
          ) : null}
          {'\n'}
          {T.cabecera.paraCambiarlo}
          <Texto variante="cuerpo" tono="verde" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('mailto:hola@aro.club')}>
            {T.cabecera.escribenos}
          </Texto>
          .
        </Texto>

        {T.SECCIONES.map(([titulo, nota], s) => {
          const filas = campos.filter((c) => c.seccion === s)
          if (!filas.length) return null
          return (
            <Seccion key={titulo} titulo={titulo} nota={nota}>
              <View style={estilos.caja}>
                {filas.map((c, i) => (
                  <FilaCampo
                    key={c.clave}
                    c={c}
                    valor={vals[c.clave] ?? null}
                    ultima={i === filas.length - 1}
                    abierta={abierta === c.clave}
                    borrador={borrador}
                    guardando={guardando}
                    fallo={abierta === c.clave ? falloCampo : ''}
                    alAbrir={() => abrir(c)}
                    alCambiar={setBorrador}
                    alGuardar={() => guardar(c)}
                  />
                ))}
              </View>
            </Seccion>
          )
        })}

        <Seccion titulo={T.exclusiones.titulo} nota={T.exclusiones.nota}>
          {excl && excl.length ? (
            <View style={estilos.caja}>
              {excl.map((x, i) => (
                <View key={x.id} style={[estilos.fila, i < excl.length - 1 ? estilos.separada : null]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texto variante="rotulo">{x.nombre}</Texto>
                    <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 3 }}>
                      {x.porQue}
                    </Texto>
                  </View>
                  {x.sePuedeQuitar ? <Boton tipo="secundario" texto={T.exclusiones.quitar(quitando === x.id)} onPress={() => quitar(x.id)} /> : null}
                </View>
              ))}
            </View>
          ) : excl ? (
            <View style={[estilos.caja, { padding: 18 }]}>
              <Texto variante="cuerpo">{T.exclusiones.vacio}</Texto>
            </View>
          ) : null}
          {falloExcl ? (
            <View style={{ marginTop: 10 }}>
              <Aviso tono="ojo">{falloExcl}</Aviso>
            </View>
          ) : null}
        </Seccion>

        <Seccion titulo={T.cenas.titulo} nota={T.cenas.nota}>
          {hist.length ? (
            <>
              {hist.map((c, i) => (
                <View key={i} style={estilos.cena}>
                  <View style={{ flexGrow: 1, flexBasis: 190, minWidth: 0 }}>
                    <Texto variante="subtitulo" style={{ fontSize: 20 }}>
                      {c.sitio}
                    </Texto>
                    <Texto variante="nota" style={{ marginTop: 3 }}>
                      {c.cuando}
                    </Texto>
                  </View>
                  <View style={[estilos.chipCena, c.fuiste ? { backgroundColor: verdeAlfa(0.11) } : null]}>
                    <Texto variante="chip" style={{ color: c.fuiste ? color.verde : color.secundario }}>
                      {c.estado}
                    </Texto>
                  </View>
                </View>
              ))}
              <Texto variante="nota" style={{ marginTop: 10 }}>
                {T.cenas.noAgenda}
              </Texto>
            </>
          ) : (
            <View style={[estilos.caja, { padding: 18 }]}>
              <Texto variante="cuerpo">{T.cenas.vacio}</Texto>
            </View>
          )}
        </Seccion>

        <Seccion titulo={T.avisos.titulo} nota={T.avisos.nota}>
          <View style={estilos.caja}>
            {avisos.map((a, i) => (
              <View key={a.clave} style={[estilos.fila, { alignItems: 'flex-start' }, i < avisos.length - 1 ? estilos.separada : null]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto variante="rotulo">{a.titulo}</Texto>
                  <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 3 }}>
                    {a.cuerpo}
                  </Texto>
                  {a.clave === 'whatsapp' && a.encendido && whatsappDesde ? (
                    <Texto variante="nota" tono="cuerpo" style={{ marginTop: 5 }}>
                      {T.avisos.desde(F.fechaNumerica(whatsappDesde))}
                    </Texto>
                  ) : null}
                </View>
                <Interruptor encendido={a.encendido} fijo={a.fijo} onCambio={() => alternar(a)} etiqueta={a.titulo} />
              </View>
            ))}
          </View>
          <Texto variante="nota" style={{ marginTop: 10 }}>
            {T.avisos.fijos}
          </Texto>
          {falloAvisos ? (
            <Texto variante="cuerpoChico" style={{ color: '#6E340F', fontFamily: fuente.textoMedia, marginTop: 9 }}>
              {falloAvisos}
            </Texto>
          ) : null}
        </Seccion>

        <View style={[estilos.recuadro, { marginTop: 36 }]}>
          <Texto variante="subtitulo" style={{ fontSize: 21 }}>
            {T.noTocaLaMesa.titulo}
          </Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 8 }}>
            {T.noTocaLaMesa.cuerpo}
          </Texto>
        </View>

        <View style={[estilos.recuadro, { marginTop: 36, borderColor: 'rgba(143,69,21,.34)' }]}>
          <Texto variante="subtitulo" style={{ fontSize: 21, color: '#6E340F' }}>
            {T.baja.titulo}
          </Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 8 }}>
            {T.baja.cuerpo}
          </Texto>
          {!baja ? (
            <Pressable onPress={() => (setBaja(true), setPalabra(''), setFalloBaja(''))} accessibilityRole="button" style={estilos.botonBaja}>
              <Texto variante="rotulo" tono="terracota">
                {T.baja.quiero}
              </Texto>
            </Pressable>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Texto variante="rotulo" style={{ fontSize: 14, marginBottom: 8 }}>
                {T.baja.escribe}
              </Texto>
              <View style={{ maxWidth: 220 }}>
                <Campo
                  value={palabra}
                  onChangeText={setPalabra}
                  placeholder={T.baja.palabra}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel={T.baja.escribe}
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 14 }}>
                <Boton tipo="grave" texto={T.baja.confirmar(dandoDeBaja, M.puedeBaja(palabra))} onPress={darDeBaja} apagado={!M.puedeBaja(palabra) || dandoDeBaja} />
                <Boton tipo="fantasma" texto={T.baja.cancelar} onPress={() => setBaja(false)} />
              </View>
              {falloBaja ? (
                <View style={{ marginTop: 12 }}>
                  <Aviso tono="ojo">{falloBaja}</Aviso>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={estilos.pie}>
          <EnlacePie fondo="crema" texto={T.pie.verificacion} onPress={() => p.ir('/verificacion')} />
          <EnlacePie fondo="crema" texto={T.pie.privacidad} onPress={() => p.ir('web:/privacidad')} />
        </View>
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <Cabecera
        arriba={insets.top}
        saliendo={saliendo}
        alSalir={async () => {
          if (saliendo) return
          setSaliendo(true)
          await p.alSalir()
        }}
      />
      <ScrollView
        contentContainerStyle={estilos.pagina}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={color.verde}
            onRefresh={async () => {
              setRefrescando(true)
              await todo()
              setRefrescando(false)
            }}
          />
        }
      >
        {cuerpo}
      </ScrollView>
    </View>
  )
}

function Seccion({ titulo, nota, children }: { titulo: string; nota: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 36 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, alignItems: 'baseline', marginBottom: 14 }}>
        <Texto variante="titulo" accessibilityRole="header">
          {titulo}
        </Texto>
        <Texto variante="cuerpoChico" tono="secundario">
          {nota}
        </Texto>
      </View>
      {children}
    </View>
  )
}

function FilaCampo(p: {
  c: M.Campo
  valor: M.Valor
  ultima: boolean
  abierta: boolean
  borrador: M.Valor
  guardando: boolean
  fallo: string
  alAbrir: () => void
  alCambiar: (v: M.Valor) => void
  alGuardar: () => void
}) {
  const { c, abierta, borrador } = p
  const falta = abierta ? M.falta(c, borrador) : null
  const lectura = abierta ? (falta ?? T.campo.editando) : M.texto(c, p.valor)
  const sel = Array.isArray(borrador) ? borrador : []
  const fecha = M.partesFecha(borrador)
  return (
    <View style={[!p.ultima ? estilos.separada : null, { backgroundColor: abierta ? color.cremaFria : 'transparent' }]}>
      <Pressable onPress={p.alAbrir} accessibilityRole="button" aria-expanded={abierta} style={[estilos.fila, { minHeight: 66 }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto variante="rotulo" style={{ fontSize: 14 }}>
            {c.etiqueta}
          </Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 4, color: c.privada ? color.terracota : color.secundario }}>
            {lectura}
          </Texto>
        </View>
        <View style={[estilos.flecha, { backgroundColor: abierta ? color.verde : verdeAlfa(0.09) }]}>
          {abierta ? <IconoCruz tam={13} color={color.crema} /> : <IconoAbrir tam={14} color={color.verde} />}
        </View>
      </Pressable>

      {abierta ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          {c.ayuda ? (
            <Texto variante="nota" style={{ marginBottom: 14 }}>
              {c.ayuda}
            </Texto>
          ) : null}
          {c.tipo === 'texto' ? (
            <Campo
              value={typeof borrador === 'string' ? borrador : ''}
              onChangeText={(t) => p.alCambiar(c.clave === 'telefono' ? reglas.filtrar('telefonoPerfil', t) : t)}
              accessibilityLabel={c.etiqueta}
              keyboardType={c.clave === 'telefono' ? 'phone-pad' : 'default'}
              autoCapitalize={c.clave === 'telefono' ? 'none' : 'words'}
              autoCorrect={false}
            />
          ) : c.tipo === 'fecha' ? (
            <Fecha
              dia={fecha.dia}
              mes={fecha.mes}
              anio={fecha.anio}
              meses={MESES_CORTOS}
              textos={T.campo.fecha}
              onDia={(v) => p.alCambiar(M.juntarFecha({ ...fecha, dia: reglas.filtrar('dia', v) }))}
              onMes={(m) => p.alCambiar(M.juntarFecha({ ...fecha, mes: m }))}
              onAnio={(v) => p.alCambiar(M.juntarFecha({ ...fecha, anio: reglas.filtrar('anio', v) }))}
            />
          ) : (
            <View style={c.tipo === 'unica' ? { gap: 8 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {c.opciones.map(([texto, cod]) => {
                const marcada = c.tipo === 'unica' ? borrador === cod : sel.includes(cod)
                return (
                  <Opcion
                    key={cod}
                    texto={texto}
                    unica={c.tipo === 'unica'}
                    marcada={marcada}
                    enTope={c.tipo === 'multi' && !!c.max && sel.length >= c.max && !marcada}
                    onPress={() => p.alCambiar(M.marcar(c, borrador, cod))}
                  />
                )
              })}
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <Boton texto={p.guardando ? T.campo.guardando : T.campo.guardar} onPress={p.alGuardar} apagado={!!falta || p.guardando} />
            <Boton tipo="fantasma" texto={T.campo.cancelar} onPress={p.alAbrir} />
          </View>
          {p.fallo ? (
            <View style={{ marginTop: 12 }}>
              <Aviso tono="ojo">{p.fallo}</Aviso>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, paddingTop: 26, paddingBottom: 48, maxWidth: 680, width: '100%', alignSelf: 'center' },
  credencial: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radio.capsula, borderWidth: 1, borderColor: tinta(0.18) },
  caja: { borderRadius: 24, backgroundColor: color.cremaElevada, overflow: 'hidden' },
  fila: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  separada: { borderBottomWidth: 1, borderBottomColor: tinta(0.1) },
  flecha: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cena: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: tinta(0.13),
  },
  chipCena: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radio.capsula },
  recuadro: { borderRadius: 24, borderWidth: 1, borderColor: tinta(0.16), padding: 20 },
  botonBaja: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: 'rgba(143,69,21,.44)',
    marginTop: 14,
  },
  pie: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 30, paddingTop: 24, borderTopWidth: 1, borderTopColor: tinta(0.13) },
})
