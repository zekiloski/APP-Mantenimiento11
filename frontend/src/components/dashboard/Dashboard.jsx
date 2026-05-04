import React, { useState, useEffect } from 'react';
import { API_URL, TYPE_COLORS, getTypeColor } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function Dashboard({ onModifyAlarm }) {
  const [data, setData] = useState({ totalMachines: 0, totalRecords: 0, totalOperators: 0, totalSpareParts: 0, chartData: [], alerts: [], stockAlerts: [], totalDowntime: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    setLoading(true);
    authFetch(`${API_URL}/dashboard/stats`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast('Error al cargar datos del tablero', 'error');
      });
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando tablero estadístico...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ marginBottom: '25px' }}>📊 Resumen de Planta</h1>

      {/* TARJETAS PRINCIPALES */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div className="card glass" style={{ textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Máquinas</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{data.totalMachines}</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Órdenes Totales</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>{data.totalRecords}</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', padding: '20px', borderBottom: '4px solid #f97316' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Horas de Paro</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#f97316' }}>{data.totalDowntime} hs</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', padding: '20px', borderBottom: '4px solid #22c55e' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Costo Laboral</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#22c55e' }}>${data.totalCost}</div>
        </div>
      </div>

      {/* GRÁFICO DE BARRAS CSS (INFALIBLE) */}
      <div className="card glass" style={{ marginBottom: '25px', padding: '25px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '25px', color: 'var(--text-muted)' }}>📈 Distribución por Tipo de Mantenimiento</h2>
        {data.chartData && data.chartData.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '200px', paddingBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {data.chartData.map(item => {
              const maxVal = Math.max(...data.chartData.map(x => x.value));
              const height = (item.value / maxVal) * 150;
              return (
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                  <div style={{ color: 'white', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>{item.value}</div>
                  <div style={{ 
                    width: '40px', 
                    height: `${height}px`, 
                    background: TYPE_COLORS[item.name] || 'var(--accent)', 
                    borderRadius: '6px 6px 0 0',
                    boxShadow: `0 0 15px ${TYPE_COLORS[item.name]}44`,
                    transition: 'height 0.5s ease'
                  }}></div>
                  <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', width: '80px' }}>{item.name}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Esperando datos de órdenes para generar gráficos...</div>
        )}
      </div>

      {/* ALERTAS DE MANTENIMIENTO */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="card glass" style={{ borderLeft: '5px solid var(--warning)', padding: '25px' }}>
          <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>🚨 Alertas Próximas</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.alerts.slice(0, 5).map(a => (
              <div key={a.id} className="glass" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block' }}>{a.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sector: {a.sector} • Fecha: {a.next_maintenance}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: a.daysUntil < 0 ? 'var(--danger)' : 'var(--warning)', marginBottom: '5px' }}>
                    {a.daysUntil < 0 ? `VENCIDO (${Math.abs(a.daysUntil)} d)` : `EN ${a.daysUntil} DÍAS`}
                  </div>
                  <button className="btn btn-primary" style={{ padding: '5px 15px', fontSize: '0.8rem' }} onClick={() => onModifyAlarm(a.id)}>Registrar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
