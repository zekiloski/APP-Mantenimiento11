import React, { useState, useEffect } from 'react';
import { API_URL } from '../../utils/constants';
import { authFetch } from '../../utils/api';
import { toast } from '../common/Toast';

export function SpareParts() {
  const [parts, setParts] = useState([]);
  const [editPart, setEditPart] = useState(null);

  useEffect(() => { load() }, []);
  const load = () => authFetch(`${API_URL}/spare_parts`).then(r => r.json()).then(setParts);

  const save = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (editPart) {
      await authFetch(`${API_URL}/spare_parts/${editPart.id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await authFetch(`${API_URL}/spare_parts`, { method: 'POST', body: JSON.stringify(data) });
    }
    setEditPart(null); e.target.reset(); load();
  };

  const remove = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este repuesto?")) return;
    await authFetch(`${API_URL}/spare_parts/${id}`, { method: 'DELETE' });
    load();
  }

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await authFetch(`${API_URL}/spare_parts/import`, { method: 'POST', body: fd });
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
              {parts.length === 0 && <tr><td colSpan="4">Sin repuestos.</td></tr>}
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
