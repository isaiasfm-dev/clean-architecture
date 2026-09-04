-- db/migrations/002_add_orders_customer_id_index.sql
-- Este indice acompana las consultas que localizan pedidos por customer_id.
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
