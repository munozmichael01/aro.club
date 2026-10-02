/**
 * La configuración es `app.json`; esto solo añade lo que no puede vivir en
 * un repositorio público.
 *
 * `google-services.json` (Firebase, para las push de Android) no se commitea:
 * en EAS llega como variable de tipo fichero, `GOOGLE_SERVICES_JSON`, y en
 * local se usa la copia de `app-mobile/` (ignorada por git). Sin ninguno de
 * los dos la app compila igual, pero Android no recibe push.
 */
const fs = require('node:fs')
const path = require('node:path')

module.exports = ({ config }) => {
  const local = path.join(__dirname, 'google-services.json')
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync(local) ? './google-services.json' : undefined)
  return {
    ...config,
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
  }
}
