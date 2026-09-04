-- db/migrations/003_add_outbox.sql
CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY,
  aggregate_id text NOT NULL,
  aggregate_type text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,

  CONSTRAINT outbox_aggregate_id_not_blank CHECK (btrim(aggregate_id) <> ''),
  CONSTRAINT outbox_aggregate_type_not_blank CHECK (btrim(aggregate_type) <> ''),
  CONSTRAINT outbox_event_type_not_blank CHECK (btrim(event_type) <> '')
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished_id
ON outbox(created_at, id)
WHERE published_at IS NULL;
