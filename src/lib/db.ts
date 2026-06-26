import { Debt, Payment, CreditCardPurchase } from '@/types'
import { amortizeMonth, calcCardMonthlyPayment } from './engines/calculations'
import { totalOutstandingPurchases } from './engines/creditCard'
import { v4 as uuid } from 'uuid'

function isMock() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT')
  )
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export async function getDebts(_userId: string): Promise<Debt[]> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { debts, purchases } = getStore()
    const enriched = debts.map((d) => {
      if (d.type !== 'credit_card') return d
      const dp = purchases[d.id] ?? []
      if (dp.length === 0) return d
      const monthly  = calcCardMonthlyPayment(dp)
      const balance  = totalOutstandingPurchases(dp)
      const initial  = dp.reduce((s, p) => s + p.num_installments * p.installment_amount, 0)
      return {
        ...d,
        monthly_payment:  monthly,
        current_balance:  balance,
        initial_balance:  initial || d.initial_balance,
      }
    })
    return enriched.sort((a, b) => a.current_balance - b.current_balance)
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', _userId)
    .order('current_balance', { ascending: true })
  const debtList = (debts ?? []) as Debt[]

  // Enrich credit cards with calculated monthly payment from purchases
  const cardIds = debtList.filter((d) => d.type === 'credit_card').map((d) => d.id)
  if (cardIds.length > 0) {
    const { data: allPurchases } = await supabase
      .from('credit_card_purchases')
      .select('*')
      .in('debt_id', cardIds)
    const byDebt: Record<string, CreditCardPurchase[]> = {}
    for (const p of (allPurchases ?? []) as CreditCardPurchase[]) {
      if (!byDebt[p.debt_id]) byDebt[p.debt_id] = []
      byDebt[p.debt_id].push(p)
    }
    return debtList.map((d) => {
      if (d.type !== 'credit_card') return d
      const dp = byDebt[d.id] ?? []
      if (dp.length === 0) return d
      const monthly = calcCardMonthlyPayment(dp)
      const balance = totalOutstandingPurchases(dp)
      const initial = dp.reduce((s, p) => s + p.num_installments * p.installment_amount, 0)
      return {
        ...d,
        monthly_payment: monthly,
        current_balance: balance,
        initial_balance: initial || d.initial_balance,
      }
    })
  }
  return debtList
}

export async function getActiveDebts(_userId: string): Promise<Debt[]> {
  const all = await getDebts(_userId)
  return all.filter((d) => d.status === 'active')
}

export async function getDebtWithPayments(
  id: string,
  _userId: string,
): Promise<(Debt & { payments: Payment[] }) | null> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { debts, payments, purchases } = getStore()
    const debt = debts.find((d) => d.id === id)
    if (!debt) return null
    let enriched = { ...debt }
    if (debt.type === 'credit_card') {
      const dp = purchases[id] ?? []
      if (dp.length > 0) {
        enriched = {
          ...enriched,
          monthly_payment: calcCardMonthlyPayment(dp),
          current_balance: totalOutstandingPurchases(dp),
          initial_balance: dp.reduce((s, p) => s + p.num_installments * p.installment_amount, 0) || debt.initial_balance,
        }
      }
    }
    return { ...enriched, payments: payments[id] ?? [] }
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('debts')
    .select('*, payments(*)')
    .eq('id', id)
    .eq('user_id', _userId)
    .single()
  if (!data) return null
  const debt = data as Debt & { payments: Payment[] }
  if (debt.type === 'credit_card') {
    const { data: purchaseData } = await supabase
      .from('credit_card_purchases')
      .select('*')
      .eq('debt_id', id)
    const dp = (purchaseData ?? []) as CreditCardPurchase[]
    if (dp.length > 0) {
      return {
        ...debt,
        monthly_payment: calcCardMonthlyPayment(dp),
        current_balance: totalOutstandingPurchases(dp),
        initial_balance: dp.reduce((s, p) => s + p.num_installments * p.installment_amount, 0) || debt.initial_balance,
      }
    }
  }
  return debt
}

export async function updateDebt(id: string, userId: string, body: Partial<Debt>): Promise<Debt> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { debts } = getStore()
    const debt = debts.find((d) => d.id === id)
    if (!debt) throw new Error('Deuda no encontrada')
    Object.assign(debt, body, { updated_at: new Date().toISOString() })
    return debt
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('debts').update(body).eq('id', id).eq('user_id', userId).select().single()
  if (error) throw new Error(error.message)
  return data as Debt
}

