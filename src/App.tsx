import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type EntryType = 'expense' | 'income'
type RangeKey = 'today' | 'week' | 'month' | 'all'
type TypeFilter = 'all' | EntryType
type AppView = 'dashboard' | 'add' | 'activity' | 'goals' | 'investments'
type InvestmentView = 'stocks' | 'mf' | 'nps' | 'ppf' | 'fd' | 'rd' | 'subscriptions'
type MfType = 'sip' | 'one-time'

type SubscriptionFrequency = 'monthly' | 'yearly'

type Subscription = {
  id: string
  name: string
  amount: number
  frequency: SubscriptionFrequency
  accent: string
  nextBillingDate: string
}

type Category = {
  id: string
  label: string
  accent: string
}

type AccountType = 'bank' | 'cash'

interface BudgetEntry {
  id: string
  amount: number
  categoryId: string
  note: string
  createdAt: string
  type: EntryType
  accountType?: AccountType
}

type Transaction = BudgetEntry;

type ToastState = {
  visible: boolean
  message: string
  undoTransaction: Transaction | null
  undoMode: 'add' | 'delete' | null
}

type GoalSettings = {
  monthlySavingsGoal: number
  monthlyExpenseBudget: number
}

type CustomGoal = {
  id: string
  title: string
  targetAmount: number
  savedAmount: number
}

type InvestmentSessionState = {
  stockSymbols: string
  mfSchemeCode: string
  npsMonthlyContribution: number
  npsYears: number
  npsExpectedReturn: number
  ppfLastYearContribution: number
  ppfThisYearContribution: number
  ppfYearlyContribution: number
  ppfYears: number
  ppfInterestRate: number
  fdPrincipal: number
  fdYears: number
  fdInterestRate: number
  rdMonthlyDeposit: number
  rdYears: number
  rdInterestRate: number
}

type InvestmentNumberKey = {
  [Key in keyof InvestmentSessionState]: InvestmentSessionState[Key] extends number ? Key : never
}[keyof InvestmentSessionState]

type StockQuote = {
  symbol: string
  price: number
  changePercent: number
  currency?: string
}

type StockLot = {
  shares: number
  buyPrice: number
}

type MfHolding = {
  id: string
  schemeCode: string
  schemeName: string
  units: number
  buyNav: number
  addedAt: string
  type: MfType
}

type InvestmentContribution = {
  id: string
  date: string
  amount: number
  note: string
}

type FixedDepositAccount = {
  id: string
  name: string
  principal: number
  years: number
  interestRate: number
  startDate: string
}

type RecurringDepositAccount = {
  id: string
  name: string
  monthlyDeposit: number
  years: number
  interestRate: number
  startDate: string
}

type MutualFundSnapshot = {
  schemeCode: string
  schemeName: string
  nav: number
  navDate: string
}

const STORAGE_KEY = 'project-x-transactions-v1'
const GOALS_STORAGE_KEY = 'project-x-goals-v1'
const CUSTOM_GOALS_STORAGE_KEY = 'project-x-custom-goals-v1'
const INVESTMENT_SESSION_KEY = 'project-x-investment-session-v1'
const STOCK_LOTS_STORAGE_KEY = 'project-x-stock-lots-v1'
const MF_HOLDINGS_STORAGE_KEY = 'project-x-mf-holdings-v1'
const NPS_CONTRIBUTIONS_STORAGE_KEY = 'project-x-nps-contributions-v1'
const PPF_CONTRIBUTIONS_STORAGE_KEY = 'project-x-ppf-contributions-v1'
const FD_ACCOUNTS_STORAGE_KEY = 'project-x-fd-accounts-v1'
const RD_ACCOUNTS_STORAGE_KEY = 'project-x-rd-accounts-v1'
const SUBSCRIPTIONS_STORAGE_KEY = 'project-x-subscriptions-v1'
const DAY_IN_MS = 1000 * 60 * 60 * 24
const FINNHUB_API_KEY = 'd7qtnmpr01qudming61gd7qtnmpr01qudming620'

const categoryGroups: Record<EntryType, Category[]> = {
  expense: [
    { id: 'groceries', label: 'Groceries', accent: 'var(--coral)' },
    { id: 'transport', label: 'Transport', accent: 'var(--sun)' },
    { id: 'rent', label: 'Rent', accent: 'var(--berry)' },
    { id: 'food', label: 'Food', accent: 'var(--mint)' },
    { id: 'bills', label: 'Bills', accent: 'var(--sky)' },
    { id: 'fun', label: 'Fun', accent: 'var(--sand)' },
  ],
  income: [
    { id: 'salary', label: 'Salary', accent: 'var(--mint)' },
    { id: 'freelance', label: 'Freelance', accent: 'var(--sky)' },
    { id: 'interest', label: 'Interest', accent: 'var(--sun)' },
    { id: 'refund', label: 'Refund', accent: 'var(--berry)' },
  ],
}

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'all', label: 'All Time' },
]

const typeFilterOptions: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
]

type ViewOption = {
  key: AppView
  label: string
  caption: string
  mobileLabel: string
}

const viewOptions: ViewOption[] = [
  { key: 'dashboard', label: 'Dashboard', caption: 'Pulse and trends', mobileLabel: 'Home' },
  { key: 'activity', label: 'Activity', caption: 'Search and edit history', mobileLabel: 'History' },
  { key: 'add', label: 'Add Entry', caption: 'Fast transaction pad', mobileLabel: 'Add' },
  { key: 'goals', label: 'Goals', caption: 'Habits and monthly targets', mobileLabel: 'Goals' },
  { key: 'investments', label: 'Investments', caption: 'Portfolio and allocation', mobileLabel: 'Invest' },
]

const investmentViewOptions: { key: InvestmentView; label: string }[] = [
  { key: 'stocks', label: 'Stocks' },
  { key: 'mf', label: 'Mutual Funds' },
  { key: 'nps', label: 'NPS' },
  { key: 'ppf', label: 'PPF' },
  { key: 'fd', label: 'FD' },
  { key: 'rd', label: 'RD' },
  { key: 'subscriptions', label: 'Subscriptions' },
]

const investmentSessionDefaults: InvestmentSessionState = {
  stockSymbols: 'INFY.NS,RELIANCE.NS,HDFCBANK.NS',
  mfSchemeCode: '120503',
  npsMonthlyContribution: 5000,
  npsYears: 25,
  npsExpectedReturn: 10,
  ppfLastYearContribution: 150000,
  ppfThisYearContribution: 5000,
  ppfYearlyContribution: 150000,
  ppfYears: 15,
  ppfInterestRate: 7.1,
  fdPrincipal: 100000,
  fdYears: 3,
  fdInterestRate: 6.9,
  rdMonthlyDeposit: 5000,
  rdYears: 5,
  rdInterestRate: 6.7,
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setHours(10, 15, 0, 0)
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const sampleTransactions: Transaction[] = [
  {
    id: 'seed-salary',
    type: 'income',
    categoryId: 'salary',
    amount: 48000,
    note: 'April salary',
    createdAt: dateDaysAgo(0),
  },
  {
    id: 'seed-groceries',
    type: 'expense',
    categoryId: 'groceries',
    amount: 860,
    note: 'Quick market run',
    createdAt: dateDaysAgo(0),
  },
  {
    id: 'seed-food',
    type: 'expense',
    categoryId: 'food',
    amount: 220,
    note: 'Dinner with friends',
    createdAt: dateDaysAgo(1),
  },
  {
    id: 'seed-freelance',
    type: 'income',
    categoryId: 'freelance',
    amount: 7500,
    note: 'Landing page gig',
    createdAt: dateDaysAgo(3),
  },
  {
    id: 'seed-transport',
    type: 'expense',
    categoryId: 'transport',
    amount: 310,
    note: 'Fuel top-up',
    createdAt: dateDaysAgo(4),
  },
]

function loadTransactions() {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return sampleTransactions
  }

  try {
    const parsed = JSON.parse(stored) as Transaction[]
    if (!Array.isArray(parsed)) {
      return sampleTransactions
    }

    return parsed.length > 0 ? parsed : sampleTransactions
  } catch {
    return sampleTransactions
  }
}

function loadGoalSettings(): GoalSettings {
  const fallback: GoalSettings = {
    monthlySavingsGoal: 5000,
    monthlyExpenseBudget: 35000,
  }

  const stored = window.localStorage.getItem(GOALS_STORAGE_KEY)
  if (!stored) {
    return fallback
  }

  try {
    const parsed = JSON.parse(stored) as GoalSettings
    return {
      monthlySavingsGoal:
        Number.isFinite(parsed.monthlySavingsGoal) && parsed.monthlySavingsGoal >= 0
          ? parsed.monthlySavingsGoal
          : fallback.monthlySavingsGoal,
      monthlyExpenseBudget:
        Number.isFinite(parsed.monthlyExpenseBudget) && parsed.monthlyExpenseBudget >= 0
          ? parsed.monthlyExpenseBudget
          : fallback.monthlyExpenseBudget,
    }
  } catch {
    return fallback
  }
}

function loadCustomGoals(): CustomGoal[] {
  const stored = window.localStorage.getItem(CUSTOM_GOALS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as CustomGoal[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (goal) =>
          typeof goal.id === 'string' &&
          typeof goal.title === 'string' &&
          Number.isFinite(goal.targetAmount) &&
          goal.targetAmount > 0 &&
          Number.isFinite(goal.savedAmount) &&
          goal.savedAmount >= 0,
      )
      .map((goal) => ({
        ...goal,
        title: goal.title.trim(),
        targetAmount: Math.round(goal.targetAmount),
        savedAmount: Math.round(goal.savedAmount),
      }))
  } catch {
    return []
  }
}

function loadStockLots(): Record<string, StockLot> {
  const stored = window.localStorage.getItem(STOCK_LOTS_STORAGE_KEY)
  if (!stored) {
    return {}
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, StockLot>
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.entries(parsed).reduce<Record<string, StockLot>>((accumulator, [symbol, lot]) => {
      if (
        typeof symbol === 'string' &&
        lot &&
        Number.isFinite(lot.shares) &&
        lot.shares > 0 &&
        Number.isFinite(lot.buyPrice) &&
        lot.buyPrice >= 0
      ) {
        accumulator[symbol.toUpperCase()] = {
          shares: Math.max(1, Math.round(Number(lot.shares))),
          buyPrice: Number(lot.buyPrice),
        }
      }

      return accumulator
    }, {})
  } catch {
    return {}
  }
}

function loadMfHoldings(): MfHolding[] {
  const stored = window.localStorage.getItem(MF_HOLDINGS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as MfHolding[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.schemeCode === 'string' &&
        typeof item.schemeName === 'string' &&
        Number.isFinite(item.units) &&
        item.units > 0 &&
        Number.isFinite(item.buyNav) &&
        item.buyNav >= 0 &&
        typeof item.addedAt === 'string',
    ).map(item => ({
      ...item,
      type: item.type || 'one-time'
    }))
  } catch {
    return []
  }
}

function loadContributions(storageKey: string): InvestmentContribution[] {
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as InvestmentContribution[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.date === 'string' &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        typeof item.note === 'string',
    )
  } catch {
    return []
  }
}

function loadFdAccounts(): FixedDepositAccount[] {
  const stored = window.localStorage.getItem(FD_ACCOUNTS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as FixedDepositAccount[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.principal) &&
        item.principal > 0 &&
        Number.isFinite(item.years) &&
        item.years > 0 &&
        Number.isFinite(item.interestRate) &&
        item.interestRate >= 0 &&
        typeof item.startDate === 'string',
    )
  } catch {
    return []
  }
}

function loadRdAccounts(): RecurringDepositAccount[] {
  const stored = window.localStorage.getItem(RD_ACCOUNTS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as RecurringDepositAccount[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.monthlyDeposit) &&
        item.monthlyDeposit > 0 &&
        Number.isFinite(item.years) &&
        item.years > 0 &&
        Number.isFinite(item.interestRate) &&
        item.interestRate >= 0 &&
        typeof item.startDate === 'string',
    )
  } catch {
    return []
  }
}

function loadSubscriptions(): Subscription[] {
  const stored = window.localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as Subscription[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        (item.frequency === 'monthly' || item.frequency === 'yearly')
    )
  } catch {
    return []
  }
}

