-- ============================================================
-- CREDIT CARD PURCHASES
-- ============================================================
CREATE TABLE credit_card_purchases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id           UUID NOT NULL REFERENCES debts (id) ON DELETE CASCADE,

  description       TEXT NOT NULL,
  purchase_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount      NUMERIC(14, 2) NOT NULL,

  -- Cuotas
  num_installments  INTEGER NOT NULL DEFAULT 1 CHECK (num_installments >= 1),
  paid_installments INTEGER NOT NULL DEFAULT 0,
  installment_amount NUMERIC(14, 2) NOT NULL,

  -- Interest
  interest_free     BOOLEAN NOT NULL DEFAULT FALSE,
  interest_rate     NUMERIC(6, 4),   -- NULL = usa la tasa de la tarjeta

  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_debt_id ON credit_card_purchases (debt_id);
CREATE INDEX idx_purchases_status  ON credit_card_purchases (status);

-- RLS: owner via debt
ALTER TABLE credit_card_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_owner" ON credit_card_purchases
  USING (
    debt_id IN (
      SELECT id FROM debts WHERE user_id = auth.uid()
    )
  );
