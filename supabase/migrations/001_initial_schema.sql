-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DEBTS
-- ============================================================
CREATE TABLE debts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('credit_card', 'loan')),
  name             TEXT NOT NULL,
  entity           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),

  -- Balances & rates
  initial_balance  NUMERIC(14, 2) NOT NULL,
  current_balance  NUMERIC(14, 2) NOT NULL,
  interest_rate    NUMERIC(6, 4)  NOT NULL, -- Annual %
  monthly_payment  NUMERIC(14, 2) NOT NULL,
  credit_limit     NUMERIC(14, 2),

  -- Loan fields
  loan_type        TEXT CHECK (loan_type IN (
                     'libre_inversion','vehiculo','hipotecario',
                     'libranza','cooperativa','familiar','otro')),
  disbursement_date DATE,
  due_date          DATE,
  term_months       INTEGER,

  -- Credit card fields
  cut_date         INTEGER CHECK (cut_date BETWEEN 1 AND 31),
  payment_due_date INTEGER CHECK (payment_due_date BETWEEN 1 AND 31),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON debts (user_id);
CREATE INDEX idx_debts_status  ON debts (status);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id          UUID NOT NULL REFERENCES debts (id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('normal','partial','extraordinary','total')),
  amount           NUMERIC(14, 2) NOT NULL,
  principal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  interest_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance_after    NUMERIC(14, 2) NOT NULL,
  payment_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_debt_id      ON payments (debt_id);
CREATE INDEX idx_payments_payment_date ON payments (payment_date);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_debts_updated_at
BEFORE UPDATE ON debts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security) — per-user isolation
-- ============================================================
ALTER TABLE debts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Debts: owner only
CREATE POLICY "debts_owner" ON debts
  USING (user_id = auth.uid());

-- Payments: owner via debt
CREATE POLICY "payments_owner" ON payments
  USING (
    debt_id IN (
      SELECT id FROM debts WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- USEFUL VIEWS
-- ============================================================
CREATE VIEW debt_summary AS
SELECT
  d.user_id,
  COUNT(*)                                         AS total_debts,
  SUM(d.current_balance)                           AS total_balance,
  SUM(d.monthly_payment)                           AS total_monthly_payment,
  MIN(d.interest_rate)                             AS min_rate,
  MAX(d.interest_rate)                             AS max_rate,
  AVG(d.interest_rate)                             AS avg_rate
FROM debts d
WHERE d.status = 'active'
GROUP BY d.user_id;
