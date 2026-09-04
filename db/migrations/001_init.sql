-- db/migrations/001_init.sql
CREATE TABLE IF NOT EXISTS orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL,
  customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_order_id_unique UNIQUE (order_id),
  CONSTRAINT orders_order_id_not_blank CHECK (btrim(order_id) <> ''),
  CONSTRAINT orders_customer_id_not_blank CHECK (btrim(customer_id) <> '')
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  sku text NOT NULL,
  quantity integer NOT NULL,
  unit_price_amount numeric(12, 2) NOT NULL,
  unit_price_currency char(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_items_sku_not_blank CHECK (btrim(sku) <> ''),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_amount_non_negative CHECK (unit_price_amount >= 0),
  CONSTRAINT order_items_unit_price_currency_supported CHECK (unit_price_currency IN ('EUR', 'USD'))
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_order_items_updated_at ON order_items;
CREATE TRIGGER set_order_items_updated_at
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
