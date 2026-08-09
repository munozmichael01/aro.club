-- El bucket de las capturas de pago. Privado, igual que el de las
-- verificaciones: un comprobante lleva el nombre del titular, su banco y
-- una referencia. No es un documento de identidad, pero tampoco es algo
-- que se deje a la vista.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Sin politica de lectura: la unica forma de ver una captura es la URL
-- firmada que pide la cola de conciliacion.
