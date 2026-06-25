/**
 * Global in-memory store for mock mode.
 * `global` is shared across all module contexts in the same Node.js process,
 * so API routes and Server Components see the same data.
 */
import type { Debt, Payment, CreditCardPurchase } from '@/types'
import { mockDebts, mockPayments, mockPurchases } from './data'

declare global {
  // eslint-disable-next-line no-var
  var __snowboll_debts: Debt[] | undefined
  // eslint-disable-next-line no-var
  var __snowboll_payments: Record<string, Payment[]> | undefined
  // eslint-disable-next-line no-var
  var __snowboll_purchases: Record<string, CreditCardPurchase[]> | undefined
  // paymentId → list of {purchaseId, delta} that were advanced when that payment was created
  // eslint-disable-next-line no-var
  var __snowboll_advances: Record<string, { purchaseId: string; delta: number }[]> | undefined
}

function initStore() {
  if (!global.__snowboll_debts) {
    global.__snowboll_debts = JSON.parse(JSON.stringify(mockDebts))
  }
  if (!global.__snowboll_payments) {
    global.__snowboll_payments = JSON.parse(JSON.stringify(mockPayments))
  }
  if (!global.__snowboll_purchases) {
    global.__snowboll_purchases = JSON.parse(JSON.stringify(mockPurchases))
  }
  if (!global.__snowboll_advances) {
    global.__snowboll_advances = {}
  }
}

export function getStore() {
  initStore()
  return {
    debts:     global.__snowboll_debts!,
    payments:  global.__snowboll_payments!,
    purchases: global.__snowboll_purchases!,
    advances:  global.__snowboll_advances!,
  }
}
