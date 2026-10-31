/**
 * «Comparte tu plan»: la hoja con las tarjetas para historias.
 *
 * Entrega estas-dentro de Design, C1 y W. La abren dos pantallas —«Estás
 * dentro» y Mi mesa (C2)— y vive aquí, una vez, para que no sean dos hojas
 * que se separan en cuanto alguien toque una. Se carga con un <script>, como
 * `reglas.js`, y se monta en el <body>, fuera del árbol de la pantalla: es una
 * capa encima de ella, y la pantalla no tiene que saber nada de su estado.
 *
 *   AroCompartir.abrir({ evento: '<id>' })
 *
 * Las tarjetas son PNG que pinta el servidor (`/api/historia`): la miniatura,
 * la que se descarga y la que se comparte son la misma imagen. Los textos son
 * los de `AroReglas.DENTRO`, los mismos que la app.
 *
 * En el navegador, Instagram no recibe historias (W de la entrega): los
 * botones son Descargar imagen, WhatsApp y Copiar enlace. Y donde el sistema
 * sabe compartir ficheros —el navegador del teléfono— se añade «Más», la hoja
 * del sistema con la imagen y el mensaje, que es por donde se llega a
 * Instagram desde la web.
 */
;(function (raiz) {
  'use strict'

  var VERDE = '#14342A'
  var CREMA = '#FAF3E4'
  var TERRACOTA = '#E39C63'
  var SALVIA = '#9CBBA6'
  var CUERPO = '#33513F'

  // Los trazos de la maqueta (C1), uno por botón.
  var ICONOS = {
    descargar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    whatsapp: 'M21 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.6A8.5 8.5 0 1 1 21 12Z',
    copiar: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
    mas: 'M5 12h.01M12 12h.01M19 12h.01',
    cerrar: 'M6 6l12 12M18 6L6 18',
  }

  function el(tag, estilo, hijos) {
    var n = document.createElement(tag)
    if (estilo) n.setAttribute('style', estilo)
    ;(hijos || []).forEach(function (h) { n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h) })
    return n
  }

  function icono(d, color, tam) {
    var ns = 'http://www.w3.org/2000/svg'
    var s = document.createElementNS(ns, 'svg')
    s.setAttribute('width', String(tam || 24))
    s.setAttribute('height', String(tam || 24))
    s.setAttribute('viewBox', '0 0 24 24')
    s.setAttribute('fill', 'none')
    s.setAttribute('stroke', color)
    s.setAttribute('stroke-width', '2')
    s.setAttribute('stroke-linecap', 'round')
    s.setAttribute('stroke-linejoin', 'round')
    s.setAttribute('aria-hidden', 'true')
    var p = document.createElementNS(ns, 'path')
    p.setAttribute('d', d)
    s.appendChild(p)
    return s
  }

  /** ¿Sabe este navegador compartir un fichero? Solo el del teléfono, casi siempre. */
  function compartePng() {
    try {
      var f = new File([new Blob([''], { type: 'image/png' })], 'a.png', { type: 'image/png' })
      return !!(navigator.canShare && navigator.canShare({ files: [f] }))
    } catch {
      return false
    }
  }

  var abierta = null

  function abrir(opciones) {
    if (abierta) return
    var D = raiz.AroReglas && raiz.AroReglas.DENTRO
    if (!D) return
    var evento = (opciones && opciones.evento) || ''
    var T = D.hoja

    var antes = document.activeElement
    var desplazamiento = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    var estado = { datos: null, i: 0, ocupado: false }

    // ── la capa y la hoja ────────────────────────────────────────────────
    var fondo = el('div', 'position:fixed;inset:0;z-index:1000;background:rgba(20,52,42,.6);display:flex;align-items:flex-end;justify-content:center;animation:aro-hoja-fondo 200ms ease both')
    var hoja = el('div', 'position:relative;width:100%;max-width:480px;max-height:100%;overflow:auto;background:' + CREMA + ';color:' + VERDE + ";font-family:'Inter Tight',system-ui,sans-serif;border-radius:28px 28px 0 0;padding:10px 0 calc(26px + env(safe-area-inset-bottom));animation:aro-hoja 260ms cubic-bezier(.2,.8,.2,1) both")
    hoja.setAttribute('role', 'dialog')
    hoja.setAttribute('aria-modal', 'true')
    hoja.setAttribute('aria-label', T.titulo)

    var estilo = el('style', null, ['@keyframes aro-hoja{from{transform:translateY(100%)}to{transform:none}}@keyframes aro-hoja-fondo{from{opacity:0}to{opacity:1}}@keyframes aro-hoja-giro{to{transform:rotate(360deg)}}.aro-carrusel::-webkit-scrollbar{display:none}@media (prefers-reduced-motion: reduce){.aro-hoja-capa *{animation:none!important}}'])
    fondo.className = 'aro-hoja-capa'

    var asa = el('div', 'width:40px;height:5px;border-radius:3px;background:rgba(20,52,42,.2);margin:0 auto 14px')

    var bajada = el('div', "font:400 14px/1.35 'Inter Tight',sans-serif;color:" + CUERPO, [T.bajada(false)])
    var cerrar = el('button', 'flex:none;width:44px;height:44px;border-radius:22px;border:none;background:rgba(20,52,42,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0', [icono(ICONOS.cerrar, VERDE, 18)])
    cerrar.setAttribute('aria-label', 'Cerrar')
    cerrar.type = 'button'
    var cabecera = el('div', 'display:flex;align-items:center;gap:12px;padding:0 20px;margin-bottom:6px', [
      el('div', 'flex:1;min-width:0;display:flex;flex-direction:column;gap:4px', [
        el('h2', "margin:0;font:400 26px/1.05 'Young Serif',Georgia,serif;letter-spacing:-.02em", [T.titulo]),
        bajada,
      ]),
      cerrar,
    ])

    var carrusel = el('div', 'display:flex;gap:12px;overflow-x:auto;padding:8px 20px 10px;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch')
    carrusel.className = 'aro-carrusel'
    var puntos = el('div', 'display:flex;gap:6px;justify-content:center')
    var etiqueta = el('div', "font:500 14px/1.3 'Inter Tight',sans-serif;color:" + CUERPO + ';text-align:center;margin-top:14px', [
      T.etiqueta[0], el('span', 'font-weight:700;color:' + VERDE, [T.etiqueta[1]]), T.etiqueta[2],
    ])
    var fallo = el('div', "display:none;font:400 13px/1.4 'Inter Tight',sans-serif;color:#8F4515;text-align:center;margin:10px 20px 0")
    fallo.setAttribute('role', 'alert')
    var botones = el('div', 'display:flex;padding:18px 8px 0')
    var cargando = el('div', 'display:flex;justify-content:center;padding:40px 0', [
      el('div', 'width:28px;height:28px;border-radius:50%;border:3px solid rgba(20,52,42,.15);border-top-color:' + VERDE + ';animation:aro-hoja-giro 800ms linear infinite'),
    ])

    hoja.appendChild(estilo)
    hoja.appendChild(asa)
    hoja.appendChild(cabecera)
    hoja.appendChild(cargando)
    fondo.appendChild(hoja)
    document.body.appendChild(fondo)
    cerrar.focus()

    function quitar() {
      if (!abierta) return
      abierta = null
      document.removeEventListener('keydown', alTeclado)
      document.body.style.overflow = desplazamiento
      fondo.remove()
      if (antes && antes.focus) antes.focus()
    }
    function alTeclado(e) { if (e.key === 'Escape') quitar() }
    document.addEventListener('keydown', alTeclado)
    fondo.addEventListener('click', function (e) { if (e.target === fondo) quitar() })
    cerrar.addEventListener('click', quitar)
    abierta = { cerrar: quitar }

    function decir(texto) {
      fallo.textContent = texto || ''
      fallo.style.display = texto ? 'block' : 'none'
    }

    // ── los datos ────────────────────────────────────────────────────────
    fetch('/api/estas-dentro' + (evento ? '?evento=' + encodeURIComponent(evento) : ''))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('sin datos')) })
      .then(function (d) {
        if (!abierta) return
        if (!d || !d.reserva) { quitar(); return }
        estado.datos = d
        pintar()
      })
      .catch(function () {
        if (!abierta) return
        cargando.remove()
        decir('No pudimos cargar tu plan. Revisa la conexión y vuelve a intentarlo.')
        hoja.appendChild(fallo)
      })

    function urlDe(v, extra) {
      return '/api/historia?evento=' + encodeURIComponent(estado.datos.reserva.eventoId) + '&v=' + v + (extra || '')
    }

    function elegir(k, desplazar) {
      estado.i = k
      ;[].forEach.call(carrusel.children, function (c, j) {
        c.style.outline = j === k ? '3px solid ' + TERRACOTA : '0 solid transparent'
        c.setAttribute('aria-pressed', j === k ? 'true' : 'false')
      })
      ;[].forEach.call(puntos.children, function (p, j) { p.style.background = j === k ? VERDE : 'rgba(20,52,42,.22)' })
      if (desplazar && carrusel.children[k]) {
        carrusel.children[k].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }

    function pintar() {
      var d = estado.datos
      var variantes = d.variantes || []
      cargando.remove()
      bajada.textContent = variantes.length ? T.bajada(!!d.invitar) : ''
      bajada.style.display = variantes.length ? '' : 'none'

      variantes.forEach(function (v, k) {
        var img = el('img', 'display:block;width:100%;height:100%;object-fit:cover')
        img.alt = ''
        img.decoding = 'async'
        if (k > 2) img.loading = 'lazy'
        img.src = urlDe(v, '&ancho=400')
        var carta = el('button', 'flex:none;scroll-snap-align:center;width:200px;height:356px;padding:0;border:none;border-radius:16px;overflow:hidden;cursor:pointer;background:rgba(20,52,42,.08);outline-offset:3px;box-shadow:0 8px 22px rgba(20,52,42,.18),0 0 0 1px rgba(20,52,42,.1)', [img])
        carta.type = 'button'
        carta.setAttribute('aria-label', T.tarjeta(k + 1, variantes.length))
        carta.addEventListener('click', function () { elegir(k, true) })
        carrusel.appendChild(carta)
        puntos.appendChild(el('span', 'width:7px;height:7px;border-radius:4px'))
      })
      // Al deslizar con el dedo, la elegida es la que queda en el centro.
      var t = null
      carrusel.addEventListener('scroll', function () {
        clearTimeout(t)
        t = setTimeout(function () {
          var centro = carrusel.scrollLeft + carrusel.clientWidth / 2
          var mejor = 0
          var dist = Infinity
          ;[].forEach.call(carrusel.children, function (c, j) {
            var x = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro)
            if (x < dist) { dist = x; mejor = j }
          })
          if (mejor !== estado.i) elegir(mejor, false)
        }, 90)
      })

      if (variantes.length) {
        hoja.appendChild(carrusel)
        hoja.appendChild(puntos)
        hoja.appendChild(etiqueta)
        elegir(0, false)
      }
      hoja.appendChild(fallo)

      var mensaje = D.mensaje(d.invitar)
      var enlace = d.invitar ? d.invitar.enlace : 'https://aro.club'
      var conFichero = compartePng()

      var lista = []
      if (variantes.length) lista.push({ id: 'descargar', texto: T.descargar, fondo: VERDE, tinta: CREMA, hacer: descargar })
      lista.push({ id: 'whatsapp', texto: T.whatsapp, fondo: SALVIA, tinta: VERDE, hacer: whatsapp })
      lista.push({ id: 'copiar', texto: T.copiar, fondo: TERRACOTA, tinta: VERDE, hacer: copiar })
      if (conFichero && variantes.length) lista.push({ id: 'mas', texto: T.mas, fondo: 'rgba(20,52,42,.08)', tinta: VERDE, hacer: mas })

      lista.forEach(function (b) {
        var nombre = el('span', "font:500 12px/1.2 'Inter Tight',sans-serif;text-align:center;color:" + VERDE, [b.texto])
        var boton = el('button', 'flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:none;padding:0;cursor:pointer;color:inherit', [
          el('span', 'width:56px;height:56px;border-radius:28px;background:' + b.fondo + ';display:flex;align-items:center;justify-content:center', [icono(ICONOS[b.id], b.tinta)]),
          nombre,
        ])
        boton.type = 'button'
        boton.addEventListener('click', function () { b.hacer(nombre) })
        botones.appendChild(boton)
      })
      hoja.appendChild(botones)

      /** La tarjeta elegida, a tamaño de historia, como fichero. */
      function imagen() {
        return fetch(urlDe(variantes[estado.i]))
          .then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error('sin imagen')) })
          .then(function (b) { return new File([b], 'aro-club.png', { type: 'image/png' }) })
      }

      function ocupado(si) {
        estado.ocupado = si
        botones.style.opacity = si ? '.5' : '1'
      }

      function descargar() {
        if (estado.ocupado) return
        ocupado(true)
        decir('')
        imagen()
          .then(function (f) {
            var url = URL.createObjectURL(f)
            var a = el('a', 'display:none')
            a.href = url
            a.download = 'aro-club.png'
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(function () { URL.revokeObjectURL(url) }, 4000)
          })
          .catch(function () { decir(T.fallo) })
          .then(function () { ocupado(false) })
      }

      /** La hoja del sistema, con la imagen y el mensaje. Cerrarla sin compartir no es un fallo. */
      function mas() {
        if (estado.ocupado) return
        ocupado(true)
        decir('')
        imagen()
          .then(function (f) { return navigator.share({ files: [f], text: mensaje }) })
          .catch(function (e) { if (!e || e.name !== 'AbortError') decir(T.fallo) })
          .then(function () { ocupado(false) })
      }

      /**
       * WhatsApp con el mensaje y el enlace. Por URL no se le puede pasar una
       * imagen: quien quiera mandar la tarjeta la tiene en «Más» o la descarga.
       */
      function whatsapp() {
        window.open('https://wa.me/?text=' + encodeURIComponent(mensaje), '_blank', 'noopener')
      }

      function copiar(nombre) {
        var listo = function () {
          nombre.textContent = T.copiado
          setTimeout(function () { nombre.textContent = T.copiar }, 2000)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(enlace).then(listo, function () { decir(enlace) })
        } else {
          decir(enlace)
        }
      }
    }
  }

  raiz.AroCompartir = { abrir: abrir, cerrar: function () { if (abierta) abierta.cerrar() } }
})(typeof globalThis !== 'undefined' ? globalThis : this)
