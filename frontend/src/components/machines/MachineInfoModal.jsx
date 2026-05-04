import React from 'react';
import { ROOT_URL, getTypeColor } from '../../utils/constants';

export function MachineInfoModal({ machine, settings, onClose, onStartMaintenance }) {
  if (!machine) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ width: '500px', padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {settings.logo_url && <img src={`${ROOT_URL}${settings.logo_url}`} alt="Company Logo" style={{ maxHeight: '40px' }} />}
          <button className="btn btn-danger" style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0 }} onClick={onClose}>X</button>
        </div>

        <div style={{ padding: '25px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <img 
              src={machine.image_url ? (machine.image_url.startsWith('http') ? machine.image_url : `${ROOT_URL}${machine.image_url}`) : 'https://placehold.co/200x200?text=Sin+Imagen'} 
              alt={machine.name} 
              style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '16px', border: '2px solid var(--accent)' }}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{machine.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Cód. Activo: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{machine.asset_code || 'N/A'}</span></p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>ID Interno: <span style={{ color: '#eab308', fontWeight: 'bold' }}>{machine.internal_id || 'N/A'}</span></p>
              <div className={`badge ${machine.status === 'Operativa' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem' }}>
                {machine.status}
              </div>
            </div>
          </div>

          {machine.history && machine.history.length > 0 && (
            <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>📋 Últimas Intervenciones</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {machine.history.map(h => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span><span style={{ color: getTypeColor(h.type) }}>●</span> {h.date}</span>
                    <span style={{ fontWeight: '600' }}>{h.type}</span>
                    <span style={{ color: 'var(--text-muted)' }}>👷 {h.operator_name || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Modelo</label>
              <span style={{ fontWeight: 'bold' }}>{machine.model || '-'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tipo</label>
              <span style={{ fontWeight: 'bold' }}>{machine.machine_type || '-'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Voltaje</label>
              <span style={{ fontWeight: 'bold' }}>{machine.voltage || '-'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Presión</label>
              <span style={{ fontWeight: 'bold' }}>{machine.pressure || '-'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Sector</label>
              <span style={{ fontWeight: 'bold' }}>{machine.sector || '-'}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Compra</label>
              <span style={{ fontWeight: 'bold' }}>{machine.purchase_date || '-'}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--accent)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Próximo Mantenimiento Sugerido:</p>
            <h3 style={{ margin: '5px 0 0 0', color: 'var(--accent)' }}>{machine.last_maintenance || 'No registrado'}</h3>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" style={{ flex: 2, padding: '15px', fontWeight: 'bold' }} onClick={() => onStartMaintenance(machine.id)}>
              📝 Registrar Mantenimiento
            </button>
            <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
