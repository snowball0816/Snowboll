import { CreditCardPurchase, Debt } from '@/types'

export function monthlyCardObligation(
  _card: Debt,
  purchases: CreditCardPurchase[],
): number {
  return purchases
    .filter((p) => p.status === 'active' && p.paid_installments < p.num_installments)
    .reduce((sum, p) => sum + currentInstallment(p), 0)
}

/**
 * Sum of active monthly installments (cuotas a >1 mes) — current month's amount.
 */
export function totalInstallmentPayment(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active' && p.num_installments > 1 && p.paid_installments < p.num_installments)
    .reduce((s, p) => s + currentInstallment(p), 0)
}

/**
 * Sum of single-payment purchases due this month (1-cuota).
 */
export function revolvingBalance(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active' && p.num_installments === 1 && p.paid_installments === 0)
    .reduce((s, p) => s + p.installment_amount, 0)
}

/**
 * Total remaining capital to pay on a purchase (outstanding principal).
 */
export function remainingInstallmentValue(p: CreditCardPurchase): number {
  return outstandingPrincipal(p)
}

/**
 * Outstanding principal balance using equal-principal (German amortization).
 * Each installment repays total_amount/num_installments of capital.
 * Matches what credit card banks typically report as saldo de capital.
 */
export function outstandingPrincipal(p: CreditCardPurchase): number {
  const n = p.num_installments - p.paid_installments
  if (n <= 0) return 0
  return p.total_amount * n / p.num_installments
}

/**
 * Current month's installment under equal-principal (German) amortization:
 * fixed capital portion + interest on outstanding balance.
 * For interest-free purchases returns the stored installment_amount.
 */
export function currentInstallment(p: CreditCardPurchase): number {
  if (p.interest_free || !p.interest_rate || p.num_installments <= 1) {
    return p.installment_amount
  }
  const capitalPerMonth = p.total_amount / p.num_installments
  const balance = outstandingPrincipal(p)
  const r = (1 + p.interest_rate / 100) ** (1 / 12) - 1
  return capitalPerMonth + balance * r
}

/**
 * Total outstanding balance across all active purchases.
 */
export function totalOutstandingPurchases(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + outstandingPrincipal(p), 0)
}

/**
 * Progress percentage paid for a purchase.
 */
export function purchaseProgress(p: CreditCardPurchase): number {
  if (p.num_installments <= 0) return 0
  return (p.paid_installments / p.num_installments) * 100
}
