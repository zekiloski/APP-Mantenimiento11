import React, { useState, useEffect } from 'react';
import './index.css';

// Utilities
import { API_URL, ROOT_URL } from './utils/constants';
import { authFetch } from './utils/api';

// Common Components
import { Sidebar } from './components/common/Sidebar';
import { toast, ToastContainer } from './components/common/Toast';
import { Scanner } from './components/common/Scanner';
import { Settings } from './components/common/Settings';

// Feature Components
import { Login } from './components/auth/Login';
import { Dashboard } from './components/dashboard/Dashboard';
import { Machines } from './components/machines/Machines';
import { MachineInfoModal } from './components/machines/MachineInfoModal';
import { Sectors } from './components/machines/Sectors';
import { Operators } from './components/operators/Operators';
import { SpareParts } from './components/spare-parts/SpareParts';
import { AlarmsBoard } from './components/maintenance/AlarmsBoard';
import { PartsHistory } from './components/maintenance/PartsHistory';
import { MaintenanceRecords } from './components/maintenance/MaintenanceRecords';
import { MaintenancePlan } from './components/maintenance/MaintenancePlan';
import { Reports } from './components/maintenance/Reports';

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

    authFetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        updateThemeColors(data.primary_color);
      });

    // PWA & Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        authFetch(`${API_URL}/vapidPublicKey`)
          .then(r => r.json())
          .then(data => {
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: data.publicKey
            }).then(sub => {
              authFetch(`${API_URL}/subscribe`, {
                method: 'POST',
                body: JSON.stringify(sub)
              });
            }).catch(err => console.log('Push subscribe failed:', err));
          });
      });
    }

    const handleOnline = () => syncOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const updateThemeColors = (color) => {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', color + 'cc');
    const r = parseInt(color.slice(1,3), 16);
    const g = parseInt(color.slice(3,5), 16);
    const b = parseInt(color.slice(5,7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intentar procesar cola al arrancar
    processOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineMaintQueue') || '[]');
    if (queue.length === 0) return;

    toast(`Sincronizando ${queue.length} registros pendientes...`, 'info');
    let successCount = 0;

    for (const item of queue) {
      try {
        await authFetch(`${API_URL}/maintenance`, {
          method: 'POST',
          body: JSON.stringify(item)
        });
        successCount++;
      } catch (e) {
        console.error("Error en sincronización offline:", e);
      }
    }

    const remaining = queue.slice(successCount);
    localStorage.setItem('offlineMaintQueue', JSON.stringify(remaining));

    if (successCount > 0) {
      toast(`✅ Sincronización completa: ${successCount} registros subidos`, 'success');
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} settings={settings} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="app-container">
      {!isOnline && (
        <div style={{ background: '#ef4444', color: 'white', textAlign: 'center', padding: '5px', fontSize: '0.8rem', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1000 }}>
          ⚠️ MODO OFFLINE: Los cambios se guardarán localmente hasta recuperar conexión.
        </div>
      )}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setIsMenuOpen(true)}>☰</button>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{settings.company_name}</h2>
        <div style={{ width: '30px' }}></div>
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
        {activeTab === 'dashboard' && <Dashboard key="dash" onModifyAlarm={(id) => { setScannedMachineId(id); setActiveTab('maintenance'); }} />}
        {activeTab === 'alarms' && <AlarmsBoard key="alarms" onModifyAlarm={(id) => { setScannedMachineId(id); setActiveTab('maintenance'); }} />}
        {activeTab === 'maintenance' && <MaintenanceRecords key="maint_rec" user={user} preselectedMachine={scannedMachineId} setScannedMachineId={setScannedMachineId} settings={settings} />}
        {activeTab === 'maint_plan' && (
          <MaintenancePlan 
            key="maint_plan"
            settings={settings} 
            onRegisterMaintenance={(machineId) => {
              setScannedMachineId(machineId);
              setActiveTab('maintenance');
            }} 
          />
        )}
        {activeTab === 'reports' && <Reports key="reports" settings={settings} />}
        {activeTab === 'parts_history' && <PartsHistory key="parts" />}

        {user.role === 'Administrador' && (
          <>
            {activeTab === 'machines' && <Machines onViewInfo={(m) => { setScannedMachineData(m); setShowMachineInfo(true); }} />}
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
                  authFetch(`${API_URL}/machines/${id}`)
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

      {isLoadingScan && <div className="modal-overlay"><div className="glass" style={{ padding: '20px' }}>Cargando datos de máquina...</div></div>}
      
      {showMachineInfo && (
        <MachineInfoModal 
          machine={scannedMachineData} 
          settings={settings} 
          onClose={() => { setShowMachineInfo(false); setScannedMachineData(null); }}
          onStartMaintenance={(id) => {
            setShowMachineInfo(false);
            setScannedMachineId(id);
            setActiveTab('maintenance');
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default App;
