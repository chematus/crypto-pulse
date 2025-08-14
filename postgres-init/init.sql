BEGIN;

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    coin_id VARCHAR(50) NOT NULL,
    price NUMERIC(20, 10) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE price_history IS 'Stores the historical price data for each cryptocurrency.';
COMMENT ON COLUMN price_history.id IS 'Unique identifier for the price entry.';
COMMENT ON COLUMN price_history.coin_id IS 'The ID of the cryptocurrency (e.g., "bitcoin").';
COMMENT ON COLUMN price_history.price IS 'The price of the cryptocurrency at the given timestamp.';
COMMENT ON COLUMN price_history.currency IS 'The currency the price is measured in (e.g., "usd").';
COMMENT ON COLUMN price_history.timestamp IS 'The timestamp of the price data from the source (e.g., Kafka message).';
COMMENT ON COLUMN price_history.created_at IS 'The timestamp when the record was inserted into the database.';

CREATE INDEX IF NOT EXISTS idx_price_history_coin_id_timestamp ON price_history (coin_id, timestamp DESC);

COMMIT;

\echo 'Database initialization script completed.'
