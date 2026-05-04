import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';

export function PartsHistory() {
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const mRes = await authFetch(`${API_URL}/machines`);
      const rRes = await authFetch(`${API_URL}/maintenance`);
      setMachines(await mRes.json());
      setRecords(await rRes.json());
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar registros que tienen repuestos
  const recordsWithParts = records.filter(r => {
    const hasParts = r.spare_parts_used && JSON.parse(r.spare_parts_used).length > 0;
    const matchMachine = !selectedMachine || r.machine_id == selectedMachine;
    return hasParts && matchMachine;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>🛠️ Historial de Consumo de Repuestos</h1>
      <p style={{ color: 'var(--text-muted)' }}>Consulte qué piezas se han utilizado en cada equipo.</p>

      <div className="card glass" style={{ marginBottom: '25px', padding: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>Filtrar por Máquina:</label>
        <select 
          className="input-field" 
          style={{ maxWidth: '400px', margin: 0 }}
          value={selectedMachine}
          onChange={e => setSelectedMachine(e.target.value)}
        >
          <option value="">-- Ver todos los consumos --</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.internal_id})</option>)}
        </select>
      </div>

      <div className="glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando historial...</div>
        ) : recordsWithParts.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📦</div>
            <h3 style={{ color: 'var(--text-muted)' }}>
              {selectedMachine 
                ? 'Esta máquina no tiene repuestos utilizados registrados.' 
                : 'No hay registros de consumo de repuestos todavía.'}
            </h3>
          </div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th>FECHA</th>
                <th>MÁQUINA</th>
                <th>REPUESTOS UTILIZADOS</th>
                <th>OPERARIO</th>
                <th>TIPO</th>
              </tr>
            </thead>
            <tbody>
              {recordsWithParts.map(r => {
                const parts = JSON.parse(r.spare_parts_used);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td>{r.date}</td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{r.machine_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.machine_type}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {parts.map(p => (
                          <span key={p.id} className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)' }}>
                            {p.name} x{p.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{r.operator_name}</td>
                    <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{r.type}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