function loadInvestmentSession(): InvestmentSessionState {
  const stored = window.sessionStorage.getItem(INVESTMENT_SESSION_KEY)
  if (!stored) {
    return investmentSessionDefaults
  }

  try {
    const parsed = JSON.parse(stored) as Partial<InvestmentSessionState>

    function safeNumber(value: unknown, fallback: number) {
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : fallback
    }

    return {
      stockSymbols:
        typeof parsed.stockSymbols === 'string' && parsed.stockSymbols.trim().length > 0
          ? parsed.stockSymbols
          : investmentSessionDefaults.stockSymbols,
      mfSchemeCode:
        typeof parsed.mfSchemeCode === 'string' && parsed.mfSchemeCode.trim().length > 0
          ? parsed.mfSchemeCode
          : investmentSessionDefaults.mfSchemeCode,
      npsMonthlyContribution: safeNumber(
        parsed.npsMonthlyContribution,
        investmentSessionDefaults.npsMonthlyContribution,
      ),
      npsYears: safeNumber(parsed.npsYears, investmentSessionDefaults.npsYears),
      npsExpectedReturn: safeNumber(parsed.npsExpectedReturn, investmentSessionDefaults.npsExpectedReturn),
      ppfLastYearContribution: safeNumber(
        parsed.ppfLastYearContribution,
        investmentSessionDefaults.ppfLastYearContribution,
      ),
      ppfThisYearContribution: safeNumber(
        parsed.ppfThisYearContribution,
        investmentSessionDefaults.ppfThisYearContribution,
      ),
      ppfYearlyContribution: safeNumber(
        parsed.ppfYearlyContribution,
        investmentSessionDefaults.ppfYearlyContribution,
      ),
      ppfYears: safeNumber(parsed.ppfYears, investmentSessionDefaults.ppfYears),
      ppfInterestRate: safeNumber(parsed.ppfInterestRate, investmentSessionDefaults.ppfInterestRate),
      fdPrincipal: safeNumber(parsed.fdPrincipal, investmentSessionDefaults.fdPrincipal),
      fdYears: safeNumber(parsed.fdYears, investmentSessionDefaults.fdYears),
      fdInterestRate: safeNumber(parsed.fdInterestRate, investmentSessionDefaults.fdInterestRate),
      rdMonthlyDeposit: safeNumber(parsed.rdMonthlyDeposit, investmentSessionDefaults.rdMonthlyDeposit),
      rdYears: safeNumber(parsed.rdYears, investmentSessionDefaults.rdYears),
      rdInterestRate: safeNumber(parsed.rdInterestRate, investmentSessionDefaults.rdInterestRate),
    }
  } catch {
    return investmentSessionDefaults
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function parseStockSymbols(symbolsText: string) {
  return symbolsText
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol.length > 0)
    .slice(0, 10)
}

function parseMfApiDate(value: string) {
  const parts = value.split('-').map((item) => Number(item))
  if (parts.length === 3 && parts.every((item) => Number.isFinite(item))) {
    const [day, month, year] = parts
    const parsed = new Date(year, month - 1, day)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

async function fetchJsonWithFallback<T>(url: string): Promise<T> {
  // Try direct first
  try {
    const directResponse = await fetch(url)
    if (directResponse.ok) return (await directResponse.json()) as T
  } catch { }

  // Primary Proxy: AllOrigins
  try {
    const cacheBuster = url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`
    const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url + cacheBuster)}`
    const res = await fetch(proxiedUrl)
    if (res.ok) return (await res.json()) as T
  } catch { }

  // Secondary Proxy: Codetabs (as backup)
  const backupUrl = `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(url)}`
  const backupRes = await fetch(backupUrl)
  if (!backupRes.ok) throw new Error('All proxies failed')
  return (await backupRes.json()) as T
}

async function lookupMfNavOnDate(schemeCode: string, targetDate: string) {
  type MfApiResponse = {
    meta?: {
      scheme_code?: string | number
      scheme_name?: string
    }
    data?: Array<{
      date?: string
      nav?: string
    }>
  }

  const response = await fetchJsonWithFallback<MfApiResponse>(`https://api.mfapi.in/mf/${schemeCode}`)
  const targetTime = new Date(`${targetDate}T00:00:00`).getTime()

  let latestBeforeOrOn:
    | {
      nav: number
      dateLabel: string
      time: number
    }
    | null = null

  let earliestAfter:
    | {
      nav: number
      dateLabel: string
      time: number
    }
    | null = null

  for (const row of response.data ?? []) {
    const parsedDate = row.date ? parseMfApiDate(row.date) : null
    const nav = Number(row.nav)
    if (!parsedDate || !Number.isFinite(nav)) {
      continue
    }

    const rowTime = parsedDate.getTime()
    const candidate = { nav, dateLabel: row.date as string, time: rowTime }

    if (rowTime <= targetTime) {
      if (!latestBeforeOrOn || rowTime > latestBeforeOrOn.time) {
        latestBeforeOrOn = candidate
      }
    } else if (!earliestAfter || rowTime < earliestAfter.time) {
      earliestAfter = candidate
    }
  }

  const selected = latestBeforeOrOn ?? earliestAfter
  if (!selected) {
    throw new Error('NAV not found')
  }

  return {
    schemeName: response.meta?.scheme_name ?? `Scheme ${schemeCode}`,
    nav: selected.nav,
    navDateLabel: selected.dateLabel,
  }
}

function calculateSipFutureValue(monthlyAmount: number, annualRatePercent: number, years: number) {
  const months = Math.max(0, Math.round(years * 12))
  const monthlyRate = annualRatePercent / 1200

  if (months === 0 || monthlyAmount <= 0) {
    return 0
  }

  if (monthlyRate === 0) {
    return monthlyAmount * months
  }

  return monthlyAmount * ((((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate))
}

function currency(value: number, code: string = 'INR') {
  return formatCurrency(value, code)
}

function compactCurrency(amount: number, code: string = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: code,
    notation: Math.abs(amount) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(amount)
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function matchesRange(dateString: string, range: RangeKey) {
  if (range === 'all') {
    return true
  }

  const date = new Date(dateString)
  const now = new Date()

  if (range === 'today') {
    return isSameDay(date, now)
  }

  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (range === 'week') {
    return diffDays <= 7
  }

  return diffDays <= 30
}

function friendlyDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()

  if (isSameDay(date, now)) {
    return 'Today'
  }

  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(date, yesterday)) {
    return 'Yesterday'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function formatCurrency(value: number, currencyCode: string = 'INR') {
  const isSmall = Math.abs(value) < 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: isSmall || currencyCode !== 'INR' ? 2 : 0,
    maximumFractionDigits: isSmall || currencyCode !== 'INR' ? 2 : 0,
  }).format(value)
}

function getCurrencyForSymbol(symbol: string) {
  const s = symbol.toUpperCase()
  if (s.endsWith('.NS') || s.endsWith('.BO')) return 'INR'
  if (s.endsWith('.NE') || s.endsWith('.TO')) return 'CAD'
  if (s.endsWith('.L')) return 'GBP'
  if (s.endsWith('.DE')) return 'EUR'
  if (s.endsWith('.HK')) return 'HKD'
  // Default to USD for others or no suffix
  return 'USD'
}


function friendlyFullDate(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
  const [goals, setGoals] = useState<GoalSettings>(loadGoalSettings)
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>(loadCustomGoals)
  const [activeView, setActiveView] = useState<AppView>('dashboard')
  const [entryType, setEntryType] = useState<EntryType>('expense')
  const [selectedAccount, setSelectedAccount] = useState<AccountType>('bank')
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryGroups.expense[0].id)
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [range, setRange] = useState<RangeKey>('today')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customGoalTitle, setCustomGoalTitle] = useState('')
  const [customGoalTarget, setCustomGoalTarget] = useState('')
  const [investmentView, setInvestmentView] = useState<InvestmentView | null>(null)
  const [investmentSession, setInvestmentSession] = useState<InvestmentSessionState>(loadInvestmentSession)
  const [stockSymbolDraft, setStockSymbolDraft] = useState('')
  const [stockSharesDraft, setStockSharesDraft] = useState('10')
  const [activeAllocIdx, setActiveAllocIdx] = useState<number | null>(null)
  const [stockBuyPriceDraft, setStockBuyPriceDraft] = useState('')
  const [stockLots, setStockLots] = useState<Record<string, StockLot>>(loadStockLots)
  const [mfCodeDraft, setMfCodeDraft] = useState(investmentSession.mfSchemeCode)
  const [mfDateDraft, setMfDateDraft] = useState(todayIsoDate())
  const [mfUnitsDraft, setMfUnitsDraft] = useState('0')
  const [mfBuyNavDraft, setMfBuyNavDraft] = useState('0')
  const [mfTypeDraft, setMfTypeDraft] = useState<MfType>('sip')
  const [mfNavLookupLoading, setMfNavLookupLoading] = useState(false)
  const [mfNavLookupError, setMfNavLookupError] = useState('')
  const [mfHoldings, setMfHoldings] = useState<MfHolding[]>(loadMfHoldings)
  const [npsContributions, setNpsContributions] = useState<InvestmentContribution[]>(
    () => loadContributions(NPS_CONTRIBUTIONS_STORAGE_KEY),
  )
  const [npsContributionDate, setNpsContributionDate] = useState(todayIsoDate())
  const [npsContributionAmount, setNpsContributionAmount] = useState('')
  const [npsContributionNote, setNpsContributionNote] = useState('')
  const [ppfContributions, setPpfContributions] = useState<InvestmentContribution[]>(
    () => loadContributions(PPF_CONTRIBUTIONS_STORAGE_KEY),
  )
  const [ppfContributionDate, setPpfContributionDate] = useState(todayIsoDate())
  const [ppfContributionAmount, setPpfContributionAmount] = useState('')
  const [ppfContributionNote, setPpfContributionNote] = useState('')
  const [fdAccounts, setFdAccounts] = useState<FixedDepositAccount[]>(loadFdAccounts)
  const [fdNameDraft, setFdNameDraft] = useState('')
  const [fdPrincipalDraft, setFdPrincipalDraft] = useState(String(investmentSession.fdPrincipal))
  const [fdYearsDraft, setFdYearsDraft] = useState(String(investmentSession.fdYears))
  const [fdRateDraft, setFdRateDraft] = useState(String(investmentSession.fdInterestRate))
  const [fdStartDateDraft, setFdStartDateDraft] = useState(todayIsoDate())
  const [rdAccounts, setRdAccounts] = useState<RecurringDepositAccount[]>(loadRdAccounts)
  const [rdNameDraft, setRdNameDraft] = useState('')
  const [rdDepositDraft, setRdDepositDraft] = useState(String(investmentSession.rdMonthlyDeposit))
  const [rdYearsDraft, setRdYearsDraft] = useState(String(investmentSession.rdYears))
  const [rdRateDraft, setRdRateDraft] = useState(String(investmentSession.rdInterestRate))
  const [rdStartDateDraft, setRdStartDateDraft] = useState(todayIsoDate())
  const [stockQuotes, setStockQuotes] = useState<StockQuote[]>([])
  const [usdToInrRate, setUsdToInrRate] = useState<number>(83)
  const [stocksLoading, setStocksLoading] = useState(false)
  const [stocksError, setStocksError] = useState('')
  const [mfSnapshot, setMfSnapshot] = useState<MutualFundSnapshot | null>(null)
  const [mfLoading, setMfLoading] = useState(false)
  const [mfError, setMfError] = useState('')
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(loadSubscriptions)
  const [subNameDraft, setSubNameDraft] = useState('')
  const [subAmountDraft, setSubAmountDraft] = useState('')
  const [subFrequencyDraft, setSubFrequencyDraft] = useState<SubscriptionFrequency>('monthly')
  const [subDateDraft, setSubDateDraft] = useState(todayIsoDate())
  const [stockSearchQuery, setStockSearchQuery] = useState('')
  const [stockSearchResults, setStockSearchResults] = useState<any[]>([])
  const [isStockSearching, setIsStockSearching] = useState(false)
  const [mfSearchQuery, setMfSearchQuery] = useState('')
  const [mfSearchResults, setMfSearchResults] = useState<any[]>([])
  const [isMfSearching, setIsMfSearching] = useState(false)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    undoTransaction: null,
    undoMode: null,
  })

  const activeCategories = categoryGroups[entryType]
  const isEditing = editingId !== null

  const categoryFilterOptions = useMemo(() => {
    const source =
      typeFilter === 'all' ? [...categoryGroups.expense, ...categoryGroups.income] : categoryGroups[typeFilter]

    return [...source].sort((a, b) => a.label.localeCompare(b.label))
  }, [typeFilter])

  const selectedCategoryValue = activeCategories.some((category) => category.id === selectedCategory)
    ? selectedCategory
    : activeCategories[0].id

  const normalizedCategoryFilter =
    categoryFilter === 'all' || categoryFilterOptions.some((category) => category.id === categoryFilter)
      ? categoryFilter
      : 'all'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
  }, [goals])

  useEffect(() => {
    window.localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscriptions))
  }, [subscriptions])

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_GOALS_STORAGE_KEY, JSON.stringify(customGoals))
  }, [customGoals])

  useEffect(() => {
    window.localStorage.setItem(STOCK_LOTS_STORAGE_KEY, JSON.stringify(stockLots))
  }, [stockLots])

  useEffect(() => {
    window.localStorage.setItem(MF_HOLDINGS_STORAGE_KEY, JSON.stringify(mfHoldings))
  }, [mfHoldings])

  useEffect(() => {
    window.localStorage.setItem(NPS_CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(npsContributions))
  }, [npsContributions])

  useEffect(() => {
    window.localStorage.setItem(PPF_CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(ppfContributions))
  }, [ppfContributions])

  useEffect(() => {
    window.localStorage.setItem(FD_ACCOUNTS_STORAGE_KEY, JSON.stringify(fdAccounts))
  }, [fdAccounts])

  useEffect(() => {
    window.localStorage.setItem(RD_ACCOUNTS_STORAGE_KEY, JSON.stringify(rdAccounts))
  }, [rdAccounts])

  useEffect(() => {
    window.sessionStorage.setItem(INVESTMENT_SESSION_KEY, JSON.stringify(investmentSession))
  }, [investmentSession])

  useEffect(() => {
    if (!toast.visible) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToast({ visible: false, message: '', undoTransaction: null, undoMode: null })
    }, 4200)

    return () => window.clearTimeout(timeoutId)
  }, [toast.visible])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [transactions])

  const rangeTransactions = useMemo(
    () => sortedTransactions.filter((transaction) => matchesRange(transaction.createdAt, range)),
    [sortedTransactions, range],
  )

  const scopedTransactions = useMemo(() => {
    return rangeTransactions.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false
      }

      if (normalizedCategoryFilter !== 'all' && transaction.categoryId !== normalizedCategoryFilter) {
        return false
      }

      return true
    })
  }, [rangeTransactions, typeFilter, normalizedCategoryFilter])

  const filteredTransactions = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (query.length === 0) {
      return scopedTransactions
    }

    return scopedTransactions.filter((transaction) => {
      const categoryLabel =
        categoryGroups[transaction.type].find((item) => item.id === transaction.categoryId)?.label ??
        'Unsorted'

      const haystack = `${categoryLabel} ${transaction.note} ${transaction.type} ${transaction.amount}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [scopedTransactions, searchText])

  const todayTransactions = useMemo(
    () => sortedTransactions.filter((transaction) => matchesRange(transaction.createdAt, 'today')),
    [sortedTransactions],
  )

  const summary = useMemo(() => {
    return scopedTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += transaction.amount
        } else {
          accumulator.expense += transaction.amount
        }

        return accumulator
      },
      { income: 0, expense: 0 },
    )
  }, [scopedTransactions])

  const todaySummary = useMemo(() => {
    return todayTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += transaction.amount
        } else {
          accumulator.expense += transaction.amount
        }

        return accumulator
      },
      { income: 0, expense: 0 },
    )
  }, [todayTransactions])

  const net = summary.income - summary.expense
  const todayNet = todaySummary.income - todaySummary.expense

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return sortedTransactions.reduce(
      (accumulator, transaction) => {
        const transactionDate = new Date(transaction.createdAt)
        if (transactionDate.getFullYear() !== year || transactionDate.getMonth() !== month) {
          return accumulator
        }

        if (transaction.type === 'income') {
          accumulator.income += transaction.amount
        } else {
          accumulator.expense += transaction.amount
        }

        return accumulator
      },
      { income: 0, expense: 0 },
    )
  }, [sortedTransactions])

  const monthlyNet = monthlySummary.income - monthlySummary.expense

  const { bankBalance, cashBalance } = useMemo(() => {
    return sortedTransactions.reduce(
      (acc, t) => {
        const amount = t.type === 'income' ? t.amount : -t.amount
        if (t.accountType === 'cash') {
          acc.cashBalance += amount
        } else {
          // Default to bank if not specified for backward compatibility
          acc.bankBalance += amount
        }
        return acc
      },
      { bankBalance: 0, cashBalance: 0 }
    )
  }, [sortedTransactions])

  const totalTracked = bankBalance + cashBalance

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    const expenseTransactions = scopedTransactions.filter((t) => t.type === 'expense')
    const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0)

    expenseTransactions.forEach((t) => {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
    })

    return [...totals.entries()]
      .map(([id, amount]) => {
        const category = categoryGroups.expense.find((c) => c.id === id)
        return {
          id,
          label: category?.label ?? 'Unsorted',
          amount,
          accent: category?.accent ?? '#ccc',
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [scopedTransactions])

  const topSpendCategory = useMemo(() => {
    const top = spendingByCategory[0]
    return {
      label: top?.label ?? 'No spend yet',
      amount: top?.amount ?? 0,
    }
  }, [spendingByCategory])

  const savingsRate =
    summary.income > 0 ? Math.max(0, Math.round((net / summary.income) * 100)) : 0

  const streak = useMemo(() => {
    if (sortedTransactions.length === 0) {
      return { days: 0, loggedToday: false, daysSinceLastEntry: Infinity }
    }

    const uniqueDays = new Set(
      sortedTransactions.map((transaction) => dateKey(startOfDay(new Date(transaction.createdAt)))),
    )

    const today = startOfDay(new Date())
    const loggedToday = uniqueDays.has(dateKey(today))

    const cursor = startOfDay(new Date())
    if (!loggedToday) {
      cursor.setDate(cursor.getDate() - 1)
    }

    let streakDays = 0
    while (uniqueDays.has(dateKey(cursor))) {
      streakDays += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const lastEntryDate = startOfDay(new Date(sortedTransactions[0].createdAt))
    const diffDays = Math.floor((today.getTime() - lastEntryDate.getTime()) / DAY_IN_MS)

    return {
      days: streakDays,
      loggedToday,
      daysSinceLastEntry: diffDays,
    }
  }, [sortedTransactions])

  const weeklyInsight = useMemo(() => {
    const today = startOfDay(new Date())
    let thisWeekExpense = 0
    let lastWeekExpense = 0
    const thisWeekCategoryTotals = new Map<string, number>()

    sortedTransactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        const transactionDay = startOfDay(new Date(transaction.createdAt))
        const diffDays = Math.floor((today.getTime() - transactionDay.getTime()) / DAY_IN_MS)

        if (diffDays >= 0 && diffDays <= 6) {
          thisWeekExpense += transaction.amount
          thisWeekCategoryTotals.set(
            transaction.categoryId,
            (thisWeekCategoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount,
          )
        } else if (diffDays >= 7 && diffDays <= 13) {
          lastWeekExpense += transaction.amount
        }
      })

    const [topCategoryId] = [...thisWeekCategoryTotals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    const topCategoryLabel =
      categoryGroups.expense.find((category) => category.id === topCategoryId)?.label ?? 'expenses'

    let message = 'Spending is steady compared with last week.'
    let tone: 'good' | 'warn' | 'neutral' = 'neutral'

    if (streak.daysSinceLastEntry >= 3) {
      message = `No entry in ${streak.daysSinceLastEntry} days. Add one now to keep your numbers accurate.`
      tone = 'warn'
    } else if (lastWeekExpense === 0 && thisWeekExpense > 0) {
      message = `Fresh activity this week. ${topCategoryLabel} is your top spend area so far.`
      tone = 'neutral'
    } else if (lastWeekExpense > 0) {
      const changePercent = Math.round(((thisWeekExpense - lastWeekExpense) / lastWeekExpense) * 100)

      if (changePercent >= 15) {
        message = `You spent ${changePercent}% more this week, mostly on ${topCategoryLabel}.`
        tone = 'warn'
      } else if (changePercent <= -15) {
        message = `Great work. You cut weekly spending by ${Math.abs(changePercent)}%.`
        tone = 'good'
      }
    }

    return {
      thisWeekExpense,
      lastWeekExpense,
      message,
      tone,
    }
  }, [sortedTransactions, streak.daysSinceLastEntry])

  const savingsProgress =
    goals.monthlySavingsGoal > 0 ? Math.min(100, Math.round((Math.max(monthlyNet, 0) / goals.monthlySavingsGoal) * 100)) : 0

  const expenseUsagePercent =
    goals.monthlyExpenseBudget > 0 ? Math.round((monthlySummary.expense / goals.monthlyExpenseBudget) * 100) : 0

  const budgetProgress = goals.monthlyExpenseBudget > 0 ? Math.min(100, expenseUsagePercent) : 0
  const budgetTone =
    goals.monthlyExpenseBudget <= 0
      ? 'neutral'
      : expenseUsagePercent >= 100
        ? 'danger'
        : expenseUsagePercent >= 80
          ? 'warn'
          : 'good'

  const parsedStockSymbols = useMemo(() => {
    return parseStockSymbols(investmentSession.stockSymbols)
  }, [investmentSession.stockSymbols])

  useEffect(() => {
    if (!stockSearchQuery.trim()) {
      setStockSearchResults([])
      return
    }
    const timeoutId = setTimeout(async () => {
      setIsStockSearching(true)
      try {
        const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(stockSearchQuery)}&token=${FINNHUB_API_KEY}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data.result)) {
            setStockSearchResults(
              data.result
                .filter((r: any) => r.type === 'Common Stock' || r.type === 'ETP' || r.type === 'ADR')
                .slice(0, 8)
                .map((r: any) => ({
                  symbol: r.symbol,
                  shortname: r.description,
                  type: r.type,
                }))
            )
          }
        }
      } catch {
        setStockSearchResults([])
      } finally {
        setIsStockSearching(false)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [stockSearchQuery])

  useEffect(() => {
    if (!mfSearchQuery.trim()) {
      setMfSearchResults([])
      return
    }
    const timeoutId = setTimeout(async () => {
      setIsMfSearching(true)
      try {
        const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(mfSearchQuery)}`
        const data = await fetchJsonWithFallback<any[]>(url)
        if (Array.isArray(data)) {
          setMfSearchResults(data.slice(0, 10))
        }
      } catch {
        setMfSearchResults([])
      } finally {
        setIsMfSearching(false)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [mfSearchQuery])

  useEffect(() => {
    if (parsedStockSymbols.length === 0) {
      Promise.resolve().then(() => {
        setStockQuotes([])
        setStocksError('Add at least one stock symbol to fetch live quotes.')
      })
      return undefined
    }

    let isActive = true

    async function loadStocks() {
      if (isActive) {
        setStocksLoading(true)
      }

      try {
        type FinnhubQuote = {
          c: number  // current price
          d: number  // change
          dp: number // percent change
          h: number  // high
          l: number  // low
          o: number  // open
          pc: number // previous close
        }

        async function fetchFinnhubQuote(symbol: string): Promise<StockQuote | null> {
          try {
            const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
            const response = await fetch(url)
            if (!response.ok) return null
            const data: FinnhubQuote = await response.json()
            if (!data || !Number.isFinite(data.c) || data.c === 0) return null
            return {
              symbol,
              price: data.c,
              changePercent: Number.isFinite(data.dp) ? data.dp : 0,
              currency: getCurrencyForSymbol(symbol),
            }
          } catch {
            return null
          }
        }

        async function fetchYahooQuote(symbol: string): Promise<StockQuote | null> {
          try {
            type YahooChartResponse = {
              chart?: {
                result?: Array<{
                  meta?: {
                    regularMarketPrice?: number
                    previousClose?: number
                    currency?: string
                  }
                }>
              }
            }
            const data = await fetchJsonWithFallback<YahooChartResponse>(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
            )
            const meta = data.chart?.result?.[0]?.meta
            if (!meta || !Number.isFinite(meta.regularMarketPrice)) return null

            const price = Number(meta.regularMarketPrice)
            const prev = Number(meta.previousClose)
            let changePercent = 0
            if (Number.isFinite(prev) && prev > 0) {
              changePercent = ((price - prev) / prev) * 100
            }

            return {
              symbol,
              price,
              changePercent,
              currency: meta.currency || getCurrencyForSymbol(symbol),
            }
          } catch {
            return null
          }
        }

        let nseCookie = ''

        async function fetchNseQuote(symbol: string): Promise<StockQuote | null> {
          try {
            const cleanSymbol = symbol.replace('.NS', '').toUpperCase()
            // Browsers block direct NSE requests due to CORS. Using proxy is mandatory.
            const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(cleanSymbol)}`
            const data = await fetchJsonWithFallback<any>(url)
            
            if (!data || !data.priceInfo || !Number.isFinite(data.priceInfo.lastPrice)) return null

            return {
              symbol,
              price: Number(data.priceInfo.lastPrice),
              changePercent: Number(data.priceInfo.pChange) || 0,
            }
          } catch (err) {
            console.warn(`NSE fetch failed for ${symbol}:`, err)
            return null
          }
        }

        const isIndianSymbol = (s: string) => s.endsWith('.NS') || s.endsWith('.BO')

        const loadExchangeRate = async () => {
          try {
            const quote = await fetchYahooQuote('USDINR=X')
            if (quote && quote.price > 0) {
              setUsdToInrRate(quote.price)
            }
          } catch { }
        }

        loadExchangeRate()

        const quotePromises = parsedStockSymbols.map(async (symbol): Promise<StockQuote | null> => {
          // If no suffix and looks like an Indian stock (standard letters), try .NS first
          let targetSymbol = symbol
          if (!symbol.includes('.')) {
            targetSymbol = `${symbol}.NS`
          }

          const isInd = isIndianSymbol(targetSymbol)

          if (isInd) {
            // Priority 1: Direct NSE (via Proxy)
            if (targetSymbol.endsWith('.NS')) {
              const nseResult = await fetchNseQuote(targetSymbol)
              if (nseResult) return nseResult
            }
            // Priority 2: Yahoo (via Proxy)
            return fetchYahooQuote(targetSymbol)
          }

          // Non-Indian symbol logic
          // Try Finnhub first (usually faster for US stocks)
          const finnhubResult = await fetchFinnhubQuote(symbol)
          if (finnhubResult) return finnhubResult

          // Fallback: Yahoo
          return fetchYahooQuote(symbol)
        })

        const results = await Promise.all(quotePromises)
        const orderedQuotes = results.filter((q): q is StockQuote => q !== null)

        if (!isActive) return

        if (orderedQuotes.length === 0) {
          setStocksError('Live stock data unavailable. Check symbols or retry.')
          return
        }

        setStockQuotes(orderedQuotes)
        setStocksError('')
        setQuoteUpdatedAt(new Date().toISOString())
      } catch {
        if (!isActive) return
        setStocksError('Unable to fetch stock quotes from Finnhub right now.')
      } finally {
        if (isActive) {
          setStocksLoading(false)
        }
      }
    }

    void loadStocks()
    const intervalId = window.setInterval(() => {
      void loadStocks()
    }, 60000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [parsedStockSymbols])

  useEffect(() => {
    const schemeCode = investmentSession.mfSchemeCode.trim()
    if (schemeCode.length === 0) {
      Promise.resolve().then(() => {
        setMfSnapshot(null)
        setMfError('Enter a mutual fund scheme code (AMFI) to fetch NAV.')
      })
      return undefined
    }

    let isActive = true

    async function loadMutualFund() {
      if (isActive) {
        setMfLoading(true)
      }

      try {
        type MfApiResponse = {
          meta?: {
            scheme_code?: string | number
            scheme_name?: string
          }
          data?: Array<{
            date?: string
            nav?: string
          }>
        }

        const response = await fetchJsonWithFallback<MfApiResponse>(`https://api.mfapi.in/mf/${schemeCode}`)

        const latest = (response.data ?? []).find((row) => Number.isFinite(Number(row.nav)))

        if (!latest || !Number.isFinite(Number(latest.nav)) || !latest.date) {
          throw new Error('No NAV rows')
        }

        if (!isActive) {
          return
        }

        setMfSnapshot({
          schemeCode: String(response.meta?.scheme_code ?? schemeCode),
          schemeName: response.meta?.scheme_name ?? 'Mutual Fund',
          nav: Number(latest.nav),
          navDate: latest.date,
        })
        setMfError('')
        setQuoteUpdatedAt(new Date().toISOString())
      } catch {
        if (isActive) {
          setMfError('Unable to fetch mutual fund NAV from free API right now.')
        }
      } finally {
        if (isActive) {
          setMfLoading(false)
        }
      }
    }

    void loadMutualFund()
    const intervalId = window.setInterval(() => {
      void loadMutualFund()
    }, 60000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [investmentSession.mfSchemeCode])

  useEffect(() => {
    const code = mfCodeDraft.trim()
    if (code.length === 0 || !mfDateDraft || !/^\d+$/.test(code)) {
      return undefined
    }

    let isActive = true

    async function loadNavPreview() {
      if (isActive) {
        setMfNavLookupLoading(true)
      }

      try {
        const navInfo = await lookupMfNavOnDate(code, mfDateDraft)
        if (!isActive) {
          return
        }

        setMfBuyNavDraft(navInfo.nav.toFixed(3))
        setMfNavLookupError('')
      } catch {
        if (isActive) {
          setMfNavLookupError('NAV preview unavailable for selected date right now.')
        }
      } finally {
        if (isActive) {
          setMfNavLookupLoading(false)
        }
      }
    }
    void loadNavPreview()
    return () => {
      isActive = false
    }
  }, [mfCodeDraft, mfDateDraft])

  const stockQuoteMap = useMemo(() => {
    return new Map(stockQuotes.map((quote) => [quote.symbol.toUpperCase(), quote]))
  }, [stockQuotes])

  const stockHoldingRows = useMemo(() => {
    return parsedStockSymbols.map((symbol) => {
      const quote = stockQuoteMap.get(symbol)
      const lot = stockLots[symbol]
      const shares = lot?.shares ?? 1
      const buyPrice =
        lot?.buyPrice ??
        (quote && Number.isFinite(quote.price) && quote.price > 0 ? quote.price : 0)
      const currentPrice =
        quote && Number.isFinite(quote.price) && quote.price > 0 ? quote.price : buyPrice
      const investedValue = buyPrice * shares
      const currentValue = currentPrice * shares
      const totalPnl = currentValue - investedValue
      const totalPnlPercent = investedValue > 0 ? (totalPnl / investedValue) * 100 : 0
      const changePercent = quote?.changePercent ?? 0

      const dayPnl =
        Number.isFinite(changePercent) && Math.abs(changePercent) < 99.9
          ? currentValue - currentValue / (1 + changePercent / 100)
          : 0

      const currencyCode = quote?.currency || getCurrencyForSymbol(symbol)

      return {
        symbol,
        shares,
        buyPrice,
        currentPrice,
        investedValue,
        currentValue,
        totalPnl,
        totalPnlPercent,
        changePercent,
        dayPnl,
        currency: currencyCode,
      }
    })
  }, [parsedStockSymbols, stockLots, stockQuoteMap])

  const stockHoldingsSummary = useMemo(() => {
    return stockHoldingRows.reduce(
      (acc, row) => {
        const multiplier = row.currency === 'USD' ? usdToInrRate : 1
        return {
          investedValue: acc.investedValue + row.investedValue * multiplier,
          currentValue: acc.currentValue + row.currentValue * multiplier,
          dayReturn: acc.dayReturn + row.dayPnl * multiplier,
        }
      },
      { investedValue: 0, currentValue: 0, dayReturn: 0 }
    )
  }, [stockHoldingRows, usdToInrRate])

  const stockTotalReturn = stockHoldingsSummary.currentValue - stockHoldingsSummary.investedValue
  const stockTotalReturnPercent =
    stockHoldingsSummary.investedValue > 0
      ? (stockTotalReturn / stockHoldingsSummary.investedValue) * 100
      : 0
  const stockPreviousValue = stockHoldingsSummary.currentValue - stockHoldingsSummary.dayReturn
  const stockDayReturnPercent =
    stockPreviousValue > 0 ? (stockHoldingsSummary.dayReturn / stockPreviousValue) * 100 : 0

  const mfHoldingRows = useMemo(() => {
    return mfHoldings.map((holding) => {
      const isLiveScheme = mfSnapshot?.schemeCode === holding.schemeCode
      const schemeName = isLiveScheme ? mfSnapshot.schemeName : holding.schemeName
      const currentNav = isLiveScheme ? mfSnapshot.nav : holding.buyNav
      const invested = holding.units * holding.buyNav
      const currentValue = holding.units * currentNav
      const pnl = currentValue - invested

      return {
        ...holding,
        schemeName,
        currentNav,
        invested,
        currentValue,
        pnl,
      }
    })
  }, [mfHoldings, mfSnapshot])

  const npsContributionSummary = useMemo(() => {
    return npsContributions.reduce(
      (accumulator, contribution) => {
        accumulator.total += contribution.amount
        return accumulator
      },
      { total: 0, count: npsContributions.length },
    )
  }, [npsContributions])

  const sortedNpsContributions = useMemo(() => {
    return [...npsContributions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [npsContributions])

  const ppfContributionSummary = useMemo(() => {
    return ppfContributions.reduce(
      (accumulator, contribution) => {
        accumulator.total += contribution.amount
        return accumulator
      },
      { total: 0, count: ppfContributions.length },
    )
  }, [ppfContributions])

  const sortedPpfContributions = useMemo(() => {
    return [...ppfContributions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [ppfContributions])

  const fdRows = useMemo(() => {
    return fdAccounts.map((account) => {
      const principal = Math.max(0, account.principal)
      const annualRate = Math.max(0, account.interestRate) / 100
      const years = Math.max(0, account.years)
      const maturity = principal * (1 + annualRate / 4) ** (years * 4)

      return {
        ...account,
        maturity,
        gains: maturity - principal,
      }
    })
  }, [fdAccounts])

  const rdRows = useMemo(() => {
    return rdAccounts.map((account) => {
      const monthlyDeposit = Math.max(0, account.monthlyDeposit)
      const years = Math.max(0, account.years)
      const months = Math.round(years * 12)
      const monthlyRate = Math.max(0, account.interestRate) / 1200
      const invested = monthlyDeposit * months
      const maturity =
        months <= 0 || monthlyDeposit <= 0
          ? 0
          : monthlyRate === 0
            ? invested
            : monthlyDeposit * ((((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate))

      return {
        ...account,
        invested,
        maturity,
        gains: maturity - invested,
      }
    })
  }, [rdAccounts])

  const npsProjection = useMemo(() => {
    const invested =
      Math.max(0, investmentSession.npsMonthlyContribution) *
      Math.max(0, investmentSession.npsYears) *
      12
    const corpus = calculateSipFutureValue(
      Math.max(0, investmentSession.npsMonthlyContribution),
      Math.max(0, investmentSession.npsExpectedReturn),
      Math.max(0, investmentSession.npsYears),
    )

    return {
      invested,
      corpus,
      gains: corpus - invested,
    }
  }, [
    investmentSession.npsExpectedReturn,
    investmentSession.npsMonthlyContribution,
    investmentSession.npsYears,
  ])

  const amountValue = Number(amountText || 0)
  const canSave = Number.isFinite(amountValue) && amountValue > 0
  const viewSignals: Record<AppView, string> = {
    dashboard: `${todayTransactions.length} today`,
    add: isEditing ? 'Editing' : 'Ready',
    activity: `${filteredTransactions.length} shown`,
    goals: goals.monthlySavingsGoal > 0 ? `${savingsProgress}%` : 'Set target',
    investments: stockHoldingRows.length > 0 ? `${stockHoldingRows.length} holdings` : 'Set up',
  }

  function showToast(
    message: string,
    undoTransaction: Transaction | null = null,
    undoMode: ToastState['undoMode'] = null,
  ) {
    setToast({
      visible: true,
      message,
      undoTransaction,
      undoMode,
    })
  }

  function resetComposer() {
    setEditingId(null)
    setEntryType('expense')
    setSelectedCategory(categoryGroups.expense[0].id)
    setAmountText('')
    setNote('')
  }

  function resetFilters() {
    setRange('today')
    setTypeFilter('all')
    setCategoryFilter('all')
    setSearchText('')
  }

  function updateInvestmentText<K extends keyof InvestmentSessionState>(
    key: K,
    value: InvestmentSessionState[K],
  ) {
    setInvestmentSession((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateInvestmentNumber<K extends InvestmentNumberKey>(
    key: K,
    value: string,
  ) {
    const numericValue = Number(value)

    setInvestmentSession((current) => ({
      ...current,
      [key]: Number.isFinite(numericValue)
        ? (numericValue as InvestmentSessionState[K])
        : (0 as InvestmentSessionState[K]),
    }))
  }

  function handleSavingsGoalChange(value: string) {
    const numericValue = Number(value)
    setGoals((current) => ({
      ...current,
      monthlySavingsGoal:
        Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0,
    }))
  }

  function handleExpenseBudgetChange(value: string) {
    const numericValue = Number(value)
    setGoals((current) => ({
      ...current,
      monthlyExpenseBudget:
        Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0,
    }))
  }

  function handleAddCustomGoal() {
    const title = customGoalTitle.trim()
    const targetAmount = Number(customGoalTarget)

    if (title.length === 0) {
      showToast('Enter a goal name first.')
      return
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      showToast('Enter a valid goal target amount.')
      return
    }

    const nextGoal: CustomGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      targetAmount: Math.round(targetAmount),
      savedAmount: 0,
    }

    setCustomGoals((current) => [nextGoal, ...current])
    setCustomGoalTitle('')
    setCustomGoalTarget('')
    showToast(`Added goal: ${title}`)
  }

  function handleCustomGoalSavedChange(goalId: string, value: string) {
    const numericValue = Number(value)

    setCustomGoals((current) =>
      current.map((goal) => {
        if (goal.id !== goalId) {
          return goal
        }

        return {
          ...goal,
          savedAmount: Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0,
        }
      }),
    )
  }

  function handleDeleteCustomGoal(goalId: string) {
    const goal = customGoals.find((item) => item.id === goalId)
    if (!goal) {
      return
    }

    const shouldDelete = window.confirm(`Delete goal "${goal.title}"?`)
    if (!shouldDelete) {
      return
    }

    setCustomGoals((current) => current.filter((item) => item.id !== goalId))
    showToast(`Removed goal: ${goal.title}`)
  }

  function handleAddStockSymbol() {
    const symbol = stockSymbolDraft.trim().toUpperCase().replace(/\s+/g, '')
    const sharesValue = Number(stockSharesDraft)
    const buyPriceValue = Number(stockBuyPriceDraft)
    if (symbol.length === 0) {
      showToast('Enter a stock symbol first.')
      return
    }

    if (!/^[A-Z0-9.-]+$/.test(symbol)) {
      showToast('Use letters, numbers, dot, or hyphen for stock symbols.')
      return
    }

    if (parsedStockSymbols.includes(symbol)) {
      showToast(`${symbol} is already in your watchlist.`)
      return
    }

    if (!Number.isFinite(sharesValue) || sharesValue <= 0) {
      showToast('Enter valid shares before adding stock.')
      return
    }

    const quotePrice = stockQuoteMap.get(symbol)?.price ?? 0
    const normalizedBuyPrice =
      Number.isFinite(buyPriceValue) && buyPriceValue > 0
        ? buyPriceValue
        : Number.isFinite(quotePrice) && quotePrice > 0
          ? quotePrice
          : 0

    const nextSymbols = [...parsedStockSymbols, symbol].slice(0, 10)
    updateInvestmentText('stockSymbols', nextSymbols.join(','))
    setStockLots((current) => ({
      ...current,
      [symbol]: {
        shares: Math.max(1, Math.round(sharesValue)),
        buyPrice: normalizedBuyPrice,
      },
    }))
    setStockSymbolDraft('')
    setStockSharesDraft('10')
    setStockBuyPriceDraft('')
    showToast(`Added stock: ${symbol}`)
  }

  function handleRemoveStockSymbol(symbol: string) {
    const nextSymbols = parsedStockSymbols.filter((item) => item !== symbol)
    updateInvestmentText('stockSymbols', nextSymbols.join(','))
    setStockLots((current) => {
      const nextLots = { ...current }
      delete nextLots[symbol]
      return nextLots
    })
    showToast(`Removed stock: ${symbol}`)
  }

  async function handleAddMfScheme() {
    const code = mfCodeDraft.trim()
    const units = Number(mfUnitsDraft)

    if (code.length === 0) {
      showToast('Enter a mutual fund scheme code first.')
      return
    }

    if (!Number.isFinite(units) || units <= 0) {
      showToast('Enter valid MF units before adding.')
      return
    }

    if (!mfDateDraft) {
      showToast('Select a purchase date.')
      return
    }

    try {
      setMfNavLookupLoading(true)
      setMfNavLookupError('')

      const navInfo = await lookupMfNavOnDate(code, mfDateDraft)

      updateInvestmentText('mfSchemeCode', code)

      setMfHoldings((current) => {
        const existingIndex = current.findIndex(
          (h) => h.schemeCode === code && h.type === mfTypeDraft
        )

        if (existingIndex !== -1) {
          const existing = current[existingIndex]
          const totalUnits = existing.units + units
          // Weighted average for buy nav
          const newBuyNav = (existing.units * existing.buyNav + units * navInfo.nav) / totalUnits

          const updated = [...current]
          updated[existingIndex] = {
            ...existing,
            units: totalUnits,
            buyNav: newBuyNav,
            addedAt: `${mfDateDraft}T00:00:00.000Z`, // Update to latest transaction date
          }
          return updated
        }

        const nextHolding: MfHolding = {
          id: `mf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          schemeCode: code,
          schemeName: navInfo.schemeName,
          units,
          buyNav: navInfo.nav,
          addedAt: `${mfDateDraft}T00:00:00.000Z`,
          type: mfTypeDraft,
        }
        return [nextHolding, ...current]
      })

      setMfBuyNavDraft(navInfo.nav.toFixed(3))
      setMfUnitsDraft('0')
      showToast(`Updated MF ${code} at NAV ${navInfo.nav.toFixed(3)} (${navInfo.navDateLabel})`)
    } catch {
      setMfNavLookupError('Could not fetch NAV for this scheme/date right now.')
      showToast('Unable to fetch NAV from API. Please retry.')
    } finally {
      setMfNavLookupLoading(false)
    }
  }

  function handleTrackMfScheme(code: string, purchaseDate?: string) {
    setMfCodeDraft(code)
    if (purchaseDate) {
      setMfDateDraft(purchaseDate.slice(0, 10))
    }
    updateInvestmentText('mfSchemeCode', code)
  }

  function handleAddSubscription() {
    const name = subNameDraft.trim()
    const amount = Number(subAmountDraft)
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      showToast('Enter valid subscription details.')
      return
    }
    const accents = ['var(--sky)', 'var(--mint)', 'var(--coral)', 'var(--sun)', 'var(--berry)']
    const accent = accents[subscriptions.length % accents.length]
    setSubscriptions((curr) => [
      {
        id: `sub-${Date.now()}`,
        name,
        amount,
        frequency: subFrequencyDraft,
        nextBillingDate: subDateDraft,
        accent,
      },
      ...curr,
    ])
    setSubNameDraft('')
    setSubAmountDraft('')
    showToast('Subscription added')
  }

  function handleDeleteSubscription(id: string) {
    setSubscriptions((curr) => curr.filter((s) => s.id !== id))
    showToast('Subscription deleted')
  }

  function handleDeleteMfHolding(holdingId: string) {
    const holding = mfHoldings.find((item) => item.id === holdingId)
    if (!holding) {
      return
    }

    const shouldDelete = window.confirm(`Delete MF holding ${holding.schemeCode}?`)
    if (!shouldDelete) {
      return
    }

    setMfHoldings((current) => current.filter((item) => item.id !== holdingId))
    showToast(`Removed MF scheme: ${holding.schemeCode}`)
  }

  function addContribution(
    date: string,
    amountText: string,
    note: string,
    onAdd: (entry: InvestmentContribution) => void,
    label: string,
  ) {
    const amount = Number(amountText)
    if (!date) {
      showToast(`Select a date for ${label}.`)
      return false
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast(`Enter a valid amount for ${label}.`)
      return false
    }

    onAdd({
      id: `${label.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date,
      amount,
      note: note.trim(),
    })

    return true
  }

  function handleAddNpsContribution() {
    const added = addContribution(
      npsContributionDate,
      npsContributionAmount,
      npsContributionNote,
      (entry) => setNpsContributions((current) => [entry, ...current]),
      'NPS',
    )

    if (!added) {
      return
    }

    setNpsContributionAmount('')
    setNpsContributionNote('')
    showToast('NPS contribution added.')
  }

  function handleDeleteNpsContribution(id: string) {
    const entry = npsContributions.find((item) => item.id === id)
    setNpsContributions((current) => current.filter((item) => item.id !== id))
    if (entry) {
      showToast(`Deleted NPS ${currency(entry.amount)} entry`)
    }
  }

  function handleAddPpfContribution() {
    const added = addContribution(
      ppfContributionDate,
      ppfContributionAmount,
      ppfContributionNote,
      (entry) => setPpfContributions((current) => [entry, ...current]),
      'PPF',
    )

    if (!added) {
      return
    }

    setPpfContributionAmount('')
    setPpfContributionNote('')
    showToast('PPF contribution added.')
  }

  function handleDeletePpfContribution(id: string) {
    const entry = ppfContributions.find((item) => item.id === id)
    setPpfContributions((current) => current.filter((item) => item.id !== id))
    if (entry) {
      showToast(`Deleted PPF ${currency(entry.amount)} entry`)
    }
  }

  function handleCreateFdAccount() {
    const principal = Number(fdPrincipalDraft)
    const years = Number(fdYearsDraft)
    const interestRate = Number(fdRateDraft)

    if (!Number.isFinite(principal) || principal <= 0) {
      showToast('Enter valid FD principal.')
      return
    }

    if (!Number.isFinite(years) || years <= 0) {
      showToast('Enter valid FD years.')
      return
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      showToast('Enter valid FD interest rate.')
      return
    }

    if (!fdStartDateDraft) {
      showToast('Select FD start date.')
      return
    }

    const nextAccount: FixedDepositAccount = {
      id: `fd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: fdNameDraft.trim() || `FD #${fdAccounts.length + 1}`,
      principal,
      years,
      interestRate,
      startDate: fdStartDateDraft,
    }

    setFdAccounts((current) => [nextAccount, ...current])
    setFdNameDraft('')
    showToast(`Created ${nextAccount.name}`)
  }

  const handleAdjustBalance = (type: AccountType = 'cash') => {
    const currentVal = type === 'bank' ? bankBalance : cashBalance
    const label = type === 'bank' ? 'Bank Balance' : 'Cash in Hand'
    const target = prompt(`Enter your actual current ${label}:`, Math.round(currentVal).toString())

    if (target !== null) {
      const targetNum = parseFloat(target)
      if (isNaN(targetNum)) return

      const diff = targetNum - currentVal
      if (Math.abs(diff) < 1) return

      const newEntry: BudgetEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        amount: Math.abs(diff),
        categoryId: 'other',
        note: `${label} adjustment to ${currency(targetNum)}`,
        createdAt: todayIsoDate(),
        type: diff > 0 ? 'income' : 'expense',
        accountType: type,
      }

      setTransactions((prev) => [newEntry, ...prev])
      showToast(`${label} updated.`)
    }
  }

  function handleDeleteFdAccount(id: string) {
    const account = fdAccounts.find((item) => item.id === id)
    if (!account) {
      return
    }

    const shouldDelete = window.confirm(`Delete ${account.name}?`)
    if (!shouldDelete) {
      return
    }

    setFdAccounts((current) => current.filter((item) => item.id !== id))
    showToast(`Deleted ${account.name}`)
  }

  function handleCreateRdAccount() {
    const monthlyDeposit = Number(rdDepositDraft)
    const years = Number(rdYearsDraft)
    const interestRate = Number(rdRateDraft)

    if (!Number.isFinite(monthlyDeposit) || monthlyDeposit <= 0) {
      showToast('Enter valid RD monthly deposit.')
      return
    }

    if (!Number.isFinite(years) || years <= 0) {
      showToast('Enter valid RD years.')
      return
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      showToast('Enter valid RD interest rate.')
      return
    }

    if (!rdStartDateDraft) {
      showToast('Select RD start date.')
      return
    }

    const nextAccount: RecurringDepositAccount = {
      id: `rd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: rdNameDraft.trim() || `RD #${rdAccounts.length + 1}`,
      monthlyDeposit,
      years,
      interestRate,
      startDate: rdStartDateDraft,
    }

    setRdAccounts((current) => [nextAccount, ...current])
    setRdNameDraft('')
    showToast(`Created ${nextAccount.name}`)
  }

  function handleDeleteRdAccount(id: string) {
    const account = rdAccounts.find((item) => item.id === id)
    if (!account) {
      return
    }

    const shouldDelete = window.confirm(`Delete ${account.name}?`)
    if (!shouldDelete) {
      return
    }

    setRdAccounts((current) => current.filter((item) => item.id !== id))
    showToast(`Deleted ${account.name}`)
  }

  function handleToggleType(type: EntryType) {
    setEntryType(type)
    setSelectedCategory(categoryGroups[type][0].id)
  }

  function handleViewChange(view: AppView) {
    setActiveView(view)

    if (view !== activeView) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleAmountChange(value: string) {
    const sanitized = value.replace(/,/g, '').replace(/[^\d.]/g, '')
    const [wholePart = '', ...decimalParts] = sanitized.split('.')
    const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '')
    const hasDecimalPoint = sanitized.includes('.')

    if (!hasDecimalPoint) {
      setAmountText(normalizedWhole)
      return
    }

    const decimal = decimalParts.join('').slice(0, 2)
    setAmountText(`${normalizedWhole || '0'}.${decimal}`)
  }

  function handleSaveTransaction() {
    if (!canSave) {
      return
    }

    if (editingId) {
      setTransactions((current) =>
        current.map((item) => {
          if (item.id !== editingId) {
            return item
          }

          return {
            ...item,
            type: entryType,
            categoryId: selectedCategoryValue,
            amount: Number(amountText),
            note: note.trim(),
            accountType: selectedAccount,
          }
        }),
      )

      setEditingId(null)
      setAmountText('')
      setNote('')
      showToast('Transaction updated.')
      return
    }

    const nextEntry: Transaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: entryType,
      categoryId: selectedCategoryValue,
      amount: Number(amountText),
      note: note.trim(),
      createdAt: new Date().toISOString(),
      accountType: selectedAccount,
    }

    setTransactions((current) => [nextEntry, ...current])
    setAmountText('')
    setNote('')
    showToast(`Saved ${entryType} for ${currency(nextEntry.amount)}.`, nextEntry, 'add')
  }

  function handleStartEdit(transaction: Transaction) {
    setActiveView('add')
    setEditingId(transaction.id)
    setEntryType(transaction.type)
    setSelectedCategory(transaction.categoryId)
    setAmountText(transaction.amount.toString())
    setNote(transaction.note)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDeleteTransaction(transaction: Transaction) {
    const shouldDelete = window.confirm('Delete this transaction? This can be undone from the toast.')
    if (!shouldDelete) {
      return
    }

    setTransactions((current) => current.filter((item) => item.id !== transaction.id))

    if (editingId === transaction.id) {
      resetComposer()
    }

    showToast('Transaction deleted.', transaction, 'delete')
  }

  function handleUndo() {
    if (!toast.undoTransaction || !toast.undoMode) {
      return
    }

    if (toast.undoMode === 'add') {
      setTransactions((current) => current.filter((item) => item.id !== toast.undoTransaction?.id))
    } else if (toast.undoMode === 'delete') {
      setTransactions((current) => [toast.undoTransaction as Transaction, ...current])
    }

    setToast({ visible: false, message: '', undoTransaction: null, undoMode: null })
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="layout">
        <aside className="side-rail panel">
          <div className="rail-head">
            <span className="eyebrow">Project X</span>
            <h1>Money Workspace</h1>
            <p>Move through overview, quick add, history, and goals without losing your flow.</p>
          </div>

          <nav className="view-nav" aria-label="Primary navigation">
            {viewOptions.map((view) => (
              <button
                key={view.key}
                type="button"
                className={`view-button ${activeView === view.key ? 'active' : ''}`}
                onClick={() => handleViewChange(view.key)}
                aria-current={activeView === view.key ? 'page' : undefined}
              >
                <span className="view-button-main">
                  <span className="view-button-label">{view.label}</span>
                  <span className="view-button-copy">{view.caption}</span>
                </span>
                <span className="view-badge">{viewSignals[view.key]}</span>
              </button>
            ))}
          </nav>

          <div className="rail-stats">
            <article className="rail-stat">
              <span>This month net</span>
              <strong className={monthlyNet >= 0 ? 'text-positive' : 'text-negative'}>
                {compactCurrency(monthlyNet)}
              </strong>
            </article>
            <article className="rail-stat">
              <span>Tracked balance</span>
              <strong>{compactCurrency(totalTracked)}</strong>
            </article>
          </div>
        </aside>

        <section className="content-stack">
          {activeView === 'dashboard' ? (
            <div className="dashboard-container">
              {/* ── SECTION 1: FINANCIAL SNAPSHOT ── */}
              <section className="dash-hero-card">
                <div className="dash-hero-header">
                  <div>
                    <span className="eyebrow">Welcome Back</span>
                    <h1>Financial Snapshot</h1>
                  </div>
                  <div className="dash-hero-status">
                    <span className="status-dot"></span>
                    Live Updates
                  </div>
                </div>

                <div className="dash-hero-main">
                  <div className="dash-main-balance">
                    <span className="mini-label">Total Tracked Balance</span>
                    <strong className="main-balance-val">{compactCurrency(totalTracked)}</strong>
                    <div className="balance-trend">
                      <span className="trend-up">↑ 12%</span> vs last month
                    </div>
                  </div>

                  <div className="dash-today-pulse">
                    <div className="pulse-item">
                      <span className="pulse-label">In</span>
                      <strong className="text-positive">{compactCurrency(todaySummary.income)}</strong>
                    </div>
                    <div className="pulse-divider"></div>
                    <div className="pulse-item">
                      <span className="pulse-label">Out</span>
                      <strong className="text-negative">{compactCurrency(todaySummary.expense)}</strong>
                    </div>
                  </div>
                </div>

                <div className="dash-hero-footer">
                  <div className="footer-stat">
                    <span>Savings Rate</span>
                    <strong>{savingsRate}%</strong>
                  </div>
                  <div className="footer-stat">
                    <span>Active Streak</span>
                    <strong>{streak.days} Days</strong>
                  </div>
                  <div className="footer-stat">
                    <span>Top Category</span>
                    <strong>{topSpendCategory.label}</strong>
                  </div>
                </div>
              </section>

              {/* ── SECTION 2: PORTFOLIO BUCKETS ── */}
              <div className="dash-bucket-row">
                <article className="bucket-tile" onClick={() => handleAdjustBalance('bank')} style={{ cursor: 'pointer' }}>
                  <div className="bucket-icon">🏦</div>
                  <div className="bucket-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Bank Balance</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6, textDecoration: 'underline' }}>Set</span>
                    </div>
                    <strong>{compactCurrency(bankBalance)}</strong>
                  </div>
                </article>

                <article className="bucket-tile" onClick={() => handleAdjustBalance('cash')} style={{ cursor: 'pointer' }}>
                  <div className="bucket-icon">💵</div>
                  <div className="bucket-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Cash in Hand</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6, textDecoration: 'underline' }}>Set</span>
                    </div>
                    <strong>{compactCurrency(cashBalance)}</strong>
                  </div>
                </article>
                <article className="bucket-tile">
                  <div className="bucket-icon">📈</div>
                  <div className="bucket-info">
                    <span>Investments</span>
                    <strong>{compactCurrency(stockHoldingsSummary.currentValue + mfHoldingRows.reduce((s, h) => s + h.currentValue, 0))}</strong>
                  </div>
                </article>
                <article className="bucket-tile">
                  <div className="bucket-icon">🏦</div>
                  <div className="bucket-info">
                    <span>Safe Assets</span>
                    <strong>{compactCurrency(ppfContributionSummary.total + fdRows.reduce((s, a) => s + a.maturity, 0))}</strong>
                  </div>
                </article>
              </div>

              {/* ── SECTION 3: INSIGHTS & ANALYTICS ── */}
              <section className="dash-insights-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Money Pulse</span>
                    <h2>Insights & Trends</h2>
                  </div>
                  <div className="dash-range-tabs segmented-tabs">
                    {rangeOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`range-chip ${range === option.key ? 'active' : ''}`}
                        onClick={() => setRange(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="insight-grid">
                  <div className="insight-main-metrics">
                    <div className="metric-row">
                      <div className="metric-item">
                        <span className="mini-label">Period Income</span>
                        <strong>{compactCurrency(summary.income)}</strong>
                      </div>
                      <div className="metric-item">
                        <span className="mini-label">Period Expense</span>
                        <strong>{compactCurrency(summary.expense)}</strong>
                      </div>
                    </div>
                    <div className={`metric-net-box ${net >= 0 ? 'positive' : 'negative'}`}>
                      <span>Net Cash Flow</span>
                      <strong>{compactCurrency(net)}</strong>
                    </div>
                  </div>

                  <div className="insight-tips">
                    <div className="tip-box">
                      <span className="tip-icon">💡</span>
                      <div className="tip-content">
                        <strong>Weekly Insight</strong>
                        <p>{weeklyInsight.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── SECTION 4: SPENDING BREAKDOWN ── */}
              <section className="dash-chart-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Allocation</span>
                    <h2>Spending Breakdown</h2>
                  </div>
                </div>

                <div className="chart-container">
                  {spendingByCategory.length > 0 ? (
                    <>
                      <div
                        className="pie-chart"
                        style={{
                          background: `conic-gradient(${spendingByCategory.reduce((acc, curr, i, arr) => {
                            const prevPercent = arr.slice(0, i).reduce((sum, c) => sum + c.percentage, 0)
                            return `${acc}${curr.accent} ${prevPercent}% ${prevPercent + curr.percentage}%${i === arr.length - 1 ? '' : ', '}`
                          }, '')})`
                        }}
                      >
                        <div className="pie-inner">
                          <strong>{Math.round(spendingByCategory.reduce((s, c) => s + c.percentage, 0))}%</strong>
                          <span>Tracked</span>
                        </div>
                      </div>

                      <div className="chart-legend">
                        {spendingByCategory.slice(0, 5).map((item) => (
                          <div key={item.id} className="legend-item">
                            <div className="legend-dot" style={{ background: item.accent }}></div>
                            <div className="legend-info">
                              <span className="legend-label">{item.label}</span>
                              <span className="legend-value">{Math.round(item.percentage)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <strong>No spending data yet.</strong>
                      <p>Add some expenses to see your breakdown.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeView === 'add' ? (
            <section className="composer-card panel single-view-card transaction-pad">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Fast Add</span>
                  <h2>{isEditing ? 'Edit Entry' : 'Entry Pad'}</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  <div className="segmented-tabs" style={{ width: '100%' }}>
                    {(['bank', 'cash'] as AccountType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`toggle-chip ${type} ${selectedAccount === type ? 'active' : ''}`}
                        onClick={() => setSelectedAccount(type)}
                        style={{ flex: 1 }}
                      >
                        {type === 'bank' ? '🏦 Bank' : '💵 Cash'}
                      </button>
                    ))}
                  </div>
                  <div className="segmented-tabs" style={{ width: '100%' }}>
                    {(['expense', 'income'] as EntryType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`toggle-chip ${type} ${entryType === type ? 'active' : ''}`}
                        onClick={() => handleToggleType(type)}
                        style={{ flex: 1 }}
                      >
                        {type === 'expense' ? 'Out' : 'In'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="amount-display-pad">
                <div className="amount-val-wrap">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="amount-input-field"
                    value={amountText}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="amount-preview">
                  {isEditing ? 'Editing existing' : 'New transaction'}
                </div>
              </div>

              <div className="category-grid-pad">
                {activeCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`cat-pad-item ${selectedCategoryValue === category.id ? 'active' : ''}`}
                    style={{ '--cat-accent': category.accent } as CSSProperties}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className="cat-pad-label">{category.label}</span>
                  </button>
                ))}
              </div>

              <div className="pad-footer">
                <input
                  className="pad-note-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What was this for?"
                  maxLength={80}
                />
                <button
                  type="button"
                  className={`pad-save-btn ${entryType} ${!canSave ? 'disabled' : ''}`}
                  onClick={handleSaveTransaction}
                  disabled={!canSave}
                >
                  {isEditing ? 'Update' : 'Confirm'}
                </button>
              </div>
            </section>
          ) : null}

          {activeView === 'goals' ? (
            <section className="habit-card panel single-view-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Habit Loop</span>
                  <h2>Goals & Smart Tips</h2>
                </div>
              </div>

              <div className="habit-grid">
                <article className="habit-tile">
                  <span className="mini-label">Current streak</span>
                  <strong>
                    {streak.days} day{streak.days === 1 ? '' : 's'}
                  </strong>
                  <p>
                    {streak.loggedToday
                      ? 'Logged today. Keep it going.'
                      : streak.days > 0
                        ? "Add today's entry to continue your streak."
                        : 'Start your streak with one quick entry.'}
                  </p>
                </article>

                <article className="habit-tile">
                  <span className="mini-label">Weekly insight</span>
                  <strong>{currency(weeklyInsight.thisWeekExpense)} spent this week</strong>
                  <p className={`insight-text ${weeklyInsight.tone}`}>{weeklyInsight.message}</p>
                </article>
              </div>

              <div className="goal-grid">
                <article className="goal-tile">
                  <div className="goal-topline">
                    <span className="mini-label">Monthly savings goal</span>
                    <strong>{goals.monthlySavingsGoal > 0 ? `${savingsProgress}%` : '--'}</strong>
                  </div>
                  <label className="goal-input">
                    <span>Target amount</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={goals.monthlySavingsGoal}
                      onChange={(event) => handleSavingsGoalChange(event.target.value)}
                    />
                  </label>
                  <div className="progress-track">
                    <div
                      className="progress-fill good"
                      style={{ width: `${savingsProgress}%` } as CSSProperties}
                    />
                  </div>
                  <p>
                    Saved {currency(Math.max(monthlyNet, 0))} of {currency(goals.monthlySavingsGoal)}
                  </p>
                </article>

                <article className="goal-tile">
                  <div className="goal-topline">
                    <span className="mini-label">Monthly expense budget</span>
                    <strong>{goals.monthlyExpenseBudget > 0 ? `${expenseUsagePercent}%` : '--'}</strong>
                  </div>
                  <label className="goal-input">
                    <span>Budget cap</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={goals.monthlyExpenseBudget}
                      onChange={(event) => handleExpenseBudgetChange(event.target.value)}
                    />
                  </label>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${budgetTone}`}
                      style={{ width: `${budgetProgress}%` } as CSSProperties}
                    />
                  </div>
                  <p>
                    Spent {currency(monthlySummary.expense)} of {currency(goals.monthlyExpenseBudget)}
                  </p>
                </article>
              </div>

              <section className="custom-goal-panel">
                <div className="goal-create-head">
                  <h3>Custom goals</h3>
                  <span>Add your own goal targets</span>
                </div>

                <div className="goal-create-grid">
                  <label className="goal-input">
                    <span>Goal name</span>
                    <input
                      type="text"
                      value={customGoalTitle}
                      onChange={(event) => setCustomGoalTitle(event.target.value)}
                      placeholder="Emergency Fund, Vacation, New Phone"
                      maxLength={40}
                    />
                  </label>
                  <label className="goal-input">
                    <span>Target amount</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={customGoalTarget}
                      onChange={(event) => setCustomGoalTarget(event.target.value)}
                      placeholder="50000"
                    />
                  </label>
                  <button type="button" className="mini-action-button" onClick={handleAddCustomGoal}>
                    Add Goal
                  </button>
                </div>

                <div className="custom-goal-list">
                  {customGoals.length > 0 ? (
                    customGoals.map((goal) => {
                      const progress =
                        goal.targetAmount > 0
                          ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                          : 0

                      return (
                        <article key={goal.id} className="goal-tile custom-goal-tile">
                          <div className="goal-topline">
                            <span className="mini-label">{goal.title}</span>
                            <strong>{progress}%</strong>
                          </div>

                          <label className="goal-input">
                            <span>Saved so far</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={goal.savedAmount}
                              onChange={(event) => handleCustomGoalSavedChange(goal.id, event.target.value)}
                            />
                          </label>

                          <div className="progress-track">
                            <div
                              className="progress-fill good"
                              style={{ width: `${progress}%` } as CSSProperties}
                            />
                          </div>

                          <div className="custom-goal-footer">
                            <p>
                              {currency(goal.savedAmount)} of {currency(goal.targetAmount)}
                            </p>
                            <button
                              type="button"
                              className="inline-danger-button"
                              onClick={() => handleDeleteCustomGoal(goal.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      )
                    })
                  ) : (
                    <p className="invest-note">No custom goals yet. Add your first goal above.</p>
                  )}
                </div>
              </section>
            </section>
          ) : null}

          {activeView === 'investments' ? (
            <section className="investments-card panel single-view-card broker-investments">

              {/* ── OVERVIEW DASHBOARD ── */}
              {investmentView === null ? (
                <>
                  {/* Hero card — total portfolio */}
                  <div className="invest-hero-card">
                    <div className="invest-hero-copy">
                      <span className="eyebrow">Portfolio Overview</span>
                      <h2 className="invest-hero-total">
                        {compactCurrency(
                          stockHoldingsSummary.currentValue +
                          mfHoldingRows.reduce((s, h) => s + h.currentValue, 0) +
                          npsContributionSummary.total +
                          ppfContributionSummary.total +
                          fdRows.reduce((s, a) => s + a.maturity, 0) +
                          rdRows.reduce((s, a) => s + a.maturity, 0)
                        )}
                      </h2>
                      <p className="invest-hero-sub">Total portfolio value across all instruments</p>
                    </div>
                    <div className="invest-hero-band">
                      <div className="invest-hero-band-item">
                        <span>Invested</span>
                        <strong>
                          {compactCurrency(
                            stockHoldingsSummary.investedValue +
                            mfHoldingRows.reduce((s, h) => s + h.invested, 0) +
                            npsContributionSummary.total +
                            ppfContributionSummary.total +
                            fdRows.reduce((s, a) => s + a.principal, 0) +
                            rdRows.reduce((s, a) => s + a.invested, 0)
                          )}
                        </strong>
                      </div>
                      <div className={`invest-hero-band-item ${stockTotalReturn >= 0 ? 'positive' : 'negative'}`}>
                        <span>Stocks P&L</span>
                        <strong>
                          {stockTotalReturn >= 0 ? '+' : ''}{compactCurrency(stockTotalReturn)}
                          {' '}
                          <em>({stockTotalReturnPercent.toFixed(1)}%)</em>
                        </strong>
                      </div>
                      <div className="invest-hero-band-item">
                        <span>Instruments</span>
                        <strong>6 active</strong>
                      </div>
                    </div>
                  </div>

                  {/* ── Interactive Allocation Donut ── */}
                  {(() => {
                    const vals = [
                      { label: 'Stocks', val: stockHoldingsSummary.currentValue, color: '#73a6ff' },
                      { label: 'Mut. Funds', val: mfHoldingRows.reduce((s, h) => s + h.currentValue, 0), color: '#1dbf91' },
                      { label: 'NPS', val: npsContributionSummary.total, color: '#c47ef7' },
                      { label: 'PPF', val: ppfContributionSummary.total, color: '#ffbf69' },
                      { label: 'FD', val: fdRows.reduce((s, a) => s + a.maturity, 0), color: '#ff7d5d' },
                      { label: 'RD', val: rdRows.reduce((s, a) => s + a.maturity, 0), color: '#e8c97a' },
                    ].filter(v => v.val > 0)

                    const total = vals.reduce((s, v) => s + v.val, 0)
                    const radius = 70
                    const strokeWidth = 14
                    const center = 80
                    const circ = 2 * Math.PI * radius
                    let cumPct = 0

                    const activeItem = activeAllocIdx !== null ? vals[activeAllocIdx] : null

                    return (
                      <div className="invest-alloc-container">
                        <div className="invest-alloc-main">
                          <svg width={center * 2} height={center * 2} viewBox={`0 0 ${center * 2} ${center * 2}`}>
                            <circle
                              cx={center} cy={center} r={radius}
                              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
                            />
                            {vals.map((v, i) => {
                              const pct = v.val / total
                              const offset = circ * (1 - cumPct)
                              const dash = circ * pct
                              const rotate = (cumPct * 360) - 90
                              cumPct += pct
                              return (
                                <circle
                                  key={v.label}
                                  cx={center} cy={center} r={radius}
                                  fill="none"
                                  stroke={v.color}
                                  strokeWidth={activeAllocIdx === i ? strokeWidth + 4 : strokeWidth}
                                  strokeDasharray={`${dash} ${circ - dash}`}
                                  strokeDashoffset={circ * 0.25} // start at top
                                  transform={`rotate(${rotate} ${center} ${center})`}
                                  style={{ transition: 'stroke-width 0.2s, stroke 0.2s', cursor: 'pointer' }}
                                  onMouseEnter={() => setActiveAllocIdx(i)}
                                  onMouseLeave={() => setActiveAllocIdx(null)}
                                  onTouchStart={(e) => {
                                    e.preventDefault();
                                    setActiveAllocIdx(i);
                                  }}
                                />
                              )
                            })}
                          </svg>

                          <div className="invest-alloc-center-large">
                            {activeItem ? (
                              <>
                                <span className="alloc-label" style={{ color: activeItem.color }}>{activeItem.label}</span>
                                <strong className="alloc-pct">{((activeItem.val / total) * 100).toFixed(1)}%</strong>
                                <span className="alloc-val">{compactCurrency(activeItem.val)}</span>
                              </>
                            ) : (
                              <>
                                <span className="alloc-label">Total Allocation</span>
                                <strong className="alloc-total">{total > 0 ? compactCurrency(total) : '₹0'}</strong>
                                <span className="alloc-hint">Touch segments for details</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Portfolio Insights */}
                  <div className="invest-mini-grid">
                    <article className="invest-mini-tile">
                      <span className="invest-mini-label">Equity Exposure</span>
                      <strong>
                        {(() => {
                          const eq = stockHoldingsSummary.currentValue + mfHoldingRows.reduce((s, h) => s + h.currentValue, 0);
                          const tot = stockHoldingsSummary.currentValue +
                            mfHoldingRows.reduce((s, h) => s + h.currentValue, 0) +
                            npsContributionSummary.total +
                            ppfContributionSummary.total +
                            fdRows.reduce((s, a) => s + a.maturity, 0) +
                            rdRows.reduce((s, a) => s + a.maturity, 0);
                          return tot > 0 ? ((eq / tot) * 100).toFixed(0) : 0;
                        })()}%
                      </strong>
                      <p>Stocks & Mutual Funds</p>
                    </article>
                    <article className="invest-mini-tile">
                      <span className="invest-mini-label">Fixed Income</span>
                      <strong>
                        {compactCurrency(
                          ppfContributionSummary.total +
                          fdRows.reduce((s, a) => s + a.principal, 0) +
                          rdRows.reduce((s, a) => s + a.invested, 0)
                        )}
                      </strong>
                      <p>PPF, FD & RD principal</p>
                    </article>
                    <article className="invest-mini-tile">
                      <span className="invest-mini-label">Asset Spread</span>
                      <strong>
                        {[
                          stockHoldingsSummary.currentValue,
                          mfHoldingRows.reduce((s, h) => s + h.currentValue, 0),
                          npsContributionSummary.total,
                          ppfContributionSummary.total,
                          fdRows.reduce((s, a) => s + a.maturity, 0),
                          rdRows.reduce((s, a) => s + a.maturity, 0)
                        ].filter(v => v > 0).length} / 6
                      </strong>
                      <p>Active asset classes</p>
                    </article>
                  </div>

                  {/* Metric grid — per instrument */}

                  <div className="section-head compact-head" style={{ marginTop: '0.5rem' }}>
                    <div><h3>Instrument Breakdown</h3></div>
                    <span className="feed-count">
                      {quoteUpdatedAt
                        ? `Live · ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(quoteUpdatedAt))}`
                        : 'Feed pending'}
                    </span>
                  </div>

                  <div className="invest-metric-grid">
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--sky)' } as CSSProperties}>
                      <span className="invest-metric-icon">📈</span>
                      <span className="invest-metric-label">Stocks</span>
                      <strong className="invest-metric-value">{compactCurrency(stockHoldingsSummary.currentValue)}</strong>
                      <span className={`invest-metric-sub ${stockTotalReturn >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {stockTotalReturn >= 0 ? '+' : ''}{stockTotalReturnPercent.toFixed(1)}%
                      </span>
                    </article>
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--mint)' } as CSSProperties}>
                      <span className="invest-metric-icon">💹</span>
                      <span className="invest-metric-label">Mutual Funds</span>
                      <strong className="invest-metric-value">{compactCurrency(mfHoldingRows.reduce((s, h) => s + h.currentValue, 0))}</strong>
                      <span className="invest-metric-sub">{mfHoldings.length} fund{mfHoldings.length !== 1 ? 's' : ''}</span>
                    </article>
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--berry)' } as CSSProperties}>
                      <span className="invest-metric-icon">🏛️</span>
                      <span className="invest-metric-label">NPS</span>
                      <strong className="invest-metric-value">{compactCurrency(npsContributionSummary.total)}</strong>
                      <span className="invest-metric-sub">{npsContributions.length} entries</span>
                    </article>
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--sun)' } as CSSProperties}>
                      <span className="invest-metric-icon">🌱</span>
                      <span className="invest-metric-label">PPF</span>
                      <strong className="invest-metric-value">{compactCurrency(ppfContributionSummary.total)}</strong>
                      <span className="invest-metric-sub">{ppfContributions.length} entries</span>
                    </article>
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--coral)' } as CSSProperties}>
                      <span className="invest-metric-icon">🏦</span>
                      <span className="invest-metric-label">Fixed Deposit</span>
                      <strong className="invest-metric-value">{compactCurrency(fdRows.reduce((s, a) => s + a.maturity, 0))}</strong>
                      <span className="invest-metric-sub">Maturity value</span>
                    </article>
                    <article className="invest-metric-tile" style={{ '--tile-accent': 'var(--sand)' } as CSSProperties}>
                      <span className="invest-metric-icon">📅</span>
                      <span className="invest-metric-label">Recurring Dep.</span>
                      <strong className="invest-metric-value">{compactCurrency(rdRows.reduce((s, a) => s + a.maturity, 0))}</strong>
                      <span className="invest-metric-sub">Maturity value</span>
                    </article>
                  </div>

                  {/* Quick-nav feature buttons */}
                  <div className="section-head compact-head" style={{ marginTop: '0.4rem' }}>
                    <div><h3>Manage</h3></div>
                  </div>

                  <div className="invest-feature-grid">
                    {([
                      { key: 'stocks' as InvestmentView, label: 'Stocks', caption: `${stockHoldingRows.length} holding${stockHoldingRows.length !== 1 ? 's' : ''}`, icon: '📈', accent: 'var(--sky)' },
                      { key: 'mf' as InvestmentView, label: 'Mutual Funds', caption: `${mfHoldings.length} fund${mfHoldings.length !== 1 ? 's' : ''}`, icon: '💹', accent: 'var(--mint)' },
                      { key: 'nps' as InvestmentView, label: 'NPS', caption: `${npsContributions.length} transaction${npsContributions.length !== 1 ? 's' : ''}`, icon: '🏛️', accent: 'var(--berry)' },
                      { key: 'ppf' as InvestmentView, label: 'PPF', caption: `${ppfContributions.length} entr${ppfContributions.length !== 1 ? 'ies' : 'y'}`, icon: '🌱', accent: 'var(--sun)' },
                      { key: 'fd' as InvestmentView, label: 'Fixed Deposits', caption: `${fdAccounts.length} account${fdAccounts.length !== 1 ? 's' : ''}`, icon: '🏦', accent: 'var(--coral)' },
                      { key: 'rd' as InvestmentView, label: 'Recurring Deposits', caption: `${rdAccounts.length} account${rdAccounts.length !== 1 ? 's' : ''}`, icon: '📅', accent: 'var(--sand)' },
                      { key: 'subscriptions' as InvestmentView, label: 'Subscriptions', caption: `${subscriptions.length} active`, icon: '🔄', accent: 'var(--berry)' },
                    ] as { key: InvestmentView; label: string; caption: string; icon: string; accent: string }[]).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="invest-feature-btn"
                        style={{ '--invest-accent': item.accent } as CSSProperties}
                        onClick={() => setInvestmentView(item.key)}
                      >
                        <span className="invest-feature-icon">{item.icon}</span>
                        <div className="invest-feature-text">
                          <strong>{item.label}</strong>
                          <span>{item.caption}</span>
                        </div>
                        <span className="invest-feature-arrow">›</span>
                      </button>
                    ))}
                  </div>

                  <p className="invest-disclaimer">
                    Free feeds can be delayed. Quotes auto-refresh every 60 seconds.
                  </p>
                </>
              ) : null}

              {/* ── DEDICATED INSTRUMENT PAGE ── */}
              {investmentView !== null ? (
                <>
                  <div className="section-head invest-inner-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        className="invest-back-btn"
                        onClick={() => setInvestmentView(null)}
                      >
                        Back
                      </button>
                      <div>
                        <span className="eyebrow">Investment</span>
                        <h2>{investmentViewOptions.find(o => o.key === investmentView)?.label}</h2>
                      </div>
                    </div>
                    {investmentView === 'stocks' && (
                      <span className="feed-count">
                        {quoteUpdatedAt
                          ? `Updated ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(quoteUpdatedAt))}`
                          : 'Waiting for live feed'}
                      </span>
                    )}
                  </div>

                  {investmentView === 'stocks' ? (
                    <section className="stocks-screen">
                      <article className="stocks-summary-card">
                        <strong>{compactCurrency(stockHoldingsSummary.currentValue)}</strong>
                        <div className="stocks-summary-grid">
                          <p>
                            1D returns
                            <span className={stockHoldingsSummary.dayReturn >= 0 ? 'text-positive' : 'text-negative'}>
                              {stockHoldingsSummary.dayReturn >= 0 ? '+' : ''}
                              {currency(stockHoldingsSummary.dayReturn)} ({stockDayReturnPercent.toFixed(2)}%)
                            </span>
                          </p>
                          <p>
                            Total returns
                            <span className={stockTotalReturn >= 0 ? 'text-positive' : 'text-negative'}>
                              {stockTotalReturn >= 0 ? '+' : ''}
                              {currency(stockTotalReturn)} ({stockTotalReturnPercent.toFixed(2)}%)
                            </span>
                          </p>
                          <p>
                            Invested
                            <span>{currency(stockHoldingsSummary.investedValue)}</span>
                          </p>
                        </div>
                      </article>

                      <div className="invest-search-wrap" style={{ position: 'relative', marginBottom: '1rem', zIndex: 10 }}>
                        <label className="invest-field">
                          <span>Search Symbol</span>
                          <input
                            type="search"
                            value={stockSearchQuery}
                            onChange={(e) => setStockSearchQuery(e.target.value)}
                            placeholder="Search (e.g. Reliance)"
                          />
                        </label>
                        {isStockSearching && <span className="invest-status">Searching...</span>}
                        {stockSearchResults.length > 0 && (
                          <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, listStyle: 'none', margin: '4px 0 0', padding: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            {stockSearchResults.map((res) => (
                              <li
                                key={res.symbol}
                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                onClick={() => {
                                  setStockSymbolDraft(res.symbol)
                                  setStockSearchQuery('')
                                  setStockSearchResults([])
                                }}
                              >
                                <strong style={{ color: 'var(--text)', display: 'block' }}>{res.symbol}</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{res.shortname || res.longname}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="stock-add-grid">
                        <label className="invest-field">
                          <span>Selected Symbol (Yahoo)</span>
                          <input
                            type="text"
                            value={stockSymbolDraft}
                            onChange={(event) => setStockSymbolDraft(event.target.value)}
                            placeholder="TCS.NS"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleAddStockSymbol()
                              }
                            }}
                          />
                        </label>
                        <label className="invest-field">
                          <span>Shares</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={stockSharesDraft}
                            onChange={(event) => setStockSharesDraft(event.target.value)}
                            placeholder="10"
                          />
                        </label>
                        <label className="invest-field">
                          <span>Avg buy price</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={stockBuyPriceDraft}
                            onChange={(event) => setStockBuyPriceDraft(event.target.value)}
                            placeholder="Optional"
                          />
                        </label>
                        <button type="button" className="mini-action-button" onClick={handleAddStockSymbol}>
                          Add Stock
                        </button>
                      </div>

                      <div className="chip-list">
                        {parsedStockSymbols.map((symbol) => (
                          <button
                            key={symbol}
                            type="button"
                            className="chip-button"
                            onClick={() => handleRemoveStockSymbol(symbol)}
                          >
                            {symbol} x
                          </button>
                        ))}
                      </div>

                      {stocksLoading ? <p className="invest-status">Loading live stock data...</p> : null}
                      {stocksError ? <p className="invest-status warn">{stocksError}</p> : null}

                      <div className="stocks-list-head">
                        <span>Holdings</span>
                        <span>Current (Invested)</span>
                      </div>

                      <div className="stock-holdings-list">
                        {stockHoldingRows.length > 0 ? (
                          stockHoldingRows.map((row) => (
                            <article key={row.symbol} className="stock-holding-row">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="stock-holding-main" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ fontSize: '1rem' }}>{row.symbol}</strong>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                                    {row.shares} shares @ {formatCurrency(row.buyPrice, row.currency)}
                                  </span>
                                </div>
                                <div className="stock-holding-values" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong style={{ fontSize: '1rem' }}>
                                    {row.currentPrice > 0 ? formatCurrency(row.currentValue, row.currency) : 'Fetching...'}
                                  </strong>
                                  <span className={row.totalPnl >= 0 ? 'text-positive' : 'text-negative'} style={{ fontSize: '0.85rem' }}>
                                    {row.currentPrice > 0 ? (
                                      <>
                                        {row.totalPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(row.totalPnl), row.currency)} ({row.totalPnlPercent >= 0 ? '+' : ''}{row.totalPnlPercent.toFixed(1)}%)
                                      </>
                                    ) : (
                                      'Price pending'
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                paddingTop: '0.6rem',
                                marginTop: '0.2rem'
                              }}>
                                <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
                                  Live Rate: <strong style={{ color: 'var(--text-main)', marginLeft: '4px' }}>
                                    {row.currentPrice > 0 ? formatCurrency(row.currentPrice, row.currency) : '---'}
                                  </strong>
                                </span>
                                <span className={row.changePercent >= 0 ? 'text-positive' : 'text-negative'} style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                  {row.currentPrice > 0 ? `1D: ${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%` : 'Checking...'}
                                </span>
                              </div>
                            </article>
                          ))
                        ) : (
                          <p className="invest-note">Add stocks to build your holdings screen.</p>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {investmentView === 'mf' ? (
                    <section className="invest-screen-wrap">
                      <article className="invest-section">
                        <div className="invest-head">
                          <strong>Mutual Funds</strong>
                          <span>Add holding + track NAV</span>
                        </div>

                        <div className="invest-search-wrap" style={{ position: 'relative', marginBottom: '1rem', zIndex: 10 }}>
                          <label className="invest-field">
                            <span>Search Fund</span>
                            <input
                              type="search"
                              value={mfSearchQuery}
                              onChange={(e) => setMfSearchQuery(e.target.value)}
                              placeholder="Search (e.g. HDFC Small Cap)"
                            />
                          </label>
                          {isMfSearching && <span className="invest-status">Searching...</span>}
                          {mfSearchResults.length > 0 && (
                            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, listStyle: 'none', margin: '4px 0 0', padding: 0, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                              {mfSearchResults.map((res) => (
                                <li
                                  key={res.schemeCode}
                                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                  onClick={() => {
                                    setMfCodeDraft(String(res.schemeCode))
                                    setMfSearchQuery('')
                                    setMfSearchResults([])
                                  }}
                                >
                                  <strong style={{ color: 'var(--text)', display: 'block' }}>{res.schemeCode}</strong>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{res.schemeName}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>Scheme code (AMFI)</span>
                            <input
                              type="text"
                              list="mf-scheme-options"
                              value={mfCodeDraft}
                              onChange={(event) => setMfCodeDraft(event.target.value)}
                              placeholder="120503"
                            />
                          </label>
                          <label className="invest-field">
                            <span>Transaction date</span>
                            <input
                              type="date"
                              value={mfDateDraft}
                              onChange={(event) => setMfDateDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Units</span>
                            <input
                              type="number"
                              min={0}
                              step={0.001}
                              value={mfUnitsDraft}
                              onChange={(event) => setMfUnitsDraft(event.target.value)}
                              placeholder="25"
                            />
                          </label>
                          <label className="invest-field">
                            <span>NAV on selected date</span>
                            <input
                              type="number"
                              min={0}
                              step={0.001}
                              value={mfBuyNavDraft}
                              readOnly
                              placeholder="Auto fetched"
                            />
                          </label>
                        </div>

                        <div className="type-toggle segmented-tabs mf-type-toggle" role="tablist" aria-label="Investment type">
                          {(['sip', 'one-time'] as MfType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`toggle-chip ${mfTypeDraft === type ? 'active' : ''}`}
                              onClick={() => setMfTypeDraft(type)}
                            >
                              {type === 'sip' ? 'SIP' : 'One-time'}
                            </button>
                          ))}
                        </div>
                        <datalist id="mf-scheme-options">
                          {[...new Set(mfHoldings.map((item) => item.schemeCode))].map((schemeCode) => (
                            <option key={schemeCode} value={schemeCode} />
                          ))}
                        </datalist>

                        {mfNavLookupLoading ? <p className="invest-status">Fetching NAV for selected date...</p> : null}
                        {mfNavLookupError ? <p className="invest-status warn">{mfNavLookupError}</p> : null}

                        <div className="inline-action-row">
                          <button type="button" className="mini-action-button" onClick={() => void handleAddMfScheme()}>
                            Add MF
                          </button>
                        </div>

                        {mfLoading ? <p className="invest-status">Loading live MF NAV...</p> : null}
                        {mfError ? <p className="invest-status warn">{mfError}</p> : null}

                        <div className="account-list">
                          {mfHoldingRows.length > 0 ? (
                            mfHoldingRows.map((holding) => (
                              <article key={holding.id} className="account-card">
                                <div className="account-head">
                                  <strong>{holding.schemeName}</strong>
                                  <span>{holding.schemeCode}</span>
                                </div>
                                <div className="account-meta">
                                  <span>Type: {holding.type === 'sip' ? 'SIP' : 'One-time'}</span>
                                  <span>Txn date: {friendlyFullDate(holding.addedAt)}</span>
                                  <span>Units: {holding.units.toFixed(3)}</span>
                                  <span>Buy NAV: {holding.buyNav.toFixed(3)}</span>
                                  <span>Current NAV: {holding.currentNav.toFixed(3)}</span>
                                  <span>Invested: {currency(holding.invested)}</span>
                                  <span>Current: {currency(holding.currentValue)}</span>
                                  <span className={holding.pnl >= 0 ? 'text-positive' : 'text-negative'}>
                                    P&L: {holding.pnl >= 0 ? '+' : ''}
                                    {currency(holding.pnl)}
                                  </span>
                                </div>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action"
                                    onClick={() => handleTrackMfScheme(holding.schemeCode, holding.addedAt)}
                                  >
                                    Track NAV
                                  </button>
                                  <button
                                    type="button"
                                    className="row-action danger"
                                    onClick={() => handleDeleteMfHolding(holding.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <p className="invest-note">No MF holding yet. Add one to see it here.</p>
                          )}
                        </div>

                        {mfSnapshot ? (
                          <div className="mf-card">
                            <strong>{mfSnapshot.schemeName}</strong>
                            <span>Tracking scheme: {mfSnapshot.schemeCode}</span>
                            <p>
                              Latest NAV: {mfSnapshot.nav.toFixed(3)} ({mfSnapshot.navDate})
                            </p>
                          </div>
                        ) : null}
                      </article>
                    </section>
                  ) : null}

                  {investmentView === 'nps' ? (
                    <section className="invest-screen-wrap">
                      <article className="invest-section">
                        <div className="invest-head">
                          <strong>NPS</strong>
                          <span>Date-wise contributions + projection</span>
                        </div>

                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>Date</span>
                            <input
                              type="date"
                              value={npsContributionDate}
                              onChange={(event) => setNpsContributionDate(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Amount</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={npsContributionAmount}
                              onChange={(event) => setNpsContributionAmount(event.target.value)}
                              placeholder="5000"
                            />
                          </label>
                          <label className="invest-field">
                            <span>Note</span>
                            <input
                              type="text"
                              value={npsContributionNote}
                              onChange={(event) => setNpsContributionNote(event.target.value)}
                              placeholder="April contribution"
                            />
                          </label>
                        </div>

                        <button type="button" className="mini-action-button" onClick={handleAddNpsContribution}>
                          Add Transaction
                        </button>

                        <div className="invest-result">
                          <span>Transactions: {npsContributionSummary.count}</span>
                          <strong>Contributed: {compactCurrency(npsContributionSummary.total)}</strong>
                        </div>

                        <div className="account-list">
                          {sortedNpsContributions.length > 0 ? (
                            sortedNpsContributions.map((entry) => (
                              <article key={entry.id} className="account-card">
                                <div className="account-head">
                                  <strong>{currency(entry.amount)}</strong>
                                  <span>{friendlyFullDate(entry.date)}</span>
                                </div>
                                <div className="account-meta">
                                  <span>{entry.note || 'No note'}</span>
                                </div>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action danger"
                                    onClick={() => handleDeleteNpsContribution(entry.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <p className="invest-note">No NPS transactions yet.</p>
                          )}
                        </div>

                        <div className="section-head compact-head">
                          <div>
                            <h3>NPS Projection</h3>
                          </div>
                        </div>
                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>Monthly contribution</span>
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={investmentSession.npsMonthlyContribution}
                              onChange={(event) => updateInvestmentNumber('npsMonthlyContribution', event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Years</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={investmentSession.npsYears}
                              onChange={(event) => updateInvestmentNumber('npsYears', event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Expected return (%)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={investmentSession.npsExpectedReturn}
                              onChange={(event) => updateInvestmentNumber('npsExpectedReturn', event.target.value)}
                            />
                          </label>
                        </div>

                        <div className="invest-result">
                          <span>Invested: {compactCurrency(npsProjection.invested)}</span>
                          <span>Maturity: {compactCurrency(npsProjection.corpus)}</span>
                          <strong className={npsProjection.gains >= 0 ? 'text-positive' : 'text-negative'}>
                            Gains: {compactCurrency(npsProjection.gains)}
                          </strong>
                        </div>
                      </article>
                    </section>
                  ) : null}

                  {investmentView === 'ppf' ? (
                    <section className="invest-screen-wrap">
                      <article className="invest-section">
                        <div className="invest-head">
                          <strong>PPF</strong>
                          <span>Transaction history</span>
                        </div>

                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>Date</span>
                            <input
                              type="date"
                              value={ppfContributionDate}
                              onChange={(event) => setPpfContributionDate(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Amount</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={ppfContributionAmount}
                              onChange={(event) => setPpfContributionAmount(event.target.value)}
                              placeholder="5000"
                            />
                          </label>
                          <label className="invest-field">
                            <span>Note</span>
                            <input
                              type="text"
                              value={ppfContributionNote}
                              onChange={(event) => setPpfContributionNote(event.target.value)}
                              placeholder="Top up"
                            />
                          </label>
                        </div>

                        <button type="button" className="mini-action-button" onClick={handleAddPpfContribution}>
                          Add Money
                        </button>

                        <div className="invest-result">
                          <span>Transactions: {ppfContributionSummary.count}</span>
                          <strong>Contributed: {compactCurrency(ppfContributionSummary.total)}</strong>
                        </div>

                        <div className="account-list">
                          {sortedPpfContributions.length > 0 ? (
                            sortedPpfContributions.map((entry) => (
                              <article key={entry.id} className="account-card">
                                <div className="account-head">
                                  <strong>{currency(entry.amount)}</strong>
                                  <span>{friendlyFullDate(entry.date)}</span>
                                </div>
                                <div className="account-meta">
                                  <span>{entry.note || 'No note'}</span>
                                </div>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action danger"
                                    onClick={() => handleDeletePpfContribution(entry.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <p className="invest-note">No PPF history yet.</p>
                          )}
                        </div>

                      </article>
                    </section>
                  ) : null}

                  {investmentView === 'fd' ? (
                    <section className="invest-screen-wrap">
                      <article className="invest-section">
                        <div className="invest-head">
                          <strong>Fixed Deposits</strong>
                          <span>Create and manage FD accounts</span>
                        </div>

                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>FD name</span>
                            <input
                              type="text"
                              value={fdNameDraft}
                              onChange={(event) => setFdNameDraft(event.target.value)}
                              placeholder="SBI FD"
                            />
                          </label>
                          <label className="invest-field">
                            <span>Principal</span>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={fdPrincipalDraft}
                              onChange={(event) => setFdPrincipalDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Years</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={fdYearsDraft}
                              onChange={(event) => setFdYearsDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Interest rate (%)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={fdRateDraft}
                              onChange={(event) => setFdRateDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Start date</span>
                            <input
                              type="date"
                              value={fdStartDateDraft}
                              onChange={(event) => setFdStartDateDraft(event.target.value)}
                            />
                          </label>
                        </div>

                        <button type="button" className="mini-action-button" onClick={handleCreateFdAccount}>
                          Create New FD
                        </button>

                        <div className="account-list">
                          {fdRows.length > 0 ? (
                            fdRows.map((account) => (
                              <article key={account.id} className="account-card">
                                <div className="account-head">
                                  <strong>{account.name}</strong>
                                  <span>{friendlyFullDate(account.startDate)}</span>
                                </div>
                                <div className="account-meta">
                                  <span>Principal: {currency(account.principal)}</span>
                                  <span>Maturity: {currency(account.maturity)}</span>
                                  <span className={account.gains >= 0 ? 'text-positive' : 'text-negative'}>
                                    Interest: {account.gains >= 0 ? '+' : ''}
                                    {currency(account.gains)}
                                  </span>
                                </div>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action danger"
                                    onClick={() => handleDeleteFdAccount(account.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <p className="invest-note">No FD yet. Create your first FD above.</p>
                          )}
                        </div>
                      </article>
                    </section>
                  ) : null}

                  {investmentView === 'subscriptions' ? (
                    <div className="invest-screen-wrap">
                      <div className="invest-action-panel">
                        <h3>Add Subscription</h3>
                        <div className="invest-action-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                          <label className="invest-field">
                            <span>Service Name</span>
                            <input type="text" value={subNameDraft} onChange={e => setSubNameDraft(e.target.value)} placeholder="Netflix, Spotify..." />
                          </label>
                          <label className="invest-field">
                            <span>Cost</span>
                            <input type="number" value={subAmountDraft} onChange={e => setSubAmountDraft(e.target.value)} placeholder="0" />
                          </label>
                          <label className="invest-field">
                            <span>Frequency</span>
                            <select value={subFrequencyDraft} onChange={e => setSubFrequencyDraft(e.target.value as SubscriptionFrequency)}>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </label>
                          <label className="invest-field">
                            <span>Next Billing Date</span>
                            <input type="date" value={subDateDraft} onChange={e => setSubDateDraft(e.target.value)} />
                          </label>
                        </div>
                        <button type="button" className="action-button invest-add-btn" onClick={handleAddSubscription} style={{ marginTop: '1rem' }}>
                          Add Subscription
                        </button>
                      </div>

                      <div className="invest-mini-grid" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                        <article className="invest-mini-tile">
                          <span className="invest-mini-label">Monthly Burn</span>
                          <strong>{compactCurrency(subscriptions.reduce((s, c) => s + (c.frequency === 'monthly' ? c.amount : c.amount / 12), 0))}</strong>
                          <p>Est. per month</p>
                        </article>
                        <article className="invest-mini-tile">
                          <span className="invest-mini-label">Yearly Burn</span>
                          <strong>{compactCurrency(subscriptions.reduce((s, c) => s + (c.frequency === 'yearly' ? c.amount : c.amount * 12), 0))}</strong>
                          <p>Est. per year</p>
                        </article>
                      </div>

                      <div className="invest-list">
                        {subscriptions.length > 0 ? subscriptions.map(sub => (
                          <article key={sub.id} className="invest-row">
                            <div className="invest-row-main">
                              <span className="invest-row-title" style={{ color: sub.accent }}>{sub.name}</span>
                              <strong className="invest-row-val">{compactCurrency(sub.amount)} /{sub.frequency === 'monthly' ? 'mo' : 'yr'}</strong>
                            </div>
                            <div className="invest-row-meta">
                              <span>Next: {friendlyDate(sub.nextBillingDate)}</span>
                              <button type="button" className="inline-danger-button" onClick={() => handleDeleteSubscription(sub.id)}>Delete</button>
                            </div>
                          </article>
                        )) : <p className="empty-state">No active subscriptions tracked.</p>}
                      </div>
                    </div>
                  ) : null}

                  {investmentView === 'rd' ? (
                    <section className="invest-screen-wrap">
                      <article className="invest-section">
                        <div className="invest-head">
                          <strong>Recurring Deposits</strong>
                          <span>Create and manage RD accounts</span>
                        </div>

                        <div className="invest-field-grid">
                          <label className="invest-field">
                            <span>RD name</span>
                            <input
                              type="text"
                              value={rdNameDraft}
                              onChange={(event) => setRdNameDraft(event.target.value)}
                              placeholder="Monthly RD"
                            />
                          </label>
                          <label className="invest-field">
                            <span>Monthly deposit</span>
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={rdDepositDraft}
                              onChange={(event) => setRdDepositDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Years</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={rdYearsDraft}
                              onChange={(event) => setRdYearsDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Interest rate (%)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={rdRateDraft}
                              onChange={(event) => setRdRateDraft(event.target.value)}
                            />
                          </label>
                          <label className="invest-field">
                            <span>Start date</span>
                            <input
                              type="date"
                              value={rdStartDateDraft}
                              onChange={(event) => setRdStartDateDraft(event.target.value)}
                            />
                          </label>
                        </div>

                        <button type="button" className="mini-action-button" onClick={handleCreateRdAccount}>
                          Create New RD
                        </button>

                        <div className="account-list">
                          {rdRows.length > 0 ? (
                            rdRows.map((account) => (
                              <article key={account.id} className="account-card">
                                <div className="account-head">
                                  <strong>{account.name}</strong>
                                  <span>{friendlyFullDate(account.startDate)}</span>
                                </div>
                                <div className="account-meta">
                                  <span>Monthly: {currency(account.monthlyDeposit)}</span>
                                  <span>Total deposits: {currency(account.invested)}</span>
                                  <span>Maturity: {currency(account.maturity)}</span>
                                  <span className={account.gains >= 0 ? 'text-positive' : 'text-negative'}>
                                    Interest: {account.gains >= 0 ? '+' : ''}
                                    {currency(account.gains)}
                                  </span>
                                </div>
                                <div className="row-actions">
                                  <button
                                    type="button"
                                    className="row-action danger"
                                    onClick={() => handleDeleteRdAccount(account.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <p className="invest-note">No RD yet. Create your first RD above.</p>
                          )}
                        </div>
                      </article>
                    </section>
                  ) : null}

                  <p className="invest-disclaimer">
                    Free feeds can be delayed or temporarily unavailable. This screen auto-refreshes quotes every 60 seconds.
                  </p>
                </>
              ) : null}

            </section>
          ) : null}

          {activeView === 'activity' ? (
            <>
              <section className="filters-card panel single-view-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Find & Filter</span>
                    <h2>Transaction Filters</h2>
                  </div>
                  <button type="button" className="ghost-button" onClick={resetFilters}>
                    Reset
                  </button>
                </div>

                <div className="type-filter-tabs segmented-tabs" role="tablist" aria-label="Activity type filter">
                  {typeFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`range-chip ${typeFilter === option.value ? 'active' : ''}`}
                      onClick={() => setTypeFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="filter-grid">
                  <label className="filter-field">
                    <span>Search</span>
                    <input
                      type="search"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search notes, category, amount"
                    />
                  </label>

                  <label className="filter-field">
                    <span>Category</span>
                    <select
                      value={normalizedCategoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {categoryFilterOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="feed-card panel single-view-card">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Recent Activity</span>
                    <h2>Latest Transactions</h2>
                  </div>
                  <span className="feed-count">{filteredTransactions.length} matching</span>
                </div>

                <div className="transaction-list">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => {
                      const category = categoryGroups[transaction.type].find(
                        (item) => item.id === transaction.categoryId,
                      )

                      return (
                        <article key={transaction.id} className="transaction-row">
                          <div
                            className={`transaction-dot ${transaction.type}`}
                            style={{ '--dot-accent': category?.accent ?? 'var(--sky)' } as CSSProperties}
                          />
                          <div className="transaction-copy">
                            <div className="transaction-topline">
                              <strong>{category?.label ?? 'Unsorted'}</strong>
                              <span className={`transaction-amount ${transaction.type}`}>
                                {transaction.type === 'income' ? '+' : '-'}
                                {currency(transaction.amount)}
                              </span>
                            </div>
                            <div className="transaction-meta">
                              <span>{friendlyDate(transaction.createdAt)}</span>
                              <span>{transaction.note || 'No note added'}</span>
                            </div>
                            <div className="transaction-actions">
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => handleStartEdit(transaction)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="row-action danger"
                                onClick={() => handleDeleteTransaction(transaction)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  ) : (
                    <div className="empty-state">
                      <strong>No transactions match these filters yet.</strong>
                      <p>Try resetting filters or adding a new entry from the fast pad.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </section>
      </main>

      <nav className="mobile-view-nav" aria-label="Primary navigation">
        {viewOptions.map((view) => {
          const icons: Record<string, string> = {
            dashboard: '🏠',
            activity: '📊',
            add: '＋',
            goals: '🎯',
            investments: '💰',
          }
          return (
            <button
              key={view.key}
              type="button"
              className={`mobile-view-button ${activeView === view.key ? 'active' : ''}`}
              onClick={() => handleViewChange(view.key)}
              aria-current={activeView === view.key ? 'page' : undefined}
            >
              <span className="mobile-icon">{icons[view.key]}</span>
              <span className="mobile-view-label">{view.mobileLabel}</span>
            </button>
          )
        })}
      </nav>

      <div className={`toast ${toast.visible ? 'visible' : ''}`} role="status" aria-live="polite">
        <div className="toast-copy">
          <strong>{toast.message}</strong>
          {toast.undoMode ? <span>Tap undo to restore.</span> : null}
        </div>
        {toast.undoMode ? (
          <button type="button" onClick={handleUndo}>
            Undo
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default App

