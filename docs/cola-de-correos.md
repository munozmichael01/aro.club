# Qué pasó con cada correo

`sent_at` solo dice «esta fila está cerrada». Cerraba igual un envío de
verdad, un correo que no se pudo armar y uno de quien se dio de baja, así que
«cuántos correos han salido» devolvía la suma de los tres. `estado` dice cuál
fue cada uno, y `motivo` el detalle. Sin abrir los registros de Vercel.

```sql
select
  coalesce(estado, 'antes de saberlo') as que_paso,
  count(*)                             as cuantos,
  count(*) filter (where sent_at is null) as siguen_en_la_cola,
  max(motivo)                          as un_ejemplo
from scheduled_emails
group by 1
order by 2 desc;
```

Los cinco finales:

| `estado` | ¿cierra la fila? | qué significa |
|---|---|---|
| `enviado` | sí | salió, Resend lo aceptó |
| `no_se_pudo_armar` | sí | le faltan datos, y mañana le faltarán igual |
| `dado_de_baja` | sí | la persona no quiere este correo (y no es imprescindible) |
| `sin_plantilla` | **no** | el `kind` no tiene fichero. Casi siempre: falta desplegar |
| `error_de_envio` | **no** | falló la red o la API. Se reintenta solo |
| *nulo* | — | anterior a la entrega 18: no se sabe cuál de los tres fue |

`sin_plantilla` y `error_de_envio` **no** cierran a propósito. Un `kind` sin
plantilla suele ser la base por delante del despliegue —el enum ya tiene el
tipo, el código todavía no—, y cerrar esas filas quemaría los correos. Pasó
de verdad: al probar el empujón se encolaron seis filas antes de desplegar su
plantilla, y lo único que impidió que la cola se las comiera fue que esta
rama no cierra.

Lo que sigue atascado:

```sql
select kind, estado, motivo, send_at
from scheduled_emails
where sent_at is null and estado is not null
order by send_at;
```

Si esa consulta devuelve algo, `/api/salud` está en rojo y lo dice también.

## Sin remitente

Falta `RESEND_API_KEY` es el único caso que no escribe **nada**: la cola se
para entera y espera al día que exista, sin perder ningún correo. Por eso
`/api/salud` mira la variable: la cola no puede avisar de una avería que
consiste precisamente en no tocar la cola.
