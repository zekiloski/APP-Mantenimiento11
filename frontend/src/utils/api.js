import { API_URL } from './constants';

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };
  
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  
  const isPublic = url.includes('/login') || (url.includes('/settings') && options.method !== 'PUT') || url.includes('/vapidPublicKey');
  
  if (res.status === 401 && !isPublic) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }
  return res;
};
