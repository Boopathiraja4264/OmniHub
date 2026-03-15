import React, { useCallback, useEffect, useState, useMemo } from "react";
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
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleStartWeight, setScheduleStartWeight] = useState("");
  const [achievedWeeks, setAchievedWeeks] = useState<Record<number, boolean>>({});
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

  // PARALLEL DATA LOADING
  const loadAllData = useCallback(async (month: string) => {
    try {
      const [statsRes, setupRes, logsRes, weeksRes] = await Promise.all([
        api.get(`/fitness/weight/stats?month=${month}`),
        api.get("/fitness/weight/setup"),
        api.get("/fitness/weight"),
        api.get("/fitness/weight/achieved-weeks")
      ]);

      setStats(statsRes.data);
      setAllLogs(logsRes.data);

      // Handle Setup
      const s = setupRes.data;
      setSetupForm({
        heightCm: s.heightCm || "",
        goalWeight: s.goalWeight || "",
        weeklyLossRate: s.weeklyLossRate || "",
        startWeight: s.startWeight || "",
        scheduleStartDate: s.scheduleStartDate || "",
        scheduleStartWeight: s.scheduleStartWeight || "",
      });
      if (s.scheduleStartWeight) setScheduleStartWeight(String(s.scheduleStartWeight));
      if (s.scheduleStartDate) setScheduleStartDate(s.scheduleStartDate);
      else if (s.startWeight) setScheduleStartWeight(String(s.startWeight));

      // Handle Weeks
      const map: Record<number, boolean> = {};
      weeksRes.data.achievedWeeks.forEach((w: number) => { map[w] = true; });
      setAchievedWeeks(map);

    } catch (err) {
      console.error("Failed to load weight data", err);
    }
  }, []);

  useEffect(() => {
    loadAllData(currentMonth);
  }, [currentMonth, loadAllData]);

  // MEMOIZED CALCULATIONS (Prevents lag during render)
  const scheduleRows = useMemo(() => {
    if (!scheduleStartWeight || !stats?.goalWeight || !stats?.weeklyLossRate) return [];
    const rows = [];
    let currentWeight = parseFloat(scheduleStartWeight);
    const goal = stats.goalWeight;
    const rate = stats.weeklyLossRate;
    const startDateStr = scheduleStartDate || new Date().toISOString().split("T")[0];
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
      const avgWeight = weekLogs.length > 0
          ? Math.round((weekLogs.reduce((sum: number, d: any) => sum + d.weight, 0) / weekLogs.length) * 10) / 10
          : null;

      rows.push({
        week: week + 1,
        date: weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
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
  }, [scheduleStartWeight, stats, scheduleStartDate, allLogs]);

  const monthOpts = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      opts.push({ val, label });
    }
    return opts;
  }, []);

  const chartData = useMemo(() => 
    stats?.days?.filter((d: any) => d.weight !== null).map((d: any) => ({
      date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      weight: d.weight,
      target: d.weeklyTarget,
    })) || [], [stats]);

  const saveSetup = async () => {
    await api.post("/fitness/weight/setup", {
      heightCm: parseFloat(setupForm.heightCm),
      goalWeight: parseFloat(setupForm.goalWeight),
      weeklyLossRate: parseFloat(setupForm.weeklyLossRate),
      startWeight: parseFloat(setupForm.startWeight),
      scheduleStartDate: setupForm.scheduleStartDate || scheduleStartDate,
      scheduleStartWeight: parseFloat(setupForm.scheduleStartWeight || scheduleStartWeight) || 0,
    });
    loadAllData(currentMonth);
    setShowSetup(false);
  };

  const addWeight = async () => {
    if (!form.weight) return;
    await api.post("/fitness/weight", {
      weight: parseFloat(form.weight),
      date: form.date,
      notes: form.notes,
    });
    loadAllData(currentMonth);
    setShowAdd(false);
    setForm({ weight: "", date: new Date().toISOString().split("T")[0], notes: "" });
  };

  const deleteWeight = async (date: string) => {
    const all = await api.get("/fitness/weight");
    const match = all.data.find((l: any) => l.date === date);
    if (match) {
      await api.delete(`/fitness/weight/${match.id}`);
      loadAllData(currentMonth);
    }
  };

  const handleAchievedChange = (weekNum: number, checked: boolean) => {
    const updated = { ...achievedWeeks, [weekNum]: checked };
    setAchievedWeeks(updated);
    const weeksList = Object.entries(updated).filter(([, v]) => v).map(([k]) => parseInt(k));
    api.post("/fitness/weight/achieved-weeks", { achievedWeeks: weeksList }).catch(() => {});
  };

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
    <div style={{ animation: "slideUp 0.3s ease-out" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Weight Tracker</h1>
          <p className="page-subtitle">Track your body weight over time</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowSetup(true)}>⚙ Setup</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Weight</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-grid" style={{ marginBottom: 24, minHeight: 100 }}>
        <div className="stat-card">
          <div className="stat-label">Current Weight</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{stats?.latestWeight ? `${stats.latestWeight} kg` : "--"}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>BMI: {stats?.bmi || "--"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Goal Weight</div>
          <div className="stat-value" style={{ color: "var(--gold)" }}>{stats?.goalWeight ? `${stats.goalWeight} kg` : "--"}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{stats?.weeksRemaining ? `~${stats.weeksRemaining} weeks left` : ""}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Change</div>
          <div className="stat-value" style={{ color: stats?.kgChanged < 0 ? "var(--success)" : stats?.kgChanged > 0 ? "var(--danger)" : "var(--text-muted)" }}>
            {stats?.kgChanged !== null && stats?.kgChanged !== undefined ? `${stats.kgChanged > 0 ? "+" : ""}${stats.kgChanged} kg` : "--"}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{stats?.percentToGoal !== null && stats?.percentToGoal !== undefined ? `${stats.percentToGoal}% to goal` : ""}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ideal Weight Range</div>
          <div className="stat-value" style={{ fontSize: 20, color: "var(--primary)" }}>{stats?.idealWeightRange || "--"}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Based on BMI 18.5–24.9</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 24, padding: "18px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Goal Progress</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{stats?.percentToGoal || 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill safe" style={{ width: `${Math.min(stats?.percentToGoal || 0, 100)}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Start: {stats?.startWeight || "--"} kg</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Goal: {stats?.goalWeight || "--"} kg</span>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowSchedule(!showSchedule)}>
          <div>
            <h3 style={{ color: "var(--text-primary)", margin: 0 }}>Weekly Target Schedule</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4, marginBottom: 0 }}>See your target weight for every week until goal</p>
          </div>
          <span style={{ fontSize: 20, color: "var(--text-muted)" }}>{showSchedule ? "▲" : "▼"}</span>
        </div>

        {showSchedule && (
          <div style={{ marginTop: 20 }}>
            <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
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
                  {scheduleRows.map((row, i) => {
                    const isAchieved = achievedWeeks[row.week] || false;
                    const isGoalWeek = row.targetWeight <= (stats?.goalWeight || 0) + 0.5;
                    const isPast = new Date(row.weekStart) < new Date();
                    return (
                      <tr key={i} style={{ background: isAchieved ? "rgba(138,159,74,0.18)" : isPast ? "rgba(138,159,74,0.05)" : "transparent" }}>
                        <td><span style={{ background: isAchieved ? "var(--primary)" : "var(--primary-dim)", color: isAchieved ? "#fff" : "var(--primary)", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>W{row.week}</span></td>
                        <td style={{ color: isPast ? "var(--text-secondary)" : "var(--text-primary)", fontSize: 13 }}>{row.date}</td>
                        <td style={{ color: "var(--primary)", fontWeight: 600 }}>{row.targetWeight} kg</td>
                        <td>{row.avgWeight !== null ? <span style={{ color: row.avgWeight <= row.targetWeight ? "var(--success)" : "var(--danger)", fontWeight: 600, fontSize: 13 }}>{row.avgWeight} kg</span> : "—"}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{row.toGo} kg</td>
                        <td>{isGoalWeek ? "🎯 Goal!" : isPast ? "Past" : "Upcoming"}</td>
                        <td><input type="checkbox" checked={isAchieved} onChange={(e) => handleAchievedChange(row.week, e.target.checked)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Line Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>Weight vs Target</h3>
        <div style={{ width: "100%", height: "300px", minHeight: "300px", position: "relative" }}>
          <ResponsiveContainer width="99%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name="Actual" />
              <Line type="monotone" dataKey="target" stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text-primary)" }}>Monthly Log</h3>
          <select className="input" style={{ width: "auto" }} value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)}>
            {monthOpts.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
          <table className="table" style={{ minWidth: "500px" }}>
            <thead>
              <tr><th>Date</th><th>Weight</th><th>Change</th><th>Weekly Target</th><th>To Go</th><th></th></tr>
            </thead>
            <tbody>
              {stats?.days?.map((d: any) => (
                <tr key={d.date}>
                  <td>{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{d.weight ? `${d.weight} kg` : "—"}</td>
                  <td style={{ color: changeColor(d.changeDirection) }}>{d.change !== null ? `${changeArrow(d.changeDirection)} ${Math.abs(d.change)} kg` : "—"}</td>
                  <td>{d.weeklyTarget ? `${d.weeklyTarget} kg` : "—"}</td>
                  <td>{d.toGo !== null ? `${d.toGo} kg` : "—"}</td>
                  <td>{d.weight && <button onClick={() => deleteWeight(d.date)}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Weight Setup</h3>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" className="input" value={setupForm.heightCm} onChange={(e) => setSetupForm({...setupForm, heightCm: e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={saveSetup}>Save Setup</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Log Weight</h3>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" className="input" value={form.weight} onChange={(e) => setForm({...form, weight: e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={addWeight}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightPage;
