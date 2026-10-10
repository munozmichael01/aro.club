-- La ayuda de `romance` prometía más de lo que vamos a cumplir.
--
-- Decía: «Esta respuesta no se le muestra a nadie, nunca, en ninguna pantalla
-- del producto». Y desde hoy Operación la ve en la ficha del miembro
-- (Michael, 10-10), porque moderar el club a veces pasa por saber qué
-- contestó alguien a esta en concreto.
--
-- No es un matiz: era la promesa más fuerte del cuestionario entero, hecha
-- justo en la pregunta más delicada, y en el momento de contestarla. Dejarla
-- escrita mientras una pantalla nuestra la enseña es la clase de frase que no
-- se puede defender después.
--
-- Lo que sigue siendo verdad se dice tal cual: su mesa no la ve y su perfil
-- no la enseña. Lo que ya no se promete —«nadie, nunca, en ninguna
-- pantalla»— se quita, en vez de reescribirlo con palabras más suaves que
-- signifiquen lo mismo.
--
-- La app la lee de `/api/questions`, así que con esto le llega sola.

update questions
   set help_text = 'No la ve nadie de tu mesa ni se muestra en tu perfil. Solo la usamos para no juntar expectativas opuestas.'
 where key = 'romance';
