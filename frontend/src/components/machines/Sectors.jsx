import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';

export function Sectors() {
  const [sectors, setSectors] = useState([]);
  const [editSector, setEditSector] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => authFetch(`${API_URL}/sectors`).then(r => r.json()).then(setSectors);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (editSector) {
      await authFetch(`${API_URL}/sectors/${editSector.id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await authFetch(`${API_URL}/sectors`, { method: 'POST', body: JSON.stringify(data) });
    }
    setEditSector(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar el sector?")) return;
    await authFetch(`${API_URL}/sectors/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h1>Sectores / Áreas</h1>
      <div className="card-grid">
        <form onSubmit={save} className="card glass">
          <h3>{editSector ? 'Modificando Sector' : '+ Agregar Sector'}</h3>
          <input name="name" defaultValue={editSector?.name} key={editSector?.id} className="input-field" placeholder="Nombre del sector" required />
          <div style={{ display: 'flex', gap: '5px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
            {editSector && <button type="button" className="btn btn-danger" onClick={() => setEditSector(null)}>Cancelar</button>}
          </div>
        </form>
        <div className="card glass" style={{ gridColumn: 'span 2' }}>
          <h3>Sectores Registrados</h3>
          <ul>{sectors.map(s => (
            <li key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{s.name}</strong>
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
