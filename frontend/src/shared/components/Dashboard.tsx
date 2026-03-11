import React, { useEffect, useState } from "react";
import { transactionApi } from "../services/api";
import { Summary, Transaction } from "../types";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n || 0,
  );

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    transactionApi.getSummary().then((r) => setSummary(r.data));
    transactionApi.getAll().then((r) => setRecent(r.data.slice(0, 8)));
  }, []);

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Good {getGreeting()}, {user?.fullName?.split(" ")[0]}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card balance">
          <div className="stat-label">Net Balance</div>
          <div className="stat-value balance">
            {formatCurrency(summary?.balance || 0)}
          </div>
        </div>
        <div className="stat-card income">
          <div className="stat-label">Total Income</div>
          <div className="stat-value income">
            {formatCurrency(summary?.totalIncome || 0)}
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value expense">
            {formatCurrency(summary?.totalExpenses || 0)}
          </div>
        </div>
        <div className="stat-card monthly">
          <div className="stat-label">{monthName} Net</div>
          <div
            className="stat-value"
            style={{ color: "#6a8fe8", fontSize: 24 }}
          >
            {formatCurrency(
              (summary?.monthlyIncome || 0) - (summary?.monthlyExpenses || 0),
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: 18 }}>Recent Transactions</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "40px",
                    }}
                  >
                    No transactions yet. Add your first one!
                  </td>
                </tr>
              )}
              {recent.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--text-primary)" }}>
                    {t.description}
                  </td>
                  <td>{t.category}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${t.type.toLowerCase()}`}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`amount-${t.type.toLowerCase()}`}>
                      {t.type === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(t.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

export default Dashboard;
