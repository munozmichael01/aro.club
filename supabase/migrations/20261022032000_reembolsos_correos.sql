-- Los dos correos del reembolso. En su propia migración, como manda la casa
-- con los valores de enum.
alter type email_kind_t add value if not exists 'reembolso_pedido';
alter type email_kind_t add value if not exists 'reembolso_hecho';
