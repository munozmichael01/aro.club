# El proxy de `/auth/v1`: no hacía falta, y tampoco habría servido

**Cerrado.** El texto feo de la pantalla de Google no tenía nada que ver con
el dominio de Supabase: era la **marca sin verificar**. Michael ya tenía «Aro
Club» puesto, pero Google no lo reconocía como dueño de `aro.club`, y sin eso
cae al dominio como respaldo. Verificó `aro.club` en Search Console —gratis— y
Google ya dice **«Accede a Aro Club»** con el logo.

Así que ni esta rama ni los 35 $ al mes del dominio propio de Supabase.

Lo de abajo se guarda porque la medición sigue siendo válida y ahorra volver a
plantearlo: aunque el branding no se hubiera arreglado, **el reenvío tampoco
habría funcionado**.

---

## Lo que se midió

Un reenvío de Next.js hacia una URL externa manda la petición con el `Host`
del destino y añade `x-forwarded-host` con el nuestro. Así que la pregunta es
si Supabase construye el `redirect_uri` mirando esa cabecera.

Preguntado directamente a Supabase, con y sin ella:

| lo que se manda | `redirect_uri` que emite |
|---|---|
| nada | `https://qdydmklrbsdemzvjsldo.supabase.co/auth/v1/callback` |
| `x-forwarded-host: aro.club` | `https://qdydmklrbsdemzvjsldo.supabase.co/auth/v1/callback` |
| `Host: aro.club` | **403 de Cloudflare** — la petición no llega a Supabase |

**No cambia.** Supabase construye esa URL desde su propia configuración, que
en el plan alojado solo se toca con el complemento de dominio propio. Y no es
un descuido suyo: derivar el `redirect_uri` de una cabecera que manda el
cliente sería un agujero — cualquiera podría desviar la vuelta del OAuth
falsificando el `Host`.

Y un proxy transparente, de los que reescriben el `Host`, ni siquiera pasa de
Cloudflare.

## Por qué eso zanja la pregunta

Google no enseña el dominio por el que pasó el navegador antes: enseña lo que
sabe del CLIENTE y de su URI registrada. Si el `redirect_uri` sigue siendo el
de Supabase, el reenvío no cambia nada de lo que se ve — solo añade un salto.

No hizo falta recorrer el viaje entero en la vista previa, que además está
detrás del SSO de Vercel: la pregunta se contesta antes, en el primer salto,
y la respuesta es la misma para todos los siguientes.

## Lo que aprendí, para la próxima

Mi primera hipótesis fue que faltaba el nombre de la aplicación. Estaba mal:
ya estaba puesto. Lo que había que leer era el aviso de la propia consola
—«Your branding is not being shown to users»— que dice que el nombre existe
pero no se enseña, que es una frase distinta de «no hay nombre».

Medí bien el proxy y diagnostiqué mal la causa. Las dos cosas cuentan.
