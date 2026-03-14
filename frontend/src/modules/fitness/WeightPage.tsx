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
  const [setup, setSetup] = useState<any>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleStartWeight, setScheduleStartWeight] = useState("");
  const [achievedWeeks, setAchievedWeeks] = useState<Record<number, boolean>>(
    {},
  );
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
    scheduleStartDate: "",
    scheduleStartWeight: "",
  });

  const loadStats = (month: string) =>
    api
      .get(`/fitness/weight/stats?month=${month}`)
      .then((r) => setStats(r.data))
      .catch(() => {});

  const loadAllLogs = () =>
    api
      .get("/fitness/weight")
      .then((r) => setAllLogs(r.data))
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
          scheduleStartDate: r.data.scheduleStartDate || "",
          scheduleStartWeight: r.data.scheduleStartWeight || "",
        });
        // restore schedule fields from backend
        if (r.data.scheduleStartWeight)
          setScheduleStartWeight(String(r.data.scheduleStartWeight));
        if (r.data.scheduleStartDate)
          setScheduleStartDate(r.data.scheduleStartDate);
        else if (r.data.startWeight)
          setScheduleStartWeight(String(r.data.startWeight));
      })
      .catch(() => {});

  const loadAchievedWeeks = () =>
    api
      .get("/fitness/weight/achieved-weeks")
      .then((r) => {
        const map: Record<number, boolean> = {};
        r.data.achievedWeeks.forEach((w: number) => {
          map[w] = true;
        });
        setAchievedWeeks(map);
      })
      .catch(() => {});

  useEffect(() => {
    loadStats(currentMonth);
    loadSetup();
    loadAllLogs();
    loadAchievedWeeks();
  }, []);

  useEffect(() => {
    loadStats(currentMonth);
  }, [currentMonth]);

  const saveSetup = async () => {
    await api.post("/fitness/weight/setup", {
      heightCm: parseFloat(setupForm.heightCm),
      goalWeight: parseFloat(setupForm.goalWeight),
      weeklyLossRate: parseFloat(setupForm.weeklyLossRate),
      startWeight: parseFloat(setupForm.startWeight),
      scheduleStartDate: setupForm.scheduleStartDate || scheduleStartDate,
      scheduleStartWeight:
        parseFloat(setupForm.scheduleStartWeight || scheduleStartWeight) || 0,
    });
    loadSetup();
    loadStats(currentMonth);
    setShowSetup(false);
  };

  const saveScheduleToBackend = (date: string, weight: string) => {
    if (!date || !weight) return;
    api
      .post("/fitness/weight/setup", {
        scheduleStartDate: date,
        scheduleStartWeight: parseFloat(weight),
      })
      .catch(() => {});
  };

  const addWeight = async () => {
    if (!form.weight) return;
    await api.post("/fitness/weight", {
      weight: parseFloat(form.weight),
      date: form.date,
      notes: form.notes,
    });
    loadStats(currentMonth);
    loadAllLogs();
    setShowAdd(false);
    setForm({
      weight: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const deleteWeight = async (date: string) => {
    const all = await api.get("/fitness/weight");
    const match = all.data.find((l: any) => l.date === date);
    if (match) {
      await api.delete(`/fitness/weight/${match.id}`);
      loadStats(currentMonth);
      loadAllLogs();
    }
  };

  const handleAchievedChange = (weekNum: number, checked: boolean) => {
    const updated = { ...achievedWeeks, [weekNum]: checked };
    setAchievedWeeks(updated);
    // save to backend immediately
    const weeksList = Object.entries(updated)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k));
    api
      .post("/fitness/weight/achieved-weeks", { achievedWeeks: weeksList })
      .catch(() => {});
  };

  const generateSchedule = () => {
    if (!scheduleStartWeight || !stats?.goalWeight || !stats?.weeklyLossRate)
      return [];
    const rows = [];
    let currentWeight = parseFloat(scheduleStartWeight);
    const goal = stats.goalWeight;
    const rate = stats.weeklyLossRate;
    const startDateStr =
      scheduleStartDate || new Date().toISOString().split("T")[0];
    const start = new Date(startDateStr);
    let week = 0;

    while (currentWeight > goal && week < 100) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // use allLogs for avg — covers ALL months not just current
      const weekLogs = allLogs.filter((d: any) => {
        const date = new Date(d.date);
        return d.weight !== null && date >= weekStart && date <= weekEnd;
      });
      const avgWeight =
        weekLogs.length > 0
          ? Math.round(
              (weekLogs.reduce((sum: number, d: any) => sum + d.weight, 0) /
                weekLogs.length) *
                10,
            ) / 10
          : null;

      rows.push({
        week: week + 1,
        date: weekStart.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        targetWeight: Math.round(currentWeight * 10) / 10,
        toGo: Math.round((currentWeight - goal) * 10) / 10,
        avgWeight,
        weekStart,
        weekEnd,
      });
      currentWeight = currentWeight * (1 - rate / 100);
      week++;
    }
    return rows;
  };

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

      {/* Weekly Schedule */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => setShowSchedule((p) => !p)}
        >
          <div>
            <h3 style={{ color: "var(--text-primary)", margin: 0 }}>
              Weekly Target Schedule
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              See your target weight for every week until goal
            </p>
          </div>
          <span style={{ fontSize: 20, color: "var(--text-muted)" }}>
            {showSchedule ? "▲" : "▼"}
          </span>
        </div>

        {showSchedule && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={scheduleStartDate}
                  readOnly
                  style={{ cursor: "default", opacity: 0.8 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Start Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={scheduleStartWeight}
                  placeholder={
                    stats?.startWeight ? String(stats.startWeight) : "82"
                  }
                  readOnly
                  style={{ cursor: "default", opacity: 0.8 }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 160,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    padding: "10px 16px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    width: "100%",
                  }}
                >
                  Goal:{" "}
                  <strong style={{ color: "var(--gold)" }}>
                    {stats?.goalWeight} kg
                  </strong>
                  &nbsp;·&nbsp; Rate:{" "}
                  <strong style={{ color: "var(--primary)" }}>
                    {stats?.weeklyLossRate}% / week
                  </strong>
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: -8,
                marginBottom: 12,
              }}
            >
              To change these values, use the ⚙ Setup button above
            </p>
            {scheduleStartWeight ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Date</th>
                    <th>Target Weight</th>
                    <th>Avg Weight</th>
                    <th>To Go</th>
                    <th>Status</th>
                    <th>Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {generateSchedule().map((row, i) => {
                    const isAchieved = achievedWeeks[row.week] || false;
                    const isGoalWeek =
                      row.targetWeight <= (stats?.goalWeight || 0) + 0.5;
                    const isPast = new Date(row.weekStart) < new Date();
                    const bgColor = isAchieved
                      ? "rgba(138,159,74,0.18)"
                      : isPast
                        ? "rgba(138,159,74,0.05)"
                        : "transparent";

                    return (
                      <tr
                        key={i}
                        style={{
                          background: bgColor,
                          transition: "background 0.3s",
                        }}
                      >
                        <td>
                          <span
                            style={{
                              background: isAchieved
                                ? "var(--primary)"
                                : "var(--primary-dim)",
                              color: isAchieved ? "#fff" : "var(--primary)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            W{row.week}
                          </span>
                        </td>
                        <td
                          style={{
                            color: isPast
                              ? "var(--text-secondary)"
                              : "var(--text-primary)",
                            fontSize: 13,
                          }}
                        >
                          {row.date}
                        </td>
                        <td
                          style={{ color: "var(--primary)", fontWeight: 600 }}
                        >
                          {row.targetWeight} kg
                        </td>
                        <td>
                          {row.avgWeight !== null ? (
                            <span
                              style={{
                                color:
                                  row.avgWeight <= row.targetWeight
                                    ? "var(--success)"
                                    : "var(--danger)",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {row.avgWeight} kg
                              <span style={{ fontSize: 10, marginLeft: 4 }}>
                                {row.avgWeight <= row.targetWeight ? "✓" : "↑"}
                              </span>
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: 13,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {row.toGo} kg
                        </td>
                        <td>
                          {isGoalWeek ? (
                            <span
                              style={{
                                background: "rgba(138,159,74,0.12)",
                                color: "var(--success)",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              🎯 Goal!
                            </span>
                          ) : isPast ? (
                            <span
                              style={{
                                background: "var(--bg-elevated)",
                                color: "var(--text-muted)",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                              }}
                            >
                              Past
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "rgba(14,165,233,0.1)",
                                color: "#0ea5e9",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                              }}
                            >
                              Upcoming
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={isAchieved}
                            onChange={(e) =>
                              handleAchievedChange(row.week, e.target.checked)
                            }
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: "var(--primary)",
                              cursor: "pointer",
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Enter your start weight above to generate the schedule
              </div>
            )}
          </div>
        )}
      </div>

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
            {stats?.days?.map((d: any) => (
              <tr
                key={d.date}
                style={{
                  background: d.weight ? "transparent" : "var(--bg-secondary)",
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
            ))}
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
            <div className="form-group">
              <label className="form-label">Schedule Start Date</label>
              <input
                type="date"
                className="input"
                value={setupForm.scheduleStartDate}
                onChange={(e) =>
                  setSetupForm((p) => ({
                    ...p,
                    scheduleStartDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Schedule Start Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={setupForm.scheduleStartWeight}
                onChange={(e) =>
                  setSetupForm((p) => ({
                    ...p,
                    scheduleStartWeight: e.target.value,
                  }))
                }
                placeholder="80"
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
