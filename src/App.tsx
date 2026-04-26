import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type EntryType = 'expense' | 'income'
type RangeKey = 'today' | 'week' | 'month' | 'all'

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
  entry: Transaction | null
}

const STORAGE_KEY = 'project-x-transactions-v1'

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

const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL']

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
    return parsed.length > 0 ? parsed : sampleTransactions
  } catch {
    return sampleTransactions
  }
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

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
  const [entryType, setEntryType] = useState<EntryType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryGroups.expense[0].id)
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [range, setRange] = useState<RangeKey>('today')
  const [toast, setToast] = useState<ToastState>({ visible: false, entry: null })

  const activeCategories = categoryGroups[entryType]

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    if (!toast.visible) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToast({ visible: false, entry: null })
    }, 4200)

    return () => window.clearTimeout(timeoutId)
  }, [toast.visible])

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => matchesRange(transaction.createdAt, range)),
    [transactions, range],
  )

  const todayTransactions = useMemo(
    () => transactions.filter((transaction) => matchesRange(transaction.createdAt, 'today')),
    [transactions],
  )

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
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
  }, [filteredTransactions])

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

  const totalTracked = transactions.reduce((accumulator, transaction) => {
    return accumulator + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)

  const topSpendCategory = useMemo(() => {
    const totals = new Map<string, number>()

    filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        totals.set(
          transaction.categoryId,
          (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
        )
      })

    const [topCategoryId, topAmount] =
      [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['groceries', 0]

    const category = categoryGroups.expense.find((item) => item.id === topCategoryId)

    return {
      label: category?.label ?? 'No spend yet',
      amount: topAmount,
    }
  }, [filteredTransactions])

  const savingsRate =
    summary.income > 0 ? Math.max(0, Math.round((net / summary.income) * 100)) : 0

  const amountValue = Number(amountText || 0)
  const canSave = Number.isFinite(amountValue) && amountValue > 0

  function handleKeypadPress(key: string) {
    if (key === 'DEL') {
      setAmountText((current) => current.slice(0, -1))
      return
    }

    if (key === '.') {
      setAmountText((current) => {
        if (current.includes('.')) {
          return current
        }

        return current.length === 0 ? '0.' : `${current}.`
      })
      return
    }

    setAmountText((current) => {
      const [whole = '', decimal = ''] = current.split('.')

      if (decimal.length >= 2 && current.includes('.')) {
        return current
      }

      if (whole === '0' && !current.includes('.')) {
        return key
      }

      return `${current}${key}`
    })
  }

  function handleAddTransaction() {
    if (!canSave) {
      return
    }

    const nextEntry: Transaction = {
      id: `${Date.now()}`,
      type: entryType,
      categoryId: selectedCategory,
      amount: Number(amountText),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }

    setTransactions((current) => [nextEntry, ...current])
    setAmountText('')
    setNote('')
    setToast({ visible: true, entry: nextEntry })
  }

  function handleUndo() {
    if (!toast.entry) {
      return
    }

    setTransactions((current) => current.filter((item) => item.id !== toast.entry?.id))
    setToast({ visible: false, entry: null })
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="layout">
        <section className="hero-card panel">
          <div className="hero-copy">
            <span className="eyebrow">Project X</span>
            <h1>Track money in seconds, not screens.</h1>
            <p>
              Built around a fast-add flow: switch type, tap amount, choose a category, and keep
              moving.
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

        <section className="composer-card panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Fast Add</span>
              <h2>Main Entry Pad</h2>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAmountText('')
                setNote('')
              }}
            >
              Clear
            </button>
          </div>

          <div className="type-toggle" role="tablist" aria-label="Transaction type">
            {(['expense', 'income'] as EntryType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`toggle-chip ${entryType === type ? 'active' : ''}`}
                onClick={() => {
                  setEntryType(type)
                  setSelectedCategory(categoryGroups[type][0].id)
                }}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div className="amount-display">
            <span className="amount-prefix">Amount</span>
            <strong>{amountText.length > 0 ? currency(Number(amountText)) : '₹0'}</strong>
          </div>

          <div className="keypad" aria-label="Numeric keypad">
            {keypadKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`key ${key === 'DEL' ? 'key-action' : ''}`}
                onClick={() => handleKeypadPress(key)}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="category-strip">
            {activeCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`category-pill ${selectedCategory === category.id ? 'selected' : ''}`}
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
            onClick={handleAddTransaction}
            disabled={!canSave}
          >
            Add {entryType === 'expense' ? 'Expense' : 'Income'}
          </button>
        </section>

        <section className="insight-card panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Live Overview</span>
              <h2>Money Pulse</h2>
            </div>
          </div>

          <div className="range-row">
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
              <p>Based on the active range</p>
            </article>
            <article className="mini-tile">
              <span className="mini-label">Running balance</span>
              <strong>{compactCurrency(totalTracked)}</strong>
              <p>All tracked entries</p>
            </article>
          </div>
        </section>

        <section className="feed-card panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Recent Activity</span>
              <h2>Latest Transactions</h2>
            </div>
            <span className="feed-count">{filteredTransactions.length} shown</span>
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
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty-state">
                <strong>No transactions in this range yet.</strong>
                <p>Add one from the fast pad and it will appear here instantly.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <div className={`toast ${toast.visible ? 'visible' : ''}`} role="status" aria-live="polite">
        <div>
          <strong>Saved.</strong>
          <span>
            {toast.entry
              ? ` ${toast.entry.type === 'expense' ? 'Expense' : 'Income'} added for ${currency(toast.entry.amount)}.`
              : ''}
          </span>
        </div>
        <button type="button" onClick={handleUndo}>
          Undo
        </button>
      </div>
    </div>
  )
}

export default App