export async function createDebt(userId: string, body: Partial<Debt>): Promise<Debt> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { debts } = getStore()
    const debt: Debt = {
      id: uuid(),
      user_id: userId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: 'loan',
      name: '',
      entity: '',
      initial_balance: 0,
      current_balance: 0,
      interest_rate: 0,
      monthly_payment: 0,
      ...body,
    }
    debts.push(debt)
    return debt
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const n = (v: unknown) => (v && v !== 0 ? v : null)
  const row = {
    initial_balance:  0,
    current_balance:  0,
    monthly_payment:  0,
    insurance_monthly: 0,
    ...body,
    user_id:          userId,
    // Nullable columns with CHECK constraints must be NULL, never 0
    cut_date:         n(body.cut_date),
    payment_due_date: n(body.payment_due_date),
    credit_limit:     n(body.credit_limit),
    term_months:      n(body.term_months),
    loan_type:        body.loan_type || null,
    disbursement_date: body.disbursement_date || null,
    due_date:         body.due_date || null,
  }
  const { data, error } = await supabase
    .from('debts')
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Insert did not return data')
  return data as Debt
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(debtId: string): Promise<Payment[]> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { payments } = getStore()
    return (payments[debtId] ?? []).sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
    )
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false })
  return (data ?? []) as Payment[]
}

export async function createPayment(
  debtId: string,
  _userId: string,
  body: { amount: number; type: string; notes?: string; payment_date?: string },
): Promise<Payment> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { debts, payments, purchases, advances } = getStore()
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) throw new Error('Deuda no encontrada')

    const { interest, principal, newBalance } = amortizeMonth(
      debt.current_balance,
      debt.interest_rate,
      body.amount,
    )
    const finalBalance = body.type === 'total' ? 0 : newBalance

    const payment: Payment = {
      id: uuid(),
      debt_id: debtId,
      type: body.type as Payment['type'],
      amount: body.amount,
      principal_amount: principal,
      interest_amount: interest,
      balance_after: finalBalance,
      payment_date: body.payment_date ?? new Date().toISOString().split('T')[0],
      notes: body.notes,
      created_at: new Date().toISOString(),
    }

    if (!payments[debtId]) payments[debtId] = []
    payments[debtId].unshift(payment)

    if (debt.type === 'credit_card') {
      // Advance each active purchase and record exactly what changed
      const dp = purchases[debtId] ?? []
      const advanceLog: { purchaseId: string; delta: number }[] = []
      for (const p of dp) {
        if (p.status !== 'active') continue
        const before = p.paid_installments
        p.paid_installments = body.type === 'total'
          ? p.num_installments
          : Math.min(p.paid_installments + 1, p.num_installments)
        p.status = p.paid_installments >= p.num_installments ? 'paid' : 'active'
        const delta = p.paid_installments - before
        if (delta > 0) advanceLog.push({ purchaseId: p.id, delta })
      }
      advances[payment.id] = advanceLog
      debt.current_balance = totalOutstandingPurchases(dp)
      if (debt.current_balance <= 0) debt.status = 'paid'
    } else {
      debt.current_balance = finalBalance
      if (finalBalance <= 0) debt.status = 'paid'
    }
    debt.updated_at = new Date().toISOString()

    return payment
  }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: debt } = await supabase
    .from('debts').select('*').eq('id', debtId).eq('user_id', _userId).single()
  if (!debt) throw new Error('Deuda no encontrada')

  const { interest, principal, newBalance } = amortizeMonth(
    debt.current_balance, debt.interest_rate, body.amount,
  )
  const finalBalance = body.type === 'total' ? 0 : newBalance

  const { data: payment } = await supabase
    .from('payments')
    .insert({ debt_id: debtId, ...body, principal_amount: principal, interest_amount: interest, balance_after: finalBalance })
    .select().single()

  await supabase
    .from('debts')
    .update({ current_balance: finalBalance, status: finalBalance <= 0 ? 'paid' : 'active' })
    .eq('id', debtId)

  return payment as Payment
}

export async function updatePayment(
  paymentId: string,
  debtId: string,
  body: Partial<Pick<Payment, 'amount' | 'type' | 'notes' | 'payment_date'>>,
): Promise<Payment> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { payments } = getStore()
    const list = payments[debtId] ?? []
    const p = list.find((x) => x.id === paymentId)
    if (!p) throw new Error('Pago no encontrado')
    Object.assign(p, body)
    return p
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments').update(body).eq('id', paymentId).select().single()
  return data as Payment
}

