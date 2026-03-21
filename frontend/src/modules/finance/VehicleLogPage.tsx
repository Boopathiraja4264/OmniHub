import React, { useEffect, useState, useMemo } from 'react';
import { vehicleApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { Vehicle, VehicleLog } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const VehicleLogPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [filterVehicle, setFilterVehicle] = useState<number | ''>('');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ name: '', type: 'BIKE', serviceIntervalKm: '3000' });
  const [logForm, setLogForm] = useState({ vehicleId: '', date: new Date().toISOString().split('T')[0], kmAtService: '', serviceType: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadAll = () => Promise.all([
    vehicleApi.getAll().then(r => setVehicles(Array.isArray(r.data) ? r.data : [])),
    vehicleApi.getLogs().then(r => setLogs(Array.isArray(r.data) ? r.data : [])),
  ]);

  useEffect(() => { loadAll(); }, []);

  const filteredLogs = useMemo(
    () => filterVehicle ? logs.filter(l => l.vehicleId === filterVehicle) : logs,
    [logs, filterVehicle]
  );

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vehicleApi.create({ ...vehicleForm, serviceIntervalKm: parseInt(vehicleForm.serviceIntervalKm) });
      setShowVehicleModal(false);
      setVehicleForm({ name: '', type: 'BIKE', serviceIntervalKm: '3000' });
      loadAll();
    } catch { } finally { setSaving(false); }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vehicleApi.addLog({
        vehicleId: parseInt(logForm.vehicleId),
        date: logForm.date,
        kmAtService: parseInt(logForm.kmAtService),
        serviceType: logForm.serviceType || undefined,
        cost: logForm.cost ? parseFloat(logForm.cost) : undefined,
        notes: logForm.notes || undefined,
      });
      setShowLogModal(false);
      setLogForm({ vehicleId: '', date: new Date().toISOString().split('T')[0], kmAtService: '', serviceType: '', cost: '', notes: '' });
      loadAll();
    } catch { } finally { setSaving(false); }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Delete this vehicle?')) return;
    await vehicleApi.delete(id);
    loadAll();
  };

  const handleDeleteLog = async (id: number) => {
    await vehicleApi.deleteLog(id);
    loadAll();
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Vehicle Log</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowVehicleModal(true)}>+ Add Vehicle</button>
          <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>+ Log Service</button>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          {vehicles.map(v => (
            <div key={v.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {v.type} · Service every {v.serviceIntervalKm?.toLocaleString()} km
                </div>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteVehicle(v.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filter:</span>
        <FilterDropdown
          value={filterVehicle}
          options={[{ label: 'All Vehicles', value: '' }, ...vehicles.map(v => ({ label: v.name, value: v.id }))]}
          onChange={v => setFilterVehicle(v === '' ? '' : v as number)}
          minWidth={150}
          placeholder="All Vehicles"
        />
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>{filteredLogs.length} records</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>No service logs yet.</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Date</th>
                  <th>Vehicle</th>
                  <th style={{ textAlign: 'right' }}>KM at Service</th>
                  <th style={{ textAlign: 'right' }}>Next Service</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th>Notes</th>
                  <th style={{ paddingRight: 16 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ paddingLeft: 20 }}>{new Date(l.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{l.vehicleName}</td>
                    <td style={{ textAlign: 'right' }}>{l.kmAtService?.toLocaleString()} km</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent)' }}>{l.nextServiceKm?.toLocaleString()} km</td>
                    <td>{l.serviceType || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{l.cost ? formatCurrency(l.cost) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{l.notes || '—'}</td>
                    <td style={{ paddingRight: 16 }}>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteLog(l.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVehicleModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVehicleModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Vehicle</h3>
              <button className="close-btn" onClick={() => setShowVehicleModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddVehicle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label>Vehicle Name</label>
                  <input value={vehicleForm.name} onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })} required placeholder="e.g. Honda Activa" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Type</label>
                    <FilterDropdown
                      value={vehicleForm.type}
                      options={[{ label: 'Bike', value: 'BIKE' }, { label: 'Car', value: 'CAR' }, { label: 'Scooter', value: 'SCOOTER' }]}
                      onChange={v => setVehicleForm({ ...vehicleForm, type: v as string })}
                      fullWidth
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Interval (km)</label>
                    <input type="number" value={vehicleForm.serviceIntervalKm} onChange={e => setVehicleForm({ ...vehicleForm, serviceIntervalKm: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVehicleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLogModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Log Service / KM</h3>
              <button className="close-btn" onClick={() => setShowLogModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddLog}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label>Vehicle</label>
                  <FilterDropdown
                    value={logForm.vehicleId}
                    options={vehicles.map(v => ({ label: v.name, value: String(v.id) }))}
                    onChange={v => setLogForm({ ...logForm, vehicleId: String(v) })}
                    placeholder="Select vehicle..."
                    fullWidth
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>KM Reading</label>
                    <input type="number" value={logForm.kmAtService} onChange={e => setLogForm({ ...logForm, kmAtService: e.target.value })} required placeholder="e.g. 12500" />
                  </div>
                  <div className="form-group">
                    <label>Service Type</label>
                    <input value={logForm.serviceType} onChange={e => setLogForm({ ...logForm, serviceType: e.target.value })} placeholder="e.g. Oil Change" />
                  </div>
                  <div className="form-group">
                    <label>Cost (₹)</label>
                    <input type="number" step="0.01" value={logForm.cost} onChange={e => setLogForm({ ...logForm, cost: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleLogPage;
