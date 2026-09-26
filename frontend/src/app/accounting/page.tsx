"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type BalanceData = {
  cash: number;
  upi: number;
  bank: number;
  card: number;
  total: number;
};

type LedgerEntry = {
  _id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  paymentMethod: "cash" | "upi" | "bank" | "card";
  source: string;
  sourceId?: string;
  description?: string;
  createdAt: string;
};

type Expense = {
  _id: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: "cash" | "upi" | "bank" | "card";
  withdrawnBy?: string;
  notes?: string;
  createdAt: string;
};

type OpeningBalance = {
  _id: string;
  cash: number;
  upi: number;
  bank: number;
  openingDate: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value: number) {
  return currency.format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return dateFormatter.format(date);
}

function getToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("token") || "";
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
];

const expenseCategories = [
  "Delivery",
  "Fuel",
  "Salary",
  "Rent",
  "Electricity",
  "Internet",
  "Personal Withdrawal",
  "Purchase Expense",
  "Maintenance",
  "Other",
];

export default function AccountingPage() {
  const [balances, setBalances] = useState<BalanceData>({
    cash: 0,
    upi: 0,
    bank: 0,
    card: 0,
    total: 0,
  });

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [openingBalance, setOpeningBalance] =
    useState<OpeningBalance | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);

  const [savingExpense, setSavingExpense] = useState(false);
  const [savingOpening, setSavingOpening] = useState(false);

  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Other",
    amount: "",
    paymentMethod: "cash",
    withdrawnBy: "",
    notes: "",
  });

  const [openingForm, setOpeningForm] = useState({
    cash: "",
    upi: "",
    bank: "",
  });

  const loadAccountingData = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryData, ledgerData, expenseData, openingData] =
        await Promise.all([
          apiRequest<{ success: boolean; balances: BalanceData }>(
            "/ledger/summary"
          ),
          apiRequest<{
            success: boolean;
            count: number;
            entries: LedgerEntry[];
          }>("/ledger"),
          apiRequest<{
            success: boolean;
            count: number;
            expenses: Expense[];
          }>("/expenses"),
          apiRequest<{
            success: boolean;
            openingBalance: OpeningBalance | null;
          }>("/opening-balance"),
        ]);

      setBalances(
        summaryData.balances || {
          cash: 0,
          upi: 0,
          bank: 0,
          card: 0,
          total: 0,
        }
      );

      setLedgerEntries(ledgerData.entries || []);
      setExpenses(expenseData.expenses || []);
      setOpeningBalance(openingData.openingBalance || null);

      if (openingData.openingBalance) {
        setOpeningForm({
          cash: String(openingData.openingBalance.cash || ""),
          upi: String(openingData.openingBalance.upi || ""),
          bank: String(openingData.openingBalance.bank || ""),
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load accounting data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountingData();
  }, []);

  const filteredLedgerEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const typeMatch =
        ledgerFilter === "ALL" || entry.type === ledgerFilter;

      const paymentMatch =
        paymentFilter === "ALL" ||
        entry.paymentMethod === paymentFilter;

      return typeMatch && paymentMatch;
    });
  }, [ledgerEntries, ledgerFilter, paymentFilter]);

  const totalCredits = useMemo(
    () =>
      ledgerEntries
        .filter((entry) => entry.type === "CREDIT")
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [ledgerEntries]
  );

  const totalDebits = useMemo(
    () =>
      ledgerEntries
        .filter((entry) => entry.type === "DEBIT")
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [ledgerEntries]
  );

  const recentExpenses = useMemo(
    () => expenses.slice(0, 6),
    [expenses]
  );

  const handleExpenseSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(expenseForm.amount);

    if (!expenseForm.title.trim()) {
      alert("Expense title is required.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Enter a valid expense amount.");
      return;
    }

    try {
      setSavingExpense(true);

      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: expenseForm.title.trim(),
          category: expenseForm.category,
          amount,
          paymentMethod: expenseForm.paymentMethod,
          withdrawnBy: expenseForm.withdrawnBy.trim(),
          notes: expenseForm.notes.trim(),
        }),
      });

      setExpenseForm({
        title: "",
        category: "Other",
        amount: "",
        paymentMethod: "cash",
        withdrawnBy: "",
        notes: "",
      });

      setShowExpenseModal(false);

      await loadAccountingData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to add expense"
      );
    } finally {
      setSavingExpense(false);
    }
  };

  const handleOpeningSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cash = Number(openingForm.cash) || 0;
    const upi = Number(openingForm.upi) || 0;
    const bank = Number(openingForm.bank) || 0;

    if (cash < 0 || upi < 0 || bank < 0) {
      alert("Opening balances cannot be negative.");
      return;
    }

    if (cash === 0 && upi === 0 && bank === 0) {
      alert("Enter at least one opening balance.");
      return;
    }

    try {
      setSavingOpening(true);

      await apiRequest("/opening-balance", {
        method: "POST",
        body: JSON.stringify({
          cash,
          upi,
          bank,
        }),
      });

      setShowOpeningModal(false);

      await loadAccountingData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to save opening balance"
      );
    } finally {
      setSavingOpening(false);
    }
  };

  const balanceCards = [
    {
      label: "Cash Balance",
      value: balances.cash,
      icon: "₹",
      tone: "cash",
    },
    {
      label: "UPI Balance",
      value: balances.upi,
      icon: "U",
      tone: "upi",
    },
    {
      label: "Bank Balance",
      value: balances.bank,
      icon: "B",
      tone: "bank",
    },
    {
      label: "Card Balance",
      value: balances.card,
      icon: "C",
      tone: "card",
    },
  ];

  return (
    <main className="accounting-page">
      <section className="accounting-hero">
        <div>
          <p className="accounting-eyebrow">FINANCIAL MANAGEMENT</p>

          <h1>Accounting</h1>

          <p className="accounting-subtitle">
            Track your business balances, expenses and financial
            transactions from one place.
          </p>
        </div>

        <div className="accounting-hero-actions">
          <button
            type="button"
            className="accounting-btn accounting-btn-secondary"
            onClick={() => setShowOpeningModal(true)}
          >
            Opening Balance
          </button>

          <button
            type="button"
            className="accounting-btn accounting-btn-primary"
            onClick={() => setShowExpenseModal(true)}
          >
            + Add Expense
          </button>
        </div>
      </section>

      {error && (
        <div className="accounting-error">
          <strong>Unable to load accounting data.</strong>
          <span>{error}</span>

          <button type="button" onClick={loadAccountingData}>
            Retry
          </button>
        </div>
      )}

      <section className="accounting-balance-grid">
        {balanceCards.map((card) => (
          <article
            key={card.label}
            className={`accounting-balance-card accounting-balance-${card.tone}`}
          >
            <div className="accounting-balance-top">
              <span className="accounting-balance-icon">
                {card.icon}
              </span>

              <span className="accounting-balance-label">
                {card.label}
              </span>
            </div>

            <strong>{formatCurrency(card.value)}</strong>
          </article>
        ))}

        <article className="accounting-balance-card accounting-total-card">
          <div className="accounting-balance-top">
            <span className="accounting-balance-icon">Σ</span>

            <span className="accounting-balance-label">
              Total Balance
            </span>
          </div>

          <strong>{formatCurrency(balances.total)}</strong>
        </article>
      </section>

      <section className="accounting-summary-row">
        <div className="accounting-summary-card">
          <span>Total Credits</span>
          <strong className="accounting-credit-text">
            {formatCurrency(totalCredits)}
          </strong>
          <small>Money received into business accounts</small>
        </div>

        <div className="accounting-summary-card">
          <span>Total Debits</span>
          <strong className="accounting-debit-text">
            {formatCurrency(totalDebits)}
          </strong>
          <small>Money paid out from business accounts</small>
        </div>

        <div className="accounting-summary-card">
          <span>Ledger Entries</span>
          <strong>{ledgerEntries.length}</strong>
          <small>Recorded financial transactions</small>
        </div>

        <div className="accounting-summary-card">
          <span>Expenses</span>
          <strong>{expenses.length}</strong>
          <small>Business expenses recorded</small>
        </div>
      </section>

      <section className="accounting-section">
        <div className="accounting-section-header">
          <div>
            <p className="accounting-section-kicker">
              TRANSACTION HISTORY
            </p>
            <h2>Ledger</h2>
          </div>

          <div className="accounting-filters">
            <select
              value={ledgerFilter}
              onChange={(event) =>
                setLedgerFilter(event.target.value)
              }
              className="accounting-filter"
            >
              <option value="ALL">All Types</option>
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value)
              }
              className="accounting-filter"
            >
              <option value="ALL">All Methods</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="accounting-table-wrap">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Description</th>
                <th>Method</th>
                <th>Type</th>
                <th className="accounting-amount-column">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="accounting-empty-cell"
                  >
                    Loading ledger...
                  </td>
                </tr>
              ) : filteredLedgerEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="accounting-empty-cell"
                  >
                    No ledger entries found.
                  </td>
                </tr>
              ) : (
                filteredLedgerEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{formatDate(entry.createdAt)}</td>

                    <td>
                      <strong>{entry.source}</strong>
                    </td>

                    <td>
                      <span className="accounting-description">
                        {entry.description || "-"}
                      </span>
                    </td>

                    <td>
                      <span className="accounting-method">
                        {entry.paymentMethod.toUpperCase()}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`accounting-type accounting-type-${entry.type.toLowerCase()}`}
                      >
                        {entry.type}
                      </span>
                    </td>

                    <td className="accounting-amount-column">
                      <strong
                        className={
                          entry.type === "CREDIT"
                            ? "accounting-credit-text"
                            : "accounting-debit-text"
                        }
                      >
                        {entry.type === "CREDIT" ? "+" : "-"}
                        {formatCurrency(entry.amount)}
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="accounting-section">
        <div className="accounting-section-header">
          <div>
            <p className="accounting-section-kicker">
              BUSINESS EXPENSES
            </p>
            <h2>Recent Expenses</h2>
          </div>

          <button
            type="button"
            className="accounting-link-button"
            onClick={() => setShowExpenseModal(true)}
          >
            + Add Expense
          </button>
        </div>

        <div className="accounting-table-wrap">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th>Withdrawn By</th>
                <th className="accounting-amount-column">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="accounting-empty-cell"
                  >
                    Loading expenses...
                  </td>
                </tr>
              ) : recentExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="accounting-empty-cell"
                  >
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                recentExpenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.createdAt)}</td>

                    <td>
                      <strong>{expense.title}</strong>

                      {expense.notes && (
                        <span className="accounting-secondary-text">
                          {expense.notes}
                        </span>
                      )}
                    </td>

                    <td>{expense.category}</td>

                    <td>
                      <span className="accounting-method">
                        {expense.paymentMethod.toUpperCase()}
                      </span>
                    </td>

                    <td>{expense.withdrawnBy || "-"}</td>

                    <td className="accounting-amount-column">
                      <strong className="accounting-debit-text">
                        -{formatCurrency(expense.amount)}
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="accounting-opening-card">
        <div>
          <p className="accounting-section-kicker">
            STARTING POSITION
          </p>

          <h2>Opening Balance</h2>

          {openingBalance ? (
            <p>
              Opening balance was configured on{" "}
              <strong>
                {formatDate(openingBalance.openingDate)}
              </strong>
              .
            </p>
          ) : (
            <p>
              No opening balance has been configured yet.
            </p>
          )}
        </div>

        {openingBalance ? (
          <div className="accounting-opening-values">
            <span>
              Cash
              <strong>
                {formatCurrency(openingBalance.cash)}
              </strong>
            </span>

            <span>
              UPI
              <strong>
                {formatCurrency(openingBalance.upi)}
              </strong>
            </span>

            <span>
              Bank
              <strong>
                {formatCurrency(openingBalance.bank)}
              </strong>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="accounting-btn accounting-btn-primary"
            onClick={() => setShowOpeningModal(true)}
          >
            Set Opening Balance
          </button>
        )}
      </section>

      {showExpenseModal && (
        <div
          className="accounting-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowExpenseModal(false);
            }
          }}
        >
          <div className="accounting-modal">
            <div className="accounting-modal-header">
              <div>
                <p className="accounting-section-kicker">
                  ACCOUNTING
                </p>
                <h2>Add Expense</h2>
              </div>

              <button
                type="button"
                className="accounting-modal-close"
                onClick={() => setShowExpenseModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="accounting-form-grid">
                <label>
                  <span>Expense Title</span>
                  <input
                    value={expenseForm.title}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. Electricity Bill"
                    required
                  />
                </label>

                <label>
                  <span>Category</span>
                  <select
                    value={expenseForm.category}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span>Payment Method</span>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value,
                      }))
                    }
                  >
                    {paymentMethods.map((method) => (
                      <option
                        key={method.value}
                        value={method.value}
                      >
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Withdrawn By</span>
                  <input
                    value={expenseForm.withdrawnBy}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        withdrawnBy: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </label>

                <label className="accounting-form-full">
                  <span>Notes</span>
                  <textarea
                    value={expenseForm.notes}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Optional notes"
                    rows={3}
                  />
                </label>
              </div>

              <div className="accounting-modal-actions">
                <button
                  type="button"
                  className="accounting-btn accounting-btn-secondary"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="accounting-btn accounting-btn-primary"
                  disabled={savingExpense}
                >
                  {savingExpense ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOpeningModal && (
        <div
          className="accounting-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowOpeningModal(false);
            }
          }}
        >
          <div className="accounting-modal accounting-opening-modal">
            <div className="accounting-modal-header">
              <div>
                <p className="accounting-section-kicker">
                  STARTING POSITION
                </p>
                <h2>Opening Balance</h2>
              </div>

              <button
                type="button"
                className="accounting-modal-close"
                onClick={() => setShowOpeningModal(false)}
              >
                ×
              </button>
            </div>

            {openingBalance ? (
              <div className="accounting-existing-opening">
                <p>
                  An opening balance has already been configured.
                </p>

                <div className="accounting-opening-values accounting-opening-modal-values">
                  <span>
                    Cash
                    <strong>
                      {formatCurrency(openingBalance.cash)}
                    </strong>
                  </span>

                  <span>
                    UPI
                    <strong>
                      {formatCurrency(openingBalance.upi)}
                    </strong>
                  </span>

                  <span>
                    Bank
                    <strong>
                      {formatCurrency(openingBalance.bank)}
                    </strong>
                  </span>
                </div>

                <p className="accounting-warning-text">
                  The backend allows only one opening balance.
                </p>

                <div className="accounting-modal-actions">
                  <button
                    type="button"
                    className="accounting-btn accounting-btn-secondary"
                    onClick={() => setShowOpeningModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOpeningSubmit}>
                <p className="accounting-form-help">
                  Enter the balances available when you started
                  using IntelliBill. These amounts will be added to
                  the ledger as opening credits.
                </p>

                <div className="accounting-form-grid accounting-opening-form-grid">
                  <label>
                    <span>Opening Cash</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingForm.cash}
                      onChange={(event) =>
                        setOpeningForm((current) => ({
                          ...current,
                          cash: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    <span>Opening UPI</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingForm.upi}
                      onChange={(event) =>
                        setOpeningForm((current) => ({
                          ...current,
                          upi: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    <span>Opening Bank</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingForm.bank}
                      onChange={(event) =>
                        setOpeningForm((current) => ({
                          ...current,
                          bank: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <div className="accounting-modal-actions">
                  <button
                    type="button"
                    className="accounting-btn accounting-btn-secondary"
                    onClick={() => setShowOpeningModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="accounting-btn accounting-btn-primary"
                    disabled={savingOpening}
                  >
                    {savingOpening
                      ? "Saving..."
                      : "Save Opening Balance"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}