export async function deletePayment(paymentId: string, debtId: string): Promise<void> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { payments, debts, purchases, advances } = getStore()
    const list = payments[debtId] ?? []
    const p = list.find((x) => x.id === paymentId)
    if (p) {
      const debt = debts.find((d) => d.id === debtId)
      if (debt) {
        if (debt.type === 'credit_card') {
          // Revert exactly the purchases this payment advanced
          const dp = purchases[debtId] ?? []
          const log = advances[paymentId] ?? []
          for (const { purchaseId, delta } of log) {
            const pur = dp.find(x => x.id === purchaseId)
            if (!pur) continue
            pur.paid_installments = Math.max(0, pur.paid_installments - delta)
            pur.status = pur.paid_installments >= pur.num_installments ? 'paid' : 'active'
          }
          delete advances[paymentId]
          debt.current_balance = totalOutstandingPurchases(dp)
          if (debt.current_balance > 0) debt.status = 'active'
        } else {
          debt.current_balance = Math.min(debt.initial_balance, debt.current_balance + p.principal_amount)
          if (debt.current_balance > 0) debt.status = 'active'
        }
        debt.updated_at = new Date().toISOString()
      }
      payments[debtId] = list.filter((x) => x.id !== paymentId)
    }
    return
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: pmt } = await supabase.from('payments').select('*').eq('id', paymentId).single()
  await supabase.from('payments').delete().eq('id', paymentId)
  if (pmt) {
    const { data: debt } = await supabase.from('debts').select('*').eq('id', pmt.debt_id).single()
    if (!debt) return
    if (debt.type === 'credit_card') {
      // Roll back 1 installment on every purchase with paid_installments > 0
      const { data: purchaseList } = await supabase
        .from('credit_card_purchases')
        .select('*')
        .eq('debt_id', pmt.debt_id)
        .gt('paid_installments', 0)
      if (purchaseList) {
        for (const pur of purchaseList) {
          const newPaid = pur.paid_installments - 1
          await supabase
            .from('credit_card_purchases')
            .update({ paid_installments: newPaid, status: newPaid >= pur.num_installments ? 'paid' : 'active' })
            .eq('id', pur.id)
        }
      }
    } else {
      const newBalance = Math.min(debt.initial_balance, debt.current_balance + pmt.principal_amount)
      await supabase.from('debts')
        .update({ current_balance: newBalance, status: newBalance > 0 ? 'active' : 'paid' })
        .eq('id', pmt.debt_id)
    }
  }
}

export async function deleteDebt(id: string, userId: string): Promise<void> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const store = getStore()
    store.debts = store.debts.filter((d) => d.id !== id)
    delete store.payments[id]
    delete store.purchases[id]
    return
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  await supabase.from('debts').delete().eq('id', id).eq('user_id', userId)
}

// ─── Credit Card Purchases ────────────────────────────────────────────────────

export async function getPurchases(debtId: string): Promise<CreditCardPurchase[]> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { purchases } = getStore()
    return (purchases[debtId] ?? []).sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(),
    )
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('credit_card_purchases')
    .select('*')
    .eq('debt_id', debtId)
    .order('purchase_date', { ascending: false })
  return (data ?? []) as CreditCardPurchase[]
}

export async function createPurchase(
  debtId: string,
  body: Omit<CreditCardPurchase, 'id' | 'debt_id' | 'status' | 'created_at'> & { paid_installments?: number },
): Promise<CreditCardPurchase> {
  const paidCount = body.paid_installments ?? 0
  const autoStatus: CreditCardPurchase['status'] = paidCount >= body.num_installments ? 'paid' : 'active'
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { purchases } = getStore()
    const purchase: CreditCardPurchase = {
      ...body,
      id: uuid(),
      debt_id: debtId,
      paid_installments: paidCount,
      status: autoStatus,
      created_at: new Date().toISOString(),
    }
    if (!purchases[debtId]) purchases[debtId] = []
    purchases[debtId].unshift(purchase)
    return purchase
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('credit_card_purchases')
    .insert({ ...body, debt_id: debtId, paid_installments: paidCount, status: autoStatus })
    .select().single()
  return data as CreditCardPurchase
}

export async function payPurchaseInstallment(
  purchaseId: string,
  debtId: string,
  cuotas = 1,
): Promise<CreditCardPurchase> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { purchases } = getStore()
    const list = purchases[debtId] ?? []
    const p = list.find((x) => x.id === purchaseId)
    if (!p) throw new Error('Compra no encontrada')
    p.paid_installments = Math.min(p.paid_installments + cuotas, p.num_installments)
    if (p.paid_installments >= p.num_installments) p.status = 'paid'
    return p
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('credit_card_purchases').select('*').eq('id', purchaseId).single()
  if (!existing) throw new Error('Compra no encontrada')
  const newPaid = Math.min(existing.paid_installments + cuotas, existing.num_installments)
  const { data } = await supabase
    .from('credit_card_purchases')
    .update({ paid_installments: newPaid, status: newPaid >= existing.num_installments ? 'paid' : 'active' })
    .eq('id', purchaseId).select().single()
  return data as CreditCardPurchase
}

export async function updatePurchase(
  purchaseId: string,
  debtId: string,
  body: Partial<Omit<CreditCardPurchase, 'id' | 'debt_id' | 'created_at'>>,
): Promise<CreditCardPurchase> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { purchases } = getStore()
    const list = purchases[debtId] ?? []
    const p = list.find((x) => x.id === purchaseId)
    if (!p) throw new Error('Compra no encontrada')
    Object.assign(p, body)
    // Recalculate status if installments changed
    p.status = p.paid_installments >= p.num_installments ? 'paid' : 'active'
    return p
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('credit_card_purchases')
    .update(body)
    .eq('id', purchaseId)
    .select()
    .single()
  return data as CreditCardPurchase
}

export async function deletePurchase(purchaseId: string, debtId: string): Promise<void> {
  if (isMock()) {
    const { getStore } = await import('./mock/store')
    const { purchases } = getStore()
    if (purchases[debtId]) {
      purchases[debtId] = purchases[debtId].filter((p) => p.id !== purchaseId)
    }
    return
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  await supabase.from('credit_card_purchases').delete().eq('id', purchaseId)
}
