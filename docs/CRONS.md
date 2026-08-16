# Los trabajos programados, y por qué no están en `vercel.json`

`vercel.json` desapareció a propósito. Lo que había dentro eran cinco crons
y **la cuenta es Hobby, donde Vercel solo admite crons diarios**.

Dos de los cinco no pueden ser diarios:

| Cron | Cada | Por qué no puede ser diario |
|---|---|---|
| `/api/cron/correos` | 15 min | La mesa se revela a las 12:00 en punto. Ese correo no puede esperar a mañana: es el producto entero |
| `/api/cron/empujon` | 1 hora | Mira quién se quedó a medias hace una hora. Una vez al día deja de ser un empujón |
| `/api/cron/tasa` | día · 4:00 UTC | Diario está bien |
| `/api/cron/recordatorio` | día · 13:00 UTC | Diario está bien |
| `/api/cron/purga` | día · 7:30 UTC | Diario está bien |

**Y lo importante:** con un solo cron no diario declarado, Vercel **rechaza el
despliegue entero**. No es que ese cron no corra — es que no sube nada. Eso
tuvo la producción tres días congelada sin que nadie lo viera, porque un
despliegue que nunca se intenta no aparece como fallido en ningún sitio.

Las cinco rutas siguen existiendo y siguen protegidas por `CRON_SECRET`. Lo
único que falta es quién las llama.

## Las dos salidas

**Pasar a Pro.** Veinte dólares al mes, y `vercel.json` vuelve tal cual está
en el historial de git —el commit que lo quitó lo lleva entero en el mensaje—.
Es lo más simple y lo que menos piezas mueve.

**Programar desde fuera.** GitHub Actions, cron-job.org o cualquier otro:
llaman a las rutas con `Authorization: Bearer <CRON_SECRET>` y Vercel se queda
en Hobby. Es gratis y da control total de la frecuencia, a cambio de tener el
calendario en otro sitio.

## Cómo se llama a mano, mientras tanto

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://aro.club/api/cron/tasa
```
