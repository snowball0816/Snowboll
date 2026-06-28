import { Debt, CreditCardPurchase } from '@/types'
import { currentInstallment } from './creditCard'

/**
 * Monthly effective rate from annual EA rate.
 * Colombian standard: i_m = (1 + EA)^(1/12) - 1
 * e.g. EA=28% → i_m ≈ 2.086% monthly
 */
export function monthlyRate(annualEA: number): number {
  if (annualEA <= 0) return 0
  return Math.pow(1 + annualEA / 100, 1 / 12) - 1
}

/**
 * Interest accrued on a balance for one month (French method)
 */
export function monthlyInterest(balance: number, annualEA: number): number {
  return balance * monthlyRate(annualEA)
}

/**
 * Fixed monthly installment — French amortization (cuota fija)
 * C = P × i_m / (1 − (1 + i_m)^−n)
 */
export function frenchInstallment(
  principal: number,
  annualEA: number,
  termMonths: number,
): number {
  if (principal <= 0 || termMonths <= 0) return 0
  if (annualEA <= 0) return Math.ceil(principal / termMonths)
  const r = monthlyRate(annualEA)
  return Math.ceil((principal * r) / (1 - Math.pow(1 + r, -termMonths)))
}

/**
 * Installment amount for a credit card purchase.
 * interest_free → principal / n (plain division)
 * with interest  → French amortization with purchase EA rate
 */
export function installmentWithInterest(
  principal: number,
  annualEA: number,
  numInstallments: number,
): number {
  if (numInstallments <= 1) return principal
  if (annualEA <= 0) return Math.ceil(principal / numInstallments)
  return frenchInstallment(principal, annualEA, numInstallments)
}

/**
 * Amortize one month: returns new balance, interest portion, principal portion
 */
export function amortizeMonth(
  balance: number,
  annualEA: number,
  payment: number,
): { newBalance: number; interest: number; principal: number } {
  const interest = monthlyInterest(balance, annualEA)
  const principal = Math.min(payment - interest, balance)
  const newBalance = Math.max(balance - principal, 0)
  return { newBalance, interest, principal }
}

/**
 * Full amortization table for a loan (French method).
 * Returns one row per remaining month.
 */
export interface AmortizationRow {
  period: number
  date: Date
  payment: number       // cuota sin seguro
  interest: number
  principal: number
  insurance: number     // seguro mensual
  totalPayment: number  // cuota + seguro
  balance: number
}

export function buildAmortizationTable(
  balance: number,
  annualEA: number,
  termMonths: number,
  insuranceMonthly = 0,
  fixedPayment?: number,
): AmortizationRow[] {
  const cuota = fixedPayment && fixedPayment > 0
    ? fixedPayment
    : frenchInstallment(balance, annualEA, termMonths)
  const rows: AmortizationRow[] = []
  let remaining = balance
  const today = new Date()

  for (let i = 1; i <= termMonths && remaining > 0.5; i++) {
    const interest = monthlyInterest(remaining, annualEA)
    const principal = Math.min(cuota - interest, remaining)
    remaining = Math.max(remaining - principal, 0)

    const date = new Date(today)
    date.setMonth(date.getMonth() + i)
    date.setDate(1)

    rows.push({
      period: i,
      date,
      payment: cuota,
      interest: Math.round(interest),
      principal: Math.round(principal),
      insurance: insuranceMonthly,
      totalPayment: cuota + insuranceMonthly,
      balance: Math.round(remaining),
    })
  }
  return rows
}

/**
 * Months to pay off a balance with a fixed monthly payment
 */
export function monthsToPayoff(
  balance: number,
  annualEA: number,
  monthlyPayment: number,
): number {
  if (balance <= 0) return 0
  const r = monthlyRate(annualEA)
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  if (monthlyPayment <= balance * r) return Infinity
  return Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r))
}

/**
 * Payoff date from today given months to payoff
 */
export function payoffDate(monthsFromNow: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(monthsFromNow))
  d.setDate(1)
  return d
}

/**
 * Total monthly obligation for a credit card based on active purchases.
 * - Cuotas diferidas sin interés: installment_amount fijo
 * - Cuotas con interés: installment_amount calculado con Método Francés
 * - 1 cuota sin interés: pago total ese mes
 * Falls back to 0 if no active purchases (caller should use stored minimum).
 */
export function calcCardMonthlyPayment(purchases: CreditCardPurchase[]): number {
  return purchases
    .filter((p) => p.status === 'active' && p.paid_installments < p.num_installments)
    .reduce((sum, p) => sum + currentInstallment(p), 0)
}

/**
 * Sort debts for Snowball (smallest balance first)
 */
export function sortSnowball(debts: Debt[]): Debt[] {
  return [...debts]
    .filter((d) => d.status === 'active' && d.current_balance > 0)
    .sort((a, b) => a.current_balance - b.current_balance)
}

/**
 * Sort debts for Avalanche (highest interest rate first)
 */
export function sortAvalanche(debts: Debt[]): Debt[] {
  return [...debts]
    .filter((d) => d.status === 'active' && d.current_balance > 0)
    .sort((a, b) => b.interest_rate - a.interest_rate)
}
