import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function Reports({ settings }) {
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');

  useEffect(() => {
    authFetch(`${API_URL}/machines`).then(r => r.json()).then(setMachines);
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/maintenance`);
      const allRecords = await res.json();
      
      // Filtrar localmente
      const filtered = allRecords.filter(r => {
        const matchMachine = !selectedMachine || r.machine_id == selectedMachine;
        const matchStart = !dateStart || r.date >= dateStart;
        const matchEnd = !dateEnd || r.date <= dateEnd;
        return matchMachine && matchStart && matchEnd;
      });

      if (filtered.length === 0) {
        toast('No hay registros para los filtros seleccionados', 'warning');
        return;
      }

      // Generar PDF
      const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje para que quepa más info
      
      // Cabecera
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("INFORME DE GESTIÓN DE MANTENIMIENTO", 15, 20);
      
      doc.setFontSize(10);
      doc.text(`Empresa: ${settings.company_name} | Generado el: ${new Date().toLocaleDateString()}`, 15, 26);

      // Resumen de filtros aplicados
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Filtros: ${dateStart || 'Inicio'} hasta ${dateEnd || 'Fin'} | Máquina: ${selectedMachine ? machines.find(m => m.id == selectedMachine)?.name : 'Todas'}`, 15, 40);

      // Tabla de datos
      const tableData = filtered.map(r => {
        let partsStr = '-';
        try {
          const parts = JSON.parse(r.spare_parts_used || '[]');
          if (parts.length > 0) {
            partsStr = parts.map(p => `${p.name} (x${p.quantity})`).join(', ');
          }
        } catch(e) {}

        return [
          r.date,
          r.machine_name,
          r.type,
          r.operator_name,
          r.failure_details.substring(0, 40) + (r.failure_details.length > 40 ? '...' : ''),
          partsStr,
          `$${r.labor_cost || 0}`,
          `${r.downtime_hours || 0} hs`
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Fecha', 'Máquina', 'Tipo', 'Operario', 'Detalles', 'Repuestos', 'Costo', 'Paro']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 8, cellPadding: 2 }, // Reducimos un poco la fuente para que quepa la nueva columna
        columnStyles: {
          5: { cellWidth: 40 } // Damos más espacio a la columna de repuestos
        }
      });

      // Totales
      const totalCost = filtered.reduce((acc, curr) => acc + (curr.labor_cost || 0), 0);
      const totalDowntime = filtered.reduce((acc, curr) => acc + (curr.downtime_hours || 0), 0);
      
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.text(`TOTALES DEL PERIODO:`, 15, finalY);
      doc.text(`Costo Acumulado: $${totalCost.toLocaleString()}`, 15, finalY + 7);
      doc.text(`Horas de Paro Totales: ${totalDowntime} hs`, 15, finalY + 14);

      doc.save(`Informe_Mantenimiento_${new Date().getTime()}.pdf`);
      toast('Informe PDF generado con éxito', 'success');
      
    } catch (e) {
      toast('Error al generar informe', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>📑 Informes y Reportes</h1>
      <p style={{ color: 'var(--text-muted)' }}>Filtra y exporta el historial de mantenimiento en formato profesional.</p>

      <div className="card glass" style={{ marginTop: '25px', padding: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Desde la fecha:</label>
            <input type="date" className="input-field" value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Hasta la fecha:</label>
            <input type="date" className="input-field" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Filtrar por Máquina:</label>
            <select className="input-field" value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)}>
              <option value="">-- Todas las Máquinas --</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.internal_id})</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '15px', fontSize: '1.1rem' }} 
            onClick={generateReport}
            disabled={loading}
          >
            {loading ? 'Procesando...' : '📄 Generar Informe PDF'}
          </button>
          <button 
            className="btn" 
            style={{ background: 'rgba(255,255,255,0.05)', padding: '0 25px' }}
            onClick={() => { setDateStart(''); setDateEnd(''); setSelectedMachine(''); }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '15px', textAlign: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>ℹ️ Información del Reporte</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '10px auto' }}>
          El informe incluirá todos los registros de mantenimiento (Preventivos, Correctivos, etc.) que coincidan con los filtros, calculando automáticamente los costos de mano de obra y horas de inactividad.
        </p>
      </div>
    </div>
  );
}
