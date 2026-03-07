import React, { useEffect, useState } from "react";
import { budgetApi } from "../services/api";
import { Budget, EXPENSE_CATEGORIES } from "../types";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n || 0,
  );

const BudgetsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category: "",
    limitAmount: "",
    month,
    year,
  });
  const [loading, setLoading] = useState(false);

  const load = () =>
    budgetApi.getForMonth(month, year).then((r) => setBudgets(r.data));

  useEffect(() => {
    load();
  }, [month, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await budgetApi.create({
        ...form,
        limitAmount: parseFloat(form.limitAmount),
        month,
        year,
      });
      setShowModal(false);
      setForm({ category: "", limitAmount: "", month, year });
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remove this budget?")) return;
    await budgetApi.delete(id);
    load();
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Budgets</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Set Budget
        </button>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ width: "auto" }}
        >
          {months.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: "auto" }}
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>Budget Goals</h3>
        <p
          style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}
        >
          {months[month - 1]} {year}
        </p>

        {budgets.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "40px 0",
            }}
          >
            No budgets set for this month. Create one to start tracking!
          </div>
        )}

        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.limitAmount) * 100, 100);
          const status = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "safe";
          return (
            <div key={b.id} className="budget-item">
              <div className="budget-header">
                <div>
                  <div
                    style={{ fontWeight: 500, color: "var(--text-primary)" }}
                  >
                    {b.category}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(b.spent)} of {formatCurrency(b.limitAmount)}
                    {pct >= 100 && (
                      <span style={{ color: "var(--expense)", marginLeft: 8 }}>
                        ⚠ Exceeded
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color:
                        status === "danger"
                          ? "var(--expense)"
                          : status === "warning"
                            ? "var(--accent)"
                            : "var(--income)",
                    }}
                  >
                    {Math.round(pct)}%
                  </span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(b.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${status}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Set Budget</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                  >
                    <option value="">Select category...</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Monthly Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.limitAmount}
                    onChange={(e) =>
                      setForm({ ...form, limitAmount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Set Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
