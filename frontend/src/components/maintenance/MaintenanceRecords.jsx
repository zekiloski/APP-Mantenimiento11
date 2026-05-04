import React, { useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_URL, TYPE_COLORS } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function MaintenanceRecords({ user, preselectedMachine, setScannedMachineId, settings }) {
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [localMachineId, setLocalMachineId] = useState(null);

  // Auto-abrir modal si hay una máquina preseleccionada (desde el Plan o QR)
  useEffect(() => {
    if (preselectedMachine) {
      setLocalMachineId(preselectedMachine);
      setShowModal(true);
    }
  }, [preselectedMachine]);

  const [activeOrderTab, setActiveOrderTab] = useState('cerradas');
  const [formType, setFormType] = useState('Preventivo');
  const [selectedParts, setSelectedParts] = useState([]);
  const [sigPad, setSigPad] = useState(null);
  const [checklistResults, setChecklistResults] = useState({});

  let parsedC = {};
  try { 
    if (settings?.checklists) {
      parsedC = typeof settings.checklists === 'string' ? JSON.parse(settings.checklists) : settings.checklists;
    }
  } catch(e){
    console.error("Error parsing checklists", e);
  }
  const activeChecklist = Array.isArray(parsedC[formType]) ? parsedC[formType] : [];

  useEffect(() => { setChecklistResults({}); }, [formType]);

  useEffect(() => {
    load();
    
    // Carga con persistencia local para modo offline
    const cachedM = localStorage.getItem('cache_machines');
    const cachedO = localStorage.getItem('cache_operators');
    const cachedP = localStorage.getItem('cache_parts');
    
    if (cachedM) setMachines(JSON.parse(cachedM));
    if (cachedO) setOperators(JSON.parse(cachedO));
    if (cachedP) setSpareParts(JSON.parse(cachedP));

    authFetch(`${API_URL}/machines`).then(r => r.json()).then(data => {
      setMachines(data);
      localStorage.setItem('cache_machines', JSON.stringify(data));
    });
    authFetch(`${API_URL}/operators`).then(r => r.json()).then(data => {
      setOperators(data);
      localStorage.setItem('cache_operators', JSON.stringify(data));
    });
    authFetch(`${API_URL}/spare_parts`).then(r => r.json()).then(data => {
      setSpareParts(data);
      localStorage.setItem('cache_parts', JSON.stringify(data));
    });
  }, []);

  useEffect(() => {
    if (preselectedMachine) {
      setLocalMachineId(preselectedMachine);
      setActiveOrderTab('pendientes');
      setFormType('Preventivo');
      setSelectedParts([]);
      setShowModal(true);
    }
  }, [preselectedMachine]);

  const load = () => authFetch(`${API_URL}/maintenance`).then(r => r.json()).then(setRecords);

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    let evidence_urls = [];
    if (fd.getAll('evidence_files') && fd.getAll('evidence_files')[0].size > 0) {
      const uploadData = new FormData();
      fd.getAll('evidence_files').forEach(file => uploadData.append('files', file));
      const res = await authFetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
      const up = await res.json();
      evidence_urls = up.urls;
    }

    let signature_url = null;
    if (sigPad && !sigPad.isEmpty()) {
      signature_url = sigPad.getTrimmedCanvas().toDataURL('image/png');
    }

    const payload = {
      ...data,
      machine_id: localMachineId,
      operator_id: data.operator_id,
      spare_parts_used_list: selectedParts,
      evidence_urls,
      signature_url,
      checklist_results: Object.keys(checklistResults).map(k => ({ task: k, result: checklistResults[k] }))
    };

    try {
      await authFetch(`${API_URL}/maintenance`, { method: 'POST', body: JSON.stringify(payload) });
      toast('✅ Orden de mantenimiento guardada y sincronizada');
    } catch (e) {
      console.warn("Sin conexión. Guardando en cola offline...");
      const queue = JSON.parse(localStorage.getItem('offlineMaintQueue') || '[]');
      queue.push(payload);
      localStorage.setItem('offlineMaintQueue', JSON.stringify(queue));
      toast('⚠️ Sin conexión: Registro guardado en el celular para sincronización futura', 'info');
    }

    setShowModal(false);
    setScannedMachineId(null);
    load();
  };

  const addPart = (id) => {
    const part = spareParts.find(p => p.id === parseInt(id));
    if (part && !selectedParts.find(p => p.id === part.id)) {
      setSelectedParts([...selectedParts, { ...part, quantity: 1 }]);
    }
  };

  const updatePartQty = (id, qty) => {
    setSelectedParts(selectedParts.map(p => p.id === id ? { ...p, quantity: parseInt(qty) } : p));
  };

  const generatePDF = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Orden de Mantenimiento", 14, 22);
    doc.setFontSize(10);
    doc.text(`Fecha: ${record.date} | ID: ${record.id}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Detalle']],
      body: [
        ['Máquina', record.machine_name || record.machine_id],
        ['Tipo', record.type],
        ['Operario', record.operator_name || record.operator_id],
        ['Detalles', record.failure_details],
        ['Inicio', record.start_date],
        ['Fin', record.end_date],
        ['Tiempo Paro', `${record.downtime_hours || 0} hs`],
        ['Costo Laboral', `$${record.labor_cost || 0}`]
      ]
    });

    doc.save(`Mantenimiento_${record.id}.pdf`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>Órdenes de Mantenimiento</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={`btn ${activeOrderTab === 'cerradas' ? 'btn-primary' : ''}`} onClick={() => setActiveOrderTab('cerradas')}>Historial Cerradas</button>
        <button className={`btn ${activeOrderTab === 'pendientes' ? 'btn-primary' : ''}`} onClick={() => setActiveOrderTab('pendientes')}>+ Nueva Orden</button>
      </div>

      {activeOrderTab === 'cerradas' && (
        <div className="glass" style={{ padding: '20px' }}>
          <table>
            <thead><tr><th>Fecha</th><th>Máquina</th><th>Tipo</th><th>Operario</th><th>Acciones</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.machine_name}</td>
                  <td><span className="badge" style={{ background: TYPE_COLORS[r.type] || '#ccc', color: 'white' }}>{r.type}</span></td>
                  <td>{r.operator_name}</td>
                  <td><button className="btn" style={{ background: 'var(--accent)', color: 'white', padding: '5px' }} onClick={() => generatePDF(r)}>PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeOrderTab === 'pendientes' && !showModal && (
        <div className="card glass" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Nueva Orden de Mantenimiento</h3>
          <p>Seleccione una máquina de la lista o escanee su código QR para comenzar.</p>
          <select className="input-field" style={{ maxWidth: '400px', margin: '20px auto' }} onChange={(e) => { setLocalMachineId(e.target.value); setShowModal(true); }}>
            <option value="">-- Seleccionar Máquina --</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.internal_id || m.id})</option>)}
          </select>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '20px' }}>Registrar Mantenimiento: {machines.find(m => m.id == localMachineId)?.name}</h2>
            <form onSubmit={save} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Tipo de Intervención</label>
                    <select name="type" className="input-field" value={formType} onChange={e => setFormType(e.target.value)}>
                      {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Operario Responsable</label>
                    <select name="operator_id" className="input-field" required>
                      <option value="">-- Seleccionar Operario --</option>
                      {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Detalles / Hallazgos</label>
                    <textarea name="failure_details" className="input-field" rows="3" required placeholder="Describa el trabajo realizado..."></textarea>
                  </div>
                  
                  {activeChecklist.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem' }}>✅ Protocolo de Inspección</h4>
                      {activeChecklist.map(task => (
                        <div key={task} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.9rem' }}>{task}</span>
                          <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ cursor: 'pointer', fontSize: '0.9rem' }}><input type="radio" name={`check-${task}`} required onChange={() => setChecklistResults({ ...checklistResults, [task]: 'OK' })} /> OK</label>
                            <label style={{ cursor: 'pointer', fontSize: '0.9rem' }}><input type="radio" name={`check-${task}`} required onChange={() => setChecklistResults({ ...checklistResults, [task]: 'NO OK' })} /> NO OK</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Fecha Inicio</label>
                    <input type="date" name="start_date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Fecha Fin</label>
                    <input type="date" name="end_date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Horas de Paro</label>
                    <input type="number" step="0.5" name="downtime_hours" className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Costo Laboral ($)</label>
                    <input type="number" name="labor_cost" className="input-field" placeholder="0" />
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Repuestos Utilizados</label>
                    <select className="input-field" onChange={e => addPart(e.target.value)}>
                      <option value="">+ Agregar Repuesto del Almacén</option>
                      {spareParts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                    </select>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                      {selectedParts.map(p => (
                        <div key={p.id} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '8px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '600' }}>{p.name}</span>
                          <input type="number" value={p.quantity} style={{ width: '50px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', textAlign: 'center' }} onChange={e => updatePartQty(p.id, e.target.value)} />
                          <button type="button" style={{ color: '#ef4444', border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setSelectedParts(selectedParts.filter(x => x.id !== p.id))}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Fotos de Evidencia</label>
                    <input type="file" name="evidence_files" multiple accept="image/*" className="input-field" />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Firma del Responsable</label>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '10px' }}>
                      <SignatureCanvas ref={(ref) => setSigPad(ref)} canvasProps={{ width: 500, height: 180, className: 'signature-canvas' }} />
                    </div>
                    <button type="button" className="btn" style={{ marginTop: '10px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => sigPad?.clear()}>🧹 Limpiar Firma</button>
                  </div>
               </div>
               <div style={{ position: 'sticky', bottom: '-25px', background: 'var(--bg-dark)', padding: '20px 0', borderTop: '1px solid var(--border)', display: 'flex', gap: '15px', marginTop: '10px' }}>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '15px', fontSize: '1.1rem', fontWeight: 'bold' }}>✅ Finalizar y Guardar</button>
                 <button type="button" className="btn btn-danger" style={{ padding: '0 25px' }} onClick={() => { setShowModal(false); setScannedMachineId(null); }}>Cancelar</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
