-- Un cupón que la misma persona puede usar más de una vez.
--
-- El único de `coupon_redemptions` es lo que impide que un código compartido del
-- 100% sea barra libre (ver 20260925120000_cupones.sql), y para todos los demás
-- sigue igual. Esto es la excepción explícita, código por código: Michael, 06-11,
-- sobre MICHAELARO: «lo que realmente quería es utilizarlo más de una vez».
--
-- La marca se copia al canje porque un índice parcial solo mira su propia tabla.

alter table coupons
  add column if not exists repetible boolean not null default false;

alter table coupon_redemptions
  add column if not exists repetible boolean not null default false;

alter table coupon_redemptions
  drop constraint if exists coupon_redemptions_uno_por_persona;

create unique index if not exists coupon_redemptions_uno_por_persona
  on coupon_redemptions (code, profile_id)
  where not repetible;

comment on index coupon_redemptions_uno_por_persona is
  'Un código por persona, salvo los marcados repetible. Es el tope real del cupón compartido.';

update coupons set repetible = true where code = 'MICHAELARO';
