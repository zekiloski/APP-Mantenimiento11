import React from 'react';
import { ROOT_URL } from '../../utils/constants';

export function Sidebar({ user, onLogout, activeTab, setActiveTab, settings, isMenuOpen }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Resumen General' },
    { id: 'alarms', label: '🔔 Alarmas (Pendientes)' },
    { id: 'maintenance', label: '📝 Órdenes Manten.' },
    { id: 'maint_plan', label: '📅 Plan Programado' },
    { id: 'reports', label: '📊 Informes / Reportes' },
    { id: 'parts_history', label: '🛠️ Historial Repuestos' },
  ];
  
  if (user?.role === 'Administrador') {
    tabs.splice(2, 0, { id: 'machines', label: '⚙️ Parque Máquinas' });
    tabs.splice(3, 0, { id: 'sectors', label: '🏢 Sectores' });
    tabs.push({ id: 'operators', label: '👷 Plantilla Operarios' });
    tabs.push({ id: 'spare_parts', label: '📦 Stock Repuestos' });
    tabs.push({ id: 'settings', label: '🎨 Ajustes del Sistema' });
  }

  return (
    <div className={`sidebar glass ${isMenuOpen ? 'open' : ''}`} style={{ borderRadius: 0 }}>
      <div className="sidebar-header">
        {settings.logo_url && <img src={`${ROOT_URL}${settings.logo_url}`} alt="Logo" style={{ maxHeight: '50px', marginBottom: '10px' }} />}
        <h2 style={{ color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '5px' }}>{settings.company_name}</h2>
        <span className="badge badge-warning">{user.role}</span>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '5px' }}>{user.username}</p>
      </div>

      {tabs.map(tab => (
        <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
          {tab.label}
        </div>
      ))}
      <div style={{ flex: 1 }}></div>
      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto' }}>
        <button className="btn btn-danger" onClick={onLogout} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
          <span>🚪</span> Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
