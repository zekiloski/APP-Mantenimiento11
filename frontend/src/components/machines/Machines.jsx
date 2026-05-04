import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { API_URL, ROOT_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function Machines({ onViewInfo }) {
  const [machines, setMachines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMachine, setEditMachine] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { load() }, []);
  const load = () => {
    authFetch(`${API_URL}/machines`).then(r => r.json()).then(setMachines);
    authFetch(`${API_URL}/sectors`).then(r => r.json()).then(setSectors);
  }

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData(e.target);
      let image_url = editMachine?.image_url;

      if (fd.get('image_file').size > 0) {
        const uploadData = new FormData();
        uploadData.append('files', fd.get('image_file'));
        const res = await authFetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
        if (!res.ok) throw new Error('Error al subir la imagen');
        const up = await res.json();
        image_url = up.urls[0];
      }

      const payload = {
        name: fd.get('name'),
        machine_type: fd.get('machine_type'),
        model: fd.get('model'),
        sector: fd.get('sector'),
        internal_id: fd.get('internal_id'),
        asset_code: fd.get('asset_code'),
        voltage: fd.get('voltage'),
        pressure: fd.get('pressure'),
        status: fd.get('status'),
        purchase_date: fd.get('purchase_date'),
        maint_period: fd.get('maint_period'),
        image_url: image_url,
        last_maintenance: editMachine?.last_maintenance || null
      };

      const url = editMachine ? `${API_URL}/machines/${editMachine.id}` : `${API_URL}/machines`;
      const method = editMachine ? 'PUT' : 'POST';

      const response = await authFetch(url, { method, body: JSON.stringify(payload) });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Error desconocido en el servidor');

      toast(editMachine ? '✅ Máquina actualizada' : '✅ Nueva máquina registrada', 'success');
      setShowModal(false);
      load();
    } catch (error) {
      console.error("DEBUG SAVE ERROR:", error);
      toast('Error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const removeMachine = async (machineId) => {
    if (!window.confirm("🚨 ¿ESTÁS SEGURO? Se eliminará la máquina y TODO su historial permanentemente.")) return;
    try {
      const response = await authFetch(`${API_URL}/machines/${machineId}`, { method: 'DELETE' });
      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Error al eliminar en el servidor');
      }
      toast('🗑️ Máquina eliminada con éxito', 'success');
      load();
    } catch (error) {
      console.error("Error en removeMachine:", error);
      toast('Error al eliminar: ' + error.message, 'error');
    }
  };

  const openNew = () => { setEditMachine(null); setShowModal(true); }
  const openEdit = (m) => { setEditMachine(m); setShowModal(true); }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h1>Parque de Máquinas</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nueva Máquina</button>
      </div>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input className="input-field" placeholder="🔍 Buscar por nombre, código..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, margin: 0, minWidth: '250px' }} />
        <select className="input-field" value={selectedSector} onChange={e => setSelectedSector(e.target.value)} style={{ flex: '0 0 200px', margin: 0 }}>
          <option value="">🏢 Todos los Sectores</option>
          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {machines.filter(m => {
          const matchSearch = !search || (m.name + ' ' + (m.internal_id || '') + ' ' + (m.machine_type || '')).toLowerCase().includes(search.toLowerCase());
          const matchSector = !selectedSector || m.sector === selectedSector;
          return matchSearch && matchSector;
        }).map(m => (
          <div key={m.id} className="card glass" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ height: '180px', backgroundColor: '#1e293b', position: 'relative' }}>
              {m.image_url ? <img src={`${ROOT_URL}${m.image_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.name} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>⚙️</div>}
              {m.internal_id && <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#eab308', color: 'black', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>🆔 {m.internal_id}</span>}
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{m.name}</h3>
                <span className={`badge ${m.status === 'Operativa' ? 'badge-success' : 'badge-danger'}`}>{m.status}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '10px' }}>{m.machine_type} • {m.model} • 🏢 {m.sector || 'Sin sector'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem' }}>
                <div><strong>Voltaje:</strong> {m.voltage || '-'}</div>
                <div><strong>Presión:</strong> {m.pressure || '-'}</div>
                <div><strong>Compra:</strong> {m.purchase_date || '-'}</div>
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: '6px', gridColumn: 'span 2', marginTop: '4px', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#60a5fa' }}>📅 Último Mant.:</strong> 
                  <span style={{ fontWeight: 'bold', color: 'white' }}>{m.last_maintenance || '-'}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }} className="print-hide">
                <button className="btn" onClick={() => onViewInfo(m)} style={{ background: 'var(--success)', color: 'white', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}>👁️ Ficha</button>
                <button className="btn" onClick={() => setShowQR(m)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>📱 QR</button>
                <button className="btn" onClick={() => openEdit(m)} style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}>📝 Editar</button>
                <button className="btn btn-danger" onClick={() => removeMachine(m.id)} style={{ background: '#ef4444', color: 'white', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}>🗑️ Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '750px', padding: 0, borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editMachine ? '⚙️ Modificar Máquina' : '🆕 Registrar Máquina'}</h2>
              <button className="btn btn-danger" style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0 }} onClick={() => setShowModal(false)}>X</button>
            </div>
            <form onSubmit={save} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Nombre Descriptivo</label>
                    <input name="name" defaultValue={editMachine?.name} className="input-field" placeholder="Ej: FRESA VERTICAL CNC" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Código de Activo (Inventario)</label>
                    <input name="asset_code" defaultValue={editMachine?.asset_code} className="input-field" placeholder="Ej: ACT-001" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Tipo de Equipo</label>
                    <select name="machine_type" defaultValue={editMachine?.machine_type} className="input-field" required>
                      <option value="Torno Paralelo">Torno Paralelo</option>
                      <option value="Torno CNC">Torno CNC</option>
                      <option value="Balancín">Balancín</option>
                      <option value="Perforadora">Perforadora</option>
                      <option value="Cortadora Laser">Cortadora Laser</option>
                      <option value="Inyectora">Inyectora</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Sector / Área</label>
                    <select name="sector" defaultValue={editMachine?.sector} className="input-field" required>
                      <option value="">-- Seleccionar Sector --</option>
                      {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>ID Interno (Nº Serie)</label>
                    <input name="internal_id" defaultValue={editMachine?.internal_id} className="input-field" placeholder="Ej: FV06" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Modelo / Marca</label>
                    <input name="model" defaultValue={editMachine?.model} className="input-field" placeholder="Ej: Siemens / 2024" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Frecuencia Manten. (días)</label>
                    <input type="number" name="maint_period" defaultValue={editMachine?.maint_period || 30} className="input-field" placeholder="Ej: 30" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Estado</label>
                    <select name="status" defaultValue={editMachine?.status || 'Operativa'} className="input-field">
                      <option value="Operativa">Operativa</option>
                      <option value="En Reparación">En Reparación</option>
                      <option value="Fuera de Servicio">Fuera de Servicio</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Voltaje</label>
                    <input name="voltage" defaultValue={editMachine?.voltage} className="input-field" placeholder="380V" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Presión</label>
                    <input name="pressure" defaultValue={editMachine?.pressure} className="input-field" placeholder="46 A / 6 Bar" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Fecha de Compra</label>
                    <input type="date" name="purchase_date" defaultValue={editMachine?.purchase_date} className="input-field" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Imagen</label>
                    <input type="file" name="image_file" accept="image/*" className="input-field" />
                  </div>
               </div>
               <div style={{ position: 'sticky', bottom: '-25px', background: 'var(--bg-dark)', padding: '15px 0', borderTop: '1px solid var(--border)' }}>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px' }} disabled={isSaving}>{isSaving ? 'Guardando...' : '💾 Guardar Máquina'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal-content glass" style={{ textAlign: 'center', width: '300px' }} onClick={e => e.stopPropagation()}>
            <h2>Código QR</h2>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '15px' }}>
              <QRCode value={showQR.id.toString()} size={200} />
            </div>
            <p>ID: {showQR.internal_id || showQR.id}</p>
            <button className="btn btn-danger" onClick={() => setShowQR(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
