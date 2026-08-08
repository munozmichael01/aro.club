-- =====================================================================
-- Motivos de rechazo de la verificacion (HANDOFF-4 §4.4).
--
-- Van como catalogo y no como texto libre por dos razones:
--
--   1. Los dos motivos de sospecha comparten EL MISMO mensaje a proposito.
--      Uno especifico le enseña a quien suplanta que corregir. Con el
--      mensaje en una columna, esa coincidencia es un dato y no algo que
--      alguien tenga que acordarse de copiar igual.
--   2. Guardar el codigo permite ver que alguien reintenta cinco veces con
--      documentos distintos. Con texto libre, eso no se puede contar.
-- =====================================================================

create table verification_rejection_reasons (
  code            text primary key,
  -- Lo que ve operacion.
  label           text not null,
  -- Lo que se le manda a la persona. NUNCA el motivo interno.
  message         text not null,
  allows_retry    boolean not null,
  sort_order      int not null
);

insert into verification_rejection_reasons (code, label, message, allows_retry, sort_order) values
  ('foto-movida', 'La foto salió movida o cortada',
   'No se lee bien tu documento. Vuelve a hacer la foto con más luz y sin recortar los bordes.',
   true, 10),
  ('documento-vencido', 'Documento vencido',
   'Tu documento está vencido. Sube uno vigente y lo revisamos el mismo día.',
   true, 20),
  ('selfie-borrosa', 'La selfie no se ve clara',
   'La selfie salió muy oscura o borrosa. Repítela de frente y con luz natural.',
   true, 30),
  ('documento-no-valido', 'El documento no es válido aquí',
   'Aceptamos cédula venezolana o pasaporte vigente. Sube uno de los dos.',
   true, 40),
  -- Los dos siguientes comparten mensaje. No es un descuido.
  ('no-coinciden', 'La selfie y el documento no coinciden',
   'No pudimos verificar tu identidad. Escríbenos a hola@aro.club y lo revisamos contigo.',
   false, 50),
  ('sospecha-suplantacion', 'Sospecha de suplantación',
   'No pudimos verificar tu identidad. Escríbenos a hola@aro.club y lo revisamos contigo.',
   false, 60);

alter table verification_rejection_reasons enable row level security;
-- Solo operacion los lee; la persona recibe el mensaje ya resuelto.
create policy motivos_ops on verification_rejection_reasons for select using (is_ops());

-- `rejection_note` ya existia para la nota libre de operacion. El motivo va
-- aparte y atado al catalogo.
alter table verifications
  add column rejection_reason text references verification_rejection_reasons(code);

create index on verifications (rejection_reason) where rejection_reason is not null;

comment on column verifications.rejection_reason is
  'Codigo del motivo. Se guarda junto a reviewed_by y reviewed_at: es lo que '
  'permite detectar a alguien que reintenta con documentos distintos.';

-- Rechazar exige motivo. Sin esto la persona no sabe que repetir, que era
-- justo el hueco que habia.
alter table verifications
  add constraint verifications_rechazo_con_motivo check (
    status <> 'rejected' or rejection_reason is not null
  );

-- Cuantas veces ha sido rechazada cada persona y por que. Alimenta el caso
-- humano que abren los motivos de sospecha.
create or replace view v_rechazos_por_perfil as
select v.profile_id,
       count(*)::int                                        as rechazos,
       count(*) filter (where not r.allows_retry)::int       as sin_reintento,
       array_agg(distinct v.rejection_reason)                as motivos,
       max(v.reviewed_at)                                    as ultimo
from verifications v
join verification_rejection_reasons r on r.code = v.rejection_reason
where v.status = 'rejected'
group by v.profile_id;
