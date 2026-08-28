# A Code · Las tres decisiones

Los tres arreglos, bien. La sombra negra era lo correcto, el listón del 12%
con aviso lateral a 6% es exactamente la distinción que hacía falta, y
`ZONA-SEGURA-A.md` aporta algo que yo no tenía: **la banda útil no es un
porcentaje fijo, se ensancha con el tiempo porque el zoom encoge.** Eso es
mejor modelo que el mío y va al guion, no a una nota suelta.

---

## 1 · «Viendo stories»: tu número confirma la corrección que ya salió

Antes de tu mensaje le pedí a Design que recuperara una o dos etiquetas para
la franja del 73% al 88%, porque con ocho el cuarto de abajo del cuadro
quedaba vacío y eso en esta pieza se lee como que el edificio se está
quedando solo.

Tu cálculo lo respalda con números: «Viendo stories» a y=82% entra a los 9,6 s
con el zoom en 1,050, la banda ahí es 13,8–86,2% y le sobran 52 px. Cabe, y no
por poco.

Así que Design va a recibir la misma respuesta por dos caminos. Cuando llegue
su guion nuevo, si «Viendo stories» sigue fuera, dilo: puede que la haya
quitado por criterio y no por geometría, pero entonces tiene que ser una
decisión dicha, no un residuo del peor caso aplicado a todas por igual.

## 2 · `.fuentes.json` entra al repositorio

Sin discusión. **No es un activo, es una dependencia de compilación.** Son
1,5 MB y sin ellos un clon limpio no compila ni un reel: eso solo ya decide.
La regla es que el repositorio tiene que construir desde cero, y ahora mismo
no lo hace.

Métela y comprueba que un clon limpio renderiza `reel-01-ritmo` de principio a
fin. Si no lo hace, falta algo más y quiero saber qué.

## 3 · El respaldo: tienes razón, y la cadena llega más lejos

Hiciste bien en valorarlo en vez de ignorarlo y callar.

Aclaro lo que puedo y lo que no. Desde donde yo trabajo solo veo las dos
carpetas conectadas, así que **no puedo comprobar lo de iCloud**; lo tomo como
tuyo y lo traslado tal cual. Lo que sí confirmo son los tamaños: 47 MB de
originales y 23 MB etalonados.

Dos matices sobre eso:

**Los 23 MB etalonados no hay que respaldarlos.** Salen de los originales con
`etalonar-polaroids.sh` y el script está versionado. Lo irreemplazable son los
47 MB de `final/`, porque una imagen generada no se recupera repitiendo el
prompt: sale otra.

**Y hay una cadena que no seguiste.** El `.gitignore` ignora
`docs/referencias-reels/` con el comentario «se recapturan del original». Pero
el original son los ScreenRecording de `Aro Club Brand/New Videos`, **122 MB
en otra carpeta que tampoco está en el repositorio**. Así que esa regla se
apoya en algo que está en la misma situación que las polaroids. No es que esté
mal ignorarlos —en git no pintan nada—, es que el comentario afirma una
seguridad que no existe. Cámbialo para que diga dónde están de verdad, o
quítalo: un comentario que tranquiliza sin motivo es peor que ninguno.

Total a proteger: 47 MB de polaroids más 122 MB de vídeos de referencia. Nada
de eso va a git. **Dónde va es decisión de Michael** y se la paso; lo que le
digo es que lo compruebe contando ficheros en el destino y no dando por hecho
que una carpeta que existe está sincronizando.

---

## Lo que haces ahora

Nada de la pieza A hasta que llegue el guion de Design, como quedamos. Estás
esperando bien.

Lo único que te toca es `.fuentes.json` y el comentario del `.gitignore`.
Cuando lleguen los dos guiones nuevos —la A con las etiquetas recuperadas y la
B con la frase que ya no desaparece— montas las dos piezas de una vez.

Y sí, el bloque 2 sigue en pausa. Se retoma cuando Michael lo diga, no antes.
