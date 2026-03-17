import React, { useCallback, useEffect, useMemo, useState } from "react";
import { stepsApi } from "../../services/api";

const StepsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLogForm, setShowLogForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [showTargetHistory, setShowTargetHistory] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);

  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    steps: "",
    stepsTime: "",
    runKm: "",
    runTime: "",
    notes: "",
  });

  const [targetForm, setTargetForm] = useState({
    targetSteps: "",
    targetRunKm: "",
  });

  const load = useCallback(() => {
    Promise.all([stepsApi.getLogs(), stepsApi.getTargets()])
      .then(([l, t]) => {
        setLogs(l.data);
        setTargets(t.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentTarget = useMemo(() => targets[0] || null, [targets]);

  const saveLog = async () => {
    const data = {
      date: logForm.date,
      steps: logForm.steps ? parseInt(logForm.steps) : null,
      stepsTime: logForm.stepsTime || null,
      runKm: logForm.runKm ? parseFloat(logForm.runKm) : null,
      runTime: logForm.runTime || null,
      notes: logForm.notes || null,
    };
    if (editingLog) {
      await stepsApi.updateLog(editingLog.id, data);
    } else {
      await stepsApi.addLog(data);
    }
    setShowLogForm(false);
    setEditingLog(null);
    resetLogForm();
    load();
  };

  const saveTarget = async () => {
    const data = {
      targetSteps: targetForm.targetSteps ? parseInt(targetForm.targetSteps) : null,
      targetRunKm: targetForm.targetRunKm ? parseFloat(targetForm.targetRunKm) : null,
    };
    if (editingTarget) {
      await stepsApi.updateTarget(editingTarget.id, data);
      setEditingTarget(null);
    } else {
      await stepsApi.addTarget(data);
    }
    setShowTargetForm(false);
    setTargetForm({ targetSteps: "", targetRunKm: "" });
    load();
  };

  const deleteLog = async (id: number) => {
    await stepsApi.deleteLog(id);
    load();
  };

  const startEditLog = (log: any) => {
    setLogForm({
      date: log.date,
      steps: log.steps ?? "",
      stepsTime: log.stepsTime ?? "",
      runKm: log.runKm ?? "",
      runTime: log.runTime ?? "",
      notes: log.notes ?? "",
    });
    setEditingLog(log);
    setShowLogForm(true);
  };

  const startEditTarget = (target: any) => {
    setTargetForm({
      targetSteps: target.targetSteps ?? "",
      targetRunKm: target.targetRunKm ?? "",
    });
    setEditingTarget(target);
    setShowTargetForm(true);
  };

  const resetLogForm = () => setLogForm({
    date: new Date().toISOString().split("T")[0],
    steps: "", stepsTime: "", runKm: "", runTime: "", notes: "",
  });

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Steps & Run Tracker</h1>
          <p className="page-subtitle">Track your daily steps and running distance</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => { setEditingTarget(null); setTargetForm({ targetSteps: "", targetRunKm: "" }); setShowTargetForm(true); }}>
            🎯 Set Target
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingLog(null); resetLogForm(); setShowLogForm(true); }}>
            + Log Today
          </button>
        </div>
      </div>

      {/* Current target banner */}
      {currentTarget && (
        <div className="card" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 40 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Target Steps</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>
                {currentTarget.targetSteps?.toLocaleString() ?? "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                ≈ {currentTarget.targetSteps ? Math.round(currentTarget.targetSteps * 0.00076 * 100) / 100 : "—"} km
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Target Run</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>
                {currentTarget.targetRunKm ?? "—"} km
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>per day</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Since</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                {new Date(currentTarget.setDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => startEditTarget(currentTarget)}>
              ✏️ Edit
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowTargetHistory(!showTargetHistory)}>
              {showTargetHistory ? "Hide History" : "Target History"}
            </button>
          </div>
        </div>
      )}

      {/* Target History */}
      {showTargetHistory && targets.length > 0 && (
        <div className="card" style={{ marginBottom: 24, animation: "fadeIn 0.3s" }}>
          <h3 style={{ color: "var(--text-primary)", marginBottom: 16 }}>🎯 Target History</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Set On</th>
                  <th>Target Steps</th>
                  <th>Equivalent KM</th>
                  <th>Target Run KM</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t, i) => (
                  <tr key={t.id} style={{ background: i === 0 ? "rgba(138,159,74,0.08)" : "transparent" }}>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {new Date(t.setDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, background: "var(--primary-dim)", color: "var(--primary)", padding: "1px 6px", borderRadius: 4 }}>Current</span>}
                    </td>
                    <td style={{ color: "var(--primary)", fontWeight: 600 }}>{t.targetSteps?.toLocaleString() ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {t.targetSteps ? Math.round(t.targetSteps * 0.00076 * 100) / 100 + " km" : "—"}
                    </td>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{t.targetRunKm ? t.targetRunKm + " km" : "—"}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => startEditTarget(t)}>
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Set Target form */}
      {showTargetForm && (
        <div className="card" style={{ marginBottom: 24, animation: "fadeIn 0.3s" }}>
          <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>
            {editingTarget ? "✏️ Edit Target" : "🎯 Set New Target"}
          </h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">TARGET STEPS / DAY</label>
              <input
                type="number"
                className="input"
                value={targetForm.targetSteps}
                onChange={(e) => setTargetForm((p) => ({ ...p, targetSteps: e.target.value }))}
                placeholder="e.g. 10000"
              />
              {targetForm.targetSteps && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  ≈ {Math.round(parseInt(targetForm.targetSteps) * 0.00076 * 100) / 100} km
                </p>
              )}
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">TARGET RUN (KM / DAY)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={targetForm.targetRunKm}
                onChange={(e) => setTargetForm((p) => ({ ...p, targetRunKm: e.target.value }))}
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={saveTarget}>
              {editingTarget ? "Update Target" : "Save Target"}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowTargetForm(false); setEditingTarget(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Log form */}
      {showLogForm && (
        <div className="card" style={{ marginBottom: 24, animation: "fadeIn 0.3s" }}>
          <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>
            {editingLog ? "✏️ Edit Log" : "➕ Log Steps & Run"}
          </h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">DATE</label>
              <input type="date" className="input" value={logForm.date}
                onChange={(e) => setLogForm((p) => ({ ...p, date: e.target.value }))}
                disabled={!!editingLog} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">STEPS</label>
              <input type="number" className="input" value={logForm.steps}
                onChange={(e) => setLogForm((p) => ({ ...p, steps: e.target.value }))}
                placeholder="e.g. 8500" />
              {logForm.steps && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  ≈ {Math.round(parseInt(logForm.steps) * 0.00076 * 100) / 100} km
                </p>
              )}
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">STEPS TIME</label>
              <input type="text" className="input" value={logForm.stepsTime}
                onChange={(e) => setLogForm((p) => ({ ...p, stepsTime: e.target.value }))}
                placeholder="e.g. 45 min" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">RUN (KM)</label>
              <input type="number" step="0.1" className="input" value={logForm.runKm}
                onChange={(e) => setLogForm((p) => ({ ...p, runKm: e.target.value }))}
                placeholder="e.g. 3.5" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">RUN TIME</label>
              <input type="text" className="input" value={logForm.runTime}
                onChange={(e) => setLogForm((p) => ({ ...p, runTime: e.target.value }))}
                placeholder="e.g. 25 min" />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">NOTES (optional)</label>
              <input type="text" className="input" value={logForm.notes}
                onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Morning walk" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={saveLog}>
              {editingLog ? "Update Log" : "Save Log"}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowLogForm(false); setEditingLog(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Logs table */}
      <div className="card">
        <h3 style={{ color: "var(--text-primary)", marginBottom: 20 }}>📋 Daily Log</h3>
        {logs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No logs yet. Click "Log Today" to get started.</p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Steps</th>
                  <th>Steps KM</th>
                  <th>Steps Time</th>
                  <th>Run KM</th>
                  <th>Run Time</th>
                  <th>Target Steps</th>
                  <th>Achieved</th>
                  <th>Target Run</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const stepsAchieved = log.steps != null && log.targetSteps != null && log.steps >= log.targetSteps;
                  const runAchieved = log.runKm != null && log.targetRunKm != null && log.runKm >= log.targetRunKm;
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 13, color: "var(--text-primary)" }}>
                        {new Date(log.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </td>
                      <td style={{ color: "var(--primary)", fontWeight: 600 }}>
                        {log.steps?.toLocaleString() ?? "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {log.stepsKm != null ? log.stepsKm + " km" : "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{log.stepsTime ?? "—"}</td>
                      <td style={{ color: "var(--gold)", fontWeight: 600 }}>
                        {log.runKm != null ? log.runKm + " km" : "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{log.runTime ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {log.targetSteps?.toLocaleString() ?? "—"}
                      </td>
                      <td>
                        {log.steps != null && log.targetSteps != null ? (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                            background: stepsAchieved ? "rgba(138,159,74,0.15)" : "rgba(192,57,43,0.1)",
                            color: stepsAchieved ? "var(--success)" : "var(--danger)",
                          }}>
                            {stepsAchieved ? "✓ Done" : `${log.steps?.toLocaleString()} / ${log.targetSteps?.toLocaleString()}`}
                          </span>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {log.targetRunKm != null ? (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                            background: runAchieved ? "rgba(138,159,74,0.15)" : "rgba(192,57,43,0.1)",
                            color: runAchieved ? "var(--success)" : "var(--danger)",
                          }}>
                            {log.targetRunKm} km {runAchieved ? "✓" : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => startEditLog(log)}>✏️</button>
                          <button className="btn btn-danger" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => deleteLog(log.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepsPage;
