import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './index.css';

// Configuración de URLs simplificada para máxima compatibilidad
const API_URL = '/api';
const ROOT_URL = ''; 
const TYPE_COLORS = {
  'Preventivo': '#10b981',
  'Correctivo': '#ef4444',
  'Predictivo': '#3b82f6'
};
// ── Toast Notification System ────────────────────────────────────────────────
let _addToast = null;
function toast(message, type = 'success') {
  if (_addToast) _addToast(message, type);
  else console.log('[Toast]', type, message);
}
const TOAST_COLORS = {
  success: 'linear-gradient(135deg,rgba(16,185,129,0.97),rgba(5,150,105,0.97))',
  error:   'linear-gradient(135deg,rgba(239,68,68,0.97),rgba(185,28,28,0.97))',
  warning: 'linear-gradient(135deg,rgba(245,158,11,0.97),rgba(217,119,6,0.97))',
  info:    'linear-gradient(135deg,rgba(59,130,246,0.97),rgba(37,99,235,0.97))',
};
const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    _addToast = (message, type = 'success') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { _addToast = null; };
  }, []);
  return (
    <div style={{ position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', zIndex:99999, display:'flex', flexDirection:'column', gap:'10px', alignItems:'center', pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: TOAST_COLORS[t.type] || TOAST_COLORS.success, color:'white', padding:'14px 28px', borderRadius:'14px', boxShadow:'0 12px 40px rgba(0,0,0,0.4)', animation:'fadeIn 0.3s ease', maxWidth:'460px', textAlign:'center', fontSize:'0.95rem', fontWeight:'600', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.2)', letterSpacing:'0.01em' }}>
          {TOAST_ICONS[t.type] || '✅'} {t.message}
        </div>
      ))}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Machine Info Modal (Ficha Técnica) ────────────────────────────────────────
function MachineInfoModal({ machine, settings, onClose, onStartMaintenance }) {
  if (!machine) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ width: '500px', padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        {/* Header con Logo */}
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

          {/* Historial rápido */}
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
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState({ company_name: 'MantenimientoApp', primary_color: '#3b82f6', logo_url: '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [scannedMachineId, setScannedMachineId] = useState(null);
  const [scannedMachineData, setScannedMachineData] = useState(null);
  const [showMachineInfo, setShowMachineInfo] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        document.documentElement.style.setProperty('--accent', data.primary_color);
        document.documentElement.style.setProperty('--accent-hover', data.primary_color + 'cc');
        const r = parseInt(data.primary_color.slice(1,3), 16);
        const g = parseInt(data.primary_color.slice(3,5), 16);
        const b = parseInt(data.primary_color.slice(5,7), 16);
        document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
      });

    // PWA & Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        fetch(`${API_URL}/vapidPublicKey`)
          .then(r => r.json())
          .then(data => {
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: data.publicKey
            }).then(sub => {
              fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sub)
              });
            }).catch(err => console.log('Push subscribe failed:', err));
          });
      });
    }

    // Offline Sync
    const handleOnline = () => {
      console.log('Online! Syncing queue...');
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineMaintQueue') || '[]');
    if (queue.length === 0) return;

    for (const data of queue) {
      try {
        await fetch(`${API_URL}/maintenance`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(data) 
        });
      } catch (e) {
        console.error('Failed to sync item:', e);
      }
    }
    localStorage.setItem('offlineMaintQueue', '[]');
    toast('Registros offline sincronizados correctamente');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} settings={settings} />;
  }

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setIsMenuOpen(true)}>☰</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{settings.company_name}</h2>
        <div style={{ width: '30px' }}></div> {/* Spacer */}
      </div>

      <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>

      <Sidebar 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsMenuOpen(false); }} 
        settings={settings}
        isMenuOpen={isMenuOpen}
      />
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard onModifyAlarm={(id) => { setScannedMachineId(id); setActiveTab('maintenance'); }} />}
        {activeTab === 'alarms' && <AlarmsBoard onModifyAlarm={(id) => { setScannedMachineId(id); setActiveTab('maintenance'); }} />}
        {activeTab === 'maintenance' && <MaintenanceRecords user={user} preselectedMachine={scannedMachineId} setScannedMachineId={setScannedMachineId} settings={settings} />}
        {activeTab === 'parts_history' && <PartsHistory />}

        {user.role === 'Administrador' && (
          <>
            {activeTab === 'machines' && (
              <Machines 
                onViewInfo={(m) => {
                  setScannedMachineData(m);
                  setShowMachineInfo(true);
                }} 
              />
            )}
            {activeTab === 'sectors' && <Sectors />}
            {activeTab === 'operators' && <Operators />}
            {activeTab === 'spare_parts' && <SpareParts />}
            {activeTab === 'settings' && <Settings settings={settings} setSettings={setSettings} />}
          </>
        )}
      </main>

      <button className="btn btn-primary print-hide" aria-label="Escanear QR" style={{ position: 'fixed', bottom: '90px', right: '20px', borderRadius: '50%', width: '60px', height: '60px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }} onClick={() => setIsScanning(true)}>📷</button>

      {isScanning && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ position: 'relative', padding: '20px' }}>
            <button className="btn btn-danger" style={{ position: 'absolute', top: '-10px', right: '-10px', zIndex: 10, borderRadius: '50%' }} onClick={() => setIsScanning(false)}>X</button>
            <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>Escanear Máquina</h2>
            <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <Scanner onScan={(result) => {
                if (result && result.length > 0 && result[0].rawValue) {
                  const id = result[0].rawValue;
                  setIsScanning(false);
                  setIsLoadingScan(true);
                  fetch(`${API_URL}/machines/${id}`)
                    .then(r => r.json())
                    .then(data => {
                      setScannedMachineData(data);
                      setShowMachineInfo(true);
                      setIsLoadingScan(false);
                    })
                    .catch(() => {
                      setIsLoadingScan(false);
                      toast('No se encontró la máquina con ID: ' + id, 'error');
                    });
                }
              }} />
            </div>
          </div>
        </div>
      )}

      {isLoadingScan && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="glass" style={{ padding: '30px', borderRadius: '20px', textAlign: 'center' }}>
            <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--accent)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
            <h3 style={{ margin: 0 }}>Cargando Ficha Técnica...</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Obteniendo datos e historial del servidor</p>
          </div>
        </div>
      )}
      <ToastContainer />
      {showMachineInfo && (
        <MachineInfoModal 
          machine={scannedMachineData} 
          settings={settings} 
          onClose={() => setShowMachineInfo(false)}
          onStartMaintenance={(id) => {
            setShowMachineInfo(false);
            setScannedMachineId(id);
            setActiveTab('maintenance');
          }}
        />
      )}
    </div>
  );
}

function Login({ onLogin, settings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submitLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) onLogin(data.user);
      else setError(data.error);
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={submitLogin} className="glass login-box">
        {settings.logo_url && <img src={`${ROOT_URL}${settings.logo_url}`} alt="Logo" style={{ maxHeight: '80px', marginBottom: '15px', borderRadius: '8px' }} />}
        <h1>{settings.company_name}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Sistema de Gestión</p>
        {error && <div className="badge badge-danger" style={{ marginBottom: '15px' }}>{error}</div>}
        <input className="input-field" type="text" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="input-field" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Ingresar</button>
      </form>
    </div>
  );
}

