-- El premio de los referidos: los dos correos que lo cuentan.
--
-- Michael, 29-10: una reserva gratis por cada TRES personas que vayan a su
-- primera cena. El crédito ya tiene dónde apuntarse —`referral_bonus` está
-- en `credit_reason_t` desde el esquema inicial— y lo que faltaba era
-- contarlo: el avance cuando alguien asiste, y el premio cuando llegan a
-- tres.
--
-- Son dos y no uno porque dicen cosas distintas y se leen en momentos
-- distintos. «Andrés fue a su primera cena, llevas 2 de 3» es una cuenta que
-- avanza; «tu próxima reserva es gratis» es algo que ya tienes. Con un solo
-- tipo, el segundo se perdería dentro del primero.

alter type email_kind_t add value if not exists 'referido_avanza';
alter type email_kind_t add value if not exists 'referido_premio';
