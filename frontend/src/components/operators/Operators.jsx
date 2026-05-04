import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';

export function Operators() {
  const [ops, setOps] = useState([]);
  const [editOp, setEditOp] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => authFetch(`${API_URL}/operators`).then(r => r.json()).then(setOps);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (editOp) {
      await authFetch(`${API_URL}/operators/${editOp.id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await authFetch(`${API_URL}/operators`, { method: 'POST', body: JSON.stringify(data) });
    }
    setEditOp(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar el operario?")) return;
    await authFetch(`${API_URL}/operators/${id}`, { method: 'DELETE' });
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
              <div><strong>{o.name}</strong> - <span className="badge badge-warning">{o.specialty}</span></div>
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
