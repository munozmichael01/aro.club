// Metro, con una sola ventana fuera del proyecto: `../public`, donde vive
// `reglas.js`. La app lo carga en vez de copiarlo (PEDIDO §6 bis, regla 5):
// es el mismo fichero que usan el navegador y el servidor.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '../public')]

module.exports = config
