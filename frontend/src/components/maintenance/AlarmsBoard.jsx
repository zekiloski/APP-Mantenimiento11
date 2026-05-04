import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';

const URGENCY_CONFIG = {
  'CRÍTICO':      { color: '#7f1d1d', bg: 'rgba(127,29,29,0.2)',  border: '#ef4444', icon: '🔴', label: 'CRÍTICO (Muy atrasado)' },
  'VENCIDO':      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', icon: '🔴', label: 'VENCIDO' },
  'HOY':          { color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: '#f97316', icon: '🟠', label: 'VENCE HOY' },
  'URGENTE':      { color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: '#eab308', icon: '🟡', label: 'URGENTE (1-3 días)' },
  'ESTA SEMANA':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', icon: '🔵', label: 'ESTA SEMANA (4-7 días)' },
  'PRÓXIMO MES':  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: '#22c55e', icon: '🟢', label: 'PRÓXIMO MES (8-30 días)' },
};

const URGENCY_ORDER = ['CRÍTICO', 'VENCIDO', 'HOY', 'URGENTE', 'ESTA SEMANA', 'PRÓXIMO MES'];

export function AlarmsBoard({ onModifyAlarm }) {
  const [alarms, setAlarms] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('');

  useEffect(() => {
    authFetch(`${API_URL}/dashboard/stats`)
      .then(r => r.json())
      .then(data => {
        if (data.alerts) {
          const sorted = [...data.alerts].sort((a, b) => a.daysUntil - b.daysUntil);
          setAlarms(sorted);
        }
        if (data.stockAlerts) {
          setStockAlerts(data.stockAlerts);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredAlarms = selectedSector ? alarms.filter(a => a.sector === selectedSector) : alarms;

  const grouped = URGENCY_ORDER.reduce((acc, key) => {
    acc[key] = filteredAlarms.filter(a => a.urgency === key);
    return acc;
  }, {});

  const availableSectors = Array.from(new Set(alarms.map(a => a.sector).filter(Boolean)));

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>🔔 Tablero de Alarmas</h1>
        {availableSectors.length > 0 && (
          <select 
            className="input-field" 
            style={{ width: 'auto', marginBottom: 0 }}
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
          >
            <option value="">Todos los sectores</option>
            {availableSectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        )}
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '25px' }}>
        {URGENCY_ORDER.map(key => {
          const cfg = URGENCY_CONFIG[key];
          const count = grouped[key]?.length || 0;
          if (!count) return null;
          return (
            <div key={key} className="glass" style={{
              padding: '16px',
              borderLeft: `4px solid ${cfg.border}`,
              borderRadius: '10px',
              background: cfg.bg,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem' }}>{cfg.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: cfg.color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Cargando alarmas...</p>}

      {/* SECCIÓN DE REPUESTOS CRÍTICOS */}
      {!loading && alarms.length === 0 && (!stockAlerts || stockAlerts.length === 0) && (
        <div className="card glass" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h2 style={{ color: '#22c55e', marginTop: '10px' }}>Todo en orden</h2>
          <p style={{ color: 'var(--text-muted)' }}>No hay máquinas con mantenimiento próximo ni repuestos en nivel crítico.</p>
        </div>
      )}

      {stockAlerts && stockAlerts.length > 0 && (
        <div style={{ marginBottom: '40px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '15px', padding: '20px', background: 'rgba(239,68,68,0.05)' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚠️ Alertas de Repuestos (Stock Mínimo Superado)
          </h3>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {stockAlerts.map(sp => (
              <div key={sp.id} className="glass" style={{ padding: '15px', borderRadius: '10px', borderLeft: '5px solid #ef4444' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{sp.name}</div>
                <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>{sp.stock} {sp.unit || 'uds'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo requerido: {sp.min_stock}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {URGENCY_ORDER.map(key => {
        const items = grouped[key];
        if (!items || items.length === 0) return null;
        const cfg = URGENCY_CONFIG[key];
        return (
          <div key={key} style={{ marginBottom: '25px' }}>
            <h3 style={{ color: cfg.color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cfg.icon} {cfg.label}
              <span style={{ background: cfg.color, color: 'white', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem' }}>
                {items.length}
              </span>
            </h3>
            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {items.map(a => (
                <div key={a.id} className="glass" style={{
                  padding: '18px',
                  borderLeft: `5px solid ${cfg.border}`,
                  borderRadius: '10px',
                  background: cfg.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{a.name}</h3>
                      {a.machine_type && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.machine_type}</span>}
                    </div>
                    <span style={{ background: cfg.color, color: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{cfg.icon} {key}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>📅 Mantenimiento previsto: <strong style={{ color: 'white' }}>{a.next_maintenance}</strong></div>
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: cfg.color }}>
                    {a.daysUntil < 0 ? `⏰ ${Math.abs(a.daysUntil)} días de atraso` : a.daysUntil === 0 ? '⚠️ ¡Vence hoy!' : `⏳ ${a.daysUntil} día${a.daysUntil !== 1 ? 's' : ''} restante${a.daysUntil !== 1 ? 's' : ''}`}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '5px' }} onClick={() => onModifyAlarm(a.id)}>⚙️ Registrar Manten.</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