function Sidebar({ user, onLogout, activeTab, setActiveTab, settings, isMenuOpen }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Resumen General' },
    { id: 'alarms', label: '🔔 Alarmas (Pendientes)' },
    { id: 'maintenance', label: '📝 Órdenes Manten.' },
    { id: 'parts_history', label: '🛠️ Historial Repuestos' },
  ];
  
  if (user.role === 'Administrador') {
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
      <div style={{ flex: 1 }} className="sidebar-footer"></div>
      <button className="btn btn-danger sidebar-footer" onClick={onLogout}>Cerrar Sesión</button>
    </div>
  );
}

function Settings({ settings, setSettings }) {
  const [checklistsStr, setChecklistsStr] = useState(settings.checklists || '{}');

  const handleChecklistChange = (type, val) => {
    try {
      const parsed = JSON.parse(checklistsStr);
      parsed[type] = val.split('\n').filter(Boolean);
      setChecklistsStr(JSON.stringify(parsed));
    } catch (err){
      const newOb = {};
      newOb[type] = val.split('\n').filter(Boolean);
      setChecklistsStr(JSON.stringify(newOb));
    }
  };

  const getChecklistStr = (type) => {
    try {
      const parsed = JSON.parse(checklistsStr);
      return (parsed[type] || []).join('\n');
    } catch(e) { return ''; }
  }

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let logo_url = settings.logo_url;

    if (fd.get('logo_file').size > 0) {
      const uploadData = new FormData();
      uploadData.append('files', fd.get('logo_file'));
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
      const up = await res.json();
      logo_url = up.urls ? up.urls[0] : up.url;
    }

    const payload = {
      company_name: fd.get('company_name'),
      primary_color: fd.get('primary_color'),
      logo_url: logo_url,
      checklists: checklistsStr
    };

    await fetch(`${API_URL}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSettings(payload);
    document.documentElement.style.setProperty('--accent', payload.primary_color);
    document.documentElement.style.setProperty('--accent-hover', payload.primary_color + 'cc');
    toast('Configuración guardada exitosamente');
  }
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>Configuración del Sistema</h1>
      <form onSubmit={save} className="card glass" style={{ maxWidth: '800px' }}>
        
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <h3>🎨 White Label</h3>
            <label>Nombre de la Empresa</label>
            <input name="company_name" defaultValue={settings.company_name} className="input-field" required />

            <label>Color Corporativo</label>
            <input type="color" name="primary_color" defaultValue={settings.primary_color} className="input-field" style={{ height: '50px', padding: '3px' }} />

            <label>Logotipo (Reemplazar)</label>
            <input type="file" name="logo_file" accept="image/*" className="input-field" />
            {settings.logo_url && <img src={`${ROOT_URL}${settings.logo_url}`} alt="Actual" style={{ maxHeight: '80px', objectFit: 'contain', background: '#fff', padding: '5px', borderRadius: '8px' }} />}
          </div>
          
          <div>
            <h3>✅ Protocolos (Checklists)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ingrese un paso por línea para cada tipo de mantenimiento. Será obligatorio para el operario.</p>
            {Object.keys(TYPE_COLORS).map(type => (
              <div key={type} style={{ marginBottom: '10px' }}>
                <label style={{ color: TYPE_COLORS[type], fontWeight: 'bold' }}>{type}</label>
                <textarea className="input-field" rows="2" value={getChecklistStr(type)} onChange={e => handleChecklistChange(type, e.target.value)} placeholder={`Ej:\nRevisar nivel de aceite\nAjustar correas`}></textarea>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '15px', width: '100%' }}>Aplicar Cambios</button>
      </form>
    </div>
  )
}

// Los colores de tipo se definen globalmente arriba.
const DEFAULT_COLOR = '#64748b';

function getTypeColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}

// Helper: convert hex color like #3b82f6 to [r,g,b]
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return [0, 0, 0];
  
  let fullHex = clean;
  if (clean.length === 3) {
    fullHex = clean.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

function Dashboard({ onModifyAlarm }) {
  const [data, setData] = useState({ totalMachines: 0, totalRecords: 0, totalOperators: 0, totalSpareParts: 0, chartData: [], alerts: [], stockAlerts: [] });
  const [monthlyData, setMonthlyData] = useState([]);
  useEffect(() => { 
    fetch(`${API_URL}/dashboard`)
      .then(r => {
        if (!r.ok) throw new Error('Fallo en la comunicación con el servidor');
        return r.json();
      })
      .then(setData)
      .catch(err => {
        console.error(err);
        toast('Error de conexión: No se pudo cargar el tablero.', 'error');
      });
    fetch(`${API_URL}/dashboard/monthly`)
      .then(r => r.json())
      .then(rows => {
        // pivot: [{month, Preventivo: N, Correctivo: N, ...}]
        const map = {};
        rows.forEach(r => {
          if (!map[r.month]) map[r.month] = { month: r.month };
          map[r.month][r.type] = (map[r.month][r.type] || 0) + r.count;
        });
        setMonthlyData(Object.values(map).slice(-6));
      })
      .catch(() => {});
  }, []);
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ marginBottom: '25px' }}>📊 Resumen de Operaciones</h1>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Máquinas</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.totalMachines}</p>
        </div>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Órdenes</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.totalRecords}</p>
        </div>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Operarios</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.totalOperators}</p>
        </div>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Repuestos</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.totalSpareParts}</p>
        </div>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px', borderLeft: '4px solid #f97316' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '5px' }}>⏱️ Paro Acumulado</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f97316' }}>{data.totalDowntime || 0} hs</p>
        </div>
        <div className="card glass" style={{ alignItems: 'center', textAlign: 'center', padding: '20px', borderLeft: '4px solid #22c55e' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '5px' }}>💰 Costo Laboral Total</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>${data.totalCost || 0}</p>
        </div>
      </div>

      <div className="card glass" style={{ marginBottom: '20px', padding: '20px', height: '280px' }}>
        <h2 style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '15px' }}>Órdenes por Tipo</h2>
        {data.chartData && data.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getTypeColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px' }}>Sin datos suficientes para graficar</div>
        )}
      </div>

      {monthlyData.length > 1 && (
        <div className="card glass" style={{ marginBottom: '20px', padding: '20px', height: '280px' }}>
          <h2 style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '15px' }}>📈 Tendencia Mensual (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              {Object.keys(TYPE_COLORS).map(type => (
                <Line key={type} type="monotone" dataKey={type} stroke={TYPE_COLORS[type]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.alerts && data.alerts.length > 0 && (
        <div className="card glass" style={{ borderLeft: '5px solid var(--warning)', padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>📌</span> Alertas de Mantenimiento Inminente
            </h3>
            <span className="badge badge-warning" style={{ borderRadius: '20px', padding: '5px 15px' }}>{data.alerts.length} Pendientes</span>
          </div>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.alerts.slice(0, 6).map(a => (
              <div key={a.id} className="glass" style={{ 
                padding: '15px 20px', 
                background: a.alert_type === 'Vencido' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', 
                border: `1px solid ${a.alert_type === 'Vencido' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'transform 0.2s ease'
              }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '12px', 
                    background: a.alert_type === 'Vencido' ? 'var(--danger)' : 'var(--warning)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white'
                  }}>
                    {a.alert_type === 'Vencido' ? '🚨' : '⏳'}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem', display: 'block' }}>{a.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      📍 {a.sector || 'Sin sector'} • <span style={{ color: a.alert_type === 'Vencido' ? 'var(--danger)' : 'var(--warning)' }}>Vencimiento: {a.next_maintenance}</span>
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {a.daysUntil < 0 ? (
                      <span style={{ color: 'var(--danger)' }}>Vencido hace {Math.abs(a.daysUntil)} días</span>
                    ) : (
                      <span style={{ color: 'var(--warning)' }}>En {a.daysUntil} días</span>
                    )}
                  </div>
                  <button className="btn btn-primary" style={{ padding: '8px 15px', borderRadius: '10px', fontSize: '0.85rem' }} onClick={() => onModifyAlarm(a.id)}>
                    Registrar
                  </button>
                </div>
              </div>
            ))}
            {data.alerts.length > 6 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '10px' }}>
                Hay {data.alerts.length - 6} alertas adicionales pendientes de revisión.
              </div>
            )}
          </div>
        </div>
      )}
      
      {data.stockAlerts && data.stockAlerts.length > 0 && (
        <div className="card glass" style={{ marginTop: '25px', borderLeft: '5px solid var(--danger)', padding: '25px' }}>
          <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span> Alertas de Inventario Crítico
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {data.stockAlerts.map(sp => (
              <div key={sp.id} style={{ 
                padding: '15px', 
                background: 'rgba(239,68,68,0.05)', 
                borderRadius: '16px', 
                border: '1px solid rgba(239,68,68,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '1rem' }}>{sp.name}</strong>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{sp.stock} {sp.unit || 'uds'}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min((sp.stock / sp.min_stock) * 100, 100)}%`, 
                    background: 'var(--danger)',
                    boxShadow: '0 0 10px var(--danger)'
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Stock Actual</span>
                  <span>Mínimo: {sp.min_stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Machines({ onViewInfo }) {
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
    fetch(`${API_URL}/machines`).then(r => r.json()).then(setMachines);
    fetch(`${API_URL}/sectors`).then(r => r.json()).then(setSectors);
  }

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData(e.target);
      let image_url = editMachine?.image_url;

      if (fd.get('image_file').size > 0) {
        const uploadData = new FormData();
        uploadData.append('files', fd.get('image_file')); // Corregido: 'files' coincide con el backend
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
        if (!res.ok) throw new Error('Error al subir la imagen');
        const up = await res.json();
        image_url = up.urls[0]; // Corregido: el backend devuelve un array 'urls'
      }

      // Construir payload limpio (solo campos que el backend reconoce)
      const payload = {
        name: fd.get('name'),
        machine_type: fd.get('machine_type'),
        model: fd.get('model'),
        sector: fd.get('sector'),
        internal_id: fd.get('internal_id'),
        voltage: fd.get('voltage'),
        pressure: fd.get('pressure'),
        status: fd.get('status'),
        purchase_date: fd.get('purchase_date'),
        image_url: image_url,
        last_maintenance: editMachine?.last_maintenance || null
      };

      const url = editMachine ? `${API_URL}/machines/${editMachine.id}` : `${API_URL}/machines`;
      const method = editMachine ? 'PUT' : 'POST';

      const response = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido en el servidor');
      }

      toast(editMachine ? '✅ Máquina actualizada' : '✅ Nueva máquina registrada', 'success');
      setShowModal(false);
      load();
    } catch (error) {
      console.error("DEBUG SAVE ERROR:", error);
      alert('⚠️ ERROR AL GUARDAR: ' + error.message);
      toast('Error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // FUNCIÓN DE ELIMINACIÓN DEFINITIVA
  const removeMachine = async (machineId) => {
    console.log("Solicitud de eliminación para ID:", machineId);
    if (!window.confirm("🚨 ¿ESTÁS SEGURO? Se eliminará la máquina y TODO su historial permanentemente.")) return;
    
    try {
      const response = await fetch(`${API_URL}/machines/${machineId}`, { method: 'DELETE' });
      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.error || 'Error al eliminar en el servidor');
      }
      
      toast('🗑️ Máquina eliminada con éxito', 'success');
      load(); // Recargar la lista
    } catch (error) {
      console.error("Error en removeMachine:", error);
      alert('❌ Error al eliminar: ' + error.message);
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
        <input
          className="input-field"
          placeholder="🔍 Buscar por nombre, código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, margin: 0, minWidth: '250px' }}
        />
        <select 
          className="input-field" 
          value={selectedSector} 
          onChange={e => setSelectedSector(e.target.value)}
          style={{ flex: '0 0 200px', margin: 0 }}
        >
          <option value="">🏢 Todos los Sectores</option>
          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {machines.filter(m => {
          const matchSearch = !search || (m.name + ' ' + (m.internal_id || '') + ' ' + (m.machine_type || '')).toLowerCase().includes(search.toLowerCase());
          const matchSector = !selectedSector || m.sector === selectedSector;
          return matchSearch && matchSector;
        }).length === 0 && (
          <p className="glass" style={{ padding: '20px', gridColumn: '1/-1', textAlign: 'center' }}>No se encontraron máquinas en este sector o con este criterio.</p>
        )}
        {machines.filter(m => {
          const matchSearch = !search || (m.name + ' ' + (m.internal_id || '') + ' ' + (m.machine_type || '')).toLowerCase().includes(search.toLowerCase());
          const matchSector = !selectedSector || m.sector === selectedSector;
          return matchSearch && matchSector;
        }).map(m => (
          <div key={m.id} className="card glass" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ height: '180px', backgroundColor: '#1e293b', position: 'relative' }}>
              {m.image_url ? (
                <img src={`${ROOT_URL}${m.image_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.name} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>⚙️</div>
              )}
              {m.internal_id && (
                <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#eab308', color: 'black', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  🆔 {m.internal_id}
                </span>
              )}
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
                <div><strong>Último Mant.:</strong> {m.last_maintenance || '-'}</div>
              </div>
              {m.next_maintenance && (
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                  📅 Próximo Mant.: {m.next_maintenance}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }} className="print-hide">
                <button className="btn" onClick={() => onViewInfo(m)} style={{ background: 'var(--success)', color: 'white', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}>
                   👁️ Ficha
                </button>
                <button className="btn" onClick={() => setShowQR(m)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
                   📱 QR
                </button>
                <button className="btn" onClick={() => openEdit(m)} style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}>
                   📝 Editar
                </button>
                <button 
                  className="btn btn-danger" 
                  onMouseDown={() => removeMachine(m.id)} 
                  style={{ background: '#ef4444', color: 'white', fontWeight: 'bold', borderRadius: '12px', padding: '12px' }}
                >
                  🗑️ Borrar
                </button>
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
            
            <form onSubmit={save} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Sección 1: Datos Principales */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📍</span> Información de Planta
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'block', color: '#cbd5e1', fontWeight: '500' }}>Nombre Descriptivo</label>
                    <input name="name" defaultValue={editMachine?.name} className="input-field" placeholder="Ej: FRESA VERTICAL CNC" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'block', color: '#cbd5e1', fontWeight: '500' }}>Tipo de Equipo</label>
                    <select name="machine_type" defaultValue={editMachine?.machine_type} className="input-field" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} required>
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
                    <label style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'block', color: '#cbd5e1', fontWeight: '500' }}>Sector / Área</label>
                    <select name="sector" defaultValue={editMachine?.sector} className="input-field" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} required>
                      <option value="">-- Seleccionar Sector --</option>
                      {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Identificación y Técnica */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🆔</span> Identificación
                  </h4>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID Interno (Ficha Técnica)</label>
                      <input name="internal_id" defaultValue={editMachine?.internal_id} className="input-field" placeholder="Ej: FV06" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Modelo / Marca</label>
                      <input name="model" defaultValue={editMachine?.model} className="input-field" placeholder="Ej: Siemens / 2024" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚡</span> Especificaciones
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Voltaje</label>
                      <input name="voltage" defaultValue={editMachine?.voltage} className="input-field" placeholder="380V" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Presión</label>
                      <input name="pressure" defaultValue={editMachine?.pressure} className="input-field" placeholder="46 A / 6 Bar" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Estado de Máquina</label>
                      <select name="status" defaultValue={editMachine?.status} className="input-field" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }}>
                        <option value="Operativa">🟢 Operativa</option>
                        <option value="Averiada">🔴 Averiada</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Multimedia */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📸</span> Multimedia y Adquisición
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}>Fecha Compra</label>
                    <input type="date" name="purchase_date" defaultValue={editMachine?.purchase_date} className="input-field" style={{ marginBottom: 0, background: 'rgba(0,0,0,0.3)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}>Foto del Equipo</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {editMachine?.image_url && (
                        <img src={`${ROOT_URL}${editMachine.image_url}`} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent)' }} alt="Current" />
                      )}
                      <input type="file" name="image_file" accept="image/*" className="input-field" style={{ flex: 1, marginBottom: 0, background: 'rgba(0,0,0,0.3)', padding: '8px' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '18px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '14px', textTransform: 'uppercase', letterSpacing: '1px' }} disabled={isSaving}>
                  {isSaving ? (
                    <><div className="spinner" style={{ width: '24px', height: '24px', margin: 0, borderTopColor: 'white' }}></div> Guardando...</>
                  ) : '💾 Confirmar y Guardar'}
                </button>
                <button type="button" className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '14px' }} onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal-content glass" style={{ textAlign: 'center', background: '#fff' }} onClick={(e) => e.stopPropagation()}>
            <QRCode value={showQR.id.toString()} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%", padding: '20px', background: '#fff', borderRadius: '12px' }} />
            <h2 style={{ color: '#000', marginTop: '20px', fontSize: '1.8rem' }}>{showQR.name}</h2>
            <div style={{ background: '#eab308', color: '#000', display: 'inline-block', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', marginTop: '10px' }}>
              ID: {showQR.internal_id}
            </div>
            <p style={{ color: '#666', marginTop: '10px' }}>Escanee para ver la Ficha Técnica completa</p>
            <div style={{ marginTop: '20px' }} className="print-hide">
              <button className="btn btn-primary" onClick={() => window.print()}>Imprimir QR</button>
              <button className="btn btn-danger" style={{ marginLeft: '10px' }} onClick={() => setShowQR(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sectors() {
  const [sectors, setSectors] = useState([]);
  const [editSector, setEditSector] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => fetch(`${API_URL}/sectors`).then(r => r.json()).then(setSectors);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (editSector) {
      await fetch(`${API_URL}/sectors/${editSector.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch(`${API_URL}/sectors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setEditSector(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este sector?")) return;
    await fetch(`${API_URL}/sectors/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>🏢 Gestión de Sectores</h1>
      <div className="card-grid">
        <form onSubmit={save} className="card glass">
          <h3>{editSector ? 'Modificando Sector' : '+ Agregar Sector'}</h3>
          <input name="name" defaultValue={editSector?.name} key={`s-${editSector?.id}`} className="input-field" placeholder="Nombre (Ej: Inyección)" required />
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
            {editSector && <button type="button" className="btn btn-danger" onClick={() => setEditSector(null)}>Cancelar</button>}
          </div>
        </form>

        <div className="card glass" style={{ gridColumn: 'span 2' }}>
          <h3>Sectores Registrados</h3>
          <ul>{sectors.map(s => (
            <li key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{s.name}</strong>
              </div>
              <div>
                <button className="btn" style={{ background: 'transparent', color: 'var(--accent)', padding: '5px' }} onClick={() => setEditSector(s)}>Editar</button>
                <button className="btn" style={{ background: 'transparent', color: 'var(--danger)', padding: '5px' }} onClick={() => remove(s.id)}>Eliminar</button>
              </div>
            </li>
          ))}</ul>
        </div>
      </div>
    </div>
  );
}

function Operators() {
  const [ops, setOps] = useState([]);
  const [editOp, setEditOp] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => fetch(`${API_URL}/operators`).then(r => r.json()).then(setOps);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (editOp) {
      await fetch(`${API_URL}/operators/${editOp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch(`${API_URL}/operators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setEditOp(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar el operario?")) return;
    await fetch(`${API_URL}/operators/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>Operarios</h1>
      <div className="card-grid">
        <form onSubmit={save} className="card glass">
          <h3>{editOp ? 'Modificando Empleado' : '+ Agregar Empleado'}</h3>
          <input name="name" defaultValue={editOp?.name} key={`n-${editOp?.id}`} className="input-field" placeholder="Nombre completo" required />
          <input name="specialty" defaultValue={editOp?.specialty} key={`s-${editOp?.id}`} className="input-field" placeholder="Especialidad (Ej: Eléctrico)" required />
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
            {editOp && <button type="button" className="btn btn-danger" onClick={() => setEditOp(null)}>Cancelar</button>}
          </div>
        </form>

        <div className="card glass" style={{ gridColumn: 'span 2' }}>
          <h3>Registrados</h3>
          <ul>{ops.map(o => (
            <li key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{o.name}</strong> - <span className="badge badge-warning">{o.specialty}</span>
              </div>
              <div>
                <button className="btn" style={{ background: 'transparent', color: 'var(--accent)', padding: '5px' }} onClick={() => setEditOp(o)}>Editar</button>
                <button className="btn" style={{ background: 'transparent', color: 'var(--danger)', padding: '5px' }} onClick={() => remove(o.id)}>Eliminar</button>
              </div>
            </li>
          ))}</ul>
        </div>
      </div>
    </div>
  );
}

function SpareParts() {
  const [parts, setParts] = useState([]);
  const [editPart, setEditPart] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => fetch(`${API_URL}/spare_parts`).then(r => r.json()).then(setParts);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (editPart) {
      await fetch(`${API_URL}/spare_parts/${editPart.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch(`${API_URL}/spare_parts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setEditPart(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este repuesto?")) return;
    await fetch(`${API_URL}/spare_parts/${id}`, { method: 'DELETE' });
    load();
  }

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_URL}/spare_parts/import`, { method: 'POST', body: fd });
      if (res.ok) {
        toast('Importación de repuestos exitosa');
        load();
      } else {
        toast('Error en la importación del archivo', 'error');
      }
    } catch (err) {
      toast('Error al conectar con el servidor', 'error');
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Repuestos</h1>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          📂 Importar Excel
          <input type="file" style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImport} />
        </label>
      </div>
      <div className="card-grid">
        <form onSubmit={save} className="card glass" style={{ height: 'max-content' }}>
          <h3>{editPart ? 'Modificando Repuesto' : '+ Nuevo Repuesto'}</h3>
          <input name="name" defaultValue={editPart?.name} key={`pn-${editPart?.id}`} className="input-field" placeholder="Nombre / Código" required />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input name="stock" type="number" defaultValue={editPart?.stock} key={`ps-${editPart?.id}`} className="input-field" placeholder="Stock Actual" required />
            <input name="min_stock" type="number" defaultValue={editPart?.min_stock} key={`pms-${editPart?.id}`} className="input-field" placeholder="Stock Mínimo (Alerta)" />
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
            {editPart && <button type="button" className="btn btn-danger" onClick={() => setEditPart(null)}>Cancelar</button>}
          </div>
        </form>

        <div className="glass" style={{ padding: '20px', gridColumn: 'span 2' }}>
          <table>
            <thead><tr><th>Repuesto / Código</th><th>Stock</th><th>Stock Mín.</th><th>Acciones</th></tr></thead>
            <tbody>
              {parts.length === 0 && <tr><td colSpan="3">Sin repuestos.</td></tr>}
              {parts.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><span className={`badge ${p.stock <= (p.min_stock || 0) ? 'badge-danger' : 'badge-success'}`}>{p.stock} uni.</span></td>
                  <td>{p.min_stock > 0 ? `${p.min_stock} uni.` : '-'}</td>
                  <td>
                    <button className="btn" style={{ background: 'transparent', color: 'var(--accent)', padding: '5px' }} onClick={() => setEditPart(p)}>Editar</button>
                    <button className="btn" style={{ background: 'transparent', color: 'var(--danger)', padding: '5px' }} onClick={() => remove(p.id)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlarmsBoard({ onModifyAlarm }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('');

  const URGENCY_CONFIG = {
    'CRÍTICO':      { color: '#7f1d1d', bg: 'rgba(127,29,29,0.2)',  border: '#ef4444', icon: '🔴', label: 'CRÍTICO (Muy atrasado)' },
    'VENCIDO':      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', icon: '🔴', label: 'VENCIDO' },
    'HOY':          { color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: '#f97316', icon: '🟠', label: 'VENCE HOY' },
    'URGENTE':      { color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: '#eab308', icon: '🟡', label: 'URGENTE (1-3 días)' },
    'ESTA SEMANA':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', icon: '🔵', label: 'ESTA SEMANA (4-7 días)' },
    'PRÓXIMO MES':  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: '#22c55e', icon: '🟢', label: 'PRÓXIMO MES (8-30 días)' },
  };

  const URGENCY_ORDER = ['CRÍTICO', 'VENCIDO', 'HOY', 'URGENTE', 'ESTA SEMANA', 'PRÓXIMO MES'];

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(data => {
        if (data.alerts) {
          const sorted = [...data.alerts].sort((a, b) => a.daysUntil - b.daysUntil);
          setAlarms(sorted);
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

  const criticalCount = filteredAlarms.filter(a => ['CRÍTICO','VENCIDO','HOY','URGENTE'].includes(a.urgency)).length;
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

      {/* Summary Panel */}
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

      {!loading && alarms.length === 0 && (
        <div className="card glass" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h2 style={{ color: '#22c55e', marginTop: '10px' }}>Todo en orden</h2>
          <p style={{ color: 'var(--text-muted)' }}>No hay máquinas con mantenimiento próximo o vencido en los próximos 30 días.</p>
        </div>
      )}

      {/* Alarm Cards grouped by urgency */}
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
                      {a.machine_type && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.machine_type}</span>
                      )}
                    </div>
                    <span style={{
                      background: cfg.color,
                      color: 'white',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>{cfg.icon} {key}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    📅 Mantenimiento previsto: <strong style={{ color: 'white' }}>{a.next_maintenance}</strong>
                  </div>

                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    color: cfg.color
                  }}>
                    {a.daysUntil < 0
                      ? `⏰ ${Math.abs(a.daysUntil)} días de atraso`
                      : a.daysUntil === 0
                        ? '⚠️ ¡Vence hoy!'
                        : `⏳ ${a.daysUntil} día${a.daysUntil !== 1 ? 's' : ''} restante${a.daysUntil !== 1 ? 's' : ''}`
                    }
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '5px' }}
                    onClick={() => onModifyAlarm(a.id)}
                  >
                    ⚙️ Registrar Manten.
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartsHistory() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/machines`).then(r => r.json()).then(setMachines);
  }, []);

  const loadHistory = (machineId) => {
    setSelectedMachine(machineId);
    if (!machineId) {
      setHistory([]);
      return;
    }
    fetch(`${API_URL}/machines/${machineId}/parts_history`)
      .then(r => r.json())
      .then(setHistory);
  };

  const filteredHistory = history.filter(h => 
    !search || h.part_name.toLowerCase().includes(search.toLowerCase()) || h.record_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1 style={{ marginBottom: '20px' }}>🛠️ Consumo de Repuestos</h1>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <div className="card glass" style={{ flex: 1, padding: '20px', margin: 0 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Filtrar por Máquina</label>
          <select className="input-field" style={{ marginBottom: 0 }} value={selectedMachine} onChange={e => loadHistory(e.target.value)}>
            <option value="">-- Seleccione una máquina --</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.model})</option>)}
          </select>
        </div>
        
        <div className="card glass" style={{ flex: 1, padding: '20px', margin: 0 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Buscar en Historial</label>
          <input 
            className="input-field" 
            style={{ marginBottom: 0 }} 
            placeholder="Buscar repuesto o tipo..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ margin: 0 }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>
                <th style={{ padding: '18px 20px' }}>Fecha</th>
                <th>Repuesto</th>
                <th>Cantidad</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tipo Manten.</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {selectedMachine ? 'No se encontraron registros para esta búsqueda.' : 'Seleccione una máquina para ver su historial de consumo.'}
                  </td>
                </tr>
              )}
              {filteredHistory.map(h => (
                <tr key={h.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ padding: '15px 20px', fontWeight: '500' }}>{h.date}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{h.part_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {h.part_id}</div>
                  </td>
                  <td>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold' }}>
                      {h.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <span className={`badge ${h.record_type === 'Correctivo' ? 'badge-danger' : 'badge-success'}`}>
                      {h.record_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MaintenanceRecords({ user, preselectedMachine, setScannedMachineId, settings }) {
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState('cerradas');
  const [pendingAlarms, setPendingAlarms] = useState([]);
  const [localMachineId, setLocalMachineId] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [searchMachine, setSearchMachine] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formType, setFormType] = useState('Preventivo');
  const [selectedParts, setSelectedParts] = useState([]);
  const [sigPad, setSigPad] = useState(null);

  let parsedC = {};
  try { parsedC = JSON.parse(settings?.checklists || '{}'); } catch(e){}
  const activeChecklist = parsedC[formType] || [];
  const [checklistResults, setChecklistResults] = useState({});

  useEffect(() => { setChecklistResults({}); }, [formType]);

  useEffect(() => {
    load();
    fetch(`${API_URL}/machines`).then(r => r.json()).then(setMachines);
    fetch(`${API_URL}/operators`).then(r => r.json()).then(setOperators);
    fetch(`${API_URL}/spare_parts`).then(r => r.json()).then(setSpareParts);
    fetch(`${API_URL}/dashboard`).then(r => r.json()).then(data => {
      if (data.alerts) setPendingAlarms([...data.alerts].sort((a, b) => a.daysUntil - b.daysUntil));
    }).catch(() => {});
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
  const load = () => fetch(`${API_URL}/maintenance`).then(r => r.json()).then(setRecords);

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    // Upload multiple evidence photos
    let evidence_urls = [];
    if (fd.getAll('evidence_files') && fd.getAll('evidence_files')[0].size > 0) {
      const uploadData = new FormData();
      fd.getAll('evidence_files').forEach(file => uploadData.append('files', file));
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
      const up = await res.json();
      evidence_urls = up.urls;
    }

    // Upload Signature
    let signature_url = null;
    if (sigPad && !sigPad.isEmpty()) {
      try {
        const sigData = sigPad.getTrimmedCanvas().toDataURL('image/png');
        // Convert base64 data URL to Blob properly
        const byteString = atob(sigData.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/png' });

        const sigFd = new FormData();
        sigFd.append('files', blob, 'signature.png');
        const resUp = await fetch(`${API_URL}/upload`, { method: 'POST', body: sigFd });
        const up = await resUp.json();
        signature_url = up.urls[0];
        console.log("Signature uploaded:", signature_url);
      } catch (err) {
        console.error("Error uploading signature:", err);
      }
    }

    const payload = {
      ...data,
      downtime_hours: parseFloat(data.downtime_hours) || 0,
      labor_cost: parseFloat(data.labor_cost) || 0,
      checklist_results: Object.keys(checklistResults).filter(k => checklistResults[k]).map(k => activeChecklist[k]),
      evidence_urls,
      signature_url,
      spare_parts_used_list: selectedParts
    };
    console.log("Saving maintenance record with payload:", payload);

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('offlineMaintQueue') || '[]');
      queue.push(payload);
      localStorage.setItem('offlineMaintQueue', JSON.stringify(queue));
      toast('Sin conexión. Registro guardado localmente para sincronizar.', 'warning');
    } else {
      try {
        const resFin = await fetch(`${API_URL}/maintenance`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        if (!resFin.ok) throw new Error("Error en la respuesta del servidor");
        toast('Orden de mantenimiento registrada con éxito');
      } catch (err) {
        console.error("Error saving record:", err);
        toast('Error al guardar. Se guardó en cola offline.', 'error');
        const queue = JSON.parse(localStorage.getItem('offlineMaintQueue') || '[]');
        queue.push(payload);
        localStorage.setItem('offlineMaintQueue', JSON.stringify(queue));
      }
    }

    setShowModal(false);
    setSelectedParts([]);
    setLocalMachineId(null);
    if (setScannedMachineId) setScannedMachineId(null);
    // Reload alarms after saving
    fetch(`${API_URL}/dashboard`).then(r => r.json()).then(data => {
      if (data.alerts) setPendingAlarms([...data.alerts].sort((a, b) => a.daysUntil - b.daysUntil));
    }).catch(() => {});
    load();
    setActiveOrderTab('cerradas');
    fetch(`${API_URL}/spare_parts`).then(r => r.json()).then(setSpareParts);
  };

  const exportPDF = async (record) => {
    try {
      console.log("Iniciando exportación PDF para:", record.id);
      const doc = new jsPDF();
      const accentHex = (settings.primary_color) || '#3b82f6';
      const typeHex = TYPE_COLORS[record.type] || accentHex;
      const [r, g, b] = hexToRgb(typeHex);

    // Helper to load image from backend URL as base64
    const getBase64Image = async (imgUrl) => {
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Error loading image for PDF:", e);
        return null;
      }
    };

    // ---- HEADER ----
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PLANILLA DE INSPECCIÓN TÉCNICA', 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo: ${record.type}`, 105, 30, { align: 'center' });

    // ---- META ----
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Orden #ORD-${record.id}`, 15, 50);
    doc.text(`Fecha: ${record.date}`, 150, 50);

    // ---- INFO TABLE ----
    autoTable(doc, {
      startY: 58,
      head: [['INFORMACIÓN GENERAL', '']],
      body: [
        ['Máquina:', record.machine_name || '-'],
        ['Operario Responsable:', record.operator_name || '-'],
        ['Tipo de Mantenimiento:', record.type || '-'],
        ['Fecha Inicio:', record.start_date || record.date || '-'],
        ['Fecha Fin:', record.end_date || 'En curso'],
        ['Horas de Paro (Downtime):', parseFloat(record.downtime_hours) > 0 ? `${record.downtime_hours} hs` : '-'],
        ['Costo Estimado (M.O.):', parseFloat(record.labor_cost) > 0 ? `$${record.labor_cost}` : '-']
      ],
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    let curY = (doc).lastAutoTable?.finalY || 130;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text('DETALLE DE LA INTERVENCIÓN:', 15, curY + 10);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const detailLines = doc.splitTextToSize(record.failure_details || '-', 180);
    doc.text(detailLines, 15, curY + 17);
    curY += 17 + detailLines.length * 5 + 5;

    // ---- SOP / CHECKLIST ----
    try {
      const checklistArray = JSON.parse(record.checklist_results || '[]');
      if (checklistArray.length > 0) {
        autoTable(doc, {
          startY: curY,
          head: [['PROTOCOLO / SOP REALIZADO']],
          body: checklistArray.map(task => [`✓ ${task}`]),
          theme: 'grid',
          headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255] }
        });
        curY = (doc).lastAutoTable?.finalY || (curY + 30);
      }
    } catch(e) {}

    // ---- SPARE PARTS ----
    try {
      const historyRes = await fetch(`${API_URL}/machines/${record.machine_id}/parts_history`);
      const history = await historyRes.json();
      const partsUsed = history.filter(h => h.record_id == record.id);
      if (partsUsed.length > 0) {
        autoTable(doc, {
          startY: curY + 5,
          head: [['REPUESTO', 'CANTIDAD']],
          body: partsUsed.map(p => [p.part_name, p.quantity]),
          theme: 'striped',
          headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255] }
        });
        curY = doc.lastAutoTable.finalY + 5;
      }
    } catch (e) {
      console.error('Error fetching parts history for PDF:', e);
    }

    // ---- SIGNATURE ----
    if (record.signature_url) {
      const sigData = await getBase64Image(`/uploads/${record.signature_url.split('/uploads/')[1]}`);
      if (sigData) {
        curY += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(r, g, b);
        doc.text('FIRMA DEL OPERARIO:', 15, curY);
        doc.addImage(sigData, 'PNG', 15, curY + 5, 55, 28);
        curY += 40;
      }
    }

    // ---- FOOTER ----
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(r, g, b);
    doc.rect(0, pageHeight - 12, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')} | MantenimientoApp`, 105, pageHeight - 4, { align: 'center' });

    const fileName = `Insp_ORD${record.id}_${record.machine_name}_${record.date}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${fileName}.pdf`);
    } catch(err) {
      console.error("Error exportando PDF:", err);
      toast('Error al generar el PDF. Verifique la consola.', 'error');
    }
  };

  const addPart = (id) => {
    if (!id) return;
    const part = spareParts.find(p => p.id == id);
    if (!part) return;
    if (selectedParts.find(p => p.id == id)) return;
    setSelectedParts([...selectedParts, { id: part.id, name: part.name, quantity: 1, stock: part.stock }]);
  };

  const updatePartQty = (id, qty) => {
    setSelectedParts(selectedParts.map(p => p.id == id ? { ...p, quantity: parseInt(qty, 10) } : p));
  };

  const removePart = (id) => {
    setSelectedParts(selectedParts.filter(p => p.id != id));
  };

  const filteredRecords = records.filter(r => {
    if (filterType && r.type !== filterType) return false;
    if (searchMachine && !((r.machine_name || '') + ' ' + (r.operator_name || '')).toLowerCase().includes(searchMachine.toLowerCase())) return false;
    if (dateFrom && (r.start_date || r.date) < dateFrom) return false;
    if (dateTo && (r.start_date || r.date) > dateTo) return false;
    return true;
  });

  const exportFilteredToPDF = () => {
    const doc = new jsPDF();
    const accentHex = document.documentElement.style.getPropertyValue('--accent').trim() || '#3b82f6';
    const [r, g, b] = hexToRgb(accentHex);
    
    doc.setFontSize(16);
    doc.text(`Reporte de Mantenimientos ${filterType ? `(${filterType})` : ''}`, 14, 20);
    
    const tableData = filteredRecords.map(r => [
      `ORD-${r.id}`,
      r.start_date || r.date,
      r.machine_name || '-',
      r.operator_name || '-',
      r.type,
      r.failure_details.length > 40 ? r.failure_details.substring(0, 40) + '...' : (r.failure_details || '-')
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Fecha', 'Máquina', 'Operario', 'Tipo', 'Detalle']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [r, g, b] }
    });

    doc.save(`Reporte_Mantenimiento.pdf`);
  };

  const exportFilteredToExcel = () => {
    const wsData = filteredRecords.map(r => ({
      'ID Orden': `ORD-${r.id}`,
      'Fecha Fin / Registro': r.date,
      'Fecha Inicio': r.start_date || '-',
      'Máquina': r.machine_name || '-',
      'Operario': r.operator_name || '-',
      'Tipo de Mantenimiento': r.type,
      'Detalle del Trabajo': r.failure_details || '-',
      'Próximo Mant.': r.next_maintenance || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes");
    XLSX.writeFile(wb, `Reporte_Mantenimiento.xlsx`);
  };
  const URGENCY_C = {
    'CRÍTICO':'#ef4444','VENCIDO':'#ef4444','HOY':'#f97316',
    'URGENTE':'#eab308','ESTA SEMANA':'#3b82f6','PRÓXIMO MES':'#22c55e'
  };

  const openRegistrar = (machineId) => {
    setLocalMachineId(machineId);
    setFormType('Preventivo');
    setSelectedParts([]);
    setShowModal(true);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── TAB NAV ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
        <div style={{ display:'flex', gap:'6px', background:'rgba(255,255,255,0.05)', padding:'6px', borderRadius:'12px' }}>
          <button
            onClick={() => setActiveOrderTab('pendientes')}
            style={{ padding:'10px 22px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'700', fontSize:'0.95rem',
              background: activeOrderTab==='pendientes' ? '#ef4444' : 'transparent',
              color: activeOrderTab==='pendientes' ? 'white' : 'var(--text-muted)', transition:'all 0.2s'
            }}
          >
            ⏳ Pendientes
            {pendingAlarms.length > 0 && <span style={{ marginLeft:'8px', background:'rgba(255,255,255,0.25)', borderRadius:'10px', padding:'1px 8px', fontSize:'0.8rem' }}>{pendingAlarms.length}</span>}
          </button>
          <button
            onClick={() => setActiveOrderTab('cerradas')}
            style={{ padding:'10px 22px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'700', fontSize:'0.95rem',
              background: activeOrderTab==='cerradas' ? 'var(--accent)' : 'transparent',
              color: activeOrderTab==='cerradas' ? 'white' : 'var(--text-muted)', transition:'all 0.2s'
            }}
          >
            ✅ Cerradas
            {records.length > 0 && <span style={{ marginLeft:'8px', background:'rgba(255,255,255,0.25)', borderRadius:'10px', padding:'1px 8px', fontSize:'0.8rem' }}>{records.length}</span>}
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => { setLocalMachineId(null); setFormType('Preventivo'); setSelectedParts([]); setShowModal(true); }}>+ Nueva Orden</button>
      </div>

      {/* ── TAB: PENDIENTES ── */}
      {activeOrderTab === 'pendientes' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          {pendingAlarms.length === 0 ? (
            <div className="card glass" style={{ textAlign:'center', padding:'60px' }}>
              <div style={{ fontSize:'3.5rem', marginBottom:'15px' }}>✅</div>
              <h2 style={{ color:'#22c55e' }}>Sin mantenimientos pendientes</h2>
              <p style={{ color:'var(--text-muted)', marginTop:'10px' }}>Todas las máquinas están al día con su plan de mantenimiento.</p>
            </div>
          ) : (
            <div className="card-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {pendingAlarms.map(a => {
                const col = URGENCY_C[a.urgency] || '#64748b';
                return (
                  <div key={a.id} className="glass" style={{ padding:'20px', borderLeft:`5px solid ${col}`, borderRadius:'12px', display:'flex', flexDirection:'column', gap:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <h3 style={{ margin:0, fontSize:'1.1rem' }}>{a.name}</h3>
                        <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{a.machine_type}{a.sector ? ` • ${a.sector}` : ''}</span>
                      </div>
                      <span style={{ background:col, color:'white', padding:'4px 10px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:'bold', whiteSpace:'nowrap' }}>{a.urgency}</span>
                    </div>
                    <div style={{ fontSize:'0.9rem', color:'var(--text-muted)' }}>
                      📅 Previsto: <strong style={{ color:'white' }}>{a.next_maintenance}</strong>
                    </div>
                    <div style={{ padding:'10px', borderRadius:'8px', background:'rgba(0,0,0,0.25)', textAlign:'center', fontWeight:'bold', color:col }}>
                      {a.daysUntil < 0 ? `⏰ ${Math.abs(a.daysUntil)} días de atraso` : a.daysUntil === 0 ? '⚠️ ¡Vence hoy!' : `⏳ ${a.daysUntil} día${a.daysUntil!==1?'s':''} restante${a.daysUntil!==1?'s':''}`}
                    </div>
                    <button
                      className="btn"
                      style={{ width:'100%', background:col, color:'white', fontWeight:'700', fontSize:'0.95rem', padding:'12px' }}
                      onClick={() => openRegistrar(a.id)}
                    >
                      ⚙️ Registrar Mantenimiento Completado
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CERRADAS ── */}
      {activeOrderTab === 'cerradas' && (
        <div style={{ animation:'fadeIn 0.3s ease' }}>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'15px' }} className="print-hide">
            <input className="input-field" style={{ marginBottom:0, width:'180px' }} placeholder="🔍 Máquina / Operario" value={searchMachine} onChange={e => setSearchMachine(e.target.value)} />
            <input type="date" className="input-field" style={{ marginBottom:0, width:'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Desde" />
            <input type="date" className="input-field" style={{ marginBottom:0, width:'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="Hasta" />
            <select className="input-field" style={{ marginBottom:0, width:'max-content' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Predictivo">Predictivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Diario">Diario</option>
              <option value="Mensual">Mensual</option>
              <option value="Fin de Año">Fin de Año</option>
            </select>
            <button className="btn btn-primary" onClick={exportFilteredToExcel} style={{ background:'#16a34a' }}>📊 Excel</button>
            <button className="btn btn-primary" onClick={exportFilteredToPDF} style={{ background:'#dc2626' }}>📄 PDF</button>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ background:'var(--success)' }}>🖨️ Imprimir</button>
          </div>
          <div className="card-grid">
            {filteredRecords.length === 0 && <p className="glass" style={{ padding:'20px' }}>No hay órdenes cerradas con el filtro aplicado.</p>}
            {filteredRecords.map(r => (
              <div key={r.id} className="card glass" style={{ borderLeft:`4px solid ${getTypeColor(r.type)}`, borderRadius:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <h3 style={{ margin:0 }}>{r.machine_name}</h3>
                  <span style={{ background:getTypeColor(r.type), color:'white', padding:'3px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'bold', whiteSpace:'nowrap' }}>{r.type}</span>
                </div>
                <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'6px' }}>
                  📅 {r.start_date || r.date}{r.end_date ? ` → ${r.end_date}` : ''} &nbsp;•&nbsp; 👷 {r.operator_name}
                </p>
                <p style={{ marginTop:'8px', fontSize:'0.9rem' }}><strong>Detalle:</strong> {r.failure_details}</p>
                {r.next_maintenance && <p style={{ fontSize:'0.85rem', color:'var(--warning)' }}>📅 Próximo: {r.next_maintenance}</p>}
                <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                  <button className="btn" style={{ background:getTypeColor(r.type), color:'white', flex:1, fontWeight:'bold' }} onClick={() => exportPDF(r)}>📄 PDF</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxHeight: '95vh', overflowY: 'auto', width: '600px' }}>
            <h2>Asentar Orden (Reporte)</h2>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select name="machine_id" className="input-field" defaultValue={localMachineId || preselectedMachine || ""} key={localMachineId || preselectedMachine} required>
                <option value="">Seleccionar Máquina...</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.model})</option>)}
              </select>
              <select name="operator_id" className="input-field" required>
                <option value="">Operario a cargo...</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>

              <select name="type" className="input-field" value={formType} onChange={(e) => setFormType(e.target.value)} required>
                <option value="Preventivo">Preventivo</option>
                <option value="Predictivo">Predictivo</option>
                <option value="Correctivo">Correctivo</option>
                <option value="Diario">Diario</option>
                <option value="Mensual">Mensual</option>
                <option value="Fin de Año">Fin de Año</option>
              </select>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>Fecha de Inicio</label>
                  <input type="date" name="start_date" className="input-field" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Fecha Fin (Aprox o Real)</label>
                  <input type="date" name="end_date" className="input-field" />
                </div>
              </div>

              {(formType === 'Preventivo' || formType === 'Predictivo' || formType === 'Mensual') && (
                <div>
                  <label style={{ color: 'var(--warning)' }}>Días para próximo {formType.toLowerCase()}</label>
                  <input type="number" name="next_days" className="input-field" placeholder="Cantidad de días (Ej: 30, 90, 180)" required />
                </div>
              )}

              {activeChecklist.length > 0 && (
                <div className="glass" style={{ padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
                  <h4 style={{ marginBottom: '10px', color: 'var(--accent)' }}>✅ Protocolo / SOP Obligatorio</h4>
                  {activeChecklist.map((item, i) => (
                    <label key={i} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" required checked={checklistResults[i] || false} onChange={e => setChecklistResults({...checklistResults, [i]: e.target.checked})} style={{ marginRight: '8px' }} />
                      {item}
                    </label>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>Horas de Paro (Downtime)</label>
                  <input type="number" step="0.5" name="downtime_hours" className="input-field" placeholder="Ej: 2.5" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Costo Estimado (Mano de Obra)</label>
                  <input type="number" step="0.01" name="labor_cost" className="input-field" placeholder="Ej: 15000" />
                </div>
              </div>

              <textarea name="failure_details" className="input-field" style={{ minHeight: '60px' }} placeholder="Describa el trabajo realizado..." required></textarea>
              
              <div className="glass" style={{ padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px' }}>📦 Repuestos Utilizados</h4>
                <select className="input-field" onChange={(e) => { addPart(e.target.value); e.target.value = ""; }}>
                  <option value="">-- Buscar / Agregar Repuesto --</option>
                  {spareParts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedParts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <input type="number" value={p.quantity} min="1" style={{ width: '60px' }} className="input-field" onChange={(e) => updatePartQty(p.id, e.target.value)} />
                      <button type="button" className="btn btn-danger" onClick={() => removePart(p.id)}>X</button>
                      {p.quantity > p.stock && <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>⚠️ Stock Insuficiente</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass" style={{ padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px' }}>✍️ Firma del Operario</h4>
                <div className="signature-pad">
                  <SignatureCanvas 
                    ref={(ref) => setSigPad(ref)}
                    penColor='black' 
                    canvasProps={{width: 300, height: 150, className: 'sigCanvas'}} 
                  />
                </div>
                <button type="button" className="btn btn-danger" onClick={() => sigPad && sigPad.clear()}>Limpiar Firma</button>
              </div>

              <label style={{ color: 'var(--text-muted)' }}>Evidencias / Fotos (Subir varias)</label>
              <input type="file" name="evidence_files" accept="image/*" multiple className="input-field" />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar y Calcular</button>
                <button type="button" className="btn btn-danger" onClick={() => { setShowModal(false); if (setScannedMachineId) setScannedMachineId(null); }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
