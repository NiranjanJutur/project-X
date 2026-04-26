import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type EntryType = 'expense' | 'income'
type RangeKey = 'today' | 'week' | 'month' | 'all'
type TypeFilter = 'all' | EntryType
type AppView = 'dashboard' | 'add' | 'activity' | 'goals' | 'investments'
type InvestmentView = 'stocks' | 'mf' | 'nps' | 'ppf' | 'fd' | 'rd'
type MfType = 'sip' | 'one-time'

type Category = {
  id: string
  label: string
  accent: string
}

type Transaction = {
  id: string
  type: EntryType
  categoryId: string
  amount: number
  note: string
  createdAt: string
}

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
const DAY_IN_MS = 1000 * 60 * 60 * 24

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
  { key: 'add', label: 'Add Entry', caption: 'Fast transaction pad', mobileLabel: 'Add' },
  { key: 'activity', label: 'Activity', caption: 'Search and edit history', mobileLabel: 'History' },
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
  try {
    const directResponse = await fetch(url)
    if (directResponse.ok) {
      return (await directResponse.json()) as T
    }
  } catch {
    // Fall through to CORS relay.
  }

  const relayResponse = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
  if (!relayResponse.ok) {
    throw new Error(`Request failed (${relayResponse.status})`)
  }

  return (await relayResponse.json()) as T
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

function currency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

function compactCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: amount >= 100000 ? 'compact' : 'standard',
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
  const [investmentView, setInvestmentView] = useState<InvestmentView>('stocks')
  const [investmentSession, setInvestmentSession] = useState<InvestmentSessionState>(loadInvestmentSession)
  const [stockSymbolDraft, setStockSymbolDraft] = useState('')
  const [stockSharesDraft, setStockSharesDraft] = useState('10')
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
  const [stocksLoading, setStocksLoading] = useState(false)
  const [stocksError, setStocksError] = useState('')
  const [mfSnapshot, setMfSnapshot] = useState<MutualFundSnapshot | null>(null)
  const [mfLoading, setMfLoading] = useState(false)
  const [mfError, setMfError] = useState('')
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<string | null>(null)
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

  const totalTracked = sortedTransactions.reduce((accumulator, transaction) => {
    return accumulator + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)

  const topSpendCategory = useMemo(() => {
    const totals = new Map<string, number>()

    scopedTransactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        totals.set(
          transaction.categoryId,
          (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
        )
      })

    const [topCategoryId, topAmount] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    const category = categoryGroups.expense.find((item) => item.id === topCategoryId)

    return {
      label: category?.label ?? 'No spend yet',
      amount: topAmount,
    }
  }, [scopedTransactions])

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
    if (parsedStockSymbols.length === 0) {
      setStockQuotes([])
      setStocksError('Add at least one stock symbol to fetch live quotes.')
      return undefined
    }

    let isActive = true

    async function loadStocks() {
      if (isActive) {
        setStocksLoading(true)
      }

      try {
        type YahooQuoteResult = {
          symbol?: string
          regularMarketPrice?: number
          regularMarketChangePercent?: number
        }

        type YahooQuoteResponse = {
          quoteResponse?: {
            result?: YahooQuoteResult[]
          }
        }

        const symbolsParam = encodeURIComponent(parsedStockSymbols.join(','))
        const response = await fetchJsonWithFallback<YahooQuoteResponse>(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
        )

        const quoteMap = new Map(
          (response.quoteResponse?.result ?? [])
            .filter(
              (quote) =>
                typeof quote.symbol === 'string' &&
                typeof quote.regularMarketPrice === 'number' &&
                Number.isFinite(quote.regularMarketPrice) &&
                typeof quote.regularMarketChangePercent === 'number' &&
                Number.isFinite(quote.regularMarketChangePercent),
            )
            .map((quote) => [
              quote.symbol?.toUpperCase(),
              {
                symbol: quote.symbol as string,
                price: Number(quote.regularMarketPrice),
                changePercent: Number(quote.regularMarketChangePercent),
              } satisfies StockQuote,
            ]),
        )

        const orderedQuotes = parsedStockSymbols
          .map((symbol) => quoteMap.get(symbol))
          .filter((quote): quote is StockQuote => quote !== undefined)

        if (!isActive) {
          return
        }

        if (orderedQuotes.length === 0) {
          setStocksError('Live stock data unavailable right now. Check symbols or retry.')
          return
        }

        setStockQuotes(orderedQuotes)
        setStocksError('')
        setQuoteUpdatedAt(new Date().toISOString())
      } catch {
        if (!isActive) {
          return
        }

        setStocksError('Unable to fetch stock quotes from free API right now.')
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
      setMfSnapshot(null)
      setMfError('Enter a mutual fund scheme code (AMFI) to fetch NAV.')
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
      }
    })
  }, [parsedStockSymbols, stockLots, stockQuoteMap])

  const stockHoldingsSummary = useMemo(() => {
    return stockHoldingRows.reduce(
      (accumulator, row) => {
        accumulator.currentValue += row.currentValue
        accumulator.investedValue += row.investedValue
        accumulator.dayReturn += row.dayPnl
        return accumulator
      },
      { currentValue: 0, investedValue: 0, dayReturn: 0 },
    )
  }, [stockHoldingRows])

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
            <section className="hero-card panel">
              <div className="hero-copy">
                <span className="eyebrow">Live Dashboard</span>
                <h1>Track money in seconds, not screens.</h1>
                <p>
                  Built for fast daily use: add entries instantly, view live financial health, and
                  manage every transaction in one flow.
                </p>
              </div>

              <div className="hero-band">
                <div className="band-item">
                  <span className="band-label">Today income</span>
                  <strong>{compactCurrency(todaySummary.income)}</strong>
                </div>
                <div className="band-item">
                  <span className="band-label">Today spend</span>
                  <strong>{compactCurrency(todaySummary.expense)}</strong>
                </div>
                <div className={`band-item ${todayNet >= 0 ? 'positive' : 'negative'}`}>
                  <span className="band-label">Today net</span>
                  <strong>{compactCurrency(todayNet)}</strong>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === 'add' ? (
            <section className="composer-card panel single-view-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Fast Add</span>
                  <h2>{isEditing ? 'Edit Entry' : 'Main Entry Pad'}</h2>
                </div>
                <button type="button" className="ghost-button" onClick={resetComposer}>
                  {isEditing ? 'Cancel Edit' : 'Clear'}
                </button>
              </div>

              <div className="type-toggle segmented-tabs" role="tablist" aria-label="Transaction type">
                {(['expense', 'income'] as EntryType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`toggle-chip ${entryType === type ? 'active' : ''}`}
                    onClick={() => handleToggleType(type)}
                  >
                    {type === 'expense' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>

              <div className="amount-display">
                <label className="amount-entry">
                  <span className="amount-prefix">Amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    placeholder="Enter amount"
                    value={amountText}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    aria-label="Transaction amount"
                  />
                </label>
                <strong>{amountText.length > 0 ? currency(Number(amountText)) : currency(0)}</strong>
              </div>

              <div className="category-strip">
                {activeCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-pill ${selectedCategoryValue === category.id ? 'selected' : ''}`}
                    style={{ '--pill-accent': category.accent } as CSSProperties}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <label className="note-field">
                <span>Note</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note, merchant, or reminder"
                  maxLength={80}
                />
              </label>

              <button
                type="button"
                className={`save-button ${entryType}`}
                onClick={handleSaveTransaction}
                disabled={!canSave}
              >
                {isEditing
                  ? `Save ${entryType === 'expense' ? 'Expense' : 'Income'}`
                  : `Add ${entryType === 'expense' ? 'Expense' : 'Income'}`}
              </button>
            </section>
          ) : null}

          {activeView === 'dashboard' ? (
            <section className="insight-card panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Live Overview</span>
                  <h2>Money Pulse</h2>
                </div>
              </div>

              <div className="range-row segmented-tabs">
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

              <div className="metric-grid">
                <article className="metric-tile">
                  <span>Income</span>
                  <strong>{compactCurrency(summary.income)}</strong>
                </article>
                <article className="metric-tile">
                  <span>Expenses</span>
                  <strong>{compactCurrency(summary.expense)}</strong>
                </article>
                <article className={`metric-tile ${net >= 0 ? 'positive' : 'negative'}`}>
                  <span>Net</span>
                  <strong>{compactCurrency(net)}</strong>
                </article>
              </div>

              <div className="mini-grid">
                <article className="mini-tile">
                  <span className="mini-label">Top spend</span>
                  <strong>{topSpendCategory.label}</strong>
                  <p>{topSpendCategory.amount > 0 ? currency(topSpendCategory.amount) : 'No spend yet'}</p>
                </article>
                <article className="mini-tile">
                  <span className="mini-label">Savings rate</span>
                  <strong>{savingsRate}%</strong>
                  <p>Based on active date and category tabs</p>
                </article>
                <article className="mini-tile">
                  <span className="mini-label">Running balance</span>
                  <strong>{compactCurrency(totalTracked)}</strong>
                  <p>All tracked entries</p>
                </article>
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
              <div className="section-head">
                <div>
                  <span className="eyebrow">Long Term</span>
                  <h2>Investment Hub</h2>
                </div>
                <span className="feed-count">
                  {quoteUpdatedAt
                    ? `Updated ${new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(quoteUpdatedAt))}`
                    : 'Waiting for live feed'}
                </span>
              </div>

              <div className="investment-view-tabs" role="tablist" aria-label="Investment sections">
                {investmentViewOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`investment-view-tab ${investmentView === option.key ? 'active' : ''}`}
                    role="tab"
                    aria-selected={investmentView === option.key}
                    onClick={() => setInvestmentView(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
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

                  <div className="stock-add-grid">
                    <label className="invest-field">
                      <span>Symbol</span>
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
                          <div className="stock-holding-main">
                            <strong>{row.symbol}</strong>
                            <span>{row.shares} shares</span>
                          </div>
                          <span className={`stock-sparkline ${row.changePercent >= 0 ? 'up' : 'down'}`} />
                          <div className="stock-holding-values">
                            <strong className={row.totalPnl >= 0 ? 'text-positive' : 'text-negative'}>
                              {currency(row.currentValue)}
                            </strong>
                            <span>({currency(row.investedValue)})</span>
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
        {viewOptions.map((view) => (
          <button
            key={view.key}
            type="button"
            className={`mobile-view-button ${activeView === view.key ? 'active' : ''}`}
            onClick={() => handleViewChange(view.key)}
            aria-current={activeView === view.key ? 'page' : undefined}
          >
            <span className="mobile-view-label">{view.mobileLabel}</span>
            <span className="mobile-view-hint">{viewSignals[view.key]}</span>
          </button>
        ))}
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

