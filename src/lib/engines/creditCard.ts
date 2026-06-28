import { CreditCardPurchase, Debt } from '@/types'
import { calcCardMonthlyPayment } from './calculations'

/**
 * Monthly payment due for a credit card = sum of installment_amount
 * for all active purchases with remaining installments.
 * Works for 1-cuota sin interés, N-cuotas sin interés, and N-cuotas con interés.
 */
export function monthlyCardObligation(
  _card: Debt,
  purchases: CreditCardPurchase[],
): number {
  return calcCardMonthlyPayment(purchases)
}

/**
 * Sum of active monthly installments (cuotas a >1 mes).
 */
export function totalInstallmentPayment(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active' && p.num_installments > 1 && p.paid_installments < p.num_installments)
    .reduce((s, p) => s + p.installment_amount, 0)
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
 * Remaining value to pay on a purchase (total future payments).
 * Used for monthly obligation totals.
 */
export function remainingInstallmentValue(p: CreditCardPurchase): number {
  const remaining = p.num_installments - p.paid_installments
  return remaining * p.installment_amount
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
 * Total outstanding balance across all active purchases.
 */
export function totalOutstandingPurchases(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + remainingInstallmentValue(p), 0)
}

/**
 * Progress percentage paid for a purchase.
 */
export function purchaseProgress(p: CreditCardPurchase): number {
  if (p.num_installments <= 0) return 0
  return (p.paid_installments / p.num_installments) * 100
}
