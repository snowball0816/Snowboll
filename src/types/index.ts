export type DebtType = 'credit_card' | 'loan'

export type PurchaseStatus = 'active' | 'paid'

export interface CreditCardPurchase {
  id: string
  debt_id: string
  description: string
  purchase_date: string
  total_amount: number
  num_installments: number    // 1 = contado (pasa al saldo rotativo)
  paid_installments: number   // cuotas ya pagadas
  installment_amount: number  // monto por cuota
  interest_free: boolean      // true = diferida sin interés
  interest_rate?: number      // tasa propia si aplica (usa la de la tarjeta si no)
  status: PurchaseStatus
  notes?: string
  created_at: string
}

export type LoanType =
  | 'libre_inversion'
  | 'vehiculo'
  | 'hipotecario'
  | 'libranza'
  | 'cooperativa'
  | 'familiar'
  | 'otro'

export type PaymentType = 'normal' | 'partial' | 'extraordinary' | 'total'

export type DebtStatus = 'active' | 'paid'

export interface Debt {
  id: string
  user_id: string
  type: DebtType
  name: string
  entity: string
  status: DebtStatus

  // Financials
  initial_balance: number
  current_balance: number
  interest_rate: number // Annual percentage
  monthly_payment: number // Minimum payment
  credit_limit?: number // For credit cards

  // Loan specific
  loan_type?: LoanType
  disbursement_date?: string
  due_date?: string
  term_months?: number

  // Credit card specific
  cut_date?: number // Day of month
  payment_due_date?: number // Day of month

  // Seguros y gastos fijos mensuales (aplica a tarjetas y créditos)
  insurance_monthly?: number

  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  debt_id: string
  type: PaymentType
  amount: number
  principal_amount: number
  interest_amount: number
  balance_after: number
  payment_date: string
  notes?: string
  created_at: string
}

export interface SnowballSchedule {
  debtId: string
  debtName: string
  payoffDate: Date
  totalInterest: number
  totalPaid: number
  monthsToPayoff: number
  order: number
  freedAmount: number // Monthly payment freed when paid off
}

export interface AvalancheSchedule {
  debtId: string
  debtName: string
  payoffDate: Date
  totalInterest: number
  totalPaid: number
  monthsToPayoff: number
  order: number
  interestSaved: number
}

export interface ComparisonResult {
  snowball: {
    totalInterest: number
    payoffDate: Date
    totalMonths: number
    schedule: SnowballSchedule[]
  }
  avalanche: {
    totalInterest: number
    payoffDate: Date
    totalMonths: number
    schedule: AvalancheSchedule[]
  }
  interestSavedByAvalanche: number
  monthsSavedByAvalanche: number
}

export interface SimulationParams {
  extraMonthlyPayment: number
  oneTimePayment?: number
  oneTimePaymentDate?: Date
  targetDebtId?: string // Override snowball order
}

export interface SimulationResult {
  withExtra: {
    totalInterest: number
    payoffDate: Date
    totalMonths: number
  }
  without: {
    totalInterest: number
    payoffDate: Date
    totalMonths: number
  }
  interestSaved: number
  monthsSaved: number
}

export interface MonthlyProjection {
  month: number
  date: Date
  totalBalance: number
  totalInterest: number
  totalPrincipal: number
  debtBalances: Record<string, number>
}

export interface DashboardStats {
  totalDebt: number
  totalDebts: number
  activeDebts: number
  projectedInterest: number
  monthlyCost: number
  nextPayments: Array<{
    debt: Debt
    dueDate: Date
    amount: number
  }>
  freedomDate: Date | null
  snowballTarget: Debt | null
}
