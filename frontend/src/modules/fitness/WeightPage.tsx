import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";

const WeightPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [setSetup] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [form, setForm] = useState({
    weight: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [setupForm, setSetupForm] = useState({
    heightCm: "",
    goalWeight: "",
    weeklyLossRate: "",
    startWeight: "",
  });

  const loadStats = (month: string) =>
    api
      .get(`/fitness/weight/stats?month=${month}`)
      .then((r) => setStats(r.data))
      .catch(() => {});

  const loadSetup = () =>
    api
      .get("/fitness/weight/setup")
      .then((r) => {
        setSetup(r.data);
        setSetupForm({
          heightCm: r.data.heightCm || "",
          goalWeight: r.data.goalWeight || "",
          weeklyLossRate: r.data.weeklyLossRate || "",
          startWeight: r.data.startWeight || "",
        });
      })
      .catch(() => {});

  useEffect(() => {
    loadStats(currentMonth);
    loadSetup();
  }, [currentMonth]);
  useEffect(() => {
    loadStats(currentMonth);
  }, [currentMonth]);

  const saveSetup = async () => {
    await api.post("/fitness/weight/setup", {
      heightCm: parseFloat(setupForm.heightCm),
      goalWeight: parseFloat(setupForm.goalWeight),
      weeklyLossRate: parseFloat(setupForm.weeklyLossRate),
      startWeight: parseFloat(setupForm.startWeight),
    });
    loadSetup();
    loadStats(currentMonth);
    setShowSetup(false);
  };

  const addWeight = async () => {
    if (!form.weight) return;
    await api.post("/fitness/weight", {
      weight: parseFloat(form.weight),
      date: form.date,
      notes: form.notes,
    });
    loadStats(currentMonth);
    setShowAdd(false);
    setForm({
      weight: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const deleteWeight = async (date: string) => {
    const log = stats?.days?.find(
      (d: any) => d.date === date && d.weight !== null,
    );
    if (!log) return;
    const all = await api.get("/fitness/weight");
    const match = all.data.find((l: any) => l.date === date);
    if (match) {
      await api.delete(`/fitness/weight/${match.id}`);
      loadStats(currentMonth);
    }
  };

  // generate month options (last 12 months)
  const monthOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      opts.push({ val, label });
    }
    return opts;
  };

  // chart data — only logged days
  const chartData =
    stats?.days
      ?.filter((d: any) => d.weight !== null)
      .map((d: any) => ({
        date: new Date(d.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        weight: d.weight,
        target: d.weeklyTarget,
      })) || [];

  const changeColor = (dir: string | null) => {
    if (dir === "DOWN") return "var(--success)";
    if (dir === "UP") return "var(--danger)";
    return "var(--text-muted)";
  };

  const changeArrow = (dir: string | null) => {
    if (dir === "DOWN") return "▼";
    if (dir === "UP") return "▲";
    if (dir === "SAME") return "—";
    return "";
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 className="page-title">Weight Tracker</h1>
          <p className="page-subtitle">Track your body weight over time</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSetup(true)}
          >
            ⚙ Setup
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Log Weight
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Current Weight</div>
            <div className="stat-value" style={{ color: "var(--primary)" }}>
              {stats.latestWeight ? `${stats.latestWeight} kg` : "--"}
            </div>
            <div
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
            >
              BMI: {stats.bmi || "--"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Goal Weight</div>
            <div className="stat-value" style={{ color: "var(--gold)" }}>
              {stats.goalWeight ? `${stats.goalWeight} kg` : "--"}
            </div>
            <div
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
            >
              {stats.weeksRemaining
                ? `~${stats.weeksRemaining} weeks left`
                : ""}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Change</div>
            <div
              className="stat-value"
              style={{
                color:
                  stats.kgChanged < 0
                    ? "var(--success)"
                    : stats.kgChanged > 0
                      ? "var(--danger)"
                      : "var(--text-muted)",
              }}
            >
              {stats.kgChanged !== null
                ? `${stats.kgChanged > 0 ? "+" : ""}${stats.kgChanged} kg`
                : "--"}
            </div>
            <div
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
            >
              {stats.percentToGoal !== null
                ? `${stats.percentToGoal}% to goal`
                : ""}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ideal Weight Range</div>
            <div
              className="stat-value"
              style={{ fontSize: 20, color: "var(--primary)" }}
            >
              {stats.idealWeightRange || "--"}
            </div>
            <div
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
            >
              Based on BMI 18.5–24.9
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {stats?.percentToGoal !== null && stats?.percentToGoal !== undefined && (
        <div
          className="card"
          style={{ marginBottom: 24, padding: "18px 26px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Goal Progress
            </span>
            <span
              style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}
            >
              {stats.percentToGoal}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill safe"
              style={{ width: `${Math.min(stats.percentToGoal, 100)}%` }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Start: {stats.startWeight} kg
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Goal: {stats.goalWeight} kg
            </span>
          </div>
        </div>
      )}

      {/* Line Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>
            Weight vs Target
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "var(--text-primary)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--primary)" }}
                name="Actual weight"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="var(--gold)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="Weekly target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Table */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 style={{ color: "var(--text-primary)" }}>Monthly Log</h3>
          <select
            className="input"
            style={{ width: "auto", padding: "8px 14px" }}
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
          >
            {monthOptions().map((o) => (
              <option key={o.val} value={o.val}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Weekly averages summary */}
        {stats?.weeklyAverages &&
          Object.keys(stats.weeklyAverages).length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              {Object.entries(stats.weeklyAverages).map(([wk, avg]: any) => (
                <div
                  key={wk}
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  Week {wk} avg:{" "}
                  <strong style={{ color: "var(--primary)" }}>{avg} kg</strong>
                </div>
              ))}
            </div>
          )}

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>Change</th>
              <th>Weekly Target</th>
              <th>To Go</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stats?.days?.map((d: any) => {
              return (
                <tr
                  key={d.date}
                  style={{
                    background: d.weight
                      ? "transparent"
                      : "var(--bg-secondary)",
                    opacity: d.weight ? 1 : 0.5,
                    borderTop:
                      d.date.endsWith("-01") ||
                      (d.weekNumber > 1 && new Date(d.date).getDay() === 1)
                        ? "2px solid var(--border)"
                        : undefined,
                  }}
                >
                  <td
                    style={{
                      color: d.weight
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    {new Date(d.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {new Date(d.date).getDay() === 1 && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          background: "var(--primary-dim)",
                          color: "var(--primary)",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        W{d.weekNumber}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      color: "var(--primary)",
                      fontWeight: d.weight ? 600 : 400,
                    }}
                  >
                    {d.weight ? `${d.weight} kg` : "—"}
                  </td>
                  <td
                    style={{
                      color: changeColor(d.changeDirection),
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {d.change !== null
                      ? `${changeArrow(d.changeDirection)} ${Math.abs(d.change)} kg`
                      : "—"}
                  </td>
                  <td style={{ color: "var(--gold)", fontSize: 13 }}>
                    {d.weeklyTarget ? `${d.weeklyTarget} kg` : "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    {d.toGo !== null ? `${d.toGo} kg` : "—"}
                  </td>
                  <td>
                    {d.weight && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => deleteWeight(d.date)}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Weight Setup</h3>
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                className="input"
                value={setupForm.heightCm}
                onChange={(e) =>
                  setSetupForm((p) => ({ ...p, heightCm: e.target.value }))
                }
                placeholder="170"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={setupForm.startWeight}
                onChange={(e) =>
                  setSetupForm((p) => ({ ...p, startWeight: e.target.value }))
                }
                placeholder="82"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Goal Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={setupForm.goalWeight}
                onChange={(e) =>
                  setSetupForm((p) => ({ ...p, goalWeight: e.target.value }))
                }
                placeholder="70"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Weekly Loss Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={setupForm.weeklyLossRate}
                onChange={(e) =>
                  setSetupForm((p) => ({
                    ...p,
                    weeklyLossRate: e.target.value,
                  }))
                }
                placeholder="0.9"
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={saveSetup}
              >
                Save Setup
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSetup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Weight Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Log Weight</h3>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.weight}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value }))
                }
                placeholder="80.5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Morning weight..."
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={addWeight}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightPage;
