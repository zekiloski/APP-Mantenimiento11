import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { API_URL, ROOT_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function MaintenancePlan({ settings, onRegisterMaintenance }) {
  const [machines, setMachines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [filterSector, setFilterSector] = useState('');
  // Filtro por defecto: Próximos 7 días
  const [filterDate, setFilterDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [showAll, setShowAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const mRes = await authFetch(`${API_URL}/machines`);
      const sRes = await authFetch(`${API_URL}/sectors`);
      setMachines(await mRes.json());
      setSectors(await sRes.json());
    } catch(e) {
      toast('Error al cargar datos del plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const scheduled = machines.filter(m => {
    const matchSector = !filterSector || m.sector === filterSector;
    const isDue = m.next_maintenance && (showAll || !filterDate || m.next_maintenance <= filterDate);
    return matchSector && isDue && m.next_maintenance;
  }).sort((a, b) => new Date(a.next_maintenance) - new Date(b.next_maintenance));

  const unscheduled = machines.filter(m => !m.next_maintenance && (!filterSector || m.sector === filterSector));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === scheduled.length && scheduled.length > 0) setSelectedIds([]);
    else setSelectedIds(scheduled.map(m => m.id));
  };

  const exportToExcel = () => {
    if (selectedIds.length === 0) {
      toast('Seleccione al menos una máquina', 'warning');
      return;
    }
    const data = scheduled.filter(m => selectedIds.includes(m.id)).map(m => ({
      'FECHA': m.next_maintenance,
      'MÁQUINA': m.name,
      'ID': m.internal_id || '',
      'ACTIVO': m.asset_code || '',
      'SECTOR': m.sector || '',
      'FRECUENCIA': `${m.maint_period} días`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan");
    XLSX.writeFile(wb, `Plan_Mantenimiento.xlsx`);
    toast('Excel descargado', 'success');
  };

  const quickSchedule = async (machine) => {
    const period = machine.maint_period || 30;
    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + parseInt(period));
    const nextDate = nextDateObj.toISOString().split('T')[0];
    try {
      const res = await authFetch(`${API_URL}/machines/${machine.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...machine, next_maintenance: nextDate })
      });
      if (res.ok) {
        toast('✅ Programado', 'success');
        load();
      }
    } catch(e) { toast('Error', 'error'); }
  };

  const printWorkOrder = (machine) => {
    const doc = new jsPDF();
    doc.setFillColor(40, 44, 52);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ORDEN DE TRABAJO", 15, 20);
    doc.setFontSize(10);
    doc.text(settings.company_name, 15, 30);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 50,
      head: [['Campo', 'Dato']],
      body: [
        ['Equipo', machine.name],
        ['Código Activo', machine.asset_code || '-'],
        ['ID/Serie', machine.internal_id || '-'],
        ['Sector', machine.sector || '-'],
        ['Fecha Prevista', machine.next_maintenance]
      ]
    });
    let checklists = {};
    try { checklists = JSON.parse(settings.checklists || '{}'); } catch(e){}
    const tasks = checklists['Preventivo'] || ['Inspección general'];
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Protocolo de Tareas', 'Estado']],
      body: tasks.map(t => [t, '[ ] OK [ ] NO OK'])
    });
    doc.save(`OT_${machine.id}.pdf`);
  };

  if (loading) return <div style={{ padding: '40px' }}>Cargando...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>📅 Plan de Mantenimiento</h1>
        {selectedIds.length > 0 && (
          <button className="btn" onClick={exportToExcel} style={{ background: '#16a34a', color: 'white' }}>
            📊 Exportar {selectedIds.length} a Excel
          </button>
        )}
      </div>

      <div className="card glass" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <select className="input-field" value={filterSector} onChange={e => setFilterSector(e.target.value)}>
          <option value="">Todos los Sectores</option>
          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <input type="date" className="input-field" value={filterDate} onChange={e => { setFilterDate(e.target.value); setShowAll(false); }} />
        <button className="btn" onClick={() => setShowAll(!showAll)} style={{ background: showAll ? 'var(--accent)' : 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
          {showAll ? '👁️ Viendo Todo' : '📅 Ver Solo Pendientes'}
        </button>
      </div>

      <div className="glass" style={{ borderRadius: '15px', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedIds.length === scheduled.length && scheduled.length > 0} onChange={toggleAll} /></th>
              <th>Fecha</th>
              <th>Equipo</th>
              <th>Sector</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {scheduled.map(m => (
              <tr key={m.id} style={{ background: selectedIds.includes(m.id) ? 'rgba(59,130,246,0.1)' : '' }}>
                <td><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{m.next_maintenance}</td>
                <td>{m.name}</td>
                <td>{m.sector}</td>
                <td style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn btn-primary" onClick={() => printWorkOrder(m)} style={{ padding: '8px 12px' }}>🖨️ OT</button>
                  <button className="btn" onClick={() => onRegisterMaintenance(m.id)} style={{ background: '#22c55e', color: 'white', padding: '8px 12px' }}>✅ Registrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unscheduled.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>⚠️ Sin Programar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {unscheduled.map(m => (
              <div key={m.id} className="glass" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{m.name}</span>
                <button className="btn" onClick={() => quickSchedule(m)}>⚡ Programar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
