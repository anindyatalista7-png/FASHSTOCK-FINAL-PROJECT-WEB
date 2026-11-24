BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'fashstock_web'
      AND table_name = 'transactions'
      AND column_name = 'out_stock_deducted'
  ) THEN
    ALTER TABLE fashstock_web.transactions
      ADD COLUMN out_stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE fashstock_web.transactions
      SET out_stock_deducted = TRUE
      WHERE type = 'OUT' AND status IN ('Approved', 'Shipped');
  END IF;
END;
$$;
COMMIT;
