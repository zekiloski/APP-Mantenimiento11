import React, { useState } from 'react';
import { API_URL, ROOT_URL } from '../../utils/constants';

export function Login({ onLogin, settings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submitLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) onLogin(data.user, data.token);
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
