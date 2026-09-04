-- db/migrations/002_add_orders_customer_id_index.sql
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
