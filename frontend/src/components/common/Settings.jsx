import React, { useState } from 'react';
import { API_URL, ROOT_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from './Toast';

export function Settings({ settings, setSettings }) {
  const [activeCheckTab, setActiveCheckTab] = useState('Preventivo');
  
  let parsedC = {};
  try { 
    if (settings?.checklists) {
      const rawData = typeof settings.checklists === 'string' ? JSON.parse(settings.checklists) : settings.checklists;
      if (rawData && typeof rawData === 'object') parsedC = rawData;
    }
  } catch(e){
    console.error("Error parsing checklists in Settings", e);
  }

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let logo_url = settings.logo_url;

    if (fd.get('logo_file').size > 0) {
      const uploadData = new FormData();
      uploadData.append('files', fd.get('logo_file'));
      const res = await authFetch(`${API_URL}/upload`, { method: 'POST', body: uploadData });
      const up = await res.json();
      logo_url = up.urls ? up.urls[0] : up.url;
    }

    const checklists = { ...parsedC };
    const rawC = fd.get('checklists_raw');
    
    // Solo actualizar la pestaña activa si hay cambios o si el usuario quiere borrar todo
    checklists[activeCheckTab] = rawC ? rawC.split('\n').map(s => s.trim()).filter(Boolean) : [];
    
    const checklistsStr = JSON.stringify(checklists);

    const payload = {
      company_name: fd.get('company_name'),
      primary_color: fd.get('primary_color'),
      logo_url: logo_url,
      checklists: checklistsStr
    };

    try {
      await authFetch(`${API_URL}/settings`, { method: 'PUT', body: JSON.stringify(payload) });
      setSettings(payload);
      toast('Configuración guardada correctamente');
    } catch(e) {
      toast('Error al guardar configuración', 'error');
    }
    
    document.documentElement.style.setProperty('--accent', payload.primary_color);
    document.documentElement.style.setProperty('--accent-hover', payload.primary_color + 'cc');
    const r = parseInt(payload.primary_color.slice(1,3), 16);
    const g = parseInt(payload.primary_color.slice(3,5), 16);
    const b = parseInt(payload.primary_color.slice(5,7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);

    toast('Configuración guardada correctamente');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>Ajustes del Sistema</h1>
      <div className="card glass">
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <h3>Apariencia y Branding</h3>
            <label>Nombre de la Empresa</label>
            <input name="company_name" defaultValue={settings.company_name} className="input-field" required />
            <label>Color Principal (Sistema)</label>
            <input type="color" name="primary_color" defaultValue={settings.primary_color} className="input-field" style={{ height: '50px', padding: '5px' }} />
            <label>Logotipo (.png / .jpg)</label>
            {settings.logo_url && <img src={`${ROOT_URL}${settings.logo_url}`} alt="Preview" style={{ maxHeight: '60px', display: 'block', margin: '10px 0' }} />}
            <input type="file" name="logo_file" accept="image/*" className="input-field" />
          </div>

          <div>
            <h3>Protocolos (Checklists)</h3>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {['Preventivo', 'Correctivo', 'Predictivo', 'Diario', 'Mensual', 'Fin de año'].map(t => (
                <button key={t} type="button" className={`btn ${activeCheckTab === t ? 'btn-primary' : ''}`} style={{ fontSize: '0.7rem', padding: '5px 8px' }} onClick={() => setActiveCheckTab(t)}>{t}</button>
              ))}
            </div>
            <label>Tareas para {activeCheckTab} (Una por línea)</label>
            <textarea 
              name="checklists_raw" 
              className="input-field" 
              rows="8" 
              defaultValue={Array.isArray(parsedC[activeCheckTab]) ? parsedC[activeCheckTab].join('\n') : ''} 
              key={activeCheckTab} 
              placeholder="Ej: Verificar nivel de aceite\nLimpiar cabezal"
            ></textarea>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '15px', fontWeight: 'bold' }}>Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}
