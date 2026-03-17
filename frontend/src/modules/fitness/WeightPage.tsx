import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [rawStats, setRawStats] = useState<any>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allLogsLoaded, setAllLogsLoaded] = useState(false);
  const [activePanel, setActivePanel] = useState<"schedule" | "monthly" | null>(null);
  const showSchedule = activePanel === "schedule";
  const showMonthlyLog = activePanel === "monthly";
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

  // All calculations run in the browser — zero server CPU
  const stats = useMemo(() => {
    if (!rawStats || !setupForm.goalWeight) return null;

    const goalWeight = parseFloat(setupForm.goalWeight) || null;
    const startWeight = parseFloat(setupForm.startWeight) || null;
    const weeklyLossRate = parseFloat(setupForm.weeklyLossRate) || null;
    const heightCm = parseFloat(setupForm.heightCm) || null;
    const { latestWeight, firstWeight } = rawStats;

    let prevWeight: number | null = null;
    const days = rawStats.days.map((d: any) => {
      const dayOfMonth = new Date(d.date).getDate();
      const weekNum = Math.floor((dayOfMonth - 1) / 7) + 1;
      const weeklyTarget =
        startWeight && weeklyLossRate
          ? Math.round(startWeight * Math.pow(1 - weeklyLossRate / 100, weekNum - 1) * 10) / 10
          : null;

      let change = null, changeDirection = null;
      if (d.weight !== null && prevWeight !== null) {
        change = Math.round((d.weight - prevWeight) * 10) / 10;
        changeDirection = change > 0 ? "UP" : change < 0 ? "DOWN" : "SAME";
      }
      if (d.weight !== null) prevWeight = d.weight;

      return {
        ...d,
        weekNumber: weekNum,
        weeklyTarget,
        change,
        changeDirection,
        toGo: d.weight !== null && goalWeight !== null
          ? Math.round((d.weight - goalWeight) * 10) / 10
          : null,
      };
    });

    // Weekly averages
    const weekGroups: Record<number, number[]> = {};
    days.forEach((d: any) => {
      if (d.weight !== null) {
        if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
        weekGroups[d.weekNumber].push(d.weight);
      }
    });
    const weeklyAverages: Record<number, number> = {};
    Object.entries(weekGroups).forEach(([wk, weights]: any) => {
      weeklyAverages[parseInt(wk)] =
        Math.round((weights.reduce((a: number, b: number) => a + b, 0) / weights.length) * 10) / 10;
    });

    // BMI + ideal range
    let bmi = null, idealWeightRange = null;
    if (latestWeight && heightCm) {
      const hm = heightCm / 100;
      bmi = Math.round((latestWeight / (hm * hm)) * 10) / 10;
      const low = Math.round(18.5 * hm * hm * 10) / 10;
      const high = Math.round(24.9 * hm * hm * 10) / 10;
      idealWeightRange = `${low} - ${high} kg`;
    }

    // Progress
    let kgChanged = null, percentToGoal = null;
    if (latestWeight !== null && firstWeight !== null && goalWeight !== null) {
      kgChanged = Math.round((latestWeight - firstWeight) * 10) / 10;
      const totalToLose = firstWeight - goalWeight;
      const lost = firstWeight - latestWeight;
      percentToGoal = totalToLose > 0
        ? Math.round((lost / totalToLose) * 1000) / 10
        : 0;
    }

    // Weeks remaining
    let weeksRemaining = null;
    if (latestWeight && goalWeight && weeklyLossRate && weeklyLossRate > 0 && latestWeight > goalWeight) {
      weeksRemaining = Math.ceil(
        Math.log(goalWeight / latestWeight) / Math.log(1 - weeklyLossRate / 100),
      );
    }

    return {
      days, weeklyAverages, latestWeight, firstWeight,
      kgChanged, percentToGoal, goalWeight, startWeight,
      bmi, idealWeightRange, weeksRemaining, weeklyLossRate,
    };
  }, [rawStats, setupForm]);

  const loadStats = useCallback(
    (month: string) =>
      api
        .get(`/fitness/weight/stats?month=${month}`)
        .then((r) => setRawStats(r.data))
        .catch(() => {}),
    [],
  );

  const loadAllLogs = useCallback(
    () =>
      api
        .get("/fitness/weight")
        .then((r) => {
          setAllLogs(r.data);
          setAllLogsLoaded(true);
        })
        .catch(() => {}),
    [],
  );

  const loadSetup = useCallback(
    () =>
      api
        .get("/fitness/weight/setup")
        .then((r) => {
          setSetupForm({
            heightCm: r.data.heightCm || "",
            goalWeight: r.data.goalWeight || "",
            weeklyLossRate: r.data.weeklyLossRate || "",
            startWeight: r.data.startWeight || "",
            scheduleStartDate: r.data.scheduleStartDate || "",
            scheduleStartWeight: r.data.scheduleStartWeight || "",
          });
          if (r.data.scheduleStartWeight)
            setScheduleStartWeight(String(r.data.scheduleStartWeight));
          if (r.data.scheduleStartDate)
            setScheduleStartDate(r.data.scheduleStartDate);
          else if (r.data.startWeight)
            setScheduleStartWeight(String(r.data.startWeight));
        })
        .catch(() => {}),
    [],
  );

  const loadAchievedWeeks = useCallback(
    () =>
      api
        .get("/fitness/weight/achieved-weeks")
        .then((r) => {
          const map: Record<number, boolean> = {};
          r.data.achievedWeeks.forEach((w: number) => {
            map[w] = true;
          });
          setAchievedWeeks(map);
        })
        .catch(() => {}),
    [],
  );

  // Initial load: only 2 API calls instead of 4
  useEffect(() => {
    Promise.all([loadStats(currentMonth), loadSetup()]);
  }, [currentMonth, loadStats, loadSetup]);

  // Lazy load allLogs + achievedWeeks only when a section that needs them is opened
  useEffect(() => {
    if ((showSchedule || showMonthlyLog) && !allLogsLoaded) {
      Promise.all([loadAllLogs(), loadAchievedWeeks()]);
    }
  }, [showSchedule, showMonthlyLog, allLogsLoaded, loadAllLogs, loadAchievedWeeks]);

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

  const addWeight = async () => {
    if (!form.weight) return;
    await api.post("/fitness/weight", {
      weight: parseFloat(form.weight),
      date: form.date,
      notes: form.notes,
    });
    loadStats(currentMonth);
    if (allLogsLoaded) loadAllLogs();
    setShowAdd(false);
    setForm({
      weight: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const deleteWeight = async (date: string) => {
    // Use already-loaded allLogs — no extra API call
    const match = allLogs.find((l: any) => l.date === date);
    if (match) {
      await api.delete(`/fitness/weight/${match.id}`);
      loadStats(currentMonth);
      loadAllLogs();
    }
  };

  const handleAchievedChange = (weekNum: number, checked: boolean) => {
    const updated = { ...achievedWeeks, [weekNum]: checked };
    setAchievedWeeks(updated);
    const weeksList = Object.entries(updated)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k));
    api
      .post("/fitness/weight/achieved-weeks", { achievedWeeks: weeksList })
      .catch(() => {});
  };

  // Memoized — only recalculates when inputs change, not on every render
  const schedule = useMemo(() => {
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
  }, [scheduleStartWeight, scheduleStartDate, stats?.goalWeight, stats?.weeklyLossRate, allLogs]);

  const monthOptions = useMemo(() => {
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
  }, []);

  const chartData = useMemo(
    () =>
      stats?.days
        ?.filter((d: any) => d.weight !== null)
        .map((d: any) => ({
          date: new Date(d.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
          weight: d.weight,
          target: d.weeklyTarget,
        })) || [],
    [stats?.days],
  );

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
                  (stats.kgChanged ?? 0) < 0
                    ? "var(--success)"
                    : (stats.kgChanged ?? 0) > 0
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

      {/* Always-visible tile cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setActivePanel(p => p === "schedule" ? null : "schedule")}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
            background: showSchedule ? "var(--primary-dim)" : "var(--bg-card)",
            border: `1.5px solid ${showSchedule ? "var(--primary)" : "var(--border)"}`,
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 20 }}>📅</span>
          <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
            Weekly Schedule
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {showSchedule ? "Click to close" : "Click to view"}
          </span>
        </button>

        <button
          onClick={() => setActivePanel(p => p === "monthly" ? null : "monthly")}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
            background: showMonthlyLog ? "var(--primary-dim)" : "var(--bg-card)",
            border: `1.5px solid ${showMonthlyLog ? "var(--primary)" : "var(--border)"}`,
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
            Monthly Log
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {showMonthlyLog ? "Click to close" : "Click to view"}
          </span>
        </button>
      </div>

      {/* Weekly Schedule expanded */}
      {showSchedule && (
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 20 }}>
          Weekly Target Schedule
        </h3>

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
              <div
                style={{
                  overflowX: "auto",
                  width: "100%",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <table className="table" style={{ minWidth: "600px" }}>
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
                    {schedule.map((row, i) => {
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
                                  {row.avgWeight <= row.targetWeight
                                    ? "✓"
                                    : "↑"}
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
              </div>
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
      </div>
      )}

      {/* Monthly Log expanded */}
      {showMonthlyLog && (
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ color: "var(--text-primary)", margin: 0 }}>
            Monthly Log
          </h3>
          <select
            className="input"
            style={{ width: "auto", padding: "8px 14px" }}
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
          >
            {monthOptions.map((o) => (
              <option key={o.val} value={o.val}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <>
          {stats?.weeklyAverages &&
              Object.keys(stats.weeklyAverages).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 16,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {Object.entries(stats.weeklyAverages).map(
                    ([wk, avg]: any) => (
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
                        <strong style={{ color: "var(--primary)" }}>
                          {avg} kg
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              )}

            <div
              style={{
                overflowX: "auto",
                width: "100%",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table className="table" style={{ minWidth: "500px" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Change</th>
                    <th>To Go</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.days?.map((d: any) => (
                    <tr
                      key={d.date}
                      style={{
                        background: d.weight
                          ? "transparent"
                          : "var(--bg-secondary)",
                        opacity: d.weight ? 1 : 0.5,
                        borderTop:
                          d.date.endsWith("-01") ||
                          (d.weekNumber > 1 &&
                            new Date(d.date).getDay() === 1)
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
                      <td
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: 13,
                        }}
                      >
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
        </>
      </div>
      )}

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
