// Capturas de tienda: node scripts/capturas.mjs <carpeta> nombre=url … (con app-catalogo en :8090).
// iPhone 6,9": 440 × 956 a escala 3 = 1320 × 2868. Para Play, alto 880 (proporción 2:1).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PUERTO = 9339
const [, , salida, ...pares] = process.argv // pares: nombre=url
const ALTO = Number(process.env.ALTO ?? 956)

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${salida}/perfil`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let ws
for (let i = 0; i < 40 && !ws; i++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json()
    const p = t.find((x) => x.type === 'page')
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl)
  } catch {}
  if (!ws) await espera(250)
}
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })

await cdp('Emulation.setDeviceMetricsOverride', { width: 440, height: ALTO, deviceScaleFactor: 3, mobile: true })
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true })
for (const par of pares) {
  const [nombre, url] = par.split('=').length > 2 ? [par.slice(0, par.indexOf('=')), par.slice(par.indexOf('=') + 1)] : par.split('=')
  await cdp('Page.navigate', { url })
  await espera(7000)
  const r = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${salida}/${nombre}.png`, Buffer.from(r.result.data, 'base64'))
  console.log('ok', nombre)
}
ws.close()
chrome.kill()